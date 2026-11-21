import { describe, expect, test } from 'bun:test';
import {
  aggregateFuelVsMaintenanceMonthly,
  buildContinuousMonthRange,
  buildMonthRange,
  formatMonthLabelsPt,
} from './costAnalytics';
import type { DailyReport, Driver, MaintenanceRecord } from '@/types/truck-service';

const SAMPLE_DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    name: 'João Motorista',
    rg: '123',
    cpf: '111.111.111-11',
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
    name: 'Pedro Motorista',
    rg: '456',
    cpf: '222.222.222-22',
    address: 'Sumaré',
    cnhCategory: 'C',
    cnhNumber: '222',
    cnhExpiry: '2028-01-01',
    vehicleId: 'veh-2',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const SAMPLE_REPORTS: DailyReport[] = [
  {
    id: 'rep-1',
    driverId: 'drv-1',
    driverName: 'João Motorista',
    vehicleId: 'veh-1',
    vehiclePlate: 'ABC1D23',
    date: '2026-10-12',
    startKm: 1000,
    endKm: 1300,
    distanceKm: 300,
    tollsCount: 2,
    hasHelper: false,
    fuelCost: 650,
    fuelLiters: 110,
    otherExpenses: [
      { id: 'e1', category: 'Manutenção', amount: 300, description: 'Borracharia' },
      { id: 'e2', category: 'Outros', amount: 80, description: 'Alimentação' },
    ],
    deliveries: [],
    totalDeliveries: 1,
    totalFreight: 2000,
    totalOtherExpenses: 380,
    status: 'approved',
    createdAt: '2026-10-12T18:00:00.000Z',
  },
  {
    id: 'rep-2',
    driverId: 'drv-2',
    driverName: 'Pedro Motorista',
    vehicleId: 'veh-2',
    vehiclePlate: 'XYZ9K88',
    date: '2026-11-05',
    startKm: 5000,
    endKm: 5400,
    distanceKm: 400,
    tollsCount: 1,
    hasHelper: true,
    fuelCost: 920.5,
    fuelLiters: 155.5,
    otherExpenses: [
      { id: 'e3', category: 'Óleo', amount: 240, description: 'Óleo motor' },
    ],
    deliveries: [],
    totalDeliveries: 2,
    totalFreight: 2500,
    totalOtherExpenses: 240,
    status: 'submitted',
    createdAt: '2026-11-05T18:00:00.000Z',
  },
];

const SAMPLE_MAINTENANCE: MaintenanceRecord[] = [
  {
    id: 'm-1',
    vehicleId: 'veh-1',
    date: '2026-11-10',
    odometer: 1800,
    type: 'Revisão Preventiva',
    cost: 1450,
    filtersReplaced: true,
    createdAt: '2026-11-10T10:00:00.000Z',
  },
  {
    id: 'm-2',
    vehicleId: 'veh-2',
    date: '2026-11-12',
    odometer: 5600,
    type: 'Troca de Óleo',
    cost: 0,
    filtersReplaced: false,
    createdAt: '2026-11-12T10:00:00.000Z',
  },
];

describe('month range and labels', () => {
  test('formats Portuguese month labels accurately', () => {
    expect(formatMonthLabelsPt('2026-11')).toEqual({
      label: 'Nov/26',
      fullLabel: 'Novembro de 2026',
    });
    expect(formatMonthLabelsPt('2026-01')).toEqual({
      label: 'Jan/26',
      fullLabel: 'Janeiro de 2026',
    });
  });

  test('builds 6-month and continuous ranges crossing year boundary', () => {
    expect(buildMonthRange('2026-02', 4)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
    expect(buildContinuousMonthRange('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });
});

describe('aggregateFuelVsMaintenanceMonthly', () => {
  test('aggregates fueling vs maintenance across reports and maintenance records', () => {
    const result = aggregateFuelVsMaintenanceMonthly({
      dailyReports: SAMPLE_REPORTS,
      maintenanceRecords: SAMPLE_MAINTENANCE,
      drivers: SAMPLE_DRIVERS,
      selectedDriverFilter: 'all',
      selectedVehicleFilter: 'all',
      rangeMode: '6m',
      fallbackMonthKey: '2026-11',
    });

    expect(result.points.length).toBe(6);
    const oct = result.points.find((p) => p.monthKey === '2026-10');
    const nov = result.points.find((p) => p.monthKey === '2026-11');

    expect(oct?.abastecimento).toBe(650);
    expect(oct?.manutencao).toBe(300); // excludes 'Outros'
    expect(oct?.fuelLiters).toBe(110);
    expect(oct?.diferenca).toBe(350);

    expect(nov?.abastecimento).toBe(920.5);
    expect(nov?.manutencao).toBe(1690); // 240 (Óleo from report) + 1450 (maintenanceRecord)
    expect(nov?.total).toBe(2610.5);
    expect(nov?.diferenca).toBe(-769.5);

    expect(result.totalAbastecimento).toBe(1570.5);
    expect(result.totalManutencao).toBe(1990);
    expect(result.totalCombined).toBe(3560.5);
    expect(result.totalLiters).toBe(265.5);
    expect(result.monthsWithData).toBe(2);
  });

  test('filters by selectedVehicleFilter cleanly', () => {
    const result = aggregateFuelVsMaintenanceMonthly({
      dailyReports: SAMPLE_REPORTS,
      maintenanceRecords: SAMPLE_MAINTENANCE,
      drivers: SAMPLE_DRIVERS,
      selectedDriverFilter: 'all',
      selectedVehicleFilter: 'veh-1',
      rangeMode: '6m',
      fallbackMonthKey: '2026-11',
    });

    expect(result.totalAbastecimento).toBe(650);
    expect(result.totalManutencao).toBe(1750); // 300 in Oct + 1450 in Nov
  });

  test('filters by selectedDriverFilter and scopes maintenance to driver vehicle', () => {
    const result = aggregateFuelVsMaintenanceMonthly({
      dailyReports: SAMPLE_REPORTS,
      maintenanceRecords: SAMPLE_MAINTENANCE,
      drivers: SAMPLE_DRIVERS,
      selectedDriverFilter: 'drv-2',
      selectedVehicleFilter: 'all',
      rangeMode: '6m',
      fallbackMonthKey: '2026-11',
    });

    expect(result.totalAbastecimento).toBe(920.5);
    expect(result.totalManutencao).toBe(240);
    expect(result.monthsWithData).toBe(1);
  });
});
