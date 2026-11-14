'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Driver,
  Vehicle,
  ChecklistItem,
  ChecklistCategory,
  AnomalySeverity,
  VehicleChecklist,
  ChecklistOverallStatus,
} from '@/types/truck-service';
import {
  createVehicleChecklist,
  getDriverChecklists,
} from '@/services/firestoreService';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  CheckCheck,
  Send,
  History,
  Wrench,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface VehicleChecklistSectionProps {
  currentDriver: Driver;
  linkedVehicle?: Vehicle;
  onRefreshData?: () => void;
}

interface DefaultChecklistTemplateItem {
  id: string;
  category: ChecklistCategory;
  label: string;
}

const DEFAULT_CHECKLIST_ITEMS: DefaultChecklistTemplateItem[] = [
  // Pneus & Rodagem
  { id: 'chk-pneu-1', category: 'Pneus & Rodagem', label: 'Calibragem e estado dos pneus (dianteiros, tração e truck)' },
  { id: 'chk-pneu-2', category: 'Pneus & Rodagem', label: 'Porcas, prisioneiros e aros das rodas sem folgas ou trincas' },
  { id: 'chk-pneu-3', category: 'Pneus & Rodagem', label: 'Estepe calibrado e fixado corretamente' },
  // Freios & Pneumático
  { id: 'chk-freio-1', category: 'Freios & Pneumático', label: 'Funcionamento dos freios de serviço e estacionamento (maneco)' },
  { id: 'chk-freio-2', category: 'Freios & Pneumático', label: 'Pressão de ar do sistema pneumático e ausência de vazamentos' },
  { id: 'chk-freio-3', category: 'Freios & Pneumático', label: 'Mangueiras, conexões de ar e cuícas de freio' },
  // Iluminação & Sinalização
  { id: 'chk-luz-1', category: 'Iluminação & Sinalização', label: 'Faróis (baixo/alto), lanternas e luzes de posição' },
  { id: 'chk-luz-2', category: 'Iluminação & Sinalização', label: 'Setas, pisca-alerta, luz de freio e luz de ré' },
  { id: 'chk-luz-3', category: 'Iluminação & Sinalização', label: 'Faixas refletivas e retrovisores sem trincas' },
  // Motor & Fluidos
  { id: 'chk-motor-1', category: 'Motor & Fluidos', label: 'Nível de óleo do motor e ausência de vazamentos' },
  { id: 'chk-motor-2', category: 'Motor & Fluidos', label: 'Nível do líquido de arrefecimento (radiador)' },
  { id: 'chk-motor-3', category: 'Motor & Fluidos', label: 'Nível do fluido de direção hidráulica / embreagem' },
  // Cabine & Segurança
  { id: 'chk-cabine-1', category: 'Cabine & Segurança', label: 'Cinto de segurança, buzina e limpadores de para-brisa' },
  { id: 'chk-cabine-2', category: 'Cabine & Segurança', label: 'Extintor de incêndio (validade/pressão), triângulo e macaco' },
  { id: 'chk-cabine-3', category: 'Cabine & Segurança', label: 'Painel de instrumentos sem luzes de advertência acesas' },
  // Carroceria & Carga
  { id: 'chk-carga-1', category: 'Carroceria & Carga', label: 'Travas, tampas, lona ou baú em boas condições de vedação' },
  { id: 'chk-carga-2', category: 'Carroceria & Carga', label: 'Amarrações, cintas, catracas e travamento de carga' },
  { id: 'chk-carga-3', category: 'Carroceria & Carga', label: 'Documentação obrigatória do veículo e tacógrafo em dia' },
];

const CATEGORIES: ChecklistCategory[] = [
  'Pneus & Rodagem',
  'Freios & Pneumático',
  'Iluminação & Sinalização',
  'Motor & Fluidos',
  'Cabine & Segurança',
  'Carroceria & Carga',
];

function createInitialItems(): ChecklistItem[] {
  return DEFAULT_CHECKLIST_ITEMS.map((item) => ({
    id: item.id,
    category: item.category,
    label: item.label,
    status: 'ok',
    severity: undefined,
    notes: '',
  }));
}

export function VehicleChecklistSection({
  currentDriver,
  linkedVehicle,
  onRefreshData,
}: VehicleChecklistSectionProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inspectionType, setInspectionType] = useState<'pre_trip' | 'post_trip' | 'routine'>('pre_trip');
  const [odometerKm, setOdometerKm] = useState<number>(linkedVehicle?.currentKm || 0);
  const [items, setItems] = useState<ChecklistItem[]>(() => createInitialItems());
  const [generalNotes, setGeneralNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [history, setHistory] = useState<VehicleChecklist[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const loadDriverChecklists = useCallback(async () => {
    setLoadingHistory(true);
    const data = await getDriverChecklists(currentDriver.id);
    setHistory(data);
    setLoadingHistory(false);
  }, [currentDriver.id]);

  useEffect(() => {
    let mounted = true;
    getDriverChecklists(currentDriver.id).then((data) => {
      if (mounted) {
        setHistory(data);
        setLoadingHistory(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [currentDriver.id]);

  // Derived counters
  const anomalyItems = items.filter((i) => i.status === 'anomaly');
  const anomaliesCount = anomalyItems.length;
  const criticalAnomaliesCount = anomalyItems.filter((i) => i.severity === 'critical').length;

  const overallStatus: ChecklistOverallStatus =
    criticalAnomaliesCount > 0 ? 'critical' : anomaliesCount > 0 ? 'attention' : 'approved';

  const handleSetItemStatus = (itemId: string, status: 'ok' | 'anomaly') => {
    setFormError(null);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (status === 'ok') {
          return { ...item, status: 'ok', severity: undefined, notes: '' };
        }
        return {
          ...item,
          status: 'anomaly',
          severity: item.severity || 'medium',
          notes: item.notes || '',
        };
      })
    );
  };

  const handleSetItemSeverity = (itemId: string, severity: AnomalySeverity) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, severity } : item))
    );
  };

  const handleSetItemNotes = (itemId: string, notes: string) => {
    setFormError(null);
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
    );
  };

  const handleMarkAllOk = () => {
    setFormError(null);
    setItems(createInitialItems());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!linkedVehicle) {
      setFormError('Nenhum veículo está vinculado ao seu cadastro. Solicite ao administrador.');
      return;
    }

    if (!date) {
      setFormError('Informe a data da inspeção.');
      return;
    }

    if (odometerKm <= 0) {
      setFormError('Informe a quilometragem atual (odômetro) do caminhão.');
      return;
    }

    // Every item marked as anomaly must have a description
    const missingDescription = items.find(
      (i) => i.status === 'anomaly' && (!i.notes || i.notes.trim().length < 3)
    );
    if (missingDescription) {
      setFormError(
        `Descreva a anomalia encontrada no item: "${missingDescription.label}".`
      );
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedItems: ChecklistItem[] = items.map((i) =>
        i.status === 'anomaly'
          ? {
              id: i.id,
              category: i.category,
              label: i.label,
              status: 'anomaly',
              severity: i.severity || 'medium',
              notes: (i.notes || '').trim(),
            }
          : {
              id: i.id,
              category: i.category,
              label: i.label,
              status: 'ok',
            }
      );

      await createVehicleChecklist({
        driverId: currentDriver.id,
        driverName: currentDriver.name,
        vehicleId: linkedVehicle.id,
        vehiclePlate: linkedVehicle.plate,
        vehicleModel: linkedVehicle.model,
        date,
        inspectionType,
        odometerKm: Number(odometerKm),
        items: sanitizedItems,
        anomaliesCount,
        criticalAnomaliesCount,
        overallStatus,
        resolutionStatus: anomaliesCount > 0 ? 'pending_review' : 'ok',
        generalNotes: generalNotes.trim() || undefined,
      });

      setSuccessMsg(
        anomaliesCount > 0
          ? `Checklist registrado com ${anomaliesCount} anomalia(s)! O Administrador foi notificado automaticamente para providenciar a verificação.`
          : 'Checklist enviado com sucesso! Veículo aprovado em todos os 18 itens sem anomalias.'
      );

      setItems(createInitialItems());
      setGeneralNotes('');
      await loadDriverChecklists();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Erro ao enviar checklist:', err);
      setFormError('Falha ao salvar o checklist de inspeção. Verifique sua conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Checklist Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4" />
              Inspeção Preventiva & Verificação de Anomalias
            </span>
            <h3 className="text-lg font-bold text-slate-100 mt-1">
              Checklist do Veículo {linkedVehicle ? `— ${linkedVehicle.plate} (${linkedVehicle.model})` : ''}
            </h3>
            <p className="text-xs text-slate-400">
              Verifique cada componente antes ou após a viagem. Caso encontre algum problema, marque como Anomalia e informe o nível de gravidade.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllOk}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 shrink-0 self-start sm:self-auto transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Marcar Todos como OK</span>
          </button>
        </div>

        {/* Inspection Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tipo de Inspeção *
            </label>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value as 'pre_trip' | 'post_trip' | 'routine')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="pre_trip">Pré-Viagem (Antes de sair)</option>
              <option value="post_trip">Pós-Viagem (Retorno à base)</option>
              <option value="routine">Inspeção de Rotina</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Data da Inspeção *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Odômetro Atual (km) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={odometerKm}
              onChange={(e) => setOdometerKm(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Live Status Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
            overallStatus === 'critical'
              ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
              : overallStatus === 'attention'
              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {overallStatus === 'critical' ? (
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
            ) : overallStatus === 'attention' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div>
              <strong className="block text-sm">
                {overallStatus === 'critical'
                  ? 'STATUS CRÍTICO: Anomalia grave detectada — notifique o administrador imediatamente!'
                  : overallStatus === 'attention'
                  ? `ATENÇÃO: ${anomaliesCount} anomalia(s) identificada(s) para revisão.`
                  : 'APROVADO: Todos os 18 itens marcados como OK.'}
              </strong>
              <span className="text-[11px] opacity-80">
                Itens verificados: {items.length} · Sem problemas: {items.length - anomaliesCount} · Anomalias: {anomaliesCount} ({criticalAnomaliesCount} crítica{criticalAnomaliesCount === 1 ? '' : 's'})
              </span>
            </div>
          </div>
        </div>

        {/* Categories & Checklist Items */}
        <div className="space-y-5">
          {CATEGORIES.map((category) => {
            const categoryItems = items.filter((i) => i.category === category);
            const catAnomalies = categoryItems.filter((i) => i.status === 'anomaly').length;

            return (
              <div
                key={category}
                className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {category}
                  </span>
                  {catAnomalies > 0 ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-mono">
                      {catAnomalies} anomalia{catAnomalies > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      Tudo OK
                    </span>
                  )}
                </div>

                <div className="divide-y divide-slate-800/70">
                  {categoryItems.map((item) => {
                    const isAnomaly = item.status === 'anomaly';
                    return (
                      <div key={item.id} className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className={`text-xs font-medium ${isAnomaly ? 'text-amber-200 font-semibold' : 'text-slate-200'}`}>
                            {item.label}
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSetItemStatus(item.id, 'ok')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                                !isAnomaly
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>OK</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetItemStatus(item.id, 'anomaly')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                                isAnomaly
                                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-300'
                              }`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Anomalia</span>
                            </button>
                          </div>
                        </div>

                        {isAnomaly && (
                          <div className="bg-rose-950/20 border border-rose-500/40 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-4">
                              <label className="block text-[10px] font-bold uppercase text-rose-300 mb-1">
                                Gravidade da Anomalia *
                              </label>
                              <select
                                value={item.severity || 'medium'}
                                onChange={(e) =>
                                  handleSetItemSeverity(item.id, e.target.value as AnomalySeverity)
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-400"
                              >
                                <option value="low">Baixa (Acompanhar)</option>
                                <option value="medium">Média (Manutenção breve)</option>
                                <option value="critical">Crítica (Parar / Urgente)</option>
                              </select>
                            </div>

                            <div className="sm:col-span-8">
                              <label className="block text-[10px] font-bold uppercase text-rose-300 mb-1">
                                Descrição da Anomalia Encontrada *
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: Pneu traseiro direito perdendo pressão / Farol baixo queimado"
                                value={item.notes || ''}
                                onChange={(e) => handleSetItemNotes(item.id, e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-400"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* General Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Observações Gerais da Inspeção (Opcional)
          </label>
          <textarea
            rows={2}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Registre qualquer ruído, vibração ou observação adicional sobre o caminhão..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Validation & Success Messages */}
        {formError && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Enviando Inspeção...' : 'ENVIAR CHECKLIST DE INSPEÇÃO'}</span>
          </button>
        </div>
      </form>

      {/* Driver's Checklist History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Meus Checklists Enviados ({history.length})
          </h4>
          <span className="text-xs text-slate-400">
            Acompanhe o retorno da manutenção
          </span>
        </div>

        {loadingHistory ? (
          <div className="p-6 text-center text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 rounded-xl">
            Carregando histórico de inspeções...
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            Você ainda não enviou nenhum checklist de inspeção.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((chk) => {
              const isExpanded = expandedHistoryId === chk.id;
              const anomalies = chk.items.filter((i) => i.status === 'anomaly');
              const typeLabel =
                chk.inspectionType === 'pre_trip'
                  ? 'Pré-Viagem'
                  : chk.inspectionType === 'post_trip'
                  ? 'Pós-Viagem'
                  : 'Rotina';

              return (
                <div
                  key={chk.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="font-mono font-bold text-slate-100">
                        {chk.date.split('-').reverse().join('/')}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-mono">
                        {chk.vehiclePlate}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                        {typeLabel}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {chk.odometerKm.toLocaleString('pt-BR')} km
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {chk.anomaliesCount === 0 ? (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Sem Anomalias
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                            chk.criticalAnomaliesCount > 0
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {chk.anomaliesCount} Anomalia{chk.anomaliesCount > 1 ? 's' : ''}
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 ${
                          chk.resolutionStatus === 'resolved' || chk.resolutionStatus === 'ok'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : chk.resolutionStatus === 'in_maintenance'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {chk.resolutionStatus === 'in_maintenance' && <Wrench className="w-3 h-3" />}
                        {chk.resolutionStatus === 'pending_review' && <Clock className="w-3 h-3" />}
                        <span>
                          {chk.resolutionStatus === 'ok'
                            ? 'Liberado'
                            : chk.resolutionStatus === 'resolved'
                            ? 'Resolvido pelo Admin'
                            : chk.resolutionStatus === 'in_maintenance'
                            ? 'Em Manutenção'
                            : 'Aguardando Análise'}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId(isExpanded ? null : chk.id)}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {anomalies.length > 0 && (
                    <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-rose-400 block">
                        Anomalias Reportadas:
                      </span>
                      {anomalies.map((a) => (
                        <div key={a.id} className="text-xs flex flex-wrap items-center gap-2 text-slate-300">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              a.severity === 'critical'
                                ? 'bg-rose-500 text-white'
                                : a.severity === 'medium'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {a.severity === 'critical' ? 'Crítica' : a.severity === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                          <strong className="text-slate-200">{a.label}:</strong>
                          <span className="text-slate-400">{a.notes}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {chk.adminNotes && (
                    <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200">
                      <strong className="block text-[11px] text-blue-300">Parecer do Administrador:</strong>
                      <span>{chk.adminNotes}</span>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-800 text-[11px]">
                      {chk.items.map((it) => (
                        <div
                          key={it.id}
                          className={`px-2.5 py-1.5 rounded border flex items-center justify-between gap-2 ${
                            it.status === 'anomaly'
                              ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                              : 'bg-slate-950 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          <span className="truncate">{it.label}</span>
                          <span className={`font-bold shrink-0 ${it.status === 'anomaly' ? 'text-rose-400' : 'text-emerald-400'}`}>
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
    </div>
  );
}
