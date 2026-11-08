'use client';

import React, { useState, useMemo } from 'react';
import { 
  Driver, 
  Vehicle, 
  DailyReport, 
  DailyRateConfig, 
  TollRecord, 
  PaymentRecord, 
  SystemNotification,
  UserProfile 
} from '@/types/truck-service';
import { 
  createDriver, 
  updateDriver, 
  deleteDriver, 
  createVehicle, 
  updateVehicle, 
  deleteVehicle,
  recordOilChange, 
  createDailyRate, 
  deleteDailyRate,
  createToll, 
  deleteToll, 
  createPayment, 
  deletePayment,
  checkPaymentExistsForPeriod, 
  updateDailyReport,
  deleteDailyReport 
} from '@/services/firestoreService';
import { MercosulPlate } from './MercosulPlate';
import { Modal } from './Modal';
import { SupabasePanel } from './SupabasePanel';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  FileText, 
  DollarSign, 
  Wrench, 
  Calculator, 
  History, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileSpreadsheet, 
  Fuel, 
  ShieldCheck, 
  Trash2, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Receipt,
  FileCheck2,
  AlertOctagon,
  Phone,
  Database
} from 'lucide-react';

export interface DriverCnhStatus {
  driver: Driver;
  daysRemaining: number;
  isExpired: boolean;
  isCritical: boolean; // <= 30 days
  expiryFormatted: string;
}

/**
 * Função de verificação no Painel do Administrador que identifica
 * motoristas cuja CNH vencerá nos próximos 30 dias (ou já está vencida).
 */
export function checkDriverCnhStatus(driver: Driver, referenceDate = new Date()): DriverCnhStatus {
  if (!driver.cnhExpiry) {
    return {
      driver,
      daysRemaining: 9999,
      isExpired: false,
      isCritical: false,
      expiryFormatted: 'Não informada',
    };
  }

  const parts = driver.cnhExpiry.split('-').map(Number);
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const expiryMidnight = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  
  const diffTime = expiryMidnight.getTime() - refMidnight.getTime();
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  const isExpired = daysRemaining < 0;
  const isCritical = daysRemaining <= 30; // Vence em até 30 dias ou já vencida
  const expiryFormatted = driver.cnhExpiry.split('-').reverse().join('/');

  return {
    driver,
    daysRemaining,
    isExpired,
    isCritical,
    expiryFormatted,
  };
}

interface AdminDashboardProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  dailyReports: DailyReport[];
  dailyRates: DailyRateConfig[];
  tolls: TollRecord[];
  payments: PaymentRecord[];
  adminProfile: UserProfile;
  onRefreshData: () => void;
}

export function AdminDashboard({
  drivers,
  vehicles,
  dailyReports,
  dailyRates,
  tolls,
  payments,
  adminProfile,
  onRefreshData,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Filters for Dashboard & Reports
  const [selectedDriverFilter, setSelectedDriverFilter] = useState('all');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('2026-11-01');
  const [endDateFilter, setEndDateFilter] = useState('2026-11-30');
  const [driverCnhFilter, setDriverCnhFilter] = useState<'all' | 'critical'>('all');

  // Verificação de motoristas com CNH crítica (vencendo em <= 30 dias ou já vencida)
  const driversWithCnhAlert = useMemo(() => {
    return drivers
      .map((d) => checkDriverCnhStatus(d))
      .filter((s) => s.isCritical)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [drivers]);

  // Current active daily rate (latest effective)
  const currentDailyRate = useMemo(() => {
    return dailyRates[0] || {
      id: 'default',
      driverDailyRate: 220.00,
      helperDailyRate: 130.00,
      effectiveDate: '2026-01-01',
      createdAt: '',
    };
  }, [dailyRates]);

  // Modals
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isTollModalOpen, setIsTollModalOpen] = useState(false);
  const [isOilChangeModalOpen, setIsOilChangeModalOpen] = useState(false);
  const [selectedVehicleForOil, setSelectedVehicleForOil] = useState<Vehicle | null>(null);

  // Forms
  const [newDriver, setNewDriver] = useState({
    name: '',
    rg: '',
    cpf: '',
    address: '',
    cnhCategory: 'E' as 'C' | 'D' | 'E',
    cnhNumber: '',
    cnhExpiry: '2028-12-31',
    vehicleId: '',
    loginEmail: '',
    password: '',
    phone: '',
    active: true,
  });

  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    model: '',
    currentKm: 0,
    lastOilChangeDate: new Date().toISOString().slice(0, 10),
    lastOilChangeKm: 0,
    nextOilChangeKm: 20000,
    filtersReplaced: true,
  });

  const [newRate, setNewRate] = useState({
    driverDailyRate: currentDailyRate.driverDailyRate,
    helperDailyRate: currentDailyRate.helperDailyRate,
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  const [newToll, setNewToll] = useState({
    date: new Date().toISOString().slice(0, 10),
    route: '',
    vehicleId: '',
    cost: 45.00,
  });

  const [oilChangeForm, setOilChangeForm] = useState({
    currentKm: 0,
    intervalKm: 20000,
    filtersReplaced: true,
  });

  // Payment Calculation State (Section 10)
  const [calcDriverId, setCalcDriverId] = useState(drivers[0]?.id || '');
  const [calcStartDate, setCalcStartDate] = useState('2026-11-01');
  const [calcEndDate, setCalcEndDate] = useState('2026-11-07');
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null);

  // Filtered reports by date, driver, vehicle
  const filteredReports = useMemo(() => {
    return dailyReports.filter((rep) => {
      const matchDriver = selectedDriverFilter === 'all' || rep.driverId === selectedDriverFilter;
      const matchVehicle = selectedVehicleFilter === 'all' || rep.vehicleId === selectedVehicleFilter;
      const matchStart = !startDateFilter || rep.date >= startDateFilter;
      const matchEnd = !endDateFilter || rep.date <= endDateFilter;
      return matchDriver && matchVehicle && matchStart && matchEnd;
    });
  }, [dailyReports, selectedDriverFilter, selectedVehicleFilter, startDateFilter, endDateFilter]);

  // Section 6 & 9 Financial Calculations
  const metrics = useMemo(() => {
    // Total kilometers
    const totalKm = filteredReports.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
    // Fuel totals
    const totalFuelLiters = filteredReports.reduce((acc, r) => acc + (r.fuelLiters || 0), 0);
    const totalFuelCost = filteredReports.reduce((acc, r) => acc + (r.fuelCost || 0), 0);
    const avgKmL = totalFuelLiters > 0 ? (totalKm / totalFuelLiters).toFixed(2) : '0.00';

    // Driver days and Helper days
    const totalDriverDaysWorked = filteredReports.length;
    const totalHelperDaysWorked = filteredReports.filter((r) => r.hasHelper).length;

    // Daily rate expenses (applying effective rate for the report date or current)
    const driverExpenses = filteredReports.reduce((acc, r) => {
      const rate = dailyRates.find((rt) => rt.effectiveDate <= r.date) || currentDailyRate;
      return acc + (rate.driverDailyRate || 0);
    }, 0);

    const helperExpenses = filteredReports.reduce((acc, r) => {
      if (!r.hasHelper) return acc;
      const rate = dailyRates.find((rt) => rt.effectiveDate <= r.date) || currentDailyRate;
      return acc + (rate.helperDailyRate || 0);
    }, 0);

    // Other Expenses from reports
    const totalOtherExpenses = filteredReports.reduce((acc, r) => acc + (r.totalOtherExpenses || 0), 0);

    // Tolls expenses (matching filter dates and vehicles)
    const filteredTolls = tolls.filter((t) => {
      const matchDate = (!startDateFilter || t.date >= startDateFilter) && (!endDateFilter || t.date <= endDateFilter);
      const matchVehicle = selectedVehicleFilter === 'all' || t.vehicleId === selectedVehicleFilter;
      return matchDate && matchVehicle;
    });
    const totalTollsCost = filteredTolls.reduce((acc, t) => acc + t.cost, 0);

    // Total Freight Gross Revenue for filtered period
    const totalFreightRevenue = filteredReports.reduce((acc, r) => acc + (r.totalFreight || 0), 0);

    // Faturamento Diário (relatórios de hoje)
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthStr = todayStr.slice(0, 7);

    const dailyFreightRevenue = dailyReports
      .filter((r) => r.date === todayStr)
      .reduce((acc, r) => acc + (r.totalFreight || 0), 0);

    // Faturamento Mensal (relatórios deste mês)
    const monthlyFreightRevenue = dailyReports
      .filter((r) => r.date.startsWith(currentMonthStr))
      .reduce((acc, r) => acc + (r.totalFreight || 0), 0);

    // Total Operating Expenses (Motoristas + Ajudantes + Pedágios + Combustível + Diversos)
    const totalExpenses = driverExpenses + helperExpenses + totalTollsCost + totalFuelCost + totalOtherExpenses;

    // Net Profit (Valor total dos fretes - Total despesas)
    const netProfit = totalFreightRevenue - totalExpenses;

    return {
      dailyFreightRevenue,
      monthlyFreightRevenue,
      totalKm,
      totalFuelLiters,
      totalFuelCost,
      avgKmL,
      totalDriverDaysWorked,
      totalHelperDaysWorked,
      driverExpenses,
      helperExpenses,
      totalOtherExpenses,
      totalTollsCost,
      totalFreightRevenue,
      totalExpenses,
      netProfit,
      reportsCount: filteredReports.length,
    };
  }, [filteredReports, dailyReports, tolls, dailyRates, currentDailyRate, startDateFilter, endDateFilter, selectedVehicleFilter]);

  // Section 10 Payment Calculation Logic
  const paymentCalcResult = useMemo(() => {
    if (!calcDriverId) return null;
    const targetDriver = drivers.find((d) => d.id === calcDriverId);
    if (!targetDriver) return null;

    // Reports of target driver in period
    const driverPeriodReports = dailyReports.filter((r) => {
      return r.driverId === calcDriverId && r.date >= calcStartDate && r.date <= calcEndDate;
    });

    const daysWorked = driverPeriodReports.length;
    const daysWithHelper = driverPeriodReports.filter((r) => r.hasHelper).length;

    // Using latest rate
    const driverAmount = daysWorked * currentDailyRate.driverDailyRate;
    const helperAmount = daysWithHelper * currentDailyRate.helperDailyRate;
    const totalFreight = driverPeriodReports.reduce((acc, r) => acc + (r.totalFreight || 0), 0);
    const netReceived = totalFreight - driverAmount - helperAmount;

    return {
      driver: targetDriver,
      daysWorked,
      daysWithHelper,
      driverAmount,
      helperAmount,
      totalFreight,
      netReceived,
      reports: driverPeriodReports,
    };
  }, [calcDriverId, calcStartDate, calcEndDate, dailyReports, drivers, currentDailyRate]);

  // Handlers
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.cpf) return;
    await createDriver(newDriver);
    setIsDriverModalOpen(false);
    onRefreshData();
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate || !newVehicle.model) return;
    await createVehicle({
      ...newVehicle,
      plate: newVehicle.plate.toUpperCase().trim(),
    });
    setIsVehicleModalOpen(false);
    onRefreshData();
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDailyRate(newRate);
    setIsRateModalOpen(false);
    onRefreshData();
  };

  const handleCreateToll = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = vehicles.find((item) => item.id === newToll.vehicleId);
    await createToll({
      ...newToll,
      vehiclePlate: v?.plate,
    });
    setIsTollModalOpen(false);
    onRefreshData();
  };

  const handlePerformOilChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForOil) return;
    await recordOilChange(
      selectedVehicleForOil.id,
      oilChangeForm.currentKm,
      oilChangeForm.intervalKm,
      oilChangeForm.filtersReplaced
    );
    setIsOilChangeModalOpen(false);
    setSelectedVehicleForOil(null);
    onRefreshData();
  };

  const handleConfirmPayment = async () => {
    setPaymentSuccessMsg(null);
    setPaymentErrorMsg(null);

    if (!paymentCalcResult || !calcDriverId) return;

    // Check duplicate payment
    const isAlreadyPaid = await checkPaymentExistsForPeriod(calcDriverId, calcStartDate, calcEndDate);
    if (isAlreadyPaid) {
      setPaymentErrorMsg(`ATENÇÃO: Já existe um pagamento confirmado para o motorista ${paymentCalcResult.driver.name} no período de ${calcStartDate} a ${calcEndDate}. Não é permitido duplicar pagamentos.`);
      return;
    }

    try {
      await createPayment({
        driverId: calcDriverId,
        driverName: paymentCalcResult.driver.name,
        startDate: calcStartDate,
        endDate: calcEndDate,
        daysWorked: paymentCalcResult.daysWorked,
        daysWithHelper: paymentCalcResult.daysWithHelper,
        driverAmount: paymentCalcResult.driverAmount,
        helperAmount: paymentCalcResult.helperAmount,
        netReceived: paymentCalcResult.netReceived,
        totalFreight: paymentCalcResult.totalFreight,
        confirmedAt: new Date().toISOString(),
        confirmedByAdminEmail: adminProfile.email,
      });

      // Mark reports in period as paid
      for (const rep of paymentCalcResult.reports) {
        await updateDailyReport({
          ...rep,
          status: 'paid',
        });
      }

      setPaymentSuccessMsg(`Pagamento de R$ ${paymentCalcResult.driverAmount.toFixed(2)} ao motorista ${paymentCalcResult.driver.name} e R$ ${paymentCalcResult.helperAmount.toFixed(2)} ao ajudante confirmado com sucesso!`);
      onRefreshData();
    } catch (err) {
      setPaymentErrorMsg('Erro ao registrar confirmação do pagamento no Firestore.');
    }
  };

  const handleApproveReport = async (report: DailyReport) => {
    await updateDailyReport({
      ...report,
      status: 'approved',
    });
    onRefreshData();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Data', 'Motorista', 'Placa', 'Km_Inicial', 'Km_Final', 'Km_Percorrido', 'Litros', 'Custo_Combustivel', 'Ajudante', 'Qtd_Entregas', 'Valor_Fretes_R$', 'Status'];
    const rows = filteredReports.map((r) => [
      r.date,
      r.driverName,
      r.vehiclePlate,
      r.startKm,
      r.endKm,
      r.distanceKm,
      r.fuelLiters,
      r.fuelCost,
      r.hasHelper ? 'SIM' : 'NÃO',
      r.totalDeliveries,
      r.totalFreight,
      r.status,
    ].join(';'));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_financeiro_truckgestao_${startDateFilter}_${endDateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check vehicles with oil alerts (< 200 km)
  const vehiclesWithOilAlert = vehicles.filter((v) => (v.nextOilChangeKm - v.currentKm) <= 200);

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs for Admin */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'dashboard', label: 'Dashboard & Faturamento', icon: LayoutDashboard },
          { id: 'reports', label: 'Relatórios Diários', icon: FileText, badge: dailyReports.filter((r) => r.status === 'submitted').length },
          { id: 'vehicles', label: 'Veículos & Óleo', icon: Truck, alertBadge: vehiclesWithOilAlert.length },
          { id: 'drivers', label: 'Motoristas', icon: Users, alertBadge: driversWithCnhAlert.length },
          { id: 'rates', label: 'Diárias', icon: Receipt },
          { id: 'tolls', label: 'Pedágios', icon: DollarSign },
          { id: 'payments', label: 'Cálculo de Pagamentos', icon: Calculator },
          { id: 'history', label: 'Histórico de Pagamentos', icon: History },
          { id: 'financial-report', label: 'Relatório Financeiro', icon: FileSpreadsheet },
          { id: 'supabase', label: 'Supabase & Migrations', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.alertBadge && tab.alertBadge > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                  {tab.alertBadge}
                </span>
              ) : tab.badge && tab.badge > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-mono text-[10px] font-bold">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Global Filter Bar for Dashboard & Reports */}
      {(activeTab === 'dashboard' || activeTab === 'financial-report' || activeTab === 'reports') && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" /> Filtros Operacionais:
            </span>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="text-slate-500">De:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
              />
              <span className="text-slate-500">Até:</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
              />
            </div>

            {/* Driver Filter */}
            <select
              value={selectedDriverFilter}
              onChange={(e) => setSelectedDriverFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-xs text-slate-200"
            >
              <option value="all">Todos os Motoristas</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Vehicle Filter */}
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-xs text-slate-200"
            >
              <option value="all">Todos os Veículos</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plate} ({v.model})</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      )}

      {/* TAB 1: DASHBOARD GERAL & FATURAMENTO (Section 6) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Requirement 6: Top Faturamento & Resultados Financeiros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Faturamento Diário (Hoje)
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                R$ {metrics.dailyFreightRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Fretes faturados na data de hoje
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Faturamento Mensal (Mês)
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                R$ {metrics.monthlyFreightRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Fretes acumulados no mês vigente
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Faturamento do Período
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                R$ {metrics.totalFreightRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {metrics.reportsCount} relatórios filtrados
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total de Despesas
              </span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                R$ {metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Combustível, diárias, pedágios, oficina
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Lucro Líquido
              </span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                R$ {metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Receita líquida da transportadora
              </div>
            </div>
          </div>

          {/* Operational Metrics (Km, Litros, Média km/l, Diárias pagas, Qtd relatórios) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-slate-400 block font-medium">Km Rodados:</span>
              <span className="text-base font-bold font-mono text-slate-100">
                {metrics.totalKm.toLocaleString('pt-BR')} km
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-slate-400 block font-medium">Litros Abastecidos:</span>
              <span className="text-base font-bold font-mono text-slate-100">
                {metrics.totalFuelLiters.toLocaleString('pt-BR')} L
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-slate-400 block font-medium">Média de Consumo:</span>
              <span className="text-base font-bold font-mono text-amber-400">
                {metrics.avgKmL} km/L
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-slate-400 block font-medium">Pago a Motoristas:</span>
              <span className="text-base font-bold font-mono text-slate-100">
                R$ {metrics.driverExpenses.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-slate-400 block font-medium">Pago a Ajudantes:</span>
              <span className="text-base font-bold font-mono text-slate-100">
                R$ {metrics.helperExpenses.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-slate-400 block font-medium">Relatórios Recebidos:</span>
              <span className="text-base font-bold font-mono text-blue-400">
                {metrics.reportsCount} enviados
              </span>
            </div>
          </div>

          {/* CARD DE ALERTA PRIORITÁRIO: VENCIMENTO DE CNH (Próximos 30 Dias) */}
          {driversWithCnhAlert.length > 0 && (
            <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/20 border-2 border-rose-500/70 p-5 rounded-2xl shadow-xl shadow-rose-950/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertOctagon className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-rose-100 uppercase tracking-wide">
                        Alerta Prioritário: CNH com Vencimento Próximo (Próximos 30 Dias)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                        {driversWithCnhAlert.length} motorista{driversWithCnhAlert.length > 1 ? 's' : ''} crítico{driversWithCnhAlert.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300/80 mt-0.5">
                      Identificado(s) motorista(s) com habilitação com menos de 30 dias de validade. Providencie a renovação imediatamente para evitar paralisação das viagens e multas.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDriverCnhFilter('critical');
                    setActiveTab('drivers');
                  }}
                  className="px-3.5 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <Users className="w-4 h-4" />
                  <span>Ver Motoristas Críticos</span>
                </button>
              </div>

              {/* Grid dos Motoristas com CNH Crítica */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {driversWithCnhAlert.map(({ driver, daysRemaining, isExpired, expiryFormatted }) => {
                  const truck = vehicles.find((v) => v.id === driver.vehicleId);
                  return (
                    <div
                      key={driver.id}
                      className="bg-slate-950/80 border border-rose-500/40 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-slate-100 text-sm block">{driver.name}</strong>
                          <span className="text-[11px] text-slate-400 font-mono">
                            CPF: {driver.cpf} · CNH {driver.cnhCategory}: {driver.cnhNumber}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          isExpired
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {isExpired
                            ? `VENCIDA (${Math.abs(daysRemaining)}d)`
                            : `Vence em ${daysRemaining} dia${daysRemaining === 1 ? '' : 's'}`}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center justify-between border-t border-slate-900 pt-2">
                        <span>
                          Vencimento: <strong className="text-rose-300 font-mono">{expiryFormatted}</strong>
                        </span>
                        {truck && (
                          <span className="text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                            Caminhão: {truck.plate}
                          </span>
                        )}
                      </div>

                      {driver.phone && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-rose-400" />
                          <span>Telefone: {driver.phone}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Urgent Maintenance & Oil Alerts Banner */}
          {vehiclesWithOilAlert.length > 0 && (
            <div className="bg-orange-950/30 border border-orange-500/50 p-4 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
                <div className="text-xs">
                  <strong className="text-orange-200">
                    Aviso de Manutenção: {vehiclesWithOilAlert.length} veículo(s) com troca de óleo necessária (menos de 200 km restantes)!
                  </strong>
                  <div className="text-orange-300/80">
                    {vehiclesWithOilAlert.map((v) => `${v.plate} (${v.model} - restam ${v.nextOilChangeKm - v.currentKm} km)`).join(' · ')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('vehicles')}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-lg text-xs shrink-0"
              >
                Gerenciar Veículos
              </button>
            </div>
          )}

          {/* Recent Reports submitted by drivers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Últimos Relatórios Recebidos dos Motoristas
              </h4>
              <button
                onClick={() => setActiveTab('reports')}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Ver todos ({dailyReports.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {dailyReports.slice(0, 4).map((rep) => (
                <div
                  key={rep.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{rep.driverName}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-slate-300">{rep.date}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-amber-400 font-semibold">{rep.vehiclePlate}</span>
                    </div>
                    <div className="text-slate-400">
                      {rep.distanceKm} km rodados · {rep.totalDeliveries} entregas realizadas · Combustível: R$ {rep.fuelCost.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      R$ {rep.totalFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>

                    {rep.status === 'submitted' ? (
                      <button
                        onClick={() => handleApproveReport(rep)}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[11px] transition-colors"
                      >
                        Aprovar
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-400">
                        {rep.status === 'approved' ? 'Aprovado' : 'Pago'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RELATÓRIOS DIÁRIOS RECEBIDOS (AUDITORIA E ENTREGAS) */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                Auditoria de Relatórios Diários de Trabalho
              </h4>
              <p className="text-xs text-slate-400">
                Acompanhe o trajeto, entregas em cada cidade e aprove os relatórios enviados
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {filteredReports.length} relatórios listados
            </span>
          </div>

          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors space-y-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-100 text-sm">
                      {report.driverName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-950 border border-slate-800 font-mono text-slate-300">
                      Placa: {report.vehiclePlate}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Data: {report.date.split('-').reverse().join('/')}
                    </span>
                    {report.hasHelper && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Com Ajudante
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold font-mono text-emerald-400">
                      Frete Total: R$ {report.totalFreight.toFixed(2)}
                    </span>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase font-mono ${
                      report.status === 'paid'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : report.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {report.status === 'paid' ? 'Pago' : report.status === 'approved' ? 'Aprovado' : 'Pendente'}
                    </span>

                    {/* Section 5: Autorização de Edição */}
                    <button
                      onClick={async () => {
                        await updateDailyReport({
                          ...report,
                          canEdit: !report.canEdit,
                        });
                        onRefreshData();
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                        report.canEdit
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                      title="Autorizar o motorista a editar este relatório em caso de ajuste solicitado (Seção 5)"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>{report.canEdit ? 'Edição Autorizada' : 'Autorizar Edição'}</span>
                    </button>

                    {report.status === 'submitted' && (
                      <button
                        onClick={() => handleApproveReport(report)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition-colors"
                      >
                        Aprovar
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (confirm(`Excluir relatório do dia ${report.date}?`)) {
                          await deleteDailyReport(report.id);
                          onRefreshData();
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Excluir relatório diário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Km Inicial / Final:</span>
                    <span className="font-mono text-slate-200">
                      {report.startKm} km → {report.endKm} km ({report.distanceKm} km rodados)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Abastecimento:</span>
                    <span className="font-mono text-slate-200">
                      {report.fuelLiters} L · R$ {report.fuelCost.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pedágios Informados:</span>
                    <span className="font-mono text-slate-200">
                      {report.tollsCount} praças
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Gastos Diversos:</span>
                    <span className="font-mono text-slate-200">
                      R$ {report.totalOtherExpenses.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Cities and Deliveries List */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cidades e Entregas Registradas ({report.totalDeliveries}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {report.deliveries.map((del) => (
                      <div
                        key={del.id}
                        className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs flex justify-between items-center"
                      >
                        <div>
                          <strong className="text-slate-200 block">{del.city}</strong>
                          <span className="text-slate-400 text-[11px]">{del.material} (Qtd: {del.quantity})</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400">
                          R$ {Number(del.freightValue).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VEÍCULOS & ALERTA DE ÓLEO (Section 4) */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                Cadastro e Controle de Manutenção dos Veículos
              </h4>
              <p className="text-xs text-slate-400">
                Alerta automático de troca de óleo com limite de 200 km
              </p>
            </div>

            <button
              onClick={() => setIsVehicleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Veículo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const kmLeft = v.nextOilChangeKm - v.currentKm;
              const isUrgent = kmLeft <= 200;

              return (
                <div
                  key={v.id}
                  className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between ${
                    isUrgent ? 'border-orange-500/80 bg-orange-950/20' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <MercosulPlate plate={v.plate} size="md" />
                      {isUrgent && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500 text-slate-950 animate-pulse">
                          ÓLEO URGENTE
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-100">{v.model}</h4>
                      <p className="text-xs text-slate-400">
                        Odômetro Atual: <strong className="font-mono text-slate-200">{v.currentKm.toLocaleString('pt-BR')} km</strong>
                      </p>
                    </div>

                    {/* Oil Maintenance Box */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Última Troca:</span>
                        <span className="font-mono text-slate-200">
                          {v.lastOilChangeDate.split('-').reverse().join('/')} ({v.lastOilChangeKm.toLocaleString('pt-BR')} km)
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Próxima Troca:</span>
                        <span className={`font-mono font-bold ${isUrgent ? 'text-orange-400' : 'text-slate-200'}`}>
                          {v.nextOilChangeKm.toLocaleString('pt-BR')} km
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Faltam:</span>
                        <span className={`font-mono font-bold ${isUrgent ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {kmLeft <= 0 ? 'VENCIDA!' : `${kmLeft.toLocaleString('pt-BR')} km`}
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Filtros Trocados:</span>
                        <span className="font-bold text-slate-300">
                          {v.filtersReplaced ? 'SIM' : 'NÃO'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <button
                      onClick={async () => {
                        if (confirm(`Tem certeza que deseja excluir o veículo ${v.plate} (${v.model})?`)) {
                          await deleteVehicle(v.id);
                          onRefreshData();
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Excluir veículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedVehicleForOil(v);
                        setOilChangeForm({
                          currentKm: v.currentKm,
                          intervalKm: 20000,
                          filtersReplaced: true,
                        });
                        setIsOilChangeModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Registrar Nova Troca de Óleo</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CADASTRO DE MOTORISTAS (Section 3) */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Cadastro e Gestão de Motoristas
              </h4>
              <p className="text-xs text-slate-400">
                Controle de CNH, identificador único e veículo vinculado
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setDriverCnhFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    driverCnhFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todos ({drivers.length})
                </button>
                <button
                  onClick={() => setDriverCnhFilter('critical')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    driverCnhFilter === 'critical'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span>CNH Crítica ≤ 30d</span>
                  {driversWithCnhAlert.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 text-[10px] font-mono font-bold">
                      {driversWithCnhAlert.length}
                    </span>
                  )}
                </button>
              </div>

              <button
                onClick={() => setIsDriverModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Motorista</span>
              </button>
            </div>
          </div>

          {/* List of displayed drivers */}
          {(() => {
            const displayedDrivers = driverCnhFilter === 'critical'
              ? drivers.filter((d) => checkDriverCnhStatus(d).isCritical)
              : drivers;

            if (displayedDrivers.length === 0) {
              return (
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-xs">
                  Nenhum motorista com CNH crítica encontrado. Todas as habilitações estão regulares com validade superior a 30 dias.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedDrivers.map((d) => {
                  const truck = vehicles.find((v) => v.id === d.vehicleId);
                  const cnhStatus = checkDriverCnhStatus(d);

                  return (
                    <div
                      key={d.id}
                      className={`bg-slate-900 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                        cnhStatus.isCritical
                          ? 'border-2 border-rose-500/80 bg-rose-950/15 shadow-rose-950/30'
                          : 'border border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-base font-bold text-slate-100">{d.name}</h4>
                              {cnhStatus.isCritical && (
                                <span title="CNH com vencimento próximo ou vencida!">
                                  <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block">ID: {d.id}</span>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              CNH Cat. {d.cnhCategory}
                            </span>
                            {cnhStatus.isCritical && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                cnhStatus.isExpired
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}>
                                {cnhStatus.isExpired ? 'VENCIDA' : `Vence em ${cnhStatus.daysRemaining}d`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>CPF:</span>
                            <span className="font-mono text-slate-200">{d.cpf}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>RG:</span>
                            <span className="font-mono text-slate-200">{d.rg}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Registro CNH:</span>
                            <span className="font-mono text-slate-200">{d.cnhNumber}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400">
                            <span>Validade CNH:</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono font-bold ${cnhStatus.isCritical ? 'text-rose-400' : 'text-slate-200'}`}>
                                {cnhStatus.expiryFormatted}
                              </span>
                              {cnhStatus.isCritical && (
                                <span className="text-[10px] font-mono text-rose-400">
                                  ({cnhStatus.isExpired ? 'Vencida!' : `${cnhStatus.daysRemaining} dias`})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Veículo Vinculado:</span>
                            <span className="font-bold text-slate-200">{truck ? truck.plate : 'Nenhum'}</span>
                          </div>
                          {d.phone && (
                            <div className="flex justify-between text-slate-400">
                              <span>Telefone:</span>
                              <span className="font-mono text-slate-300">{d.phone}</span>
                            </div>
                          )}
                          {d.loginEmail && (
                            <div className="flex justify-between text-slate-400">
                              <span>Login:</span>
                              <span className="font-mono text-amber-400">{d.loginEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                        <span className="text-slate-500 truncate max-w-[200px]">{d.address}</span>
                        <button
                          onClick={async () => {
                            await deleteDriver(d.id);
                            onRefreshData();
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Excluir motorista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 5: CADASTRO DE DIÁRIAS COM HISTÓRICO (Section 7) */}
      {activeTab === 'rates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                Configuração das Diárias de Motoristas e Ajudantes
              </h4>
              <p className="text-xs text-slate-400">
                Histórico de vigência garantindo integridade de pagamentos de períodos anteriores
              </p>
            </div>

            <button
              onClick={() => setIsRateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Vigência de Diária</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Diária Vigente Atual
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-xs">Diária Motorista</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    R$ {currentDailyRate.driverDailyRate.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-xs">Diária Ajudante</span>
                  <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                    R$ {currentDailyRate.helperDailyRate.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Vigente desde: {currentDailyRate.effectiveDate.split('-').reverse().join('/')}
              </div>
            </div>

            {/* Historical list */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Histórico de Alterações de Valores
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {dailyRates.map((rate) => (
                  <div key={rate.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-slate-200 block">Vigência: {rate.effectiveDate}</strong>
                      <span className="text-slate-400 font-mono">
                        Motorista: R$ {rate.driverDailyRate.toFixed(2)} · Ajudante: R$ {rate.helperDailyRate.toFixed(2)}
                      </span>
                    </div>
                    {dailyRates.length > 1 && (
                      <button
                        onClick={async () => {
                          if (confirm('Tem certeza que deseja excluir esta vigência de diária?')) {
                            await deleteDailyRate(rate.id);
                            onRefreshData();
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Excluir vigência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CADASTRO DE PEDÁGIOS (Section 8) */}
      {activeTab === 'tolls' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Controle de Pedágios por Rota e Data
              </h4>
              <p className="text-xs text-slate-400">
                Cadastre pedágios oficiais para contabilização precisa no relatório financeiro
              </p>
            </div>

            <button
              onClick={() => setIsTollModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Pedágio</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Rota / Praça de Pedágio</th>
                  <th className="py-3 px-4">Veículo Associado</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tolls.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono">{t.date}</td>
                    <td className="py-3 px-4 font-medium text-slate-100">{t.route}</td>
                    <td className="py-3 px-4 font-mono text-amber-400">{t.vehiclePlate || 'Geral'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      R$ {t.cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={async () => {
                          await deleteToll(t.id);
                          onRefreshData();
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: CÁLCULO DE PAGAMENTOS POR PERÍODO (Section 10) */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              Cálculo de Pagamentos de Motoristas e Ajudantes por Período
            </h4>
            <p className="text-xs text-slate-400">
              Selecione o motorista e o intervalo de datas para calcular diárias e valor recebido no período
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motorista *
                </label>
                <select
                  value={calcDriverId}
                  onChange={(e) => setCalcDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.cpf})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data Inicial *
                </label>
                <input
                  type="date"
                  value={calcStartDate}
                  onChange={(e) => setCalcStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data Final *
                </label>
                <input
                  type="date"
                  value={calcEndDate}
                  onChange={(e) => setCalcEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {paymentErrorMsg && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{paymentErrorMsg}</span>
            </div>
          )}

          {paymentSuccessMsg && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{paymentSuccessMsg}</span>
            </div>
          )}

          {paymentCalcResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h4 className="text-xs uppercase font-bold tracking-wider text-amber-400">
                Resumo Financeiro Detalhado do Período
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Dias Trabalhados:</span>
                  <span className="text-xl font-bold font-mono text-slate-100">
                    {paymentCalcResult.daysWorked} dias
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Diária: R$ {currentDailyRate.driverDailyRate.toFixed(2)}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Dias com Ajudante:</span>
                  <span className="text-xl font-bold font-mono text-slate-100">
                    {paymentCalcResult.daysWithHelper} dias
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Diária: R$ {currentDailyRate.helperDailyRate.toFixed(2)}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Valor a Pagar ao Motorista:</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    R$ {paymentCalcResult.driverAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block">Valor a Pagar ao Ajudante:</span>
                  <span className="text-xl font-bold font-mono text-blue-400">
                    R$ {paymentCalcResult.helperAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Net revenue equation as specified in prompt: Valor recebido = fretes - pago motorista - pago ajudante */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Total de Fretes Gerados pelo Motorista no Período:</span>
                  <strong className="text-lg font-mono text-slate-100">
                    R$ {paymentCalcResult.totalFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block">Valor Líquido Recebido pela Empresa:</span>
                  <strong className="text-xl font-mono text-amber-400">
                    R$ {paymentCalcResult.netReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Confirmation Action Button as specified in Section 10 */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg transition-all active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>CONFIRMAR PAGAMENTO REALIZADO</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: HISTÓRICO DE PAGAMENTOS REALIZADOS (Section 11) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Histórico de Pagamentos Realizados e Confirmados
              </h4>
              <p className="text-xs text-slate-400">
                Arquivo definitivo de liquidações para motoristas e ajudantes
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {payments.length} pagamentos arquivados
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4">Motorista</th>
                  <th className="py-3 px-4 text-right">Pago Motorista</th>
                  <th className="py-3 px-4 text-right">Pago Ajudante</th>
                  <th className="py-3 px-4 text-right">Valor Recebido</th>
                  <th className="py-3 px-4">Data Confirmação</th>
                  <th className="py-3 px-4">Admin Responsável</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      {p.startDate.split('-').reverse().join('/')} a {p.endDate.split('-').reverse().join('/')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100">{p.driverName}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {p.driverAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">
                      R$ {p.helperAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                      R$ {p.netReceived.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {p.confirmedAt ? new Date(p.confirmedAt).toLocaleDateString('pt-BR') : '--'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-[150px]">
                      {p.confirmedByAdminEmail}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={async () => {
                          if (confirm(`Excluir histórico de pagamento de ${p.driverName}?`)) {
                            await deletePayment(p.id);
                            onRefreshData();
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Excluir pagamento arquivado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: RELATÓRIO FINANCEIRO COM AS 11 FÓRMULAS EXATAS (Section 9) */}
      {activeTab === 'financial-report' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                Relatório Financeiro Consolidado (11 Indicadores Oficiais)
              </h4>
              <p className="text-xs text-slate-400">
                Período selecionado: <strong className="font-mono text-slate-200">{startDateFilter} até {endDateFilter}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>

          {/* Official 11 Indicators Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h5 className="text-xs uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                Operação e Consumo
              </h5>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">1. Quilometragem total percorrida:</span>
                  <strong className="font-mono text-slate-100 text-sm">{metrics.totalKm.toLocaleString('pt-BR')} km</strong>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">2. Quantidade total de combustível (litros):</span>
                  <strong className="font-mono text-slate-100 text-sm">{metrics.totalFuelLiters.toLocaleString('pt-BR')} L</strong>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">3. Valor total gasto com combustível:</span>
                  <strong className="font-mono text-amber-400 text-sm">R$ {metrics.totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-slate-400">4. Média de quilômetros por litro:</span>
                  <strong className="font-mono text-emerald-400 text-sm">{metrics.avgKmL} km/L</strong>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h5 className="text-xs uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                Demonstrativo de Custos & Fretes
              </h5>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">5. Gastos com motorista:</span>
                  <strong className="font-mono text-slate-200">R$ {metrics.driverExpenses.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">6. Gastos com ajudante:</span>
                  <strong className="font-mono text-slate-200">R$ {metrics.helperExpenses.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">7. Gastos com pedágios:</span>
                  <strong className="font-mono text-slate-200">R$ {metrics.totalTollsCost.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">8. Gastos diversos:</span>
                  <strong className="font-mono text-slate-200">R$ {metrics.totalOtherExpenses.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between py-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-bold">
                  <span className="text-rose-400">9. Total de Despesas (5+6+7+3+8):</span>
                  <span className="font-mono text-rose-400 text-sm">R$ {metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-bold">
                  <span className="text-emerald-400">10. Valor Total dos Fretes:</span>
                  <span className="font-mono text-emerald-400 text-sm">R$ {metrics.totalFreightRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2.5 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 font-bold">
                  <span className="text-amber-400 text-sm">11. Lucro Líquido (10 - 9):</span>
                  <span className="font-mono text-amber-400 text-base">R$ {metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: INTEGRAÇÃO SUPABASE & MIGRATIONS */}
      {activeTab === 'supabase' && (
        <SupabasePanel />
      )}

      {/* MODAL: CADASTRAR MOTORISTA (Section 3) */}
      <Modal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
        title="Cadastrar Novo Motorista"
        subtitle="Registro completo com RG, CPF, CNH, veículo e credenciais de acesso"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateDriver} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={newDriver.name}
              onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">RG *</label>
              <input
                type="text"
                required
                value={newDriver.rg}
                onChange={(e) => setNewDriver({ ...newDriver, rg: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CPF *</label>
              <input
                type="text"
                required
                value={newDriver.cpf}
                onChange={(e) => setNewDriver({ ...newDriver, cpf: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço Residencial</label>
            <input
              type="text"
              value={newDriver.address}
              onChange={(e) => setNewDriver({ ...newDriver, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria CNH</label>
              <select
                value={newDriver.cnhCategory}
                onChange={(e) => setNewDriver({ ...newDriver, cnhCategory: e.target.value as 'C' | 'D' | 'E' })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              >
                <option value="E">Cat. E (Articulados)</option>
                <option value="D">Cat. D (Pesados)</option>
                <option value="C">Cat. C (Médios)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Registro CNH *</label>
              <input
                type="text"
                required
                value={newDriver.cnhNumber}
                onChange={(e) => setNewDriver({ ...newDriver, cnhNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Vencimento CNH *</label>
              <input
                type="date"
                required
                value={newDriver.cnhExpiry}
                onChange={(e) => setNewDriver({ ...newDriver, cnhExpiry: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Veículo Vinculado</label>
              <select
                value={newDriver.vehicleId}
                onChange={(e) => setNewDriver({ ...newDriver, vehicleId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Nenhum (Livre)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Login / E-mail</label>
              <input
                type="email"
                placeholder="motorista@truckgestao.com"
                value={newDriver.loginEmail}
                onChange={(e) => setNewDriver({ ...newDriver, loginEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Senha de Acesso (Seção 3) *</label>
              <input
                type="text"
                placeholder="Ex: Trk#2026@"
                value={newDriver.password}
                onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                placeholder="(19) 98765-4321"
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDriverModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Salvar Motorista
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CADASTRAR VEÍCULO (Section 4) */}
      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        title="Cadastrar Novo Veículo"
        subtitle="Registro de caminhão com quilometragem e intervalo de troca de óleo"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateVehicle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Placa *</label>
              <input
                type="text"
                required
                maxLength={7}
                placeholder="Ex: BRA2E19"
                value={newVehicle.plate}
                onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo do Veículo *</label>
              <input
                type="text"
                required
                placeholder="Ex: Scania R 450 6x2"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Km Atual *</label>
              <input
                type="number"
                required
                value={newVehicle.currentKm}
                onChange={(e) => setNewVehicle({ ...newVehicle, currentKm: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Km Última Troca Óleo</label>
              <input
                type="number"
                value={newVehicle.lastOilChangeKm}
                onChange={(e) => setNewVehicle({ ...newVehicle, lastOilChangeKm: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Km Próxima Troca *</label>
              <input
                type="number"
                required
                value={newVehicle.nextOilChangeKm}
                onChange={(e) => setNewVehicle({ ...newVehicle, nextOilChangeKm: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="filterCheck"
              checked={newVehicle.filtersReplaced}
              onChange={(e) => setNewVehicle({ ...newVehicle, filtersReplaced: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-amber-500"
            />
            <label htmlFor="filterCheck" className="text-xs text-slate-300">
              Filtros foram trocados na última revisão
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsVehicleModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Salvar Veículo
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: REGISTRAR TROCA DE ÓLEO (Section 4) */}
      <Modal
        isOpen={isOilChangeModalOpen}
        onClose={() => setIsOilChangeModalOpen(false)}
        title={selectedVehicleForOil ? `Registrar Troca de Óleo: ${selectedVehicleForOil.plate}` : ''}
        subtitle="Atualiza a quilometragem de referência e reinicia o controle de manutenção preventiva"
        maxWidth="md"
      >
        <form onSubmit={handlePerformOilChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Quilometragem no Momento da Troca (km) *
            </label>
            <input
              type="number"
              required
              value={oilChangeForm.currentKm}
              onChange={(e) => setOilChangeForm({ ...oilChangeForm, currentKm: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Intervalo para a Próxima Troca (km)
            </label>
            <input
              type="number"
              required
              value={oilChangeForm.intervalKm}
              onChange={(e) => setOilChangeForm({ ...oilChangeForm, intervalKm: parseInt(e.target.value) || 20000 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
            <span className="text-[11px] text-slate-500">
              Próxima troca prevista para: {(oilChangeForm.currentKm + oilChangeForm.intervalKm).toLocaleString('pt-BR')} km
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="filterOilCheck"
              checked={oilChangeForm.filtersReplaced}
              onChange={(e) => setOilChangeForm({ ...oilChangeForm, filtersReplaced: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-amber-500"
            />
            <label htmlFor="filterOilCheck" className="text-xs text-slate-300">
              Filtro de óleo e filtros de combustível substituídos
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOilChangeModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Confirmar Troca de Óleo
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: NOVA VIGÊNCIA DE DIÁRIAS (Section 7) */}
      <Modal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        title="Configurar Nova Vigência de Diárias"
        subtitle="Registra novos valores de diária sem alterar o cálculo de pagamentos retroativos"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Valor da Diária do Motorista (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={newRate.driverDailyRate}
              onChange={(e) => setNewRate({ ...newRate, driverDailyRate: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Valor da Diária do Ajudante (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={newRate.helperDailyRate}
              onChange={(e) => setNewRate({ ...newRate, helperDailyRate: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Data de Início da Vigência *
            </label>
            <input
              type="date"
              required
              value={newRate.effectiveDate}
              onChange={(e) => setNewRate({ ...newRate, effectiveDate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRateModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Salvar Vigência
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CADASTRAR PEDÁGIO (Section 8) */}
      <Modal
        isOpen={isTollModalOpen}
        onClose={() => setIsTollModalOpen(false)}
        title="Cadastrar Pedágio"
        subtitle="Lançamento de pedágio por rota e veículo para inclusão no relatório financeiro"
        maxWidth="md"
      >
        <form onSubmit={handleCreateToll} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Data *</label>
            <input
              type="date"
              required
              value={newToll.date}
              onChange={(e) => setNewToll({ ...newToll, date: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Rota / Praça *</label>
            <input
              type="text"
              required
              placeholder="Ex: Rodovia Anhanguera (Praça Nova Odessa)"
              value={newToll.route}
              onChange={(e) => setNewToll({ ...newToll, route: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Veículo</label>
            <select
              value={newToll.vehicleId}
              onChange={(e) => setNewToll({ ...newToll, vehicleId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Geral / Qualquer Veículo</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plate} ({v.model})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Valor do Pedágio (R$) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={newToll.cost}
              onChange={(e) => setNewToll({ ...newToll, cost: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTollModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Salvar Pedágio
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
