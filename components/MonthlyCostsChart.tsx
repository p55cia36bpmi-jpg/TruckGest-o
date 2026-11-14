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
} from 'recharts';
import {
  DailyReport,
  TollRecord,
  MaintenanceRecord,
  Driver,
  Vehicle,
} from '@/types/truck-service';
import {
  BarChart3,
  Wrench,
  Fuel,
  Route,
  Columns3,
  Layers,
} from 'lucide-react';

interface MonthlyCostsChartProps {
  dailyReports: DailyReport[];
  tolls: TollRecord[];
  maintenanceRecords: MaintenanceRecord[];
  drivers: Driver[];
  vehicles: Vehicle[];
  selectedDriverFilter: string;
  selectedVehicleFilter: string;
}

interface MonthlyCostPoint {
  monthKey: string; // YYYY-MM
  label: string; // e.g., Nov/26
  fullLabel: string; // e.g., Novembro de 2026
  manutencao: number;
  combustivel: number;
  pedagios: number;
  total: number;
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

const emptySubscribe = () => () => {};

function formatMonthLabels(monthKey: string): { label: string; fullLabel: string } {
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

function buildMonthRange(endMonthKey: string, count: number): string[] {
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

function buildContinuousRange(startMonthKey: string, endMonthKey: string): string[] {
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

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompactBRL(value: number): string {
  if (value === 0) return 'R$ 0';
  if (value >= 1000) {
    const k = value / 1000;
    return `R$ ${k.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return `R$ ${Math.round(value)}`;
}

interface CustomTooltipPayloadItem {
  dataKey?: string;
  name?: string;
  value?: number;
  color?: string;
  payload?: MonthlyCostPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}

function MonthlyCostTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl min-w-[230px] text-xs space-y-2.5">
      <div className="border-b border-slate-800 pb-2">
        <span className="font-bold text-slate-100 block">{point.fullLabel}</span>
        <span className="text-[11px] font-mono text-slate-400">Competência {point.monthKey}</span>
      </div>

      <div className="space-y-1.5">
        {payload.map((entry) => {
          const val = Number(entry.value || 0);
          return (
            <div key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: entry.color || '#94a3b8' }}
                />
                <span>{entry.name}</span>
              </div>
              <span className="font-mono tabular-nums font-semibold text-slate-100">
                {formatBRL(val)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-800 pt-2 flex items-center justify-between gap-4">
        <span className="font-semibold text-slate-300">Total no Mês</span>
        <span className="font-mono tabular-nums font-bold text-emerald-400">
          {formatBRL(point.total)}
        </span>
      </div>
    </div>
  );
}

export function MonthlyCostsChart({
  dailyReports,
  tolls,
  maintenanceRecords,
  drivers,
  vehicles,
  selectedDriverFilter,
  selectedVehicleFilter,
}: MonthlyCostsChartProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [rangeMode, setRangeMode] = useState<'6m' | '12m' | 'all'>('6m');
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');
  const [visibleSeries, setVisibleSeries] = useState({
    manutencao: true,
    combustivel: true,
    pedagios: true,
  });

  const toggleSeries = (key: 'manutencao' | 'combustivel' | 'pedagios') => {
    setVisibleSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Prevent hiding all three series simultaneously
      if (!next.manutencao && !next.combustivel && !next.pedagios) {
        return prev;
      }
      return next;
    });
  };

  // Resolve vehicle scope when a specific driver is filtered
  const driverScopedVehicleId = useMemo(() => {
    if (selectedDriverFilter === 'all') return null;
    const drv = drivers.find((d) => d.id === selectedDriverFilter);
    return drv?.vehicleId || null;
  }, [drivers, selectedDriverFilter]);

  const activeScopeDescription = useMemo(() => {
    const parts: string[] = [];
    if (selectedDriverFilter !== 'all') {
      const drv = drivers.find((d) => d.id === selectedDriverFilter);
      if (drv) parts.push(`Motorista: ${drv.name}`);
    }
    if (selectedVehicleFilter !== 'all') {
      const veh = vehicles.find((v) => v.id === selectedVehicleFilter);
      if (veh) parts.push(`Veículo: ${veh.plate}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Toda a frota';
  }, [drivers, vehicles, selectedDriverFilter, selectedVehicleFilter]);

  const chartData = useMemo<MonthlyCostPoint[]>(() => {
    const monthlyMap = new Map<
      string,
      { manutencao: number; combustivel: number; pedagios: number }
    >();

    const ensureBucket = (monthKey: string) => {
      let bucket = monthlyMap.get(monthKey);
      if (!bucket) {
        bucket = { manutencao: 0, combustivel: 0, pedagios: 0 };
        monthlyMap.set(monthKey, bucket);
      }
      return bucket;
    };

    // 1. Combustível + Despesas de Manutenção/Óleo vindas dos Relatórios Diários
    for (const rep of dailyReports) {
      if (!rep.date || rep.date.length < 7) continue;
      if (selectedDriverFilter !== 'all' && rep.driverId !== selectedDriverFilter) continue;
      if (selectedVehicleFilter !== 'all' && rep.vehicleId !== selectedVehicleFilter) continue;

      const monthKey = rep.date.slice(0, 7);
      const bucket = ensureBucket(monthKey);

      bucket.combustivel += Number(rep.fuelCost || 0);

      if (Array.isArray(rep.otherExpenses)) {
        for (const exp of rep.otherExpenses) {
          if (exp.category === 'Manutenção' || exp.category === 'Óleo') {
            bucket.manutencao += Number(exp.amount || 0);
          }
        }
      }
    }

    // 2. Registros diretos da coleção de Manutenção (Trocas de óleo e revisões preventivas com custo)
    for (const maint of maintenanceRecords) {
      if (!maint.date || maint.date.length < 7) continue;
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

    // 3. Pedágios por rota/veículo
    for (const toll of tolls) {
      if (!toll.date || toll.date.length < 7) continue;
      if (selectedVehicleFilter !== 'all' && toll.vehicleId !== selectedVehicleFilter) continue;
      if (
        selectedDriverFilter !== 'all' &&
        driverScopedVehicleId &&
        toll.vehicleId &&
        toll.vehicleId !== driverScopedVehicleId
      ) {
        continue;
      }

      const monthKey = toll.date.slice(0, 7);
      const bucket = ensureBucket(monthKey);
      bucket.pedagios += Number(toll.cost || 0);
    }

    const sortedRecordedMonths = Array.from(monthlyMap.keys()).sort();
    const fallbackCurrentMonth = new Date().toISOString().slice(0, 7);
    const latestMonth =
      sortedRecordedMonths.length > 0
        ? sortedRecordedMonths[sortedRecordedMonths.length - 1]
        : fallbackCurrentMonth;

    let timelineMonths: string[];
    if (rangeMode === '6m') {
      timelineMonths = buildMonthRange(latestMonth, 6);
    } else if (rangeMode === '12m') {
      timelineMonths = buildMonthRange(latestMonth, 12);
    } else {
      if (sortedRecordedMonths.length <= 1) {
        timelineMonths = buildMonthRange(latestMonth, 6);
      } else {
        timelineMonths = buildContinuousRange(sortedRecordedMonths[0], latestMonth);
      }
    }

    return timelineMonths.map((monthKey) => {
      const bucket = monthlyMap.get(monthKey) || {
        manutencao: 0,
        combustivel: 0,
        pedagios: 0,
      };
      const manutencao = Number(bucket.manutencao.toFixed(2));
      const combustivel = Number(bucket.combustivel.toFixed(2));
      const pedagios = Number(bucket.pedagios.toFixed(2));
      const { label, fullLabel } = formatMonthLabels(monthKey);

      return {
        monthKey,
        label,
        fullLabel,
        manutencao,
        combustivel,
        pedagios,
        total: Number((manutencao + combustivel + pedagios).toFixed(2)),
      };
    });
  }, [
    dailyReports,
    tolls,
    maintenanceRecords,
    selectedDriverFilter,
    selectedVehicleFilter,
    driverScopedVehicleId,
    rangeMode,
  ]);

  const totals = useMemo(() => {
    const manutencao = chartData.reduce((acc, item) => acc + item.manutencao, 0);
    const combustivel = chartData.reduce((acc, item) => acc + item.combustivel, 0);
    const pedagios = chartData.reduce((acc, item) => acc + item.pedagios, 0);
    const grandTotal = manutencao + combustivel + pedagios;
    const monthsWithData = chartData.filter((item) => item.total > 0).length;

    return {
      manutencao,
      combustivel,
      pedagios,
      grandTotal,
      monthsWithData,
    };
  }, [chartData]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400 shrink-0" />
            <h4 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
              Comparativo Mensal de Custos Operacionais
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Evolução mês a mês de manutenção, combustível e pedágios · {activeScopeDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Mode Toggle: Agrupado vs Empilhado */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                chartMode === 'grouped'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Lado a Lado</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                chartMode === 'stacked'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Empilhado</span>
            </button>
          </div>

          {/* Timeframe Segmented Control */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            {[
              { id: '6m' as const, label: '6 Meses' },
              { id: '12m' as const, label: '12 Meses' },
              { id: 'all' as const, label: 'Todo Histórico' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRangeMode(option.id)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                  rangeMode === option.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Category Totals & Series Filter Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => toggleSeries('manutencao')}
          className={`text-left p-3.5 rounded-xl border transition-colors ${
            visibleSeries.manutencao
              ? 'bg-slate-950 border-rose-500/40 hover:border-rose-500/70'
              : 'bg-slate-950/40 border-slate-800/70 opacity-50 hover:opacity-80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Wrench className="w-3.5 h-3.5 text-rose-400" />
              Manutenção & Óleo
            </span>
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-rose-400 mt-1">
            {formatBRL(totals.manutencao)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
            {totals.grandTotal > 0
              ? `${((totals.manutencao / totals.grandTotal) * 100).toFixed(1)}% dos 3 custos`
              : 'Clique para alternar'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleSeries('combustivel')}
          className={`text-left p-3.5 rounded-xl border transition-colors ${
            visibleSeries.combustivel
              ? 'bg-slate-950 border-amber-500/40 hover:border-amber-500/70'
              : 'bg-slate-950/40 border-slate-800/70 opacity-50 hover:opacity-80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              Combustível
            </span>
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-amber-400 mt-1">
            {formatBRL(totals.combustivel)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
            {totals.grandTotal > 0
              ? `${((totals.combustivel / totals.grandTotal) * 100).toFixed(1)}% dos 3 custos`
              : 'Clique para alternar'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleSeries('pedagios')}
          className={`text-left p-3.5 rounded-xl border transition-colors ${
            visibleSeries.pedagios
              ? 'bg-slate-950 border-sky-500/40 hover:border-sky-500/70'
              : 'bg-slate-950/40 border-slate-800/70 opacity-50 hover:opacity-80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Route className="w-3.5 h-3.5 text-sky-400" />
              Pedágios
            </span>
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 shrink-0" />
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-sky-400 mt-1">
            {formatBRL(totals.pedagios)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
            {totals.grandTotal > 0
              ? `${((totals.pedagios / totals.grandTotal) * 100).toFixed(1)}% dos 3 custos`
              : 'Clique para alternar'}
          </div>
        </button>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Total no Período Exibido</span>
            <span className="text-[11px] font-mono text-slate-500">
              {totals.monthsWithData} {totals.monthsWithData === 1 ? 'mês ativo' : 'meses ativos'}
            </span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-slate-100 mt-1">
            {formatBRL(totals.grandTotal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
            Soma de manutenção, diesel e pedágios
          </div>
        </div>
      </div>

      {/* Bar Chart Viewport */}
      {!isMounted ? (
        <div className="h-[320px] w-full rounded-xl bg-slate-950/60 border border-slate-800/80 animate-pulse" />
      ) : totals.grandTotal === 0 ? (
        <div className="h-[260px] w-full rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <BarChart3 className="w-8 h-8 text-slate-600" />
          <h5 className="text-sm font-semibold text-slate-200">
            Nenhum custo operacional registrado para o filtro atual
          </h5>
          <p className="text-xs text-slate-400 max-w-md">
            Os custos mensais de manutenção, combustível e pedágios aparecerão automaticamente aqui conforme relatórios diários, pedágios e manutenções forem lançados.
          </p>
        </div>
      ) : (
        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
              barGap={6}
              barCategoryGap="22%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#1e293b"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCompactBRL}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                content={<MonthlyCostTooltip />}
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              />
              {visibleSeries.manutencao && (
                <Bar
                  dataKey="manutencao"
                  name="Manutenção & Óleo"
                  fill="#f43f5e"
                  stackId={chartMode === 'stacked' ? 'costs' : undefined}
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={36}
                />
              )}
              {visibleSeries.combustivel && (
                <Bar
                  dataKey="combustivel"
                  name="Combustível"
                  fill="#f59e0b"
                  stackId={chartMode === 'stacked' ? 'costs' : undefined}
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={36}
                />
              )}
              {visibleSeries.pedagios && (
                <Bar
                  dataKey="pedagios"
                  name="Pedágios"
                  fill="#38bdf8"
                  stackId={chartMode === 'stacked' ? 'costs' : undefined}
                  radius={chartMode === 'stacked' ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={36}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
