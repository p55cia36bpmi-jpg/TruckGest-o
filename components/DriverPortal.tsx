'use client';

import React, { useState, useEffect } from 'react';
import { 
  Driver, 
  Vehicle, 
  DailyReport, 
  DeliveryItem, 
  OtherExpenseItem, 
  ExpenseCategory 
} from '@/types/truck-service';
import { 
  createDailyReport, 
  updateDailyReport,
  checkDailyReportExists, 
  getDailyReportByDriverAndDate,
  getDriverReports, 
  updateVehicle 
} from '@/services/firestoreService';
import { MercosulPlate } from './MercosulPlate';
import { 
  Truck, 
  User, 
  FileText, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Fuel, 
  MapPin, 
  ChevronRight, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Clock, 
  AlertCircle,
  HelpCircle,
  PackageCheck
} from 'lucide-react';

interface DriverPortalProps {
  currentDriver: Driver;
  vehicles: Vehicle[];
  onRefreshData?: () => void;
}

export function DriverPortal({
  currentDriver,
  vehicles,
  onRefreshData,
}: DriverPortalProps) {
  const [activeView, setActiveView] = useState<'home' | 'new-report' | 'history'>('home');
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Stepper state for Daily Report (Etapa 1 vs Etapa 2)
  const [step, setStep] = useState<1 | 2>(1);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Linked vehicle
  const linkedVehicle = vehicles.find((v) => v.id === currentDriver.vehicleId) || vehicles[0];

  // Oil change alert calculation (< 200 km)
  const kmToNextOilChange = linkedVehicle ? linkedVehicle.nextOilChangeKm - linkedVehicle.currentKm : 9999;
  const isOilAlertActive = kmToNextOilChange <= 200 && !linkedVehicle?.alertDismissed;
  const [showOilAlert, setShowOilAlert] = useState(isOilAlertActive);

  // ETAPA 1 Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startKm, setStartKm] = useState(linkedVehicle ? linkedVehicle.currentKm : 20000);
  const [endKm, setEndKm] = useState(linkedVehicle ? linkedVehicle.currentKm + 280 : 20280);
  const [tollsCount, setTollsCount] = useState(3);
  const [hasHelper, setHasHelper] = useState(false);
  const [fuelCost, setFuelCost] = useState(420.00);
  const [fuelLiters, setFuelLiters] = useState(70.0);

  // Other Expenses list
  const [otherExpenses, setOtherExpenses] = useState<OtherExpenseItem[]>([
    { id: '1', category: 'Outros', amount: 0, description: '' },
  ]);

  // ETAPA 2 Form State (Cidades e Entregas)
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([
    { id: 'del-1', city: 'Indaiatuba', material: '1 frete churrasqueira', quantity: 1, freightValue: 170.00 },
    { id: 'del-2', city: 'Americana', material: '1 frete churrasqueira', quantity: 1, freightValue: 140.00 },
    { id: 'del-3', city: 'Campinas', material: '1 frete churrasqueira', quantity: 1, freightValue: 170.00 },
    { id: 'del-4', city: 'Campinas', material: '11 dutos', quantity: 11, freightValue: 44.00 },
    { id: 'del-5', city: 'Campinas', material: '5 módulos', quantity: 5, freightValue: 75.00 },
  ]);

  // Load Driver's historical reports
  const loadReports = React.useCallback(async () => {
    const data = await getDriverReports(currentDriver.id);
    setReports(data);
    setLoadingReports(false);
  }, [currentDriver.id]);

  useEffect(() => {
    let isMounted = true;
    getDriverReports(currentDriver.id).then((data) => {
      if (isMounted) {
        setReports(data);
        setLoadingReports(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentDriver.id]);

  // Calculations
  const distanceKm = Math.max(0, endKm - startKm);
  const totalDeliveriesCount = deliveries.length;
  const totalFreightValue = deliveries.reduce((acc, d) => acc + (Number(d.freightValue) || 0), 0);
  const totalOtherExpensesValue = otherExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Add delivery row
  const handleAddDelivery = () => {
    setDeliveries([
      ...deliveries,
      { id: `del-${Date.now()}`, city: '', material: '', quantity: 1, freightValue: 0 },
    ]);
  };

  const handleRemoveDelivery = (id: string) => {
    if (deliveries.length <= 1) return;
    setDeliveries(deliveries.filter((d) => d.id !== id));
  };

  const handleUpdateDelivery = (id: string, field: keyof DeliveryItem, value: any) => {
    setDeliveries(
      deliveries.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  // Add other expense row
  const handleAddExpense = () => {
    setOtherExpenses([
      ...otherExpenses,
      { id: `exp-${Date.now()}`, category: 'Outros', amount: 0, description: '' },
    ]);
  };

  const handleRemoveExpense = (id: string) => {
    setOtherExpenses(otherExpenses.filter((e) => e.id !== id));
  };

  const handleUpdateExpense = (id: string, field: keyof OtherExpenseItem, value: any) => {
    setOtherExpenses(
      otherExpenses.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // Load report for authorized editing (Section 5)
  const handleStartEditReport = (rep: DailyReport) => {
    setEditingReportId(rep.id);
    setDate(rep.date);
    setStartKm(rep.startKm);
    setEndKm(rep.endKm);
    setTollsCount(rep.tollsCount);
    setHasHelper(rep.hasHelper);
    setFuelCost(rep.fuelCost);
    setFuelLiters(rep.fuelLiters);
    if (rep.otherExpenses && rep.otherExpenses.length > 0) {
      setOtherExpenses(rep.otherExpenses);
    }
    if (rep.deliveries && rep.deliveries.length > 0) {
      setDeliveries(rep.deliveries);
    }
    setStep(1);
    setActiveView('new-report');
  };

  // Step 1 validation
  const handleNextStep = async () => {
    setFormError(null);

    if (!date) {
      setFormError('A data do serviço é obrigatória.');
      return;
    }
    if (endKm < startKm) {
      setFormError('A quilometragem final deve ser maior ou igual à quilometragem inicial.');
      return;
    }
    if (fuelCost <= 0 || fuelLiters <= 0) {
      setFormError('O valor do abastecimento e a quantidade de litros devem ser maiores que zero.');
      return;
    }

    // Check duplicate report for same driver and date (Section 5)
    const existing = await getDailyReportByDriverAndDate(currentDriver.id, date);
    if (existing && existing.id !== editingReportId) {
      if (existing.canEdit) {
        // Admin granted permission to edit!
        handleStartEditReport(existing);
        setStep(2);
        return;
      }
      setFormError(`Já existe um relatório registrado para você na data ${date}. Não é permitida duplicidade de envio sem autorização do administrador.`);
      return;
    }

    setStep(2);
  };

  // Submit complete report
  const handleSubmitReport = async () => {
    setFormError(null);
    setSubmitting(true);

    try {
      if (deliveries.length === 0 || deliveries.some((d) => !d.city || !d.material || d.freightValue < 0)) {
        setFormError('Preencha corretamente todas as cidades, materiais e valores de frete das entregas.');
        setSubmitting(false);
        return;
      }

      const validExpenses = otherExpenses.filter((e) => e.amount > 0);

      if (editingReportId) {
        // Update existing authorized report
        await updateDailyReport({
          id: editingReportId,
          driverId: currentDriver.id,
          driverName: currentDriver.name,
          vehicleId: linkedVehicle?.id || 'veh-01',
          vehiclePlate: linkedVehicle?.plate || 'BRA2E19',
          date,
          startKm: Number(startKm),
          endKm: Number(endKm),
          distanceKm,
          tollsCount: Number(tollsCount),
          hasHelper,
          fuelCost: Number(fuelCost),
          fuelLiters: Number(fuelLiters),
          calculatedKmL: fuelLiters > 0 ? Number((distanceKm / fuelLiters).toFixed(2)) : 0,
          otherExpenses: validExpenses,
          deliveries,
          totalDeliveries: totalDeliveriesCount,
          totalFreight: totalFreightValue,
          totalOtherExpenses: totalOtherExpensesValue,
          canEdit: false, // reset permission after saving
          status: 'submitted',
          createdAt: new Date().toISOString(),
        });
        setSuccessMessage('Relatório diário atualizado com sucesso após autorização do Administrador!');
      } else {
        // Create new daily report
        await createDailyReport({
          driverId: currentDriver.id,
          driverName: currentDriver.name,
          vehicleId: linkedVehicle?.id || 'veh-01',
          vehiclePlate: linkedVehicle?.plate || 'BRA2E19',
          date,
          startKm: Number(startKm),
          endKm: Number(endKm),
          distanceKm,
          tollsCount: Number(tollsCount),
          hasHelper,
          fuelCost: Number(fuelCost),
          fuelLiters: Number(fuelLiters),
          calculatedKmL: fuelLiters > 0 ? Number((distanceKm / fuelLiters).toFixed(2)) : 0,
          otherExpenses: validExpenses,
          deliveries,
          totalDeliveries: totalDeliveriesCount,
          totalFreight: totalFreightValue,
          totalOtherExpenses: totalOtherExpensesValue,
          status: 'submitted',
        });
        setSuccessMessage('Relatório diário enviado com sucesso para aprovação do Administrador!');
      }

      setEditingReportId(null);
      setActiveView('history');
      setStep(1);
      await loadReports();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setFormError('Erro ao salvar o relatório. Verifique sua conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle oil alert reminder toggle
  const handleDismissOilAlert = async (remindAgain: boolean) => {
    setShowOilAlert(false);
    if (!remindAgain && linkedVehicle) {
      await updateVehicle({
        ...linkedVehicle,
        alertDismissed: true,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Driver Header Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-2xl shrink-0">
            {currentDriver.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400">
              Painel do Motorista
            </span>
            <h2 className="text-xl font-bold text-slate-100">{currentDriver.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span>CPF: <strong className="text-slate-300 font-mono">{currentDriver.cpf}</strong></span>
              <span>·</span>
              <span>CNH: <strong className="text-slate-300 font-mono">{currentDriver.cnhNumber} (Cat. {currentDriver.cnhCategory})</strong></span>
              <span>·</span>
              <span>Vencimento: <strong className="text-slate-300 font-mono">{currentDriver.cnhExpiry.split('-').reverse().join('/')}</strong></span>
            </div>
          </div>
        </div>

        {/* Linked Vehicle Info Badge */}
        {linkedVehicle && (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center gap-4 self-stretch md:self-auto">
            <MercosulPlate plate={linkedVehicle.plate} size="md" />
            <div className="text-xs">
              <span className="text-slate-400 block">Veículo Vinculado</span>
              <strong className="text-slate-100 font-medium">{linkedVehicle.model}</strong>
              <div className="text-[11px] text-slate-400 font-mono">
                Odômetro: {linkedVehicle.currentKm.toLocaleString('pt-BR')} km
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Oil Change Alert (< 200 km) as requested in Section 4 */}
      {showOilAlert && (
        <div className="bg-orange-950/40 border-2 border-orange-500/60 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-orange-500 text-slate-950 rounded-xl font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-orange-200">
                ATENÇÃO: Faltam 200 km ou menos para a próxima troca de óleo.
              </h4>
              <p className="text-xs text-orange-300/80 mt-0.5">
                Quilometragem atual: <strong className="font-mono text-white">{linkedVehicle.currentKm.toLocaleString('pt-BR')} km</strong> · Próxima troca: <strong className="font-mono text-white">{linkedVehicle.nextOilChangeKm.toLocaleString('pt-BR')} km</strong> ({kmToNextOilChange} km restantes)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs text-orange-200 font-medium">Lembrar novamente?</span>
            <button
              onClick={() => handleDismissOilAlert(true)}
              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              SIM
            </button>
            <button
              onClick={() => handleDismissOilAlert(false)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition-colors"
            >
              NÃO
            </button>
          </div>
        </div>
      )}

      {/* Driver Quick View Selector */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => {
            setActiveView('home');
            setStep(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeView === 'home'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Início / Meu Caminhão</span>
        </button>

        <button
          onClick={() => {
            setActiveView('new-report');
            setSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeView === 'new-report'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Preencher Relatório Diário</span>
        </button>

        <button
          onClick={() => {
            setActiveView('history');
            loadReports();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeView === 'history'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Meus Relatórios ({reports.length})</span>
        </button>
      </div>

      {/* VIEW: HOME OVERVIEW FOR DRIVER */}
      {activeView === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Action Button Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
            <div>
              <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                Rotina Diária
              </span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">
                Lançamento do Dia de Trabalho
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                Preencha os dados do trajeto, combustível, pedágios, ajudante e a lista de cidades com as entregas realizadas hoje.
              </p>
            </div>

            <button
              onClick={() => setActiveView('new-report')}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
            >
              <Plus className="w-5 h-5" />
              <span>INICIAR RELATÓRIO DE HOJE</span>
            </button>
          </div>

          {/* Maintenance Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Status de Manutenção
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Filtros Trocados: {linkedVehicle?.filtersReplaced ? 'SIM' : 'NÃO'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Última Troca de Óleo:</span>
                <span className="font-mono text-slate-200">
                  {linkedVehicle?.lastOilChangeDate.split('-').reverse().join('/')} ({linkedVehicle?.lastOilChangeKm.toLocaleString('pt-BR')} km)
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Próxima Troca de Óleo:</span>
                <span className={`font-mono font-bold ${kmToNextOilChange <= 200 ? 'text-orange-400' : 'text-slate-200'}`}>
                  {linkedVehicle?.nextOilChangeKm.toLocaleString('pt-BR')} km (em {kmToNextOilChange} km)
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Quilometragem Atual:</span>
                <span className="font-mono font-bold text-slate-100 text-sm">
                  {linkedVehicle?.currentKm.toLocaleString('pt-BR')} km
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: NEW DAILY REPORT (2 ETAPAS) */}
      {activeView === 'new-report' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
          {/* Wizard Header / Stepper */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                Relatório de Serviço Diário
              </span>
              <h3 className="text-lg font-bold text-slate-100">
                {step === 1 ? 'ETAPA 1 – DADOS DO DIA' : 'ETAPA 2 – CIDADES E ENTREGAS'}
              </h3>
            </div>

            {/* Step Pills */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <div className={`px-3 py-1.5 rounded-lg border ${
                step === 1 ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                1. Dados do Dia
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <div className={`px-3 py-1.5 rounded-lg border ${
                step === 2 ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                2. Cidades & Entregas
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: DADOS DO DIA */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Driver & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Motorista (Preenchido Automaticamente)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentDriver.name}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-400 font-medium cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data do Serviço *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Kilometers and Distance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quilometragem Inicial *
                  </label>
                  <input
                    type="number"
                    required
                    value={startKm}
                    onChange={(e) => setStartKm(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quilometragem Final *
                  </label>
                  <input
                    type="number"
                    required
                    value={endKm}
                    onChange={(e) => setEndKm(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quilômetros Percorridos (Calculado)
                  </label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono font-bold text-emerald-400 flex items-center justify-between">
                    <span>{distanceKm.toLocaleString('pt-BR')} km</span>
                    <span className="text-[10px] text-slate-500 font-normal">Final - Inicial</span>
                  </div>
                </div>
              </div>

              {/* Helper & Tolls Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Houve Ajudante no Dia de Trabalho? *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHasHelper(true)}
                      className={`py-3 rounded-xl font-bold text-xs transition-colors border ${
                        hasHelper
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      SIM (Com Ajudante)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasHelper(false)}
                      className={`py-3 rounded-xl font-bold text-xs transition-colors border ${
                        !hasHelper
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      NÃO (Sem Ajudante)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantidade de Pedágios Pagos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tollsCount}
                    onChange={(e) => setTollsCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Fuel Inputs */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Fuel className="w-4 h-4" /> Registro de Abastecimento (Obrigatório)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Valor Total Abastecido (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={fuelCost}
                      onChange={(e) => setFuelCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Quantidade de Litros Abastecidos *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      required
                      value={fuelLiters}
                      onChange={(e) => setFuelLiters(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Other Expenses Categorized */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Gastos Diversos (Óleo, Manutenção, Outros)
                    </span>
                    <p className="text-[11px] text-slate-500">Despesas eventuais incorridas na rota</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddExpense}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Despesa</span>
                  </button>
                </div>

                {otherExpenses.map((expense) => (
                  <div key={expense.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="sm:col-span-3">
                      <select
                        value={expense.category}
                        onChange={(e) => handleUpdateExpense(expense.id, 'category', e.target.value as ExpenseCategory)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Óleo">Óleo</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        placeholder="Valor R$"
                        value={expense.amount || ''}
                        onChange={(e) => handleUpdateExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Descrição (ex: 1L fluido de freio, reparo lâmpada)"
                        value={expense.description}
                        onChange={(e) => handleUpdateExpense(expense.id, 'description', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(expense.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Advance to Step 2 Button */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all active:scale-[0.99]"
                >
                  <span>AVANÇAR PARA ETAPA 2 (ENTREGAS)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CIDADES E ENTREGAS */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Lista de Cidades e Cargas Entregues
                  </h4>
                  <p className="text-xs text-slate-400">
                    Adicione cada entrega realizada no dia. O total de fretes será calculado automaticamente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddDelivery}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Entrega</span>
                </button>
              </div>

              {/* Dynamic Deliveries Table / Rows */}
              <div className="space-y-3">
                {deliveries.map((delivery, index) => (
                  <div
                    key={delivery.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-950 p-4 rounded-xl border border-slate-800"
                  >
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                        Cidade #{index + 1}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Campinas"
                        value={delivery.city}
                        onChange={(e) => handleUpdateDelivery(delivery.id, 'city', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                        Material Entregue
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 1 frete churrasqueira, 11 dutos"
                        value={delivery.material}
                        onChange={(e) => handleUpdateDelivery(delivery.id, 'material', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                        Quantidade
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 1, 11"
                        value={delivery.quantity}
                        onChange={(e) => handleUpdateDelivery(delivery.id, 'quantity', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                        Valor Frete (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="R$ 170,00"
                        value={delivery.freightValue || ''}
                        onChange={(e) => handleUpdateDelivery(delivery.id, 'freightValue', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-1 text-right pt-3 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveDelivery(delivery.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Remover linha de entrega"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Automatic Summary Box */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Total de Entregas Realizadas:</span>
                  <span className="text-2xl font-bold font-mono text-slate-100">
                    {totalDeliveriesCount}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Total de Fretes do Dia:</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    R$ {totalFreightValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Km Rodado / Litros:</span>
                  <span className="text-base font-bold font-mono text-slate-200">
                    {distanceKm} km · {fuelLiters} L
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Etapa 1</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitReport}
                  className="px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <PackageCheck className="w-5 h-5" />
                  <span>{submitting ? 'Salvando...' : 'FINALIZAR E ENVIAR RELATÓRIO'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: DRIVER'S OWN REPORT HISTORY */}
      {activeView === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Histórico dos Meus Relatórios Diários Enviados
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              {reports.length} relatórios registrados
            </span>
          </div>

          {loadingReports ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs">
              Carregando relatórios...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
              Você ainda não enviou nenhum relatório diário. Clique em &quot;Preencher Relatório Diário&quot; para registrar seu primeiro dia de serviço.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors space-y-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-100 text-sm">
                        Data: {report.date.split('-').reverse().join('/')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                        Placa: {report.vehiclePlate}
                      </span>
                      {report.hasHelper && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Com Ajudante
                        </span>
                      )}
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                      report.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      report.status === 'paid' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                      'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {report.status === 'approved' ? 'Aprovado pelo Admin' : report.status === 'paid' ? 'Pago' : 'Aguardando Aprovação'}
                    </span>
                  </div>

                  {/* Metrics summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Km Percorrido:</span>
                      <strong className="text-slate-200 font-mono">{report.distanceKm} km</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Combustível:</span>
                      <strong className="text-slate-200 font-mono">{report.fuelLiters} L (R$ {report.fuelCost.toFixed(2)})</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Qtd. Entregas:</span>
                      <strong className="text-slate-200 font-mono">{report.totalDeliveries} entregas</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Fretes:</span>
                      <strong className="text-emerald-400 font-mono font-bold">R$ {report.totalFreight.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Deliveries list details */}
                  <div className="text-xs text-slate-400 space-y-1">
                    <span className="font-semibold text-slate-300">Cidades & Cargas:</span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {report.deliveries.map((del) => (
                        <span key={del.id} className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-[11px] text-slate-300">
                          <strong>{del.city}</strong>: {del.material} (R$ {del.freightValue.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>

                  {report.canEdit && (
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg">
                      <span className="text-xs text-amber-300 font-medium">
                        Edição autorizada pelo Administrador. Você pode fazer alterações neste relatório.
                      </span>
                      <button
                        onClick={() => handleStartEditReport(report)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors"
                      >
                        Editar Relatório
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
