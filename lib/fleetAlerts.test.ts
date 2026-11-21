import { describe, expect, test } from 'bun:test';
import {
  addDaysToIsoDate,
  checkDriverCnhStatus,
  checkVehiclePreventiveStatus,
  evaluatePreventiveDate,
  getPreventiveAlertReasons,
} from './fleetAlerts';
import type { Driver, Vehicle } from '@/types/truck-service';

const REF_DATE = new Date(2026, 10, 15, 12, 0, 0); // 2026-11-15

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'veh-1',
    plate: 'ABC1D23',
    model: 'Volvo FH 540',
    currentKm: 100000,
    lastOilChangeDate: '2026-08-01',
    lastOilChangeKm: 90000,
    nextOilChangeKm: 110000,
    lastPreventiveMaintenanceDate: '2026-06-01',
    lastPreventiveMaintenanceKm: 90000,
    nextPreventiveMaintenanceKm: 120000,
    nextPreventiveMaintenanceDate: '2027-02-01',
    preventiveIntervalKm: 30000,
    preventiveIntervalDays: 180,
    filtersReplaced: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: 'drv-1',
    name: 'Carlos Silva',
    rg: '123456789',
    cpf: '111.222.333-44',
    address: 'Campinas, SP',
    cnhCategory: 'B',
    cnhNumber: '12345678900',
    cnhExpiry: '2027-06-01',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('addDaysToIsoDate', () => {
  test('adds days cleanly across month boundaries', () => {
    expect(addDaysToIsoDate(20, new Date(2026, 10, 15))).toBe('2026-12-05');
  });

  test('adds days cleanly across year boundaries', () => {
    expect(addDaysToIsoDate(180, new Date(2026, 10, 15))).toBe('2027-05-14');
  });
});

describe('evaluatePreventiveDate', () => {
  test('returns none for missing or malformed dates', () => {
    expect(evaluatePreventiveDate(undefined, REF_DATE).severity).toBe('none');
    expect(evaluatePreventiveDate('', REF_DATE).severity).toBe('none');
    expect(evaluatePreventiveDate('15/11/2026', REF_DATE).severity).toBe('none');
    expect(evaluatePreventiveDate('2026-02-30', REF_DATE).severity).toBe('none');
  });

  test('returns red for overdue and today dates', () => {
    const overdue = evaluatePreventiveDate('2026-11-10', REF_DATE);
    expect(overdue.severity).toBe('red');
    expect(overdue.isDateExceeded).toBe(true);
    expect(overdue.overdueDays).toBe(5);
    expect(overdue.nextDateFormatted).toBe('10/11/2026');

    const today = evaluatePreventiveDate('2026-11-15', REF_DATE);
    expect(today.severity).toBe('red');
    expect(today.isDateExceeded).toBe(true);
    expect(today.overdueDays).toBe(0);
    expect(today.daysRemaining).toBe(0);
  });

  test('returns yellow between 1 and 15 days remaining and ok at 16+ days', () => {
    const oneDay = evaluatePreventiveDate('2026-11-16', REF_DATE);
    expect(oneDay.severity).toBe('yellow');
    expect(oneDay.isDateWarning).toBe(true);
    expect(oneDay.daysRemaining).toBe(1);

    const fifteenDays = evaluatePreventiveDate('2026-11-30', REF_DATE);
    expect(fifteenDays.severity).toBe('yellow');
    expect(fifteenDays.isDateWarning).toBe(true);
    expect(fifteenDays.daysRemaining).toBe(15);

    const sixteenDays = evaluatePreventiveDate('2026-12-01', REF_DATE);
    expect(sixteenDays.severity).toBe('ok');
    expect(sixteenDays.isDateWarning).toBe(false);
    expect(sixteenDays.daysRemaining).toBe(16);
  });
});

describe('checkVehiclePreventiveStatus', () => {
  test('returns ok when both mileage and date are outside alert thresholds', () => {
    const status = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 118999,
        nextPreventiveMaintenanceKm: 120000,
        nextPreventiveMaintenanceDate: '2026-12-01', // 16 days ahead
      }),
      REF_DATE
    );

    expect(status.alertSeverity).toBe('ok');
    expect(status.isExceeded).toBe(false);
    expect(status.isWarning).toBe(false);
    expect(status.remainingKm).toBe(1001);
    expect(status.daysRemaining).toBe(16);
    expect(getPreventiveAlertReasons(status)).toEqual([]);
  });

  test('triggers yellow alert when mileage remaining is <= 1000 km', () => {
    const atBoundary = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 119000,
        nextPreventiveMaintenanceKm: 120000,
        nextPreventiveMaintenanceDate: '2027-01-15',
      }),
      REF_DATE
    );
    expect(atBoundary.alertSeverity).toBe('yellow');
    expect(atBoundary.isKmWarning).toBe(true);
    expect(atBoundary.isKmExceeded).toBe(false);
    expect(atBoundary.remainingKm).toBe(1000);

    const oneKmLeft = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 119999,
        nextPreventiveMaintenanceKm: 120000,
        nextPreventiveMaintenanceDate: '2027-01-15',
      }),
      REF_DATE
    );
    expect(oneKmLeft.alertSeverity).toBe('yellow');
    expect(oneKmLeft.remainingKm).toBe(1);
  });

  test('triggers yellow alert when date is within 1..15 days even if km is far from limit', () => {
    const status = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 105000,
        nextPreventiveMaintenanceKm: 130000,
        nextPreventiveMaintenanceDate: '2026-11-25', // 10 days
      }),
      REF_DATE
    );

    expect(status.alertSeverity).toBe('yellow');
    expect(status.isDateWarning).toBe(true);
    expect(status.isKmWarning).toBe(false);
    expect(status.daysRemaining).toBe(10);
    expect(getPreventiveAlertReasons(status)).toContain('Revisão em 10 dia(s) (25/11/2026)');
  });

  test('triggers red alert when mileage reaches or exceeds limit', () => {
    const atLimit = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 120000,
        nextPreventiveMaintenanceKm: 120000,
        nextPreventiveMaintenanceDate: '2027-01-15',
      }),
      REF_DATE
    );
    expect(atLimit.alertSeverity).toBe('red');
    expect(atLimit.isKmExceeded).toBe(true);
    expect(atLimit.exceededKm).toBe(0);
    expect(atLimit.progressPercent).toBe(100);

    const overLimit = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 121450,
        nextPreventiveMaintenanceKm: 120000,
        nextPreventiveMaintenanceDate: '2027-01-15',
      }),
      REF_DATE
    );
    expect(overLimit.alertSeverity).toBe('red');
    expect(overLimit.isKmExceeded).toBe(true);
    expect(overLimit.exceededKm).toBe(1450);
    expect(overLimit.progressPercent).toBe(100);
  });

  test('triggers red alert when date is overdue or due today, overriding yellow km status', () => {
    const status = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 119500, // yellow km (500 left)
        nextPreventiveMaintenanceKm: 120000,
        nextPreventiveMaintenanceDate: '2026-11-12', // 3 days overdue -> red
      }),
      REF_DATE
    );

    expect(status.alertSeverity).toBe('red');
    expect(status.isExceeded).toBe(true);
    expect(status.isWarning).toBe(false);
    expect(status.isDateExceeded).toBe(true);
    expect(status.isKmWarning).toBe(true);
    expect(status.overdueDays).toBe(3);

    const reasons = getPreventiveAlertReasons(status);
    expect(reasons.length).toBe(2);
    expect(reasons[1]).toBe('Data vencida há 3 dia(s) (12/11/2026)');
  });

  test('falls back to nextOilChangeKm and lastOilChangeKm when preventive fields are absent', () => {
    const status = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 109400,
        lastPreventiveMaintenanceKm: undefined,
        nextPreventiveMaintenanceKm: undefined,
        nextPreventiveMaintenanceDate: undefined,
        lastOilChangeKm: 100000,
        nextOilChangeKm: 110000,
      }),
      REF_DATE
    );

    expect(status.limitKm).toBe(110000);
    expect(status.baselineKm).toBe(100000);
    expect(status.remainingKm).toBe(600);
    expect(status.alertSeverity).toBe('yellow');
    expect(status.progressPercent).toBe(94);
  });

  test('does not trigger km exceeded when limitKm is 0 and currentKm is 0', () => {
    const status = checkVehiclePreventiveStatus(
      makeVehicle({
        currentKm: 0,
        lastPreventiveMaintenanceKm: 0,
        nextPreventiveMaintenanceKm: 0,
        nextOilChangeKm: 0,
        nextPreventiveMaintenanceDate: undefined,
      }),
      REF_DATE
    );

    expect(status.isKmExceeded).toBe(false);
    expect(status.isKmWarning).toBe(true); // remainingKm === 0 <= 1000
    expect(status.alertSeverity).toBe('yellow');
  });
});

describe('checkDriverCnhStatus', () => {
  test('flags expired and critical CNH within 30 days', () => {
    const expired = checkDriverCnhStatus(makeDriver({ cnhExpiry: '2026-11-10' }), REF_DATE);
    expect(expired.isExpired).toBe(true);
    expect(expired.isCritical).toBe(true);
    expect(expired.daysRemaining).toBe(-5);

    const day30 = checkDriverCnhStatus(makeDriver({ cnhExpiry: '2026-12-15' }), REF_DATE);
    expect(day30.isExpired).toBe(false);
    expect(day30.isCritical).toBe(true);
    expect(day30.daysRemaining).toBe(30);

    const day31 = checkDriverCnhStatus(makeDriver({ cnhExpiry: '2026-12-16' }), REF_DATE);
    expect(day31.isExpired).toBe(false);
    expect(day31.isCritical).toBe(false);
    expect(day31.daysRemaining).toBe(31);
  });

  test('handles missing cnhExpiry gracefully', () => {
    const missing = checkDriverCnhStatus(makeDriver({ cnhExpiry: '' }), REF_DATE);
    expect(missing.isExpired).toBe(false);
    expect(missing.isCritical).toBe(false);
    expect(missing.expiryFormatted).toBe('Não informada');
  });
});
