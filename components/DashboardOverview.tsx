'use client';

import React from 'react';
import { Vehicle, Driver, FuelEntry, MaintenanceOrder, SystemAlert } from '@/types/fleet';
import { LiveTelemetryMap } from './LiveTelemetryMap';
import { 
  Truck, 
  Fuel, 
  Wrench, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  PlusCircle, 
  Calculator, 
  ClipboardCheck, 
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

interface DashboardOverviewProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  fuelEntries: FuelEntry[];
  maintenanceOrders: MaintenanceOrder[];
  alerts: SystemAlert[];
  onOpenFuelModal: () => void;
  onOpenVehicleModal: () => void;
  onOpenMaintenanceModal: () => void;
  onOpenChecklistModal: () => void;
  onNavigateTab: (tabId: string) => void;
  onDismissAlert: (id: string) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export function DashboardOverview({
  vehicles,
  drivers,
  fuelEntries,
  maintenanceOrders,
  alerts,
  onOpenFuelModal,
  onOpenVehicleModal,
  onOpenMaintenanceModal,
  onOpenChecklistModal,
  onNavigateTab,
  onDismissAlert,
  onSelectVehicle,
}: DashboardOverviewProps) {
  // Operational Metrics
  const activeVehiclesCount = vehicles.filter((v) => v.status === 'Em Viagem' || v.status === 'Em Carga/Descarga').length;
  const inMaintenanceCount = vehicles.filter((v) => v.status === 'Em Manutenção').length;
  const availableCount = vehicles.filter((v) => v.status === 'Disponível').length;
  const totalFleet = vehicles.length;
  const availabilityRate = totalFleet > 0 ? Math.round(((totalFleet - inMaintenanceCount) / totalFleet) * 100) : 100;

  // Total Mileage sum
  const totalKilometers = vehicles.reduce((acc, v) => acc + v.currentKm, 0);

  // Average Fuel Consumption (km/L)
  const validFuelWithKmL = fuelEntries.filter((f) => f.calculatedKmL > 0);
  const avgKmL = validFuelWithKmL.length > 0
    ? (validFuelWithKmL.reduce((acc, f) => acc + f.calculatedKmL, 0) / validFuelWithKmL.length).toFixed(2)
    : '2.45';

  // Cost calculations
  const totalFuelCost = fuelEntries.reduce((acc, f) => acc + f.totalCost, 0);
  const totalMaintenanceCost = maintenanceOrders.reduce((acc, m) => acc + m.totalCost, 0);
  const totalEstimatedCosts = totalFuelCost + totalMaintenanceCost;

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="space-y-6">
      {/* Quick Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-semibold text-slate-300">
            Monitoramento Operacional Ativo
          </span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            {activeVehiclesCount} veículos em rota pelo Brasil
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenFuelModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Lançar Abastecimento</span>
          </button>

          <button
            onClick={onOpenMaintenanceModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-lg transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Nova OS / Oficina</span>
          </button>

          <button
            onClick={onOpenChecklistModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-lg transition-colors"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Checklist Pré-Viagem</span>
          </button>

          <button
            onClick={() => onNavigateTab('calculator')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calcular Frete</span>
          </button>
        </div>
      </div>

      {/* Top 4 Real-World KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Frota Operacional */}
        <div 
          onClick={() => onNavigateTab('fleet')}
          className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Frota Operacional</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {activeVehiclesCount}/{totalFleet}
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> {availabilityRate}% Disp.
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{inMaintenanceCount} em manutenção</span>
            <span>{availableCount} pátio livre</span>
          </div>
        </div>

        {/* KPI 2: Consumo Médio (km/L) */}
        <div 
          onClick={() => onNavigateTab('fuel')}
          className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Consumo Médio (Diesel)</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500/20 transition-colors">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {avgKmL}
            </span>
            <span className="text-xs text-slate-400">km por litro</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Meta operacional: <strong className="text-slate-300 font-mono">2.50 km/L</strong>
          </div>
        </div>

        {/* KPI 3: Despesas Totais Lançadas */}
        <div 
          onClick={() => onNavigateTab('reports')}
          className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Custos Lançados</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              R$ {totalEstimatedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Diesel: R$ {totalFuelCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span>OS: R$ {totalMaintenanceCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* KPI 4: Alertas e Pendências */}
        <div 
          onClick={() => onNavigateTab('maintenance')}
          className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Alertas & Documentos</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg group-hover:bg-rose-500/20 transition-colors">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-rose-400">
              {unresolvedAlerts.length}
            </span>
            <span className="text-xs text-slate-400">pendências ativas</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Revisões por KM e CNH / Toxicológico
          </div>
        </div>
      </div>

      {/* Real-time Telemetry & Map Section */}
      <LiveTelemetryMap 
        vehicles={vehicles} 
        drivers={drivers} 
        onSelectVehicle={onSelectVehicle} 
      />

      {/* Lower Dashboard Grid: Operational Alerts + Fleet Health & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Alertas Operacionais Prioritários */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-slate-100">
                Avisos e Vencimentos Regulatórios
              </h4>
            </div>
            <span className="text-xs text-slate-400">
              {unresolvedAlerts.length} pendências prioritárias
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {unresolvedAlerts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <span>Nenhuma pendência crítica ou alerta no momento. Frota 100% em dia!</span>
              </div>
            ) : (
              unresolvedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 text-xs transition-colors ${
                    alert.type === 'critical'
                      ? 'bg-rose-950/20 border-rose-900/40 text-slate-200'
                      : alert.type === 'warning'
                      ? 'bg-amber-950/20 border-amber-900/40 text-slate-200'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        alert.type === 'critical' ? 'bg-rose-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <strong className="font-semibold text-slate-100">{alert.title}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">· {alert.date}</span>
                    </div>
                    <p className="text-slate-300 pl-4">{alert.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {alert.targetTab && (
                      <button
                        onClick={() => onNavigateTab(alert.targetTab!)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-[11px] font-medium transition-colors"
                      >
                        Verificar
                      </button>
                    )}
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Marcar como resolvido"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Distribuição de Custos Operacionais & Eco-Drive */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-slate-100">
                  Composição de Custos da Frota
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">Novembro 2026</span>
            </div>

            <div className="mt-4 space-y-3">
              {/* Diesel */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Diesel S10 / Combustível</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    68% · R$ {totalFuelCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '68%' }} />
                </div>
              </div>

              {/* Manutenção & Peças */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Manutenção Preventiva & Pneus</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    22% · R$ {totalMaintenanceCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '22%' }} />
                </div>
              </div>

              {/* Pedágios & Diárias */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Pedágios & Diárias de Motoristas</span>
                  <span className="font-mono tabular-nums text-slate-200">10% · R$ 9.800</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>

            {/* Eco-Driving Highlights */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-slate-200">Média Eco-Drive dos Motoristas</span>
                <span className="text-emerald-400 font-bold font-mono">90.4 / 100</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Excelente índice de condução econômica: redução de 7.2% no desgaste de pastilhas de freio e economia estimada de 820L de diesel no mês.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Relatório Contábil Consolidado</span>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Ver DRE Completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
