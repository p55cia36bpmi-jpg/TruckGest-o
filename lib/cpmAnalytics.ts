import {
  DailyReport,
  Driver,
  MaintenanceRecord,
  PaymentRecord,
  TollRecord,
  Vehicle,
} from '@/types/truck-service';

export type CpmCostScope = 'payments_fuel' | 'full';

export interface VehicleCpmRow {
  vehicle: Vehicle;
  driverNames: string[];
  reportsCount: number;
  paymentsCount: number;
  totalKm: number;
  fuelCost: number;
  fuelLiters: number;
  avgKmPerLiter: number;
  paymentsCost: number;
  driverPaymentsCost: number;
  helperPaymentsCost: number;
  tollsCost: number;
  maintenanceCost: number;
  coreOperationalCost: number; // fuelCost + paymentsCost
  fullOperationalCost: number; // fuelCost + paymentsCost + tollsCost + maintenanceCost
  operationalCost: number; // active scope total
  cpm: number | null; // R$/km for active scope
  fuelCpm: number | null;
  paymentsCpm: number | null;
  extrasCpm: number | null;
  totalFreight: number;
  revenuePerKm: number | null;
}

export interface FleetCpmSummary {
  rows: VehicleCpmRow[];
  totalKm: number;
  totalFuelCost: number;
  totalFuelLiters: number;
  totalPaymentsCost: number;
  totalTollsCost: number;
  totalMaintenanceCost: number;
  totalOperationalCost: number;
  fleetAvgCpm: number | null;
  highestCpmVehicle: VehicleCpmRow | null;
  lowestCpmVehicle: VehicleCpmRow | null;
  unallocatedPaymentsCost: number;
}

export function calculateVehicleCpmAnalytics(params: {
  vehicles: Vehicle[];
  drivers: Driver[];
  dailyReports: DailyReport[];
  payments: PaymentRecord[];
  tolls?: TollRecord[];
  maintenanceRecords?: MaintenanceRecord[];
  costScope?: CpmCostScope;
  startDate?: string;
  endDate?: string;
  selectedVehicleFilter?: string;
  selectedDriverFilter?: string;
}): FleetCpmSummary {
  const {
    vehicles,
    drivers,
    dailyReports,
    payments,
    tolls = [],
    maintenanceRecords = [],
    costScope = 'payments_fuel',
    startDate,
    endDate,
    selectedVehicleFilter = 'all',
    selectedDriverFilter = 'all',
  } = params;

  const vehicleMap = new Map<
    string,
    {
      vehicle: Vehicle;
      driverNamesSet: Set<string>;
      reportsCount: number;
      paymentsIdsSet: Set<string>;
      totalKm: number;
      fuelCost: number;
      fuelLiters: number;
      driverPaymentsCost: number;
      helperPaymentsCost: number;
      tollsCost: number;
      maintenanceCost: number;
      totalFreight: number;
    }
  >();

  for (const v of vehicles) {
    const driverNamesSet = new Set<string>();
    for (const d of drivers) {
      if (d.vehicleId === v.id) {
        driverNamesSet.add(d.name);
      }
    }
    vehicleMap.set(v.id, {
      vehicle: v,
      driverNamesSet,
      reportsCount: 0,
      paymentsIdsSet: new Set<string>(),
      totalKm: 0,
      fuelCost: 0,
      fuelLiters: 0,
      driverPaymentsCost: 0,
      helperPaymentsCost: 0,
      tollsCost: 0,
      maintenanceCost: 0,
      totalFreight: 0,
    });
  }

  const inDateRange = (dateStr?: string) => {
    if (!dateStr) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  // 1. Aggregate fueling, distance, freight, and report expenses per vehicle
  for (const rep of dailyReports) {
    if (!inDateRange(rep.date)) continue;
    if (selectedDriverFilter !== 'all' && rep.driverId !== selectedDriverFilter) continue;

    const entry = vehicleMap.get(rep.vehicleId);
    if (!entry) continue;

    const km =
      typeof rep.distanceKm === 'number' && rep.distanceKm > 0
        ? rep.distanceKm
        : Math.max(0, Number(rep.endKm || 0) - Number(rep.startKm || 0));

    entry.reportsCount += 1;
    entry.totalKm += km;
    entry.fuelCost += Number(rep.fuelCost || 0);
    entry.fuelLiters += Number(rep.fuelLiters || 0);
    entry.totalFreight += Number(rep.totalFreight || 0);
    if (rep.driverName) {
      entry.driverNamesSet.add(rep.driverName);
    }

    if (Array.isArray(rep.otherExpenses)) {
      for (const exp of rep.otherExpenses) {
        entry.maintenanceCost += Number(exp.amount || 0);
      }
    } else if (typeof rep.totalOtherExpenses === 'number') {
      entry.maintenanceCost += Number(rep.totalOtherExpenses || 0);
    }
  }

  // 2. Attribute PaymentRecords (driverAmount + helperAmount) to each vehicle
  let unallocatedPaymentsCost = 0;

  for (const pay of payments) {
    if (selectedDriverFilter !== 'all' && pay.driverId !== selectedDriverFilter) continue;

    // Check overlap with optional date window
    if (startDate && pay.endDate && pay.endDate < startDate) continue;
    if (endDate && pay.startDate && pay.startDate > endDate) continue;

    const driverAmt = Number(pay.driverAmount || 0);
    const helperAmt = Number(pay.helperAmount || 0);
    const payTotal = driverAmt + helperAmt;
    if (payTotal <= 0) continue;

    // Look up daily reports for this driver inside the payment's exact [startDate, endDate] period
    const periodDriverReports = dailyReports.filter((rep) => {
      if (rep.driverId !== pay.driverId) return false;
      if (pay.startDate && rep.date < pay.startDate) return false;
      if (pay.endDate && rep.date > pay.endDate) return false;
      return vehicleMap.has(rep.vehicleId);
    });

    if (periodDriverReports.length > 0) {
      const countsByVehicle = new Map<string, number>();
      for (const rep of periodDriverReports) {
        countsByVehicle.set(rep.vehicleId, (countsByVehicle.get(rep.vehicleId) || 0) + 1);
      }
      const totalMatchedReports = periodDriverReports.length;

      for (const [vehId, count] of countsByVehicle.entries()) {
        const weight = count / totalMatchedReports;
        const entry = vehicleMap.get(vehId);
        if (entry) {
          entry.driverPaymentsCost += driverAmt * weight;
          entry.helperPaymentsCost += helperAmt * weight;
          entry.paymentsIdsSet.add(pay.id);
        }
      }
    } else {
      // Fallback: driver's linked vehicle
      const drv = drivers.find((d) => d.id === pay.driverId);
      const fallbackVehId = drv?.vehicleId;
      const entry = fallbackVehId ? vehicleMap.get(fallbackVehId) : undefined;
      if (entry) {
        entry.driverPaymentsCost += driverAmt;
        entry.helperPaymentsCost += helperAmt;
        entry.paymentsIdsSet.add(pay.id);
      } else {
        unallocatedPaymentsCost += payTotal;
      }
    }
  }

  // 3. Tolls & direct MaintenanceRecords per vehicle (used in 'full' scope & displayed in breakdown)
  for (const toll of tolls) {
    if (!inDateRange(toll.date)) continue;
    if (!toll.vehicleId) continue;
    const entry = vehicleMap.get(toll.vehicleId);
    if (!entry) continue;
    entry.tollsCost += Number(toll.cost || 0);
  }

  for (const maint of maintenanceRecords) {
    if (!inDateRange(maint.date)) continue;
    const entry = vehicleMap.get(maint.vehicleId);
    if (!entry) continue;
    entry.maintenanceCost += Number(maint.cost || 0);
  }

  // Build rows
  let rows: VehicleCpmRow[] = Array.from(vehicleMap.values()).map((entry) => {
    const totalKm = Math.round(entry.totalKm);
    const fuelCost = Number(entry.fuelCost.toFixed(2));
    const fuelLiters = Number(entry.fuelLiters.toFixed(1));
    const driverPaymentsCost = Number(entry.driverPaymentsCost.toFixed(2));
    const helperPaymentsCost = Number(entry.helperPaymentsCost.toFixed(2));
    const paymentsCost = Number((driverPaymentsCost + helperPaymentsCost).toFixed(2));
    const tollsCost = Number(entry.tollsCost.toFixed(2));
    const maintenanceCost = Number(entry.maintenanceCost.toFixed(2));

    const coreOperationalCost = Number((fuelCost + paymentsCost).toFixed(2));
    const fullOperationalCost = Number(
      (fuelCost + paymentsCost + tollsCost + maintenanceCost).toFixed(2)
    );
    const operationalCost =
      costScope === 'full' ? fullOperationalCost : coreOperationalCost;

    const cpm = totalKm > 0 ? Number((operationalCost / totalKm).toFixed(2)) : null;
    const fuelCpm = totalKm > 0 ? Number((fuelCost / totalKm).toFixed(2)) : null;
    const paymentsCpm = totalKm > 0 ? Number((paymentsCost / totalKm).toFixed(2)) : null;
    const extrasCpm =
      totalKm > 0 ? Number(((tollsCost + maintenanceCost) / totalKm).toFixed(2)) : null;

    const avgKmPerLiter = fuelLiters > 0 ? Number((totalKm / fuelLiters).toFixed(2)) : 0;
    const totalFreight = Number(entry.totalFreight.toFixed(2));
    const revenuePerKm = totalKm > 0 ? Number((totalFreight / totalKm).toFixed(2)) : null;

    return {
      vehicle: entry.vehicle,
      driverNames: Array.from(entry.driverNamesSet),
      reportsCount: entry.reportsCount,
      paymentsCount: entry.paymentsIdsSet.size,
      totalKm,
      fuelCost,
      fuelLiters,
      avgKmPerLiter,
      paymentsCost,
      driverPaymentsCost,
      helperPaymentsCost,
      tollsCost,
      maintenanceCost,
      coreOperationalCost,
      fullOperationalCost,
      operationalCost,
      cpm,
      fuelCpm,
      paymentsCpm,
      extrasCpm,
      totalFreight,
      revenuePerKm,
    };
  });

  if (selectedVehicleFilter !== 'all') {
    rows = rows.filter((r) => r.vehicle.id === selectedVehicleFilter);
  }

  // Sort by highest operational cost / CPM descending, keeping vehicles with km first
  rows.sort((a, b) => {
    if ((a.cpm !== null) !== (b.cpm !== null)) return a.cpm !== null ? -1 : 1;
    if (a.cpm !== null && b.cpm !== null && b.cpm !== a.cpm) return b.cpm - a.cpm;
    return b.operationalCost - a.operationalCost;
  });

  const totalKm = rows.reduce((acc, r) => acc + r.totalKm, 0);
  const totalFuelCost = Number(rows.reduce((acc, r) => acc + r.fuelCost, 0).toFixed(2));
  const totalFuelLiters = Number(rows.reduce((acc, r) => acc + r.fuelLiters, 0).toFixed(1));
  const totalPaymentsCost = Number(rows.reduce((acc, r) => acc + r.paymentsCost, 0).toFixed(2));
  const totalTollsCost = Number(rows.reduce((acc, r) => acc + r.tollsCost, 0).toFixed(2));
  const totalMaintenanceCost = Number(
    rows.reduce((acc, r) => acc + r.maintenanceCost, 0).toFixed(2)
  );
  const totalOperationalCost = Number(
    rows.reduce((acc, r) => acc + r.operationalCost, 0).toFixed(2)
  );
  const fleetAvgCpm = totalKm > 0 ? Number((totalOperationalCost / totalKm).toFixed(2)) : null;

  const rowsWithCpm = rows.filter((r) => r.cpm !== null && r.totalKm > 0);
  const highestCpmVehicle =
    rowsWithCpm.length > 0
      ? rowsWithCpm.reduce((max, r) => ((r.cpm ?? 0) > (max.cpm ?? 0) ? r : max), rowsWithCpm[0])
      : null;
  const lowestCpmVehicle =
    rowsWithCpm.length > 0
      ? rowsWithCpm.reduce((min, r) => ((r.cpm ?? 0) < (min.cpm ?? 0) ? r : min), rowsWithCpm[0])
      : null;

  return {
    rows,
    totalKm,
    totalFuelCost,
    totalFuelLiters,
    totalPaymentsCost,
    totalTollsCost,
    totalMaintenanceCost,
    totalOperationalCost,
    fleetAvgCpm,
    highestCpmVehicle,
    lowestCpmVehicle,
    unallocatedPaymentsCost: Number(unallocatedPaymentsCost.toFixed(2)),
  };
}
