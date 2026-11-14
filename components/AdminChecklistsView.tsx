'use client';

import React, { useState, useMemo } from 'react';
import {
  VehicleChecklist,
  Vehicle,
  Driver,
  UserProfile,
} from '@/types/truck-service';
import { updateVehicleChecklist, createNotification } from '@/services/firestoreService';
import { MercosulPlate } from './MercosulPlate';
import {
  ClipboardCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Wrench,
  Clock,
  Filter,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';

interface AdminChecklistsViewProps {
  checklists: VehicleChecklist[];
  vehicles: Vehicle[];
  drivers: Driver[];
  adminProfile: UserProfile;
  onRefreshData: () => void;
  onRequestDelete: (checklist: VehicleChecklist) => void;
}

export function AdminChecklistsView({
  checklists,
  vehicles,
  drivers,
  adminProfile,
  onRefreshData,
  onRequestDelete,
}: AdminChecklistsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open_anomalies' | 'critical' | 'in_maintenance' | 'resolved'>('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesByChecklistId, setNotesByChecklistId] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = checklists.length;
    const openAnomalies = checklists.filter(
      (c) => c.anomaliesCount > 0 && (c.resolutionStatus === 'pending_review' || c.resolutionStatus === 'in_maintenance')
    ).length;
    const criticalOpen = checklists.filter(
      (c) => c.criticalAnomaliesCount > 0 && c.resolutionStatus !== 'resolved'
    ).length;
    const cleanOrResolved = checklists.filter(
      (c) => c.resolutionStatus === 'ok' || c.resolutionStatus === 'resolved'
    ).length;
    return { total, openAnomalies, criticalOpen, cleanOrResolved };
  }, [checklists]);

  const filteredChecklists = useMemo(() => {
    return checklists.filter((c) => {
      if (vehicleFilter !== 'all' && c.vehicleId !== vehicleFilter) return false;
      if (driverFilter !== 'all' && c.driverId !== driverFilter) return false;
      if (statusFilter === 'open_anomalies') {
        return c.anomaliesCount > 0 && (c.resolutionStatus === 'pending_review' || c.resolutionStatus === 'in_maintenance');
      }
      if (statusFilter === 'critical') {
        return c.criticalAnomaliesCount > 0 && c.resolutionStatus !== 'resolved';
      }
      if (statusFilter === 'in_maintenance') {
        return c.resolutionStatus === 'in_maintenance';
      }
      if (statusFilter === 'resolved') {
        return c.resolutionStatus === 'resolved' || c.resolutionStatus === 'ok';
      }
      return true;
    });
  }, [checklists, statusFilter, vehicleFilter, driverFilter]);

  const handleUpdateResolution = async (
    checklist: VehicleChecklist,
    newResolutionStatus: 'in_maintenance' | 'resolved'
  ) => {
    setSavingId(checklist.id);
    try {
      const adminNotes =
        notesByChecklistId[checklist.id] !== undefined
          ? notesByChecklistId[checklist.id]
          : checklist.adminNotes || '';

      await updateVehicleChecklist({
        ...checklist,
        resolutionStatus: newResolutionStatus,
        adminNotes: adminNotes.trim() || undefined,
        ...(newResolutionStatus === 'resolved'
          ? {
              resolvedBy: adminProfile.email,
              resolvedAt: new Date().toISOString(),
            }
          : {}),
      });

      await createNotification({
        targetRole: 'driver',
        targetUserId: checklist.driverId,
        title:
          newResolutionStatus === 'in_maintenance'
            ? `Checklist ${checklist.vehiclePlate}: Veículo enviado para manutenção`
            : `Checklist ${checklist.vehiclePlate}: Anomalia resolvida`,
        message:
          newResolutionStatus === 'in_maintenance'
            ? `O administrador encaminhou o veículo ${checklist.vehiclePlate} para manutenção.${adminNotes.trim() ? ` Obs: ${adminNotes.trim()}` : ''}`
            : `As anomalias reportadas no checklist de ${checklist.vehiclePlate} foram resolvidas e o veículo está liberado.${adminNotes.trim() ? ` Obs: ${adminNotes.trim()}` : ''}`,
        type: newResolutionStatus === 'in_maintenance' ? 'warning' : 'info',
        read: false,
      });

      await onRefreshData();
    } catch (err) {
      console.error('Erro ao atualizar resolução do checklist:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleExportChecklistsCSV = () => {
    const headers = [
      'Data',
      'Motorista',
      'Placa',
      'Tipo_Inspecao',
      'Odometro_KM',
      'Total_Anomalias',
      'Anomalias_Criticas',
      'Status_Geral',
      'Situacao_Resolucao',
      'Detalhes_Anomalias',
    ];
    const rows = filteredChecklists.map((c) => {
      const details = c.items
        .filter((i) => i.status === 'anomaly')
        .map((i) => `[${i.severity || 'medium'}] ${i.label}: ${i.notes || ''}`)
        .join(' | ');
      return [
        c.date,
        c.driverName,
        c.vehiclePlate,
        c.inspectionType,
        c.odometerKm,
        c.anomaliesCount,
        c.criticalAnomaliesCount,
        c.overallStatus,
        c.resolutionStatus,
        details.replace(/;/g, ','),
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `checklists_anomalias_truckgestao.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
            Checklists de Inspeção & Anomalias da Frota
          </h4>
          <p className="text-xs text-slate-400">
            Acompanhe as vistorias enviadas pelos motoristas, trate anomalias abertas e registre ações corretivas
          </p>
        </div>

        <button
          onClick={handleExportChecklistsCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exportar Checklists CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total de Checklists
          </span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Inspeções registradas</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
            Anomalias em Aberto
          </span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {stats.openAnomalies}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Aguardando análise ou oficina</div>
        </div>

        <div className="bg-slate-900 border border-rose-500/40 p-4 rounded-2xl">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
            Ocorrências Críticas
          </span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {stats.criticalOpen}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Prioridade máxima</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Liberados / Resolvidos
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {stats.cleanOrResolved}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Sem pendências ativas</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-amber-400" /> Filtros:
        </span>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="all">Todas as Inspeções ({checklists.length})</option>
          <option value="open_anomalies">Com Anomalias em Aberto ({stats.openAnomalies})</option>
          <option value="critical">Somente Críticas ({stats.criticalOpen})</option>
          <option value="in_maintenance">Em Manutenção</option>
          <option value="resolved">Sem Anomalias / Resolvidos</option>
        </select>

        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="all">Todos os Veículos</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} - {v.model}
            </option>
          ))}
        </select>

        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="all">Todos os Motoristas</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Checklists List */}
      {filteredChecklists.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
          Nenhum checklist de inspeção encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChecklists.map((chk) => {
            const anomalies = chk.items.filter((i) => i.status === 'anomaly');
            const isExpanded = expandedId === chk.id;
            const currentAdminNotes =
              notesByChecklistId[chk.id] !== undefined
                ? notesByChecklistId[chk.id]
                : chk.adminNotes || '';
            const typeLabel =
              chk.inspectionType === 'pre_trip'
                ? 'Pré-Viagem'
                : chk.inspectionType === 'post_trip'
                ? 'Pós-Viagem'
                : 'Rotina';

            return (
              <div
                key={chk.id}
                className={`bg-slate-900 rounded-2xl p-5 space-y-4 border ${
                  chk.criticalAnomaliesCount > 0 && chk.resolutionStatus !== 'resolved'
                    ? 'border-rose-500/70 bg-rose-950/10'
                    : chk.anomaliesCount > 0 && chk.resolutionStatus !== 'resolved'
                    ? 'border-amber-500/50'
                    : 'border-slate-800'
                }`}
              >
                {/* Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <MercosulPlate plate={chk.vehiclePlate} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-slate-100">{chk.driverName}</strong>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {typeLabel}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        Data: {chk.date.split('-').reverse().join('/')} · Odômetro: {chk.odometerKm.toLocaleString('pt-BR')} km
                        {chk.vehicleModel ? ` · ${chk.vehicleModel}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {chk.anomaliesCount === 0 ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>100% OK</span>
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                          chk.criticalAnomaliesCount > 0
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {chk.criticalAnomaliesCount > 0 ? (
                          <AlertOctagon className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {chk.anomaliesCount} Anomalia{chk.anomaliesCount > 1 ? 's' : ''}
                          {chk.criticalAnomaliesCount > 0 ? ` (${chk.criticalAnomaliesCount} Crítica)` : ''}
                        </span>
                      </span>
                    )}

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
                        chk.resolutionStatus === 'resolved' || chk.resolutionStatus === 'ok'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : chk.resolutionStatus === 'in_maintenance'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {chk.resolutionStatus === 'in_maintenance' && <Wrench className="w-3.5 h-3.5" />}
                      {chk.resolutionStatus === 'pending_review' && <Clock className="w-3.5 h-3.5" />}
                      <span>
                        {chk.resolutionStatus === 'ok'
                          ? 'Liberado'
                          : chk.resolutionStatus === 'resolved'
                          ? 'Resolvido'
                          : chk.resolutionStatus === 'in_maintenance'
                          ? 'Em Manutenção'
                          : 'Pendente de Análise'}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => onRequestDelete(chk)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Excluir checklist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Anomalies Detail Box */}
                {anomalies.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
                      Anomalias Identificadas na Inspeção:
                    </span>
                    <div className="space-y-2">
                      {anomalies.map((anom) => (
                        <div
                          key={anom.id}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              {anom.category}
                            </span>
                            <strong className="text-slate-100 block">{anom.label}</strong>
                            <span className="text-amber-200/90">{anom.notes}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase self-start sm:self-center shrink-0 ${
                              anom.severity === 'critical'
                                ? 'bg-rose-500 text-white'
                                : anom.severity === 'medium'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {anom.severity === 'critical'
                              ? 'Crítica'
                              : anom.severity === 'medium'
                              ? 'Média'
                              : 'Baixa'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {chk.generalNotes && (
                  <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <strong className="text-slate-400">Obs. do Motorista: </strong>
                    {chk.generalNotes}
                  </div>
                )}

                {/* Admin Resolution Controls for Checklists with Anomalies */}
                {chk.anomaliesCount > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Parecer / Providência do Administrador
                        </label>
                        <input
                          type="text"
                          value={currentAdminNotes}
                          onChange={(e) =>
                            setNotesByChecklistId((prev) => ({
                              ...prev,
                              [chk.id]: e.target.value,
                            }))
                          }
                          placeholder="Ex: Encaminhado para borracharia / Peça substituída na oficina"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {chk.resolutionStatus !== 'in_maintenance' && chk.resolutionStatus !== 'resolved' && (
                          <button
                            type="button"
                            disabled={savingId === chk.id}
                            onClick={() => handleUpdateResolution(chk, 'in_maintenance')}
                            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Em Manutenção</span>
                          </button>
                        )}

                        {chk.resolutionStatus !== 'resolved' && (
                          <button
                            type="button"
                            disabled={savingId === chk.id}
                            onClick={() => handleUpdateResolution(chk, 'resolved')}
                            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Marcar Resolvido</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {chk.resolvedAt && chk.resolvedBy && (
                      <div className="text-[11px] text-emerald-400 font-mono">
                        Resolvido por {chk.resolvedBy} em{' '}
                        {new Date(chk.resolvedAt).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                )}

                {/* Expand/Collapse all 18 inspected items */}
                <div className="pt-1 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : chk.id)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>
                      {isExpanded
                        ? 'Ocultar lista completa dos itens'
                        : `Ver todos os ${chk.items.length} itens inspecionados`}
                    </span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                    {chk.items.map((it) => (
                      <div
                        key={it.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                          it.status === 'anomaly'
                            ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="truncate">{it.label}</span>
                        <span
                          className={`font-bold shrink-0 ${
                            it.status === 'anomaly' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {it.status === 'anomaly' ? 'ANOMALIA' : 'OK'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
