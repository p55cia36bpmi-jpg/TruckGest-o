'use client';

import React, { useState } from 'react';
import { Vehicle, Driver, FuelEntry, MaintenanceOrder } from '@/types/fleet';
import { MercosulPlate } from './MercosulPlate';
import { FleetStorage } from '@/lib/storage';
import { 
  FileText, 
  Download, 
  Printer, 
  RotateCcw, 
  FileSpreadsheet, 
  Database, 
  TrendingUp, 
  DollarSign, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

interface ReportsModuleProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  fuelEntries: FuelEntry[];
  maintenanceOrders: MaintenanceOrder[];
  onResetDatabase: () => void;
}

export function ReportsModule({
  vehicles,
  drivers,
  fuelEntries,
  maintenanceOrders,
  onResetDatabase,
}: ReportsModuleProps) {
  const [resetConfirmed, setResetConfirmed] = useState(false);

  // Financial aggregates
  const totalDieselSpent = fuelEntries.reduce((acc, f) => acc + f.totalCost, 0);
  const totalMaintenanceSpent = maintenanceOrders.reduce((acc, m) => acc + m.totalCost, 0);
  const totalOperatingCosts = totalDieselSpent + totalMaintenanceSpent;

  // Estimated gross revenue from operations (simulated based on average freight factor of R$ 5,80/km)
  const totalKmRun = vehicles.reduce((acc, v) => acc + v.currentKm, 0);
  const estimatedRevenue = totalOperatingCosts * 1.35; // 35% mark-up over direct logged expenses
  const estimatedGrossProfit = estimatedRevenue - totalOperatingCosts;

  const handlePrint = () => {
    window.print();
  };

  const handleExportDatabase = () => {
    const jsonStr = FleetStorage.exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_truckgestao_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFullCSV = () => {
    const headers = ['Placa', 'Marca', 'Modelo', 'Ano', 'Categoria', 'Odometro_KM', 'Status', 'Cidade_Atual', 'Consumo_Medio_KmL', 'Gasto_Diesel_R$', 'Gasto_Manutencao_R$'];
    const rows = vehicles.map((v) => {
      const truckDiesel = fuelEntries.filter((f) => f.vehicleId === v.id).reduce((sum, f) => sum + f.totalCost, 0);
      const truckMaint = maintenanceOrders.filter((m) => m.vehicleId === v.id).reduce((sum, m) => sum + m.totalCost, 0);
      return [
        v.plate,
        v.brand,
        v.model,
        v.year,
        v.category,
        v.currentKm,
        v.status,
        v.currentCity,
        v.averageKmL,
        truckDiesel,
        truckMaint,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_geral_frota_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Tools */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Relatórios Executivos & DRE Operacional da Frota
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrativo de despesas, rentabilidade por veículo e exportação de dados contábeis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            title="Imprimir relatório em PDF"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            onClick={handleExportFullCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            title="Exportar planilha completa em CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleExportDatabase}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            title="Download do banco de dados em JSON"
          >
            <Database className="w-4 h-4 text-blue-400" />
            <span>Backup JSON</span>
          </button>
        </div>
      </div>

      {/* DRE Operacional Consolidado */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-800 flex items-center justify-between">
          <span>Demonstrativo do Resultado Operacional (DRE)</span>
          <span className="font-mono text-slate-500 font-normal">Período: Mês Corrente (Nov/2026)</span>
        </h4>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
            <span className="font-medium text-slate-200">1. Receita Bruta Estimada de Fretes</span>
            <span className="font-mono font-bold text-slate-100">
              R$ {estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pl-4 space-y-2 text-xs border-b border-slate-800/80 pb-3">
            <div className="flex items-center justify-between text-slate-400">
              <span>(-) Despesas com Combustível (Diesel S10 / Arla 32)</span>
              <span className="font-mono text-amber-400">
                - R$ {totalDieselSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>(-) Manutenções Preventivas, Corretivas e Pneus</span>
              <span className="font-mono text-blue-400">
                - R$ {totalMaintenanceSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>(-) Diárias, Pedágios e Encargos Operacionais</span>
              <span className="font-mono text-slate-400">
                - R$ {(totalOperatingCosts * 0.12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 text-base font-bold bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Margem de Contribuição Operacional Líquida
            </span>
            <span className="font-mono text-emerald-400">
              + R$ {estimatedGrossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Vehicle Cost Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Custos e Desempenho Individual por Veículo
          </h4>
          <span className="text-xs text-slate-500 font-mono">{vehicles.length} veículos rastreados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Placa / Modelo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Odômetro</th>
                <th className="py-3 px-4 text-right">Consumo Médio</th>
                <th className="py-3 px-4 text-right">Gasto Diesel</th>
                <th className="py-3 px-4 text-right">Gasto Oficina</th>
                <th className="py-3 px-4 text-right">Total Investido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {vehicles.map((v) => {
                const truckDiesel = fuelEntries
                  .filter((f) => f.vehicleId === v.id)
                  .reduce((sum, f) => sum + f.totalCost, 0);

                const truckMaint = maintenanceOrders
                  .filter((m) => m.vehicleId === v.id)
                  .reduce((sum, m) => sum + m.totalCost, 0);

                const totalVehicleSpent = truckDiesel + truckMaint;

                return (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MercosulPlate plate={v.plate} size="sm" />
                        <div>
                          <div className="font-semibold text-slate-100">{v.brand} {v.model}</div>
                          <div className="text-[11px] text-slate-500">{v.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-medium text-slate-300">
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                      {v.currentKm.toLocaleString('pt-BR')} km
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                      {v.averageKmL} km/L
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-400">
                      R$ {truckDiesel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-400">
                      R$ {truckMaint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-100">
                      R$ {totalVehicleSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone: Reset to Defaults */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
        <div>
          <h5 className="text-xs font-semibold text-slate-200">
            Reinicializar Dados de Demonstração
          </h5>
          <p className="text-[11px] text-slate-500">
            Restaura todos os caminhões, motoristas, abastecimentos e manutenções para o estado inicial padrão.
          </p>
        </div>

        {resetConfirmed ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-400 font-medium">Confirmar reset?</span>
            <button
              onClick={() => {
                onResetDatabase();
                setResetConfirmed(false);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition-colors"
            >
              Sim, Restaurar
            </button>
            <button
              onClick={() => setResetConfirmed(false)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setResetConfirmed(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>
        )}
      </div>
    </div>
  );
}
