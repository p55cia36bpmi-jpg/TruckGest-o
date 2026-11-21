import {
  DailyReport,
  Driver,
  MaintenanceRecord,
  TollRecord,
} from '@/types/truck-service';

export interface FuelVsMaintenancePoint {
  monthKey: string; // YYYY-MM
  label: string; // e.g. Nov/26
  fullLabel: string; // e.g. Novembro de 2026
  abastecimento: number;
  manutencao: number;
  total: number;
  diferenca: number; // abastecimento - manutencao
  fuelLiters: number;
}

export interface FuelVsMaintenanceAggregate {
  points: FuelVsMaintenancePoint[];
  totalAbastecimento: number;
  totalManutencao: number;
  totalCombined: number;
  totalLiters: number;
  monthsWithData: number;
}

const MONTH_SHORT_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const MONTH_FULL_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatMonthLabelsPt(monthKey: string): { label: string; fullLabel: string } {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return { label: monthKey, fullLabel: monthKey };
  }
  const shortYear = String(year).slice(-2);
  return {
    label: `${MONTH_SHORT_PT[monthIdx]}/${shortYear}`,
    fullLabel: `${MONTH_FULL_PT[monthIdx]} de ${year}`,
  };
}

export function buildMonthRange(endMonthKey: string, count: number): string[] {
  const [yStr, mStr] = endMonthKey.split('-');
  const endYear = Number(yStr);
  const endMonth = Number(mStr);
  if (Number.isNaN(endYear) || Number.isNaN(endMonth)) return [endMonthKey];

  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const d = new Date(endYear, endMonth - 1 - offset, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}-${mm}`);
  }
  return months;
}

export function buildContinuousMonthRange(startMonthKey: string, endMonthKey: string): string[] {
  const [sy, sm] = startMonthKey.split('-').map(Number);
  const [ey, em] = endMonthKey.split('-').map(Number);
  if ([sy, sm, ey, em].some(Number.isNaN)) return [endMonthKey];

  const months: string[] = [];
  let cursor = new Date(sy, sm - 1, 1);
  const end = new Date(ey, em - 1, 1);

  while (cursor <= end && months.length < 36) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}-${mm}`);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return months;
}

export function aggregateFuelVsMaintenanceMonthly(params: {
  dailyReports: DailyReport[];
  maintenanceRecords: MaintenanceRecord[];
  drivers: Driver[];
  selectedDriverFilter: string;
  selectedVehicleFilter: string;
  rangeMode: '6m' | '12m' | 'all';
  fallbackMonthKey?: string;
}): FuelVsMaintenanceAggregate {
  const {
    dailyReports,
    maintenanceRecords,
    drivers,
    selectedDriverFilter,
    selectedVehicleFilter,
    rangeMode,
    fallbackMonthKey,
  } = params;

  const driverScopedVehicleId =
    selectedDriverFilter !== 'all'
      ? drivers.find((d) => d.id === selectedDriverFilter)?.vehicleId || null
      : null;

  const monthlyMap = new Map<
    string,
    { abastecimento: number; manutencao: number; fuelLiters: number }
  >();

  const ensureBucket = (monthKey: string) => {
    let bucket = monthlyMap.get(monthKey);
    if (!bucket) {
      bucket = { abastecimento: 0, manutencao: 0, fuelLiters: 0 };
      monthlyMap.set(monthKey, bucket);
    }
    return bucket;
  };

  for (const rep of dailyReports) {
    if (!rep.date || !/^\d{4}-\d{2}/.test(rep.date)) continue;
    if (selectedDriverFilter !== 'all' && rep.driverId !== selectedDriverFilter) continue;
    if (selectedVehicleFilter !== 'all' && rep.vehicleId !== selectedVehicleFilter) continue;

    const monthKey = rep.date.slice(0, 7);
    const bucket = ensureBucket(monthKey);

    bucket.abastecimento += Number(rep.fuelCost || 0);
    bucket.fuelLiters += Number(rep.fuelLiters || 0);

    if (Array.isArray(rep.otherExpenses)) {
      for (const exp of rep.otherExpenses) {
        if (exp.category === 'Manutenção' || exp.category === 'Óleo') {
          bucket.manutencao += Number(exp.amount || 0);
        }
      }
    }
  }

  for (const maint of maintenanceRecords) {
    if (!maint.date || !/^\d{4}-\d{2}/.test(maint.date)) continue;
    if (selectedVehicleFilter !== 'all' && maint.vehicleId !== selectedVehicleFilter) continue;
    if (
      selectedDriverFilter !== 'all' &&
      driverScopedVehicleId &&
      maint.vehicleId !== driverScopedVehicleId
    ) {
      continue;
    }

    const cost = Number(maint.cost || 0);
    if (cost <= 0) continue;

    const monthKey = maint.date.slice(0, 7);
    const bucket = ensureBucket(monthKey);
    bucket.manutencao += cost;
  }

  const sortedRecordedMonths = Array.from(monthlyMap.keys()).sort();
  const currentMonth = fallbackMonthKey || new Date().toISOString().slice(0, 7);
  const latestMonth =
    sortedRecordedMonths.length > 0
      ? sortedRecordedMonths[sortedRecordedMonths.length - 1]
      : currentMonth;

  let timelineMonths: string[];
  if (rangeMode === '6m') {
    timelineMonths = buildMonthRange(latestMonth, 6);
  } else if (rangeMode === '12m') {
    timelineMonths = buildMonthRange(latestMonth, 12);
  } else if (sortedRecordedMonths.length <= 1) {
    timelineMonths = buildMonthRange(latestMonth, 6);
  } else {
    timelineMonths = buildContinuousMonthRange(sortedRecordedMonths[0], latestMonth);
  }

  const points: FuelVsMaintenancePoint[] = timelineMonths.map((monthKey) => {
    const bucket = monthlyMap.get(monthKey) || {
      abastecimento: 0,
      manutencao: 0,
      fuelLiters: 0,
    };
    const abastecimento = Number(bucket.abastecimento.toFixed(2));
    const manutencao = Number(bucket.manutencao.toFixed(2));
    const fuelLiters = Number(bucket.fuelLiters.toFixed(1));
    const { label, fullLabel } = formatMonthLabelsPt(monthKey);

    return {
      monthKey,
      label,
      fullLabel,
      abastecimento,
      manutencao,
      total: Number((abastecimento + manutencao).toFixed(2)),
      diferenca: Number((abastecimento - manutencao).toFixed(2)),
      fuelLiters,
    };
  });

  const totalAbastecimento = Number(
    points.reduce((acc, p) => acc + p.abastecimento, 0).toFixed(2)
  );
  const totalManutencao = Number(
    points.reduce((acc, p) => acc + p.manutencao, 0).toFixed(2)
  );
  const totalCombined = Number((totalAbastecimento + totalManutencao).toFixed(2));
  const totalLiters = Number(
    points.reduce((acc, p) => acc + p.fuelLiters, 0).toFixed(1)
  );
  const monthsWithData = points.filter((p) => p.total > 0).length;

  return {
    points,
    totalAbastecimento,
    totalManutencao,
    totalCombined,
    totalLiters,
    monthsWithData,
  };
}

// Keep unused TollRecord type import clean if callers need unified cost types later
export type { TollRecord };
