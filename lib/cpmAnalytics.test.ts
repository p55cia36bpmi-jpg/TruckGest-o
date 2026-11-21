import { describe, expect, test } from 'bun:test';
import { calculateVehicleCpmAnalytics } from './cpmAnalytics';
import type {
  DailyReport,
  Driver,
  MaintenanceRecord,
  PaymentRecord,
  TollRecord,
  Vehicle,
} from '@/types/truck-service';

const VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    plate: 'BRA2E19',
    model: 'Volvo FH 540',
    currentKm: 120000,
    lastOilChangeDate: '2026-10-01',
    lastOilChangeKm: 110000,
    nextOilChangeKm: 130000,
    filtersReplaced: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'veh-2',
    plate: 'TRK8G44',
    model: 'Scania R450',
    currentKm: 95000,
    lastOilChangeDate: '2026-10-01',
    lastOilChangeKm: 85000,
    nextOilChangeKm: 105000,
    filtersReplaced: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'veh-3',
    plate: 'SEM0K00',
    model: 'Mercedes Actros',
    currentKm: 50000,
    lastOilChangeDate: '2026-10-01',
    lastOilChangeKm: 40000,
    nextOilChangeKm: 60000,
    filtersReplaced: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    name: 'Carlos',
    rg: '1',
    cpf: '111',
    address: 'Campinas',
    cnhCategory: 'E',
    cnhNumber: '111',
    cnhExpiry: '2028-01-01',
    vehicleId: 'veh-1',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'drv-2',
    name: 'Marcos',
    rg: '2',
    cpf: '222',
    address: 'Sumaré',
    cnhCategory: 'E',
    cnhNumber: '222',
    cnhExpiry: '2028-01-01',
    vehicleId: 'veh-2',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const REPORTS: DailyReport[] = [
  {
    id: 'rep-1',
    driverId: 'drv-1',
    driverName: 'Carlos',
    vehicleId: 'veh-1',
    vehiclePlate: 'BRA2E19',
    date: '2026-11-02',
    startKm: 119000,
    endKm: 119500,
    distanceKm: 500,
    tollsCount: 2,
    hasHelper: true,
    fuelCost: 1500,
    fuelLiters: 250,
    otherExpenses: [{ id: 'o1', category: 'Manutenção', amount: 200, description: 'Freio' }],
    deliveries: [],
    totalDeliveries: 1,
    totalFreight: 4000,
    totalOtherExpenses: 200,
    status: 'paid',
    createdAt: '2026-11-02T18:00:00.000Z',
  },
  {
    id: 'rep-2',
    driverId: 'drv-1',
    driverName: 'Carlos',
    vehicleId: 'veh-1',
    vehiclePlate: 'BRA2E19',
    date: '2026-11-03',
    startKm: 119500,
    endKm: 120000,
    distanceKm: 500,
    tollsCount: 1,
    hasHelper: false,
    fuelCost: 1000,
    fuelLiters: 160,
    otherExpenses: [],
    deliveries: [],
    totalDeliveries: 1,
    totalFreight: 3500,
    totalOtherExpenses: 0,
    status: 'paid',
    createdAt: '2026-11-03T18:00:00.000Z',
  },
  {
    id: 'rep-3',
    driverId: 'drv-2',
    driverName: 'Marcos',
    vehicleId: 'veh-2',
    vehiclePlate: 'TRK8G44',
    date: '2026-11-04',
    startKm: 94000,
    endKm: 95000,
    distanceKm: 1000,
    tollsCount: 3,
    hasHelper: false,
    fuelCost: 2200,
    fuelLiters: 350,
    otherExpenses: [],
    deliveries: [],
    totalDeliveries: 2,
    totalFreight: 5000,
    totalOtherExpenses: 0,
    status: 'approved',
    createdAt: '2026-11-04T18:00:00.000Z',
  },
];

const PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-1',
    driverId: 'drv-1',
    driverName: 'Carlos',
    startDate: '2026-11-01',
    endDate: '2026-11-07',
    daysWorked: 2,
    daysWithHelper: 1,
    driverAmount: 440,
    helperAmount: 130,
    netReceived: 6930,
    totalFreight: 7500,
    confirmedAt: '2026-11-08T10:00:00.000Z',
    confirmedByAdminEmail: 'admin@truckgestao.com',
  },
  {
    id: 'pay-2',
    driverId: 'drv-2',
    driverName: 'Marcos',
    startDate: '2026-11-01',
    endDate: '2026-11-07',
    daysWorked: 1,
    daysWithHelper: 0,
    driverAmount: 300,
    helperAmount: 0,
    netReceived: 4700,
    totalFreight: 5000,
    confirmedAt: '2026-11-08T10:00:00.000Z',
    confirmedByAdminEmail: 'admin@truckgestao.com',
  },
];

const TOLLS: TollRecord[] = [
  {
    id: 't-1',
    date: '2026-11-02',
    route: 'Anhanguera',
    vehicleId: 'veh-1',
    vehiclePlate: 'BRA2E19',
    cost: 150,
    createdAt: '2026-11-02T12:00:00.000Z',
  },
];

const MAINTENANCE: MaintenanceRecord[] = [
  {
    id: 'm-1',
    vehicleId: 'veh-1',
    date: '2026-11-05',
    odometer: 120000,
    type: 'Troca de Óleo',
    cost: 450,
    filtersReplaced: true,
    createdAt: '2026-11-05T12:00:00.000Z',
  },
];

describe('calculateVehicleCpmAnalytics', () => {
  test('computes per-vehicle CPM from payments and fueling data accurately', () => {
    const summary = calculateVehicleCpmAnalytics({
      vehicles: VEHICLES,
      drivers: DRIVERS,
      dailyReports: REPORTS,
      payments: PAYMENTS,
      tolls: TOLLS,
      maintenanceRecords: MAINTENANCE,
      costScope: 'payments_fuel',
    });

    // veh-1: 1000 km, fuel = 2500, payments = 440 + 130 = 570 -> total = 3070 -> CPM = 3.07
    const v1 = summary.rows.find((r) => r.vehicle.id === 'veh-1');
    expect(v1?.totalKm).toBe(1000);
    expect(v1?.fuelCost).toBe(2500);
    expect(v1?.paymentsCost).toBe(570);
    expect(v1?.operationalCost).toBe(3070);
    expect(v1?.cpm).toBe(3.07);
    expect(v1?.fuelCpm).toBe(2.5);
    expect(v1?.paymentsCpm).toBe(0.57);

    // veh-2: 1000 km, fuel = 2200, payments = 300 -> total = 2500 -> CPM = 2.50
    const v2 = summary.rows.find((r) => r.vehicle.id === 'veh-2');
    expect(v2?.totalKm).toBe(1000);
    expect(v2?.operationalCost).toBe(2500);
    expect(v2?.cpm).toBe(2.5);

    // veh-3: 0 km -> CPM = null
    const v3 = summary.rows.find((r) => r.vehicle.id === 'veh-3');
    expect(v3?.totalKm).toBe(0);
    expect(v3?.cpm).toBeNull();

    expect(summary.totalKm).toBe(2000);
    expect(summary.totalOperationalCost).toBe(5570);
    expect(summary.fleetAvgCpm).toBe(2.79); // 5570 / 2000 = 2.785 -> 2.79
    expect(summary.highestCpmVehicle?.vehicle.plate).toBe('BRA2E19');
    expect(summary.lowestCpmVehicle?.vehicle.plate).toBe('TRK8G44');
  });

  test('includes tolls and maintenance in full operational cost scope', () => {
    const summary = calculateVehicleCpmAnalytics({
      vehicles: VEHICLES,
      drivers: DRIVERS,
      dailyReports: REPORTS,
      payments: PAYMENTS,
      tolls: TOLLS,
      maintenanceRecords: MAINTENANCE,
      costScope: 'full',
    });

    // veh-1: 3070 + 150 (toll) + 200 (report expense) + 450 (maint) = 3870 -> CPM = 3.87
    const v1 = summary.rows.find((r) => r.vehicle.id === 'veh-1');
    expect(v1?.tollsCost).toBe(150);
    expect(v1?.maintenanceCost).toBe(650);
    expect(v1?.operationalCost).toBe(3870);
    expect(v1?.cpm).toBe(3.87);
  });

  test('proportionally splits payment across vehicles when driver drove multiple trucks in period', () => {
    const multiTruckReports: DailyReport[] = [
      { ...REPORTS[0], id: 'r1', vehicleId: 'veh-1', vehiclePlate: 'BRA2E19', distanceKm: 400, fuelCost: 800 },
      { ...REPORTS[1], id: 'r2', vehicleId: 'veh-2', vehiclePlate: 'TRK8G44', distanceKm: 600, fuelCost: 1200 },
    ];
    const singlePayment: PaymentRecord[] = [
      { ...PAYMENTS[0], driverAmount: 400, helperAmount: 100 }, // 500 total -> 50% veh-1, 50% veh-2
    ];

    const summary = calculateVehicleCpmAnalytics({
      vehicles: VEHICLES,
      drivers: DRIVERS,
      dailyReports: multiTruckReports,
      payments: singlePayment,
      costScope: 'payments_fuel',
    });

    const v1 = summary.rows.find((r) => r.vehicle.id === 'veh-1');
    const v2 = summary.rows.find((r) => r.vehicle.id === 'veh-2');
    expect(v1?.paymentsCost).toBe(250);
    expect(v2?.paymentsCost).toBe(250);
  });
});
