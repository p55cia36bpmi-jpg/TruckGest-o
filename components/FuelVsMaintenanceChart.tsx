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
  MaintenanceRecord,
  Driver,
  Vehicle,
} from '@/types/truck-service';
import {
  aggregateFuelVsMaintenanceMonthly,
  FuelVsMaintenancePoint,
} from '@/lib/costAnalytics';
import {
  Fuel,
  Wrench,
  Columns3,
  Layers,
  Scale,
} from 'lucide-react';

interface FuelVsMaintenanceChartProps {
  dailyReports: DailyReport[];
  maintenanceRecords: MaintenanceRecord[];
  drivers: Driver[];
  vehicles: Vehicle[];
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

function formatCompactBRL(value: number): string {
  if (value === 0) return 'R$ 0';
  if (Math.abs(value) >= 1000) {
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
  payload?: FuelVsMaintenancePoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}

function ComparisonTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const diffAbs = Math.abs(point.diferenca);
  const diffLabel =
    point.diferenca > 0
      ? 'Abastecimento maior'
      : point.diferenca < 0
      ? 'Manutenção maior'
      : 'Equilíbrio';

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-xl min-w-[240px] text-xs space-y-2.5">
      <div className="border-b border-slate-800 pb-2">
        <span className="font-semibold text-slate-100 block">{point.fullLabel}</span>
        <span className="text-[11px] font-mono tabular-nums text-slate-400">
          Competência {point.monthKey}
          {point.fuelLiters > 0 ? ` · ${point.fuelLiters.toLocaleString('pt-BR')} L abastecidos` : ''}
        </span>
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

      <div className="border-t border-slate-800 pt-2 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Soma do mês</span>
          <span className="font-mono tabular-nums font-bold text-slate-100">
            {formatBRL(point.total)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <span className="text-slate-400">{diffLabel}</span>
          <span
            className={`font-mono tabular-nums font-semibold ${
              point.diferenca > 0
                ? 'text-amber-400'
                : point.diferenca < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {point.diferenca === 0 ? 'R$ 0,00' : formatBRL(diffAbs)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function FuelVsMaintenanceChart({
  dailyReports,
  maintenanceRecords,
  drivers,
  vehicles,
  selectedDriverFilter,
  selectedVehicleFilter,
}: FuelVsMaintenanceChartProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [rangeMode, setRangeMode] = useState<'6m' | '12m' | 'all'>('6m');
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');
  const [visibleSeries, setVisibleSeries] = useState({
    abastecimento: true,
    manutencao: true,
  });

  const toggleSeries = (key: 'abastecimento' | 'manutencao') => {
    setVisibleSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.abastecimento && !next.manutencao) return prev;
      return next;
    });
  };

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

  const aggregate = useMemo(
    () =>
      aggregateFuelVsMaintenanceMonthly({
        dailyReports,
        maintenanceRecords,
        drivers,
        selectedDriverFilter,
        selectedVehicleFilter,
        rangeMode,
      }),
    [
      dailyReports,
      maintenanceRecords,
      drivers,
      selectedDriverFilter,
      selectedVehicleFilter,
      rangeMode,
    ]
  );

  const fuelShare =
    aggregate.totalCombined > 0
      ? ((aggregate.totalAbastecimento / aggregate.totalCombined) * 100).toFixed(1)
      : '0.0';
  const maintShare =
    aggregate.totalCombined > 0
      ? ((aggregate.totalManutencao / aggregate.totalCombined) * 100).toFixed(1)
      : '0.0';

  const netSpread = aggregate.totalAbastecimento - aggregate.totalManutencao;

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400 shrink-0" />
            <h4 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
              Abastecimento vs. Manutenção (Mensal)
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Comparativo direto entre gastos com diesel e manutenção preventiva/corretiva · {activeScopeDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bar Layout Segmented Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                chartMode === 'grouped'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Lado a Lado</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                chartMode === 'stacked'
                  ? 'bg-slate-800 text-slate-100'
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
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  rangeMode === option.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hairline-Divided Comparison Summary Strip (Interactive Series Toggles) */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSeries('abastecimento')}
          aria-pressed={visibleSeries.abastecimento}
          className={`text-left p-4 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400 ${
            visibleSeries.abastecimento ? 'opacity-100 hover:bg-slate-900/50' : 'opacity-45 hover:opacity-75'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>Abastecimento (Diesel)</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-amber-400 mt-1">
            {formatBRL(aggregate.totalAbastecimento)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
            {fuelShare}% do comparativo · {aggregate.totalLiters.toLocaleString('pt-BR')} L
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleSeries('manutencao')}
          aria-pressed={visibleSeries.manutencao}
          className={`text-left p-4 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400 ${
            visibleSeries.manutencao ? 'opacity-100 hover:bg-slate-900/50' : 'opacity-45 hover:opacity-75'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Wrench className="w-3.5 h-3.5 text-rose-400" />
              <span>Manutenção & Óleo</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-rose-400 mt-1">
            {formatBRL(aggregate.totalManutencao)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
            {maintShare}% do comparativo · revisões e peças
          </div>
        </button>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Diferença no Período</span>
            <span className="font-mono tabular-nums text-[11px] text-slate-500">
              {aggregate.monthsWithData} {aggregate.monthsWithData === 1 ? 'mês ativo' : 'meses ativos'}
            </span>
          </div>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-1 ${
              netSpread > 0
                ? 'text-amber-300'
                : netSpread < 0
                ? 'text-rose-300'
                : 'text-slate-100'
            }`}
          >
            {netSpread === 0 ? 'R$ 0,00' : formatBRL(Math.abs(netSpread))}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {netSpread > 0
              ? 'Abastecimento superou manutenção'
              : netSpread < 0
              ? 'Manutenção superou abastecimento'
              : 'Gastos equivalentes no período'}
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Viewport */}
      {!isMounted ? (
        <div className="h-[310px] w-full rounded-xl bg-slate-950/60 border border-slate-800/80 animate-pulse" />
      ) : aggregate.totalCombined === 0 ? (
        <div className="h-[250px] w-full rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <Scale className="w-8 h-8 text-slate-600" />
          <h5 className="text-sm font-semibold text-slate-200">
            Sem lançamentos de abastecimento ou manutenção neste filtro
          </h5>
          <p className="text-xs text-slate-400 max-w-md">
            O comparativo mês a mês aparecerá automaticamente assim que os motoristas enviarem relatórios de combustível ou manutenções preventivas/óleo forem registradas.
          </p>
        </div>
      ) : (
        <div className="h-[310px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={aggregate.points}
              margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
              barGap={8}
              barCategoryGap="24%"
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
                width={72}
              />
              <Tooltip
                content={<ComparisonTooltip />}
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              />
              {visibleSeries.abastecimento && (
                <Bar
                  dataKey="abastecimento"
                  name="Abastecimento"
                  fill="#f59e0b"
                  stackId={chartMode === 'stacked' ? 'comparison' : undefined}
                  radius={
                    chartMode === 'stacked' && visibleSeries.manutencao
                      ? [0, 0, 0, 0]
                      : [6, 6, 0, 0]
                  }
                  maxBarSize={42}
                />
              )}
              {visibleSeries.manutencao && (
                <Bar
                  dataKey="manutencao"
                  name="Manutenção & Óleo"
                  fill="#f43f5e"
                  stackId={chartMode === 'stacked' ? 'comparison' : undefined}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
