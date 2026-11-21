import { Driver, Vehicle } from '@/types/truck-service';

export interface DriverCnhStatus {
  driver: Driver;
  daysRemaining: number;
  isExpired: boolean;
  isCritical: boolean; // <= 30 days
  expiryFormatted: string;
}

/**
 * Função de verificação no Painel do Administrador que identifica
 * motoristas cuja CNH vencerá nos próximos 30 dias (ou já está vencida).
 */
export function checkDriverCnhStatus(driver: Driver, referenceDate = new Date()): DriverCnhStatus {
  if (!driver.cnhExpiry) {
    return {
      driver,
      daysRemaining: 9999,
      isExpired: false,
      isCritical: false,
      expiryFormatted: 'Não informada',
    };
  }

  const parts = driver.cnhExpiry.split('-').map(Number);
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const expiryMidnight = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  const diffTime = expiryMidnight.getTime() - refMidnight.getTime();
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining < 0;
  const isCritical = daysRemaining <= 30; // Vence em até 30 dias ou já vencida
  const expiryFormatted = driver.cnhExpiry.split('-').reverse().join('/');

  return {
    driver,
    daysRemaining,
    isExpired,
    isCritical,
    expiryFormatted,
  };
}

export function addDaysToIsoDate(days: number, baseDate: Date = new Date()): string {
  const target = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + days);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface PreventiveDateEvaluation {
  severity: 'red' | 'yellow' | 'ok' | 'none';
  nextDate: string | null;
  nextDateFormatted: string | null;
  daysRemaining: number | null;
  overdueDays: number;
  isDateExceeded: boolean;
  isDateWarning: boolean;
}

export function evaluatePreventiveDate(
  dateStr?: string | null,
  referenceDate: Date = new Date()
): PreventiveDateEvaluation {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return {
      severity: 'none',
      nextDate: null,
      nextDateFormatted: null,
      daysRemaining: null,
      overdueDays: 0,
      isDateExceeded: false,
      isDateWarning: false,
    };
  }

  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const targetMidnight = new Date(yr, mo - 1, dy);

  // Guard against invalid calendar dates
  if (
    targetMidnight.getFullYear() !== yr ||
    targetMidnight.getMonth() !== mo - 1 ||
    targetMidnight.getDate() !== dy
  ) {
    return {
      severity: 'none',
      nextDate: null,
      nextDateFormatted: null,
      daysRemaining: null,
      overdueDays: 0,
      isDateExceeded: false,
      isDateWarning: false,
    };
  }

  const nextDateFormatted = dateStr.split('-').reverse().join('/');
  const daysRemaining = Math.round((targetMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24));

  const isDateExceeded = daysRemaining <= 0;
  const overdueDays = isDateExceeded ? Math.abs(daysRemaining) : 0;
  const isDateWarning = !isDateExceeded && daysRemaining <= 15;
  const severity: 'red' | 'yellow' | 'ok' = isDateExceeded
    ? 'red'
    : isDateWarning
    ? 'yellow'
    : 'ok';

  return {
    severity,
    nextDate: dateStr,
    nextDateFormatted,
    daysRemaining,
    overdueDays,
    isDateExceeded,
    isDateWarning,
  };
}

export interface VehiclePreventiveStatus {
  vehicle: Vehicle;
  currentKm: number;
  limitKm: number;
  baselineKm: number;
  remainingKm: number;
  exceededKm: number;
  isKmExceeded: boolean;
  isKmWarning: boolean;
  nextDate: string | null;
  nextDateFormatted: string | null;
  daysRemaining: number | null;
  overdueDays: number;
  isDateExceeded: boolean;
  isDateWarning: boolean;
  isExceeded: boolean;
  isWarning: boolean;
  alertSeverity: 'red' | 'yellow' | 'ok';
  progressPercent: number;
}

/**
 * Avalia o monitoramento do veículo com base na quilometragem E na data
 * configuradas para a próxima manutenção preventiva.
 * - Vermelho (isExceeded): km >= limite configurado (quando limite > 0) OU data vencida/hoje (<= 0 dias)
 * - Amarelo (isWarning): faltando <= 1.000 km OU faltando <= 15 dias para a data prevista
 */
export function checkVehiclePreventiveStatus(
  vehicle: Vehicle,
  referenceDate: Date = new Date()
): VehiclePreventiveStatus {
  const currentKm = vehicle.currentKm || 0;
  const limitKm = vehicle.nextPreventiveMaintenanceKm ?? vehicle.nextOilChangeKm;
  const baselineKm = vehicle.lastPreventiveMaintenanceKm ?? vehicle.lastOilChangeKm ?? 0;
  const remainingKm = limitKm - currentKm;
  const exceededKm = Math.max(0, currentKm - limitKm);
  const isKmExceeded = limitKm > 0 && currentKm >= limitKm;
  const isKmWarning = !isKmExceeded && remainingKm <= 1000;

  const dateEval = evaluatePreventiveDate(vehicle.nextPreventiveMaintenanceDate, referenceDate);

  const isExceeded = isKmExceeded || dateEval.isDateExceeded;
  const isWarning = !isExceeded && (isKmWarning || dateEval.isDateWarning);
  const alertSeverity: 'red' | 'yellow' | 'ok' = isExceeded ? 'red' : isWarning ? 'yellow' : 'ok';

  const span = Math.max(1, limitKm - baselineKm);
  const rawPercent = ((currentKm - baselineKm) / span) * 100;
  const progressPercent = isKmExceeded
    ? 100
    : Math.min(100, Math.max(0, Math.round(rawPercent)));

  return {
    vehicle,
    currentKm,
    limitKm,
    baselineKm,
    remainingKm,
    exceededKm,
    isKmExceeded,
    isKmWarning,
    nextDate: dateEval.nextDate,
    nextDateFormatted: dateEval.nextDateFormatted,
    daysRemaining: dateEval.daysRemaining,
    overdueDays: dateEval.overdueDays,
    isDateExceeded: dateEval.isDateExceeded,
    isDateWarning: dateEval.isDateWarning,
    isExceeded,
    isWarning,
    alertSeverity,
    progressPercent,
  };
}

export function getPreventiveAlertReasons(status: VehiclePreventiveStatus): string[] {
  const reasons: string[] = [];

  if (status.isKmExceeded) {
    reasons.push(
      status.exceededKm > 0
        ? `Km excedido em +${status.exceededKm.toLocaleString('pt-BR')} km`
        : `Limite de ${status.limitKm.toLocaleString('pt-BR')} km atingido`
    );
  } else if (status.isKmWarning) {
    reasons.push(`Faltam ${status.remainingKm.toLocaleString('pt-BR')} km`);
  }

  if (status.isDateExceeded && status.nextDateFormatted) {
    reasons.push(
      status.overdueDays === 0
        ? `Data vence hoje (${status.nextDateFormatted})`
        : `Data vencida há ${status.overdueDays} dia(s) (${status.nextDateFormatted})`
    );
  } else if (status.isDateWarning && status.nextDateFormatted && status.daysRemaining !== null) {
    reasons.push(`Revisão em ${status.daysRemaining} dia(s) (${status.nextDateFormatted})`);
  }

  return reasons;
}
