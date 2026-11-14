'use client';

import React, { useState } from 'react';
import { DailyReport } from '@/types/truck-service';
import { 
  Printer, 
  X, 
  FileText, 
  Truck, 
  Calendar, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  Fuel, 
  MapPin, 
  UserCheck 
} from 'lucide-react';

interface PrintReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: DailyReport[];
  startDate: string;
  endDate: string;
  selectedDriverName?: string;
  selectedVehiclePlate?: string;
  adminEmail?: string;
  initialReport?: DailyReport | null;
}

export function PrintReportsModal({
  isOpen,
  onClose,
  reports,
  startDate,
  endDate,
  selectedDriverName,
  selectedVehiclePlate,
  adminEmail = 'admin@truckgestao.com',
  initialReport = null,
}: PrintReportsModalProps) {
  // Mode: 'consolidated' (all filtered reports) or 'individual' (single detailed sheet)
  const [viewMode, setViewMode] = useState<'consolidated' | 'individual'>(
    initialReport ? 'individual' : 'consolidated'
  );
  const [selectedReportId, setSelectedReportId] = useState<string>(
    initialReport?.id || reports[0]?.id || ''
  );
  const [authCode] = useState(() => `TG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const [issuedAt] = useState(() => new Date().toLocaleString('pt-BR'));

  if (!isOpen) return null;

  // Selected individual report
  const currentIndividualReport = reports.find((r) => r.id === selectedReportId) || initialReport || reports[0];

  // Calculated totals for consolidated view
  const totalTrips = reports.length;
  const totalKm = reports.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
  const totalFuelLiters = reports.reduce((acc, r) => acc + (r.fuelLiters || 0), 0);
  const totalFuelCost = reports.reduce((acc, r) => acc + (r.fuelCost || 0), 0);
  const avgKmL = totalFuelLiters > 0 ? (totalKm / totalFuelLiters).toFixed(2) : '0.00';
  const totalOtherExpenses = reports.reduce((acc, r) => acc + (r.totalOtherExpenses || 0), 0);
  const totalFreight = reports.reduce((acc, r) => acc + (r.totalFreight || 0), 0);
  const totalDeliveries = reports.reduce((acc, r) => acc + (r.totalDeliveries || 0), 0);
  const totalEstimatedCosts = totalFuelCost + totalOtherExpenses;
  const netEstimatedMargin = totalFreight - totalEstimatedCosts;

  const handlePrint = () => {
    window.print();
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '--';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-slate-100">
        
        {/* Action Toolbar (Hidden during print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Exportar Relatório de Viagens e Custos (PDF Imprimível)
              </h3>
              <p className="text-xs text-slate-400">
                Visualize e imprima em folha A4 com diagramação otimizada para PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switch */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('consolidated')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'consolidated'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Relatório Consolidado ({reports.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('individual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'individual'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ficha Individual de Viagem</span>
              </button>
            </div>

            {/* Individual Trip Selector (if individual mode) */}
            {viewMode === 'individual' && reports.length > 0 && (
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDateBR(r.date)} - {r.driverName} ({r.vehiclePlate})
                  </option>
                ))}
              </select>
            )}

            {/* Print Action */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/10 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950">
          {/* Printable A4 Paper Layout (styled clean black on white for crisp PDF generation) */}
          <div 
            id="printable-trip-report"
            className="printable-document mx-auto max-w-4xl bg-white text-slate-900 rounded-xl shadow-xl p-8 sm:p-12 text-[11px] leading-relaxed border border-slate-200"
          >
            {/* Header Document */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-slate-950 uppercase flex items-center gap-1.5">
                      <Truck className="w-6 h-6 text-amber-600 inline" />
                      TRUCKGESÃO
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                      Gestão Operacional de Frotas
                    </span>
                  </div>
                  <h1 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                    {viewMode === 'consolidated' 
                      ? 'Relatório Operacional de Viagens, Entregas e Custos' 
                      : 'Ficha Diária de Viagem, Entregas e Apuração de Custos'}
                  </h1>
                  <p className="text-[10px] text-slate-600">
                    Controle de Trajeto, Abastecimento, Despesas Operacionais e Comprovantes de Entregas
                  </p>
                </div>

                <div className="text-right text-[10px] text-slate-600 font-mono space-y-0.5">
                  <div><strong>Emissão:</strong> {issuedAt}</div>
                  <div><strong>Responsável:</strong> {adminEmail}</div>
                  <div><strong>Autenticação:</strong> {authCode}</div>
                </div>
              </div>

              {/* Filter Parameters Summary */}
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block">Período:</span>
                  <strong className="text-slate-900 font-mono">
                    {formatDateBR(startDate)} até {formatDateBR(endDate)}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block">Motorista:</span>
                  <strong className="text-slate-900">
                    {selectedDriverName || (viewMode === 'individual' ? currentIndividualReport?.driverName : 'Todos os Motoristas')}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block">Veículo / Placa:</span>
                  <strong className="text-slate-900 font-mono">
                    {selectedVehiclePlate || (viewMode === 'individual' ? currentIndividualReport?.vehiclePlate : 'Todos os Veículos')}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block">Viagens Auditadas:</span>
                  <strong className="text-slate-900 font-mono">
                    {viewMode === 'consolidated' ? `${reports.length} viagens` : '1 viagem selecionada'}
                  </strong>
                </div>
              </div>
            </div>

            {/* VIEW 1: CONSOLIDATED REPORT */}
            {viewMode === 'consolidated' && (
              <div className="space-y-6">
                {/* Executive Indicators Grid */}
                <div>
                  <h2 className="text-xs uppercase font-bold text-slate-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    Resumo Consolidado do Período
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[10px]">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-600 block">Quilometragem Total:</span>
                      <span className="text-sm font-bold font-mono text-slate-900">{totalKm.toLocaleString('pt-BR')} km</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-600 block">Consumo de Combustível:</span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {totalFuelLiters.toLocaleString('pt-BR')} L (R$ {totalFuelCost.toFixed(2)})
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Média: {avgKmL} km/L</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-600 block">Despesas Extras / Outros:</span>
                      <span className="text-sm font-bold font-mono text-slate-900">R$ {totalOtherExpenses.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Óleo, Manutenção e Diversos</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-600 block">Faturamento Bruto (Fretes):</span>
                      <span className="text-sm font-bold font-mono text-emerald-700">R$ {totalFreight.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">{totalDeliveries} entregas · Margem Est.: R$ {netEstimatedMargin.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Analytical Trips Table */}
                <div>
                  <h2 className="text-xs uppercase font-bold text-slate-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-700" />
                    Tabela Analítica de Viagens e Apuração de Custos
                  </h2>
                  <div className="overflow-x-auto border border-slate-300 rounded-lg">
                    <table className="w-full text-left text-[10px] border-collapse print-table">
                      <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider border-b border-slate-300">
                        <tr>
                          <th className="py-2 px-2.5">Data</th>
                          <th className="py-2 px-2.5">Motorista</th>
                          <th className="py-2 px-2.5">Placa</th>
                          <th className="py-2 px-2 text-right">Km Inicial</th>
                          <th className="py-2 px-2 text-right">Km Final</th>
                          <th className="py-2 px-2 text-right">Distância</th>
                          <th className="py-2 px-2 text-right">Combustível</th>
                          <th className="py-2 px-2 text-center">Ajudante</th>
                          <th className="py-2 px-2 text-right">Desp. Div.</th>
                          <th className="py-2 px-2 text-right font-bold text-emerald-800">Frete Total</th>
                          <th className="py-2 px-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {reports.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-6 text-center text-slate-500">
                              Nenhum relatório diário encontrado para o período selecionado.
                            </td>
                          </tr>
                        ) : (
                          reports.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2.5 font-mono font-medium">{formatDateBR(r.date)}</td>
                              <td className="py-1.5 px-2.5 font-semibold text-slate-900">{r.driverName}</td>
                              <td className="py-1.5 px-2.5 font-mono">{r.vehiclePlate}</td>
                              <td className="py-1.5 px-2 text-right font-mono">{r.startKm}</td>
                              <td className="py-1.5 px-2 text-right font-mono">{r.endKm}</td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold">{r.distanceKm} km</td>
                              <td className="py-1.5 px-2 text-right font-mono">
                                {r.fuelLiters}L / R$ {r.fuelCost.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-2 text-center font-semibold">
                                {r.hasHelper ? 'SIM' : 'NÃO'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono">
                                R$ {(r.totalOtherExpenses || 0).toFixed(2)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700">
                                R$ {r.totalFreight.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-2 text-center uppercase font-mono text-[9px]">
                                {r.status === 'paid' ? 'Pago' : r.status === 'approved' ? 'Aprovado' : 'Pendente'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {reports.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                          <tr>
                            <td colSpan={5} className="py-2 px-2.5 text-right uppercase">Totais Consolidados:</td>
                            <td className="py-2 px-2 text-right font-mono">{totalKm.toLocaleString('pt-BR')} km</td>
                            <td className="py-2 px-2 text-right font-mono">
                              {totalFuelLiters}L / R$ {totalFuelCost.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">--</td>
                            <td className="py-2 px-2 text-right font-mono">R$ {totalOtherExpenses.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-800 text-xs">
                              R$ {totalFreight.toFixed(2)}
                            </td>
                            <td className="py-2 px-2"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: INDIVIDUAL TRIP SHEET (FICHA DIÁRIA DETALHADA) */}
            {viewMode === 'individual' && currentIndividualReport && (
              <div className="space-y-6">
                {/* Trip Header Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Motorista:</span>
                    <strong className="text-sm font-bold text-slate-950 block">{currentIndividualReport.driverName}</strong>
                    <span className="text-[9px] text-slate-500">ID: {currentIndividualReport.driverId}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Veículo Vinculado:</span>
                    <strong className="text-sm font-bold text-slate-950 block font-mono">{currentIndividualReport.vehiclePlate}</strong>
                    <span className="text-[9px] text-slate-500">Ajudante: {currentIndividualReport.hasHelper ? 'SIM' : 'NÃO'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Data do Serviço:</span>
                    <strong className="text-sm font-bold text-slate-950 block font-mono">
                      {formatDateBR(currentIndividualReport.date)}
                    </strong>
                    <span className="text-[9px] text-slate-500 uppercase">
                      Status: {currentIndividualReport.status}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-emerald-700 block font-medium">Frete Total da Viagem:</span>
                    <strong className="text-base font-bold text-emerald-800 font-mono block">
                      R$ {currentIndividualReport.totalFreight.toFixed(2)}
                    </strong>
                    <span className="text-[9px] text-emerald-600">
                      {currentIndividualReport.totalDeliveries} entregas registradas
                    </span>
                  </div>
                </div>

                {/* Quilometragem e Combustível (Etapa 1) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <h3 className="font-bold uppercase tracking-wider text-slate-800 text-[10px] border-b border-slate-200 pb-1 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      1. Quilometragem Percorrida
                    </h3>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-500 block text-[9px]">Km Inicial:</span>
                        <strong className="font-mono text-slate-900">{currentIndividualReport.startKm}</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-500 block text-[9px]">Km Final:</span>
                        <strong className="font-mono text-slate-900">{currentIndividualReport.endKm}</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200 font-bold">
                        <span className="text-slate-500 block text-[9px]">Km Percorrido:</span>
                        <strong className="font-mono text-slate-950">{currentIndividualReport.distanceKm} km</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <h3 className="font-bold uppercase tracking-wider text-slate-800 text-[10px] border-b border-slate-200 pb-1 flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-amber-600" />
                      2. Abastecimento e Consumo
                    </h3>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-500 block text-[9px]">Litros:</span>
                        <strong className="font-mono text-slate-900">{currentIndividualReport.fuelLiters} L</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-500 block text-[9px]">Valor Pago:</span>
                        <strong className="font-mono text-slate-900">R$ {currentIndividualReport.fuelCost.toFixed(2)}</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200 font-bold">
                        <span className="text-slate-500 block text-[9px]">Média:</span>
                        <strong className="font-mono text-emerald-700">
                          {currentIndividualReport.fuelLiters > 0 
                            ? (currentIndividualReport.distanceKm / currentIndividualReport.fuelLiters).toFixed(2) 
                            : '0.00'} km/L
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Entregas por Cidade (Etapa 2) */}
                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    3. Relação de Entregas por Cidade e Cargas Transportadas
                  </h3>
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[10px] border-collapse print-table">
                      <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider border-b border-slate-300">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Cidade / Destino</th>
                          <th className="py-2 px-3">Material / Descrição da Carga</th>
                          <th className="py-2 px-3 text-center">Quantidade / Volume</th>
                          <th className="py-2 px-3 text-right">Valor do Frete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentIndividualReport.deliveries?.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-500">
                              Nenhuma entrega detalhada cadastrada neste relatório.
                            </td>
                          </tr>
                        ) : (
                          currentIndividualReport.deliveries?.map((d, idx) => (
                            <tr key={d.id || idx}>
                              <td className="py-1.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-1.5 px-3 font-bold text-slate-900">{d.city}</td>
                              <td className="py-1.5 px-3 text-slate-700">{d.material || 'Mercadoria Geral'}</td>
                              <td className="py-1.5 px-3 text-center font-mono">{d.quantity}</td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">
                                R$ {Number(d.freightValue || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-right uppercase">
                            Total dos Fretes ({currentIndividualReport.deliveries?.length || 0} entregas):
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-800 text-xs">
                            R$ {currentIndividualReport.totalFreight.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Gastos Diversos e Pedágios */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <h3 className="font-bold uppercase tracking-wider text-slate-800 text-[10px] border-b border-slate-200 pb-1">
                      4. Pedágios e Ajudante
                    </h3>
                    <div className="space-y-1.5 text-[10px] pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Quantidade de Pedágios Passados:</span>
                        <strong className="font-mono text-slate-900">{currentIndividualReport.tollsCount} praças</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Presença de Ajudante:</span>
                        <strong className="text-slate-900">{currentIndividualReport.hasHelper ? 'SIM (Diária devida)' : 'NÃO'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <h3 className="font-bold uppercase tracking-wider text-slate-800 text-[10px] border-b border-slate-200 pb-1">
                      5. Gastos Diversos Identificados
                    </h3>
                    {currentIndividualReport.otherExpenses?.length === 0 ? (
                      <p className="text-[10px] text-slate-500 py-2">Sem gastos diversos registrados.</p>
                    ) : (
                      <div className="space-y-1 text-[10px] pt-1">
                        {currentIndividualReport.otherExpenses?.map((exp) => (
                          <div key={exp.id} className="flex justify-between py-0.5 border-b border-slate-200/60">
                            <span className="text-slate-700">
                              <strong className="text-slate-900 font-medium">[{exp.category}]</strong> {exp.description}
                            </span>
                            <span className="font-mono font-bold text-slate-900">R$ {exp.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-1 font-bold">
                          <span>Total Gastos Diversos:</span>
                          <span className="font-mono text-slate-950">R$ {currentIndividualReport.totalOtherExpenses.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Termo de Responsabilidade & Assinaturas (Print Avoid Break) */}
            <div className="mt-8 pt-6 border-t-2 border-slate-300 print-avoid-break space-y-6">
              <p className="text-[9px] text-slate-600 text-justify leading-relaxed">
                <strong>TERMO DE CONFERÊNCIA E RESPONSABILIDADE:</strong> Declaramos que as informações de rota, quilometragens 
                inicial e final, abastecimentos, gastos operacionais e entregas constantes neste relatório correspondem 
                fidedignamente às operações executadas no período auditado, estando sujeitas às comprovações cabíveis e quitações acordadas.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px]">
                <div className="border-t border-slate-400 pt-2 space-y-0.5">
                  <strong className="text-slate-900 block font-semibold">
                    {viewMode === 'individual' ? currentIndividualReport?.driverName : 'Motorista Responsável'}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">Assinatura do Motorista</span>
                </div>

                <div className="border-t border-slate-400 pt-2 space-y-0.5">
                  <strong className="text-slate-900 block font-semibold">Gestão de Frotas e Controladoria</strong>
                  <span className="text-[9px] text-slate-500 block">Visto / Assinatura do Administrador</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[8px] text-slate-400 pt-3 border-t border-slate-100 font-mono">
                <span>TruckGestão Cloud Enterprise · Módulo Oficial de Frotas e Serviços</span>
                <span>Página 1 de 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls (Hidden during print) */}
        <div className="no-print px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            💡 <strong>Dica de Impressão:</strong> No diálogo de impressão, você pode selecionar <em>&quot;Salvar como PDF&quot;</em> no destino para baixar o arquivo digital diretamente.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition-colors shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Gerar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
