'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  DailyReport,
  Driver,
  MaintenanceRecord,
  PaymentRecord,
  TollRecord,
  Vehicle,
} from '@/types/truck-service';
import {
  calculateVehicleCpmAnalytics,
  CpmCostScope,
  VehicleCpmRow,
} from '@/lib/cpmAnalytics';
import { MercosulPlate } from './MercosulPlate';
import {
  Gauge,
  Fuel,
  Wallet,
  Search,
  ArrowUpDown,
  Truck,
  Calculator,
} from 'lucide-react';

interface VehicleCpmAnalyticsPanelProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  dailyReports: DailyReport[];
  payments: PaymentRecord[];
  tolls: TollRecord[];
  maintenanceRecords: MaintenanceRecord[];
  startDateFilter: string;
  endDateFilter: string;
  selectedDriverFilter: string;
  selectedVehicleFilter: string;
}

const emptySubscribe = () => () => {};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCpm(value: number | null): string {
  if (value === null) return '—';
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/km`;
}

interface ChartPoint {
  plate: string;
  model: string;
  fuelCpm: number;
  paymentsCpm: number;
  extrasCpm: number;
  cpm: number;
  totalKm: number;
  fuelCost: number;
  paymentsCost: number;
  operationalCost: number;
}

interface CustomTooltipPayloadItem {
  payload?: ChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}

function CpmBarTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-xl min-w-[240px] text-xs space-y-2">
      <div className="border-b border-slate-800 pb-2">
        <span className="font-mono font-bold text-slate-100 block">{item.plate}</span>
        <span className="text-[11px] text-slate-400">
          {item.model} · {item.totalKm.toLocaleString('pt-BR')} km rodados
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
            Abastecimento
          </span>
          <span className="font-mono tabular-nums text-slate-100">
            {formatBRL(item.fuelCost)} ({formatCpm(item.fuelCpm)})
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 shrink-0" />
            Pagamentos
          </span>
          <span className="font-mono tabular-nums text-slate-100">
            {formatBRL(item.paymentsCost)} ({formatCpm(item.paymentsCpm)})
          </span>
        </div>

        {item.extrasCpm > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
              Pedágios & Oficina
            </span>
            <span className="font-mono tabular-nums text-slate-100">
              {formatCpm(item.extrasCpm)}
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 pt-2 flex items-center justify-between gap-4">
        <span className="font-semibold text-slate-300">CPM Total</span>
        <span className="font-mono tabular-nums font-bold text-emerald-400">
          {formatCpm(item.cpm)}
        </span>
      </div>
    </div>
  );
}

export function VehicleCpmAnalyticsPanel({
  vehicles,
  drivers,
  dailyReports,
  payments,
  tolls,
  maintenanceRecords,
  startDateFilter,
  endDateFilter,
  selectedDriverFilter,
  selectedVehicleFilter,
}: VehicleCpmAnalyticsPanelProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [costScope, setCostScope] = useState<CpmCostScope>('payments_fuel');
  const [periodMode, setPeriodMode] = useState<'all' | 'filtered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cpm_desc' | 'cpm_asc' | 'cost_desc' | 'km_desc'>('cpm_desc');

  const analytics = useMemo(() => {
    return calculateVehicleCpmAnalytics({
      vehicles,
      drivers,
      dailyReports,
      payments,
      tolls,
      maintenanceRecords,
      costScope,
      startDate: periodMode === 'filtered' ? startDateFilter : undefined,
      endDate: periodMode === 'filtered' ? endDateFilter : undefined,
      selectedVehicleFilter,
      selectedDriverFilter,
    });
  }, [
    vehicles,
    drivers,
    dailyReports,
    payments,
    tolls,
    maintenanceRecords,
    costScope,
    periodMode,
    startDateFilter,
    endDateFilter,
    selectedVehicleFilter,
    selectedDriverFilter,
  ]);

  const filteredAndSortedRows = useMemo<VehicleCpmRow[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = analytics.rows.filter((row) => {
      if (!q) return true;
      return (
        row.vehicle.plate.toLowerCase().includes(q) ||
        row.vehicle.model.toLowerCase().includes(q) ||
        row.driverNames.some((name) => name.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'cpm_desc') {
        if ((a.cpm !== null) !== (b.cpm !== null)) return a.cpm !== null ? -1 : 1;
        return (b.cpm ?? 0) - (a.cpm ?? 0);
      }
      if (sortBy === 'cpm_asc') {
        if ((a.cpm !== null) !== (b.cpm !== null)) return a.cpm !== null ? -1 : 1;
        return (a.cpm ?? 0) - (b.cpm ?? 0);
      }
      if (sortBy === 'cost_desc') {
        return b.operationalCost - a.operationalCost;
      }
      return b.totalKm - a.totalKm;
    });
  }, [analytics.rows, searchQuery, sortBy]);

  const chartData = useMemo<ChartPoint[]>(() => {
    return filteredAndSortedRows
      .filter((row) => row.totalKm > 0 && row.cpm !== null)
      .map((row) => ({
        plate: row.vehicle.plate,
        model: row.vehicle.model,
        fuelCpm: row.fuelCpm ?? 0,
        paymentsCpm: row.paymentsCpm ?? 0,
        extrasCpm: costScope === 'full' ? (row.extrasCpm ?? 0) : 0,
        cpm: row.cpm ?? 0,
        totalKm: row.totalKm,
        fuelCost: row.fuelCost,
        paymentsCost: row.paymentsCost,
        operationalCost: row.operationalCost,
      }));
  }, [filteredAndSortedRows, costScope]);

  const formattedPeriodRange =
    periodMode === 'filtered'
      ? `${startDateFilter.split('-').reverse().join('/')} até ${endDateFilter.split('-').reverse().join('/')}`
      : 'Todo o histórico registrado';

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400 shrink-0" />
            <h4 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
              Análise de Custo por Quilômetro (CPM) por Veículo
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            {costScope === 'payments_fuel'
              ? 'Base: Pagamentos (motorista + ajudante) + Abastecimento ÷ Km Rodados'
              : 'Base completa: Pagamentos + Abastecimento + Pedágios + Manutenção ÷ Km Rodados'}{' '}
            · {formattedPeriodRange}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cost Scope Segmented Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setCostScope('payments_fuel')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                costScope === 'payments_fuel'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pagamentos + Abastecimento
            </button>
            <button
              type="button"
              onClick={() => setCostScope('full')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                costScope === 'full'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              + Pedágios e Oficina
            </button>
          </div>

          {/* Period Mode Segmented Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setPeriodMode('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                periodMode === 'all'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todo Histórico
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('filtered')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                periodMode === 'filtered'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Período Filtrado
            </button>
          </div>
        </div>
      </div>

      {/* Hairline-Divided Fleet CPM Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
        <div className="p-4">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>CPM Médio da Frota</span>
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {formatCpm(analytics.fleetAvgCpm)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
            {formatBRL(analytics.totalOperationalCost)} em {analytics.totalKm.toLocaleString('pt-BR')} km
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Abastecimento</span>
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-amber-400 mt-1">
            {formatBRL(analytics.totalFuelCost)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
            {analytics.totalFuelLiters.toLocaleString('pt-BR')} L abastecidos
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Wallet className="w-3.5 h-3.5 text-sky-400" />
            <span>Total Pagamentos</span>
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-sky-400 mt-1">
            {formatBRL(analytics.totalPaymentsCost)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Diárias pagas a motoristas e ajudantes
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Truck className="w-3.5 h-3.5 text-slate-300" />
            <span>Extremos de CPM</span>
          </span>
          {analytics.highestCpmVehicle ? (
            <div className="mt-1 space-y-0.5 text-xs font-mono tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <span className="text-rose-400">Maior: {analytics.highestCpmVehicle.vehicle.plate}</span>
                <strong className="text-rose-300">{formatCpm(analytics.highestCpmVehicle.cpm)}</strong>
              </div>
              {analytics.lowestCpmVehicle &&
                analytics.lowestCpmVehicle.vehicle.id !== analytics.highestCpmVehicle.vehicle.id && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-emerald-400">Menor: {analytics.lowestCpmVehicle.vehicle.plate}</span>
                    <strong className="text-emerald-300">{formatCpm(analytics.lowestCpmVehicle.cpm)}</strong>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-sm font-mono text-slate-500 mt-1">Sem km registrado</div>
          )}
        </div>
      </div>

      {/* Per-Vehicle CPM Comparison Bar Chart */}
      {!isMounted ? (
        <div className="h-[260px] w-full rounded-xl bg-slate-950/60 border border-slate-800/80 animate-pulse" />
      ) : chartData.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Composição do CPM (R$/km) por placa</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                Abastecimento/km
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                Pagamentos/km
              </span>
              {costScope === 'full' && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  Pedágios & Oficina/km
                </span>
              )}
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
                barCategoryGap="26%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="plate"
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `R$ ${Number(v).toFixed(2)}`}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={68}
                />
                <Tooltip
                  content={<CpmBarTooltip />}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                />
                {analytics.fleetAvgCpm !== null && (
                  <ReferenceLine
                    y={analytics.fleetAvgCpm}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: `Média ${formatCpm(analytics.fleetAvgCpm)}`,
                      position: 'insideTopRight',
                      fill: '#34d399',
                      fontSize: 11,
                    }}
                  />
                )}
                <Bar
                  dataKey="fuelCpm"
                  name="Abastecimento/km"
                  stackId="cpm"
                  fill="#f59e0b"
                  maxBarSize={48}
                />
                <Bar
                  dataKey="paymentsCpm"
                  name="Pagamentos/km"
                  stackId="cpm"
                  fill="#38bdf8"
                  radius={costScope === 'full' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={48}
                />
                {costScope === 'full' && (
                  <Bar
                    dataKey="extrasCpm"
                    name="Pedágios & Oficina/km"
                    stackId="cpm"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* Search & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar placa, modelo ou motorista..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="cpm_desc">Maior CPM (R$/km)</option>
            <option value="cpm_asc">Menor CPM (R$/km)</option>
            <option value="cost_desc">Maior Custo Total</option>
            <option value="km_desc">Maior Km Rodado</option>
          </select>
        </div>
      </div>

      {/* Individual Vehicles CPM Table */}
      {filteredAndSortedRows.length === 0 ? (
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-8 text-center text-xs text-slate-400 space-y-1">
          <Truck className="w-7 h-7 text-slate-600 mx-auto" />
          <p className="font-semibold text-slate-300">Nenhum veículo encontrado para este filtro</p>
          <p>Cadastre veículos ou ajuste a busca para visualizar o custo operacional por quilômetro.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/50">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950">
                <th className="py-2.5 px-3.5 font-semibold">Veículo</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Km Rodados</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Abastecimento</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Pagamentos</th>
                {costScope === 'full' && (
                  <th className="py-2.5 px-3.5 font-semibold text-right">Pedágios / Oficina</th>
                )}
                <th className="py-2.5 px-3.5 font-semibold text-right">Custo Total</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">CPM (R$/km)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredAndSortedRows.map((row) => {
                const isAboveAvg =
                  row.cpm !== null &&
                  analytics.fleetAvgCpm !== null &&
                  row.cpm > analytics.fleetAvgCpm;
                const isBelowOrEqualAvg =
                  row.cpm !== null &&
                  analytics.fleetAvgCpm !== null &&
                  row.cpm <= analytics.fleetAvgCpm;

                return (
                  <tr
                    key={row.vehicle.id}
                    className="hover:bg-slate-900/60 transition-colors"
                  >
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-3">
                        <MercosulPlate plate={row.vehicle.plate} size="sm" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-100 truncate">
                            {row.vehicle.model}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {row.driverNames.length > 0
                              ? row.driverNames.join(', ')
                              : 'Sem motorista vinculado'}
                            {' · '}
                            {row.reportsCount} relatório(s) · {row.paymentsCount} pgto(s)
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                      <div>{row.totalKm.toLocaleString('pt-BR')} km</div>
                      {row.avgKmPerLiter > 0 && (
                        <div className="text-[10px] text-slate-500">
                          {row.avgKmPerLiter.toFixed(2)} km/L
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="text-amber-300 font-medium">
                        {formatBRL(row.fuelCost)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {row.fuelLiters.toLocaleString('pt-BR')} L · {formatCpm(row.fuelCpm)}
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="text-sky-300 font-medium">
                        {formatBRL(row.paymentsCost)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatCpm(row.paymentsCpm)}
                      </div>
                    </td>

                    {costScope === 'full' && (
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="text-rose-300 font-medium">
                          {formatBRL(row.tollsCost + row.maintenanceCost)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatCpm(row.extrasCpm)}
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-3.5 text-right font-mono tabular-nums font-semibold text-slate-100 whitespace-nowrap">
                      {formatBRL(row.operationalCost)}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {row.cpm !== null ? (
                        <div>
                          <span
                            className={`text-sm font-bold ${
                              isAboveAvg
                                ? 'text-rose-400'
                                : isBelowOrEqualAvg
                                ? 'text-emerald-400'
                                : 'text-slate-100'
                            }`}
                          >
                            {formatCpm(row.cpm)}
                          </span>
                          {analytics.fleetAvgCpm !== null && (
                            <div className="text-[10px] text-slate-500">
                              {isAboveAvg
                                ? `+${formatBRL(row.cpm - analytics.fleetAvgCpm)} acima da média`
                                : `${formatBRL(analytics.fleetAvgCpm - row.cpm)} abaixo da média`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">
                          Sem km no período
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {analytics.unallocatedPaymentsCost > 0 && (
        <p className="text-[11px] text-slate-400">
          Observação: existem{' '}
          <strong className="font-mono tabular-nums text-slate-200">
            {formatBRL(analytics.unallocatedPaymentsCost)}
          </strong>{' '}
          em pagamentos de motoristas sem veículo vinculado ou relatórios diários no intervalo correspondente.
        </p>
      )}
    </section>
  );
}
