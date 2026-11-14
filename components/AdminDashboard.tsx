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
  UserProfile,
  VehicleChecklist,
  MaintenanceRecord,
  TripRequest
} from '@/types/truck-service';
import { 
  createDriver, 
  updateDriver, 
  deleteDriver, 
  createVehicle, 
  updateVehicle, 
  deleteVehicle,
  recordOilChange,
  updateVehicleMileageMonitor,
  recordPreventiveMaintenance,
  createDailyRate, 
  deleteDailyRate,
  createToll, 
  deleteToll, 
  createPayment, 
  deletePayment,
  checkPaymentExistsForPeriod, 
  updateDailyReport,
  deleteDailyReport,
  deleteVehicleChecklist,
  createTripRequest,
  deleteTripRequest
} from '@/services/firestoreService';
import { MercosulPlate } from './MercosulPlate';
import { Modal } from './Modal';
import { PrintReportsModal } from './PrintReportsModal';
import { AdminChecklistsView } from './AdminChecklistsView';
import { MonthlyCostsChart } from './MonthlyCostsChart';
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
  ShieldAlert,
  ClipboardCheck,
  KeyRound,
  Edit2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Gauge,
  SlidersHorizontal,
  Navigation,
  Send
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

export interface VehiclePreventiveStatus {
  vehicle: Vehicle;
  currentKm: number;
  limitKm: number;
  baselineKm: number;
  remainingKm: number;
  exceededKm: number;
  isExceeded: boolean;
  isWarning: boolean;
  progressPercent: number;
}

/**
 * Avalia o monitoramento de quilometragem do veículo em relação ao limite
 * configurado para a próxima revisão preventiva.
 */
export function checkVehiclePreventiveStatus(vehicle: Vehicle): VehiclePreventiveStatus {
  const currentKm = vehicle.currentKm || 0;
  const limitKm = vehicle.nextPreventiveMaintenanceKm ?? vehicle.nextOilChangeKm;
  const baselineKm = vehicle.lastPreventiveMaintenanceKm ?? vehicle.lastOilChangeKm ?? 0;
  const remainingKm = limitKm - currentKm;
  const exceededKm = Math.max(0, currentKm - limitKm);
  const isExceeded = currentKm > limitKm;
  const isWarning = !isExceeded && remainingKm <= 1000;

  const span = Math.max(1, limitKm - baselineKm);
  const rawPercent = ((currentKm - baselineKm) / span) * 100;
  const progressPercent = isExceeded
    ? 100
    : Math.min(100, Math.max(0, Math.round(rawPercent)));

  return {
    vehicle,
    currentKm,
    limitKm,
    baselineKm,
    remainingKm,
    exceededKm,
    isExceeded,
    isWarning,
    progressPercent,
  };
}

interface AdminDashboardProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  dailyReports: DailyReport[];
  dailyRates: DailyRateConfig[];
  tolls: TollRecord[];
  payments: PaymentRecord[];
  checklists: VehicleChecklist[];
  maintenanceRecords?: MaintenanceRecord[];
  tripRequests?: TripRequest[];
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
  checklists,
  maintenanceRecords = [],
  tripRequests = [],
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
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverFormError, setDriverFormError] = useState<string | null>(null);
  const [driverFeedback, setDriverFeedback] = useState<string | null>(null);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Record<string, boolean>>({});
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleMonitorFilter, setVehicleMonitorFilter] = useState<'all' | 'exceeded' | 'warning' | 'ok'>('all');
  const [vehicleFeedback, setVehicleFeedback] = useState<string | null>(null);
  const [isMileageConfigModalOpen, setIsMileageConfigModalOpen] = useState(false);
  const [selectedVehicleForMileage, setSelectedVehicleForMileage] = useState<Vehicle | null>(null);
  const [mileageConfigForm, setMileageConfigForm] = useState({
    currentKm: 0,
    nextPreventiveMaintenanceKm: 20000,
    nextOilChangeKm: 20000,
  });
  const [isPreventiveModalOpen, setIsPreventiveModalOpen] = useState(false);
  const [selectedVehicleForPreventive, setSelectedVehicleForPreventive] = useState<Vehicle | null>(null);
  const [preventiveForm, setPreventiveForm] = useState({
    currentKm: 0,
    intervalKm: 20000,
    cost: 0,
  });
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isTollModalOpen, setIsTollModalOpen] = useState(false);
  const [isOilChangeModalOpen, setIsOilChangeModalOpen] = useState(false);
  const [selectedVehicleForOil, setSelectedVehicleForOil] = useState<Vehicle | null>(null);
  const [isDeleteManagerOpen, setIsDeleteManagerOpen] = useState(false);
  const [deleteEntityTab, setDeleteEntityTab] = useState<'reports' | 'checklists' | 'drivers' | 'vehicles' | 'rates' | 'tolls' | 'payments'>('reports');

  // Dedicated Confirmation Modal for Deletions (avoids blocked window.confirm in iframes)
  interface DeleteTarget {
    type: 'vehicle' | 'driver' | 'dailyReport' | 'dailyRate' | 'toll' | 'payment' | 'checklist' | 'tripRequest';
    id: string;
    title: string;
    description: string;
  }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Printable PDF Modal for Daily Trip & Cost Reports
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reportForPrint, setReportForPrint] = useState<DailyReport | null>(null);

  // Trip Dispatch Modal State
  const [isTripDispatchModalOpen, setIsTripDispatchModalOpen] = useState(false);
  const [isDispatchingTrip, setIsDispatchingTrip] = useState(false);
  const [tripDispatchFeedback, setTripDispatchFeedback] = useState<string | null>(null);
  const [tripDispatchForm, setTripDispatchForm] = useState({
    driverId: drivers[0]?.id || '',
    vehicleId: drivers[0]?.vehicleId || vehicles[0]?.id || '',
    origin: 'Campinas, SP',
    destination: '',
    cargoDescription: '',
    estimatedFreight: 850,
    scheduledDate: new Date().toISOString().slice(0, 10),
    priority: 'normal' as 'normal' | 'urgent',
    notes: '',
  });

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
    nextPreventiveMaintenanceKm: 20000,
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
    cost: 0,
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

  // Driver Creation & Editing Handlers
  const openCreateDriverModal = () => {
    setEditingDriver(null);
    setDriverFormError(null);
    setNewDriver({
      name: '',
      rg: '',
      cpf: '',
      address: '',
      cnhCategory: 'E',
      cnhNumber: '',
      cnhExpiry: '2028-12-31',
      vehicleId: vehicles[0]?.id || '',
      loginEmail: '',
      password: '',
      phone: '',
      active: true,
    });
    setIsDriverModalOpen(true);
  };

  const openEditDriverModal = (d: Driver) => {
    setEditingDriver(d);
    setDriverFormError(null);
    setNewDriver({
      name: d.name,
      rg: d.rg,
      cpf: d.cpf,
      address: d.address || '',
      cnhCategory: d.cnhCategory,
      cnhNumber: d.cnhNumber,
      cnhExpiry: d.cnhExpiry,
      vehicleId: d.vehicleId || '',
      loginEmail: d.loginEmail || '',
      password: d.password || '',
      phone: d.phone || '',
      active: d.active !== false,
    });
    setIsDriverModalOpen(true);
  };

  const handleGenerateDriverPassword = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setNewDriver((prev) => ({ ...prev, password: `Trk@${num}` }));
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverFormError(null);

    const cleanName = newDriver.name.trim();
    const cleanCpf = newDriver.cpf.trim();
    const cleanEmail = newDriver.loginEmail.trim().toLowerCase();
    const cleanPassword = newDriver.password.trim();

    if (!cleanName || !cleanCpf) {
      setDriverFormError('Nome completo e CPF são obrigatórios.');
      return;
    }
    if (!cleanEmail) {
      setDriverFormError('Informe o e-mail de login do motorista para acesso ao sistema.');
      return;
    }
    if (cleanEmail === 'admin@truckgestao.com' || cleanEmail === adminProfile.email.toLowerCase()) {
      setDriverFormError('Este e-mail pertence ao Administrador e não pode ser usado por um motorista.');
      return;
    }
    if (!editingDriver && cleanPassword.length < 4) {
      setDriverFormError('Defina uma senha com pelo menos 4 caracteres para o motorista.');
      return;
    }
    if (editingDriver && cleanPassword && cleanPassword.length < 4) {
      setDriverFormError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    const duplicateEmail = drivers.find(
      (d) => d.id !== editingDriver?.id && d.loginEmail?.trim().toLowerCase() === cleanEmail
    );
    if (duplicateEmail) {
      setDriverFormError(`O e-mail "${cleanEmail}" já está vinculado ao motorista ${duplicateEmail.name}.`);
      return;
    }

    setIsSavingDriver(true);
    try {
      if (editingDriver) {
        await updateDriver({
          ...editingDriver,
          ...newDriver,
          name: cleanName,
          cpf: cleanCpf,
          loginEmail: cleanEmail,
          password: cleanPassword || editingDriver.password,
        });
        setDriverFeedback(
          `Cadastro e credenciais de ${cleanName} atualizados (${cleanEmail} · acesso ${newDriver.active ? 'ATIVO' : 'BLOQUEADO'}).`
        );
      } else {
        await createDriver({
          ...newDriver,
          name: cleanName,
          cpf: cleanCpf,
          loginEmail: cleanEmail,
          password: cleanPassword,
        });
        setDriverFeedback(
          `Motorista ${cleanName} cadastrado! Login: ${cleanEmail} | Senha: ${cleanPassword} (acesso exclusivo às funções de motorista).`
        );
      }
      setIsDriverModalOpen(false);
      setEditingDriver(null);
      await onRefreshData();
    } catch (err: any) {
      setDriverFormError(err?.message || 'Erro ao salvar cadastro do motorista.');
    } finally {
      setIsSavingDriver(false);
    }
  };

  const handleToggleDriverActive = async (d: Driver) => {
    const nextActive = d.active === false;
    await updateDriver({
      ...d,
      active: nextActive,
    });
    setDriverFeedback(
      `Acesso de ${d.name} foi ${nextActive ? 'ATIVADO' : 'BLOQUEADO'} pelo administrador.`
    );
    await onRefreshData();
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate || !newVehicle.model) return;
    await createVehicle({
      ...newVehicle,
      plate: newVehicle.plate.toUpperCase().trim(),
      lastPreventiveMaintenanceDate: newVehicle.lastOilChangeDate,
      lastPreventiveMaintenanceKm: newVehicle.lastOilChangeKm,
      nextPreventiveMaintenanceKm: newVehicle.nextPreventiveMaintenanceKm || newVehicle.nextOilChangeKm,
    });
    setIsVehicleModalOpen(false);
    setVehicleFeedback(`Veículo ${newVehicle.plate.toUpperCase().trim()} cadastrado no monitoramento de quilometragem.`);
    onRefreshData();
  };

  const handleSaveMileageConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForMileage) return;
    await updateVehicleMileageMonitor(
      selectedVehicleForMileage.id,
      mileageConfigForm.currentKm,
      mileageConfigForm.nextPreventiveMaintenanceKm,
      mileageConfigForm.nextOilChangeKm
    );
    setVehicleFeedback(
      `Monitoramento de quilometragem de ${selectedVehicleForMileage.plate} atualizado (Odômetro: ${mileageConfigForm.currentKm.toLocaleString('pt-BR')} km · Limite revisão: ${mileageConfigForm.nextPreventiveMaintenanceKm.toLocaleString('pt-BR')} km).`
    );
    setIsMileageConfigModalOpen(false);
    setSelectedVehicleForMileage(null);
    onRefreshData();
  };

  const handlePerformPreventiveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForPreventive) return;
    await recordPreventiveMaintenance(
      selectedVehicleForPreventive.id,
      preventiveForm.currentKm,
      preventiveForm.intervalKm,
      preventiveForm.cost
    );
    setVehicleFeedback(
      `Revisão preventiva de ${selectedVehicleForPreventive.plate} registrada aos ${preventiveForm.currentKm.toLocaleString('pt-BR')} km! Próximo limite: ${(preventiveForm.currentKm + preventiveForm.intervalKm).toLocaleString('pt-BR')} km.`
    );
    setIsPreventiveModalOpen(false);
    setSelectedVehicleForPreventive(null);
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
      oilChangeForm.filtersReplaced,
      oilChangeForm.cost
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteFeedback(null);
    try {
      switch (deleteTarget.type) {
        case 'vehicle':
          await deleteVehicle(deleteTarget.id);
          break;
        case 'driver':
          await deleteDriver(deleteTarget.id);
          break;
        case 'dailyReport':
          await deleteDailyReport(deleteTarget.id);
          break;
        case 'dailyRate':
          await deleteDailyRate(deleteTarget.id);
          break;
        case 'toll':
          await deleteToll(deleteTarget.id);
          break;
        case 'payment':
          await deletePayment(deleteTarget.id);
          break;
        case 'checklist':
          await deleteVehicleChecklist(deleteTarget.id);
          break;
        case 'tripRequest':
          await deleteTripRequest(deleteTarget.id);
          break;
      }
      await onRefreshData();
      setDeleteFeedback({
        message: `${deleteTarget.title} concluída com sucesso!`,
        type: 'success',
      });
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Erro ao excluir registro:', err);
      setDeleteFeedback({
        message: `Erro ao excluir: ${err?.message || 'Falha na comunicação com o banco de dados.'}`,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenTripDispatchModal = () => {
    const defaultDriver = drivers.find((d) => d.active !== false) || drivers[0];
    setTripDispatchForm({
      driverId: defaultDriver?.id || '',
      vehicleId: defaultDriver?.vehicleId || vehicles[0]?.id || '',
      origin: 'Campinas, SP',
      destination: '',
      cargoDescription: '',
      estimatedFreight: 850,
      scheduledDate: new Date().toISOString().slice(0, 10),
      priority: 'normal',
      notes: '',
    });
    setIsTripDispatchModalOpen(true);
  };

  const handleDispatchTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const drv = drivers.find((d) => d.id === tripDispatchForm.driverId);
    const veh = vehicles.find((v) => v.id === tripDispatchForm.vehicleId) || vehicles[0];
    if (!drv || !veh) return;

    setIsDispatchingTrip(true);
    try {
      await createTripRequest({
        driverId: drv.id,
        driverName: drv.name,
        vehicleId: veh.id,
        vehiclePlate: veh.plate,
        origin: tripDispatchForm.origin.trim(),
        destination: tripDispatchForm.destination.trim(),
        cargoDescription: tripDispatchForm.cargoDescription.trim(),
        estimatedFreight: Number(tripDispatchForm.estimatedFreight) || 0,
        scheduledDate: tripDispatchForm.scheduledDate,
        priority: tripDispatchForm.priority,
        notes: tripDispatchForm.notes.trim() || undefined,
        createdByAdminEmail: adminProfile.email,
      });
      setTripDispatchFeedback(
        `Solicitação de viagem enviada para ${drv.name} (${tripDispatchForm.origin} → ${tripDispatchForm.destination}). O motorista receberá o alerta sonoro no portal.`
      );
      setIsTripDispatchModalOpen(false);
      await onRefreshData();
    } finally {
      setIsDispatchingTrip(false);
    }
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

  // Mileage monitoring statuses for preventive maintenance limits
  const vehicleMileageStatuses = useMemo(() => {
    return vehicles
      .map((v) => checkVehiclePreventiveStatus(v))
      .sort((a, b) => {
        if (a.isExceeded !== b.isExceeded) return a.isExceeded ? -1 : 1;
        if (a.isWarning !== b.isWarning) return a.isWarning ? -1 : 1;
        return a.remainingKm - b.remainingKm;
      });
  }, [vehicles]);

  const exceededMileageVehicles = useMemo(() => {
    return vehicleMileageStatuses.filter((s) => s.isExceeded);
  }, [vehicleMileageStatuses]);

  const warningMileageVehicles = useMemo(() => {
    return vehicleMileageStatuses.filter((s) => s.isWarning);
  }, [vehicleMileageStatuses]);

  const vehiclesAttentionCount = useMemo(() => {
    const ids = new Set<string>();
    exceededMileageVehicles.forEach((s) => ids.add(s.vehicle.id));
    vehiclesWithOilAlert.forEach((v) => ids.add(v.id));
    return ids.size;
  }, [exceededMileageVehicles, vehiclesWithOilAlert]);

  // Check open checklists with anomalies
  const openAnomalyChecklists = useMemo(() => {
    return checklists.filter(
      (c) =>
        c.anomaliesCount > 0 &&
        (c.resolutionStatus === 'pending_review' || c.resolutionStatus === 'in_maintenance')
    );
  }, [checklists]);

  const criticalAnomalyChecklists = useMemo(() => {
    return openAnomalyChecklists.filter((c) => c.criticalAnomaliesCount > 0);
  }, [openAnomalyChecklists]);

  // Somente usuários cadastrados no Supabase com role 'admin' têm acesso ao painel
  if (adminProfile.role !== 'admin') {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4 my-8 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-slate-100">Acesso Restrito ao Painel do Administrador</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Somente os usuários cadastrados com perfil de Administrador têm acesso a este painel com todas as funções de gestão, relatórios financeiros e exclusão de dados.
          </p>
        </div>
        <div className="pt-2">
          <span className="text-xs font-mono text-amber-400 block">Usuário conectado: {adminProfile.name}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Perfil: Motorista (Acesso Administrativo Não Permitido)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs for Admin */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'dashboard', label: 'Dashboard & Faturamento', icon: LayoutDashboard },
          { id: 'reports', label: 'Relatórios Diários', icon: FileText, badge: dailyReports.filter((r) => r.status === 'submitted').length },
          { id: 'checklists', label: 'Checklist & Anomalias', icon: ClipboardCheck, alertBadge: openAnomalyChecklists.length },
          { id: 'vehicles', label: 'Veículos & Revisão', icon: Truck, alertBadge: vehiclesAttentionCount },
          { id: 'drivers', label: 'Motoristas', icon: Users, alertBadge: driversWithCnhAlert.length },
          { id: 'rates', label: 'Diárias', icon: Receipt },
          { id: 'tolls', label: 'Pedágios', icon: DollarSign },
          { id: 'payments', label: 'Cálculo de Pagamentos', icon: Calculator },
          { id: 'history', label: 'Histórico de Pagamentos', icon: History },
          { id: 'financial-report', label: 'Relatório Financeiro', icon: FileSpreadsheet },
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenTripDispatchModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-bold transition-colors shadow-sm"
              title="Enviar nova solicitação de viagem com alerta sonoro para o motorista"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Despachar Viagem</span>
            </button>

            <button
              onClick={() => setIsDeleteManagerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded border border-rose-500/30 text-xs font-semibold transition-colors"
              title="Painel exclusivo do administrador para gerenciar e excluir dados"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Gerenciar & Excluir Dados</span>
            </button>

            <button
              onClick={() => {
                setReportForPrint(null);
                setIsPrintModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 text-xs font-semibold transition-colors shadow-sm"
              title="Exportar relatórios diários de viagens e custos para formato PDF imprimível"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimir / PDF ({filteredReports.length})</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
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

          {/* ALERTA PRIORITÁRIO DE MONITORAMENTO DE QUILOMETRAGEM: REVISÃO PREVENTIVA ULTRAPASSADA */}
          {exceededMileageVehicles.length > 0 && (
            <div className="bg-gradient-to-r from-rose-950/50 via-slate-900 to-rose-950/25 border-2 border-rose-500/80 p-5 rounded-2xl shadow-xl shadow-rose-950/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertOctagon className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-rose-100 uppercase tracking-wide flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        Monitoramento de Quilometragem: Revisão Preventiva Ultrapassada
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                        {exceededMileageVehicles.length} veículo{exceededMileageVehicles.length > 1 ? 's' : ''} acima do limite
                      </span>
                    </div>
                    <p className="text-xs text-rose-200/80 mt-0.5">
                      Os caminhões abaixo ultrapassaram o limite de quilometragem configurado para a próxima revisão preventiva. Agende a revisão imediatamente.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setVehicleMonitorFilter('exceeded');
                    setActiveTab('vehicles');
                  }}
                  className="px-3.5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <Gauge className="w-4 h-4" />
                  <span>Monitorar Quilometragem</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {exceededMileageVehicles.map(({ vehicle, currentKm, limitKm, exceededKm }) => (
                  <div
                    key={vehicle.id}
                    className="bg-slate-950/85 border border-rose-500/50 rounded-xl p-3.5 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                          <strong className="text-slate-100 font-mono text-sm">{vehicle.plate}</strong>
                        </div>
                        <span className="text-[11px] text-slate-400 block">{vehicle.model}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-mono text-[10px] font-bold shrink-0">
                        +{exceededKm.toLocaleString('pt-BR')} km
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-900 pt-2 font-mono">
                      <span>Atual: <strong className="text-rose-300">{currentKm.toLocaleString('pt-BR')} km</strong></span>
                      <span>Limite: <strong className="text-slate-200">{limitKm.toLocaleString('pt-BR')} km</strong></span>
                    </div>
                  </div>
                ))}
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

          {/* Priority Alert: Open Vehicle Checklist Anomalies */}
          {openAnomalyChecklists.length > 0 && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                criticalAnomalyChecklists.length > 0
                  ? 'bg-rose-950/35 border-rose-500/60'
                  : 'bg-amber-950/30 border-amber-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck
                  className={`w-5 h-5 shrink-0 ${
                    criticalAnomalyChecklists.length > 0 ? 'text-rose-400' : 'text-amber-400'
                  }`}
                />
                <div className="text-xs">
                  <strong
                    className={
                      criticalAnomalyChecklists.length > 0 ? 'text-rose-200' : 'text-amber-200'
                    }
                  >
                    Checklist de Frota: {openAnomalyChecklists.length} inspeção(ões) com anomalias em aberto
                    {criticalAnomalyChecklists.length > 0
                      ? ` (${criticalAnomalyChecklists.length} crítica${criticalAnomalyChecklists.length > 1 ? 's' : ''})`
                      : ''}
                    !
                  </strong>
                  <div className="text-slate-300/80">
                    {openAnomalyChecklists
                      .slice(0, 3)
                      .map((c) => `${c.vehiclePlate} (${c.driverName}: ${c.anomaliesCount} anomalia${c.anomaliesCount > 1 ? 's' : ''})`)
                      .join(' · ')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('checklists')}
                className={`px-3.5 py-1.5 font-bold rounded-lg text-xs shrink-0 self-start sm:self-auto ${
                  criticalAnomalyChecklists.length > 0
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                Analisar Anomalias
              </button>
            </div>
          )}

          {/* Gráfico Recharts: Comparativo Mensal de Custos Operacionais */}
          <MonthlyCostsChart
            dailyReports={dailyReports}
            tolls={tolls}
            maintenanceRecords={maintenanceRecords}
            drivers={drivers}
            vehicles={vehicles}
            selectedDriverFilter={selectedDriverFilter}
            selectedVehicleFilter={selectedVehicleFilter}
          />

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

          {/* Solicitações de Viagens Despachadas aos Motoristas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-amber-400" />
                  Solicitações de Viagens Despachadas
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Envie novas viagens para acionar notificações sonoras imediatas no painel do motorista
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenTripDispatchModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Solicitação de Viagem</span>
              </button>
            </div>

            {tripDispatchFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
                <span>{tripDispatchFeedback}</span>
                <button
                  type="button"
                  onClick={() => setTripDispatchFeedback(null)}
                  className="text-emerald-400 hover:text-emerald-200 font-bold"
                >
                  Fechar
                </button>
              </div>
            )}

            {tripRequests.length === 0 ? (
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                Nenhuma solicitação de viagem despachada ainda. Clique em &quot;Nova Solicitação de Viagem&quot; para enviar uma rota ao motorista.
              </div>
            ) : (
              <div className="space-y-2.5">
                {tripRequests.slice(0, 6).map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-slate-100">
                          {trip.origin} → {trip.destination}
                        </strong>
                        <span className="text-slate-500">·</span>
                        <span className="font-mono text-amber-400 font-semibold">{trip.vehiclePlate}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-300">{trip.driverName}</span>
                      </div>
                      <div className="text-slate-400">
                        {trip.cargoDescription} · Data: {trip.scheduledDate.split('-').reverse().join('/')} · Frete est.: R$ {trip.estimatedFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          trip.status === 'pending'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : trip.status === 'accepted' || trip.status === 'in_progress'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : trip.status === 'rejected'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {trip.status === 'pending'
                          ? 'Pendente'
                          : trip.status === 'accepted'
                          ? 'Aceita'
                          : trip.status === 'in_progress'
                          ? 'Em Rota'
                          : trip.status === 'rejected'
                          ? 'Recusada'
                          : 'Concluída'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: 'tripRequest',
                            id: trip.id,
                            title: `Excluir Solicitação de Viagem (${trip.origin} → ${trip.destination})`,
                            description: `Tem certeza que deseja excluir esta solicitação enviada para ${trip.driverName}?`,
                          })
                        }
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Excluir solicitação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RELATÓRIOS DIÁRIOS RECEBIDOS (AUDITORIA E ENTREGAS) */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                Auditoria de Relatórios Diários de Trabalho
              </h4>
              <p className="text-xs text-slate-400">
                Acompanhe o trajeto, entregas em cada cidade e aprove os relatórios enviados
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">
                {filteredReports.length} relatórios listados
              </span>
              <button
                onClick={() => {
                  setReportForPrint(null);
                  setIsPrintModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 text-xs font-semibold transition-colors shadow-sm"
                title="Exportar todos os relatórios filtrados em formato PDF imprimível"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Exportar Relatório PDF</span>
              </button>
            </div>
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

                    {/* Imprimir Ficha de Viagem Individual em PDF */}
                    <button
                      onClick={() => {
                        setReportForPrint(report);
                        setIsPrintModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                      title="Exportar Ficha de Viagem e Custos em PDF / Imprimir"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteTarget({
                        type: 'dailyReport',
                        id: report.id,
                        title: `Excluir Relatório Diário`,
                        description: `Tem certeza que deseja excluir o relatório de ${report.driverName} do dia ${report.date} (Veículo: ${report.vehiclePlate})? Esta operação é irreversível.`,
                      })}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
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

      {/* TAB 3: VEÍCULOS, MONITORAMENTO DE QUILOMETRAGEM & REVISÃO PREVENTIVA */}
      {activeTab === 'vehicles' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400" />
                Monitoramento de Quilometragem & Revisão Preventiva da Frota
              </h4>
              <p className="text-xs text-slate-400">
                Acompanhe os limites configurados para revisão preventiva, troca de óleo e identifique veículos com quilometragem excedida
              </p>
            </div>

            <button
              onClick={() => setIsVehicleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Veículo</span>
            </button>
          </div>

          {vehicleFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{vehicleFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setVehicleFeedback(null)}
                className="text-slate-400 hover:text-slate-200 px-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mileage Monitoring Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                Frota Monitorada
              </span>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                {vehicles.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Veículos com odômetro ativo</div>
            </div>

            <div className={`p-4 rounded-2xl border ${exceededMileageVehicles.length > 0 ? 'bg-rose-950/25 border-rose-500/60' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className={`w-3.5 h-3.5 text-rose-400 ${exceededMileageVehicles.length > 0 ? 'animate-pulse' : ''}`} />
                Limite Ultrapassado
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                {exceededMileageVehicles.length}
              </div>
              <div className="text-[10px] text-rose-300/70 mt-0.5">Revisão preventiva vencida</div>
            </div>

            <div className={`p-4 rounded-2xl border ${warningMileageVehicles.length > 0 ? 'bg-amber-950/25 border-amber-500/50' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Próximos (≤ 1.000 km)
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {warningMileageVehicles.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Aproximando-se da revisão</div>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Dentro do Limite
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {vehicleMileageStatuses.filter((s) => !s.isExceeded && !s.isWarning).length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Quilometragem regular</div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setVehicleMonitorFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                vehicleMonitorFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({vehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setVehicleMonitorFilter('exceeded')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                vehicleMonitorFilter === 'exceeded'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'text-rose-300 hover:bg-rose-950/40'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Limite Ultrapassado ({exceededMileageVehicles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setVehicleMonitorFilter('warning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                vehicleMonitorFilter === 'warning'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-amber-300 hover:bg-amber-950/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Em Alerta / Próximos ({warningMileageVehicles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setVehicleMonitorFilter('ok')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                vehicleMonitorFilter === 'ok'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-emerald-300 hover:bg-emerald-950/30'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Regulares</span>
            </button>
          </div>

          {/* Vehicle Cards Grid */}
          {(() => {
            const displayedStatuses = vehicleMileageStatuses.filter((status) => {
              if (vehicleMonitorFilter === 'exceeded') return status.isExceeded;
              if (vehicleMonitorFilter === 'warning') return status.isWarning || (status.vehicle.nextOilChangeKm - status.currentKm) <= 200;
              if (vehicleMonitorFilter === 'ok') return !status.isExceeded && !status.isWarning;
              return true;
            });

            if (displayedStatuses.length === 0) {
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                  Nenhum veículo encontrado neste filtro de monitoramento.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedStatuses.map(({ vehicle: v, currentKm, limitKm, remainingKm, exceededKm, isExceeded, isWarning, progressPercent }) => {
                  const oilKmLeft = v.nextOilChangeKm - currentKm;
                  const isOilUrgent = oilKmLeft <= 200;

                  return (
                    <div
                      key={v.id}
                      className={`rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                        isExceeded
                          ? 'bg-rose-950/20 border-2 border-rose-500 shadow-lg shadow-rose-950/40'
                          : isWarning || isOilUrgent
                          ? 'bg-orange-950/20 border-2 border-orange-500/80'
                          : 'bg-slate-900 border border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Plate + Attention Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <MercosulPlate plate={v.plate} size="md" />
                          <div className="flex flex-col items-end gap-1">
                            {isExceeded ? (
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500 text-white flex items-center gap-1 shadow-md animate-pulse">
                                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                                <span>REVISÃO ULTRAPASSADA</span>
                              </span>
                            ) : isWarning ? (
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>REVISÃO PRÓXIMA</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>OK</span>
                              </span>
                            )}

                            {isOilUrgent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-slate-950 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>ÓLEO URGENTE</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-slate-100">{v.model}</h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Gauge className={`w-3.5 h-3.5 ${isExceeded ? 'text-rose-400' : 'text-amber-400'}`} />
                            <span>Odômetro Atual:</span>
                            <strong className={`font-mono ${isExceeded ? 'text-rose-300' : 'text-slate-100'}`}>
                              {currentKm.toLocaleString('pt-BR')} km
                            </strong>
                          </p>
                        </div>

                        {/* Overdue Callout Banner inside Card */}
                        {isExceeded && (
                          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-200">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                            <div>
                              <strong className="block text-rose-100">Limite Preventivo Excedido!</strong>
                              <span className="font-mono text-[11px] text-rose-300">
                                +{exceededKm.toLocaleString('pt-BR')} km acima do limite de {limitKm.toLocaleString('pt-BR')} km
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Preventive Maintenance Progress Bar */}
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                              {isExceeded ? (
                                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                              ) : isWarning ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              Revisão Preventiva
                            </span>
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                isExceeded
                                  ? 'text-rose-400'
                                  : isWarning
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {isExceeded
                                ? `EXCEDEU ${exceededKm.toLocaleString('pt-BR')} km`
                                : remainingKm === 0
                                ? 'LIMITE ATINGIDO'
                                : `Faltam ${remainingKm.toLocaleString('pt-BR')} km`}
                            </span>
                          </div>

                          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isExceeded
                                  ? 'bg-rose-500'
                                  : isWarning
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                            <span>Limite Configurado:</span>
                            <strong className={isExceeded ? 'text-rose-300' : 'text-slate-200'}>
                              {limitKm.toLocaleString('pt-BR')} km
                            </strong>
                          </div>

                          {v.lastPreventiveMaintenanceDate && (
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>Última Revisão:</span>
                              <span className="font-mono">
                                {v.lastPreventiveMaintenanceDate.split('-').reverse().join('/')}
                                {typeof v.lastPreventiveMaintenanceKm === 'number'
                                  ? ` (${v.lastPreventiveMaintenanceKm.toLocaleString('pt-BR')} km)`
                                  : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Oil Maintenance Box */}
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Última Troca de Óleo:</span>
                            <span className="font-mono text-slate-200">
                              {v.lastOilChangeDate.split('-').reverse().join('/')} ({v.lastOilChangeKm.toLocaleString('pt-BR')} km)
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span>Próxima Troca de Óleo:</span>
                            <span className={`font-mono font-bold ${isOilUrgent ? 'text-orange-400' : 'text-slate-200'}`}>
                              {v.nextOilChangeKm.toLocaleString('pt-BR')} km ({oilKmLeft <= 0 ? 'VENCIDA!' : `faltam ${oilKmLeft.toLocaleString('pt-BR')} km`})
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

                      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDeleteTarget({
                              type: 'vehicle',
                              id: v.id,
                              title: `Excluir Veículo ${v.plate}`,
                              description: `Tem certeza que deseja excluir o veículo ${v.plate} (${v.model})? O veículo será removido permanentemente do banco de dados.`,
                            })}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Excluir veículo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVehicleForMileage(v);
                              setMileageConfigForm({
                                currentKm: v.currentKm,
                                nextPreventiveMaintenanceKm: v.nextPreventiveMaintenanceKm ?? v.nextOilChangeKm,
                                nextOilChangeKm: v.nextOilChangeKm,
                              });
                              setIsMileageConfigModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors border border-slate-700"
                            title="Atualizar odômetro e limite da próxima revisão preventiva"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                            <span>Km / Limite</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVehicleForPreventive(v);
                              setPreventiveForm({
                                currentKm: v.currentKm,
                                intervalKm: v.preventiveIntervalKm || 20000,
                                cost: 0,
                              });
                              setIsPreventiveModalOpen(true);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                              isExceeded
                                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-sm'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Registrar Revisão</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedVehicleForOil(v);
                              setOilChangeForm({
                                currentKm: v.currentKm,
                                intervalKm: 20000,
                                filtersReplaced: true,
                                cost: 0,
                              });
                              setIsOilChangeModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Registrar troca de óleo"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Óleo</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: CADASTRO DE MOTORISTAS (Section 3) */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Cadastro, Credenciais & Gestão de Motoristas
              </h4>
              <p className="text-xs text-slate-400">
                Crie login e senha individuais para que cada motorista acesse exclusivamente o Portal do Motorista
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
                onClick={openCreateDriverModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Motorista</span>
              </button>
            </div>
          </div>

          {driverFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{driverFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setDriverFeedback(null)}
                className="text-slate-400 hover:text-slate-200 px-2"
              >
                ✕
              </button>
            </div>
          )}

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
                  const isActive = d.active !== false;
                  const isPwdRevealed = !!revealedPasswordIds[d.id];

                  return (
                    <div
                      key={d.id}
                      className={`bg-slate-900 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                        !isActive
                          ? 'border border-slate-700 opacity-80'
                          : cnhStatus.isCritical
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
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isActive
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {isActive ? 'Acesso Ativo' : 'Bloqueado'}
                            </span>
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
                            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
                              <span>Login Motorista:</span>
                              <span className="font-mono text-amber-400 truncate max-w-[170px]">{d.loginEmail}</span>
                            </div>
                          )}
                          {d.password && (
                            <div className="flex justify-between items-center text-slate-400">
                              <span>Senha:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-slate-200">
                                  {isPwdRevealed ? d.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedPasswordIds((prev) => ({ ...prev, [d.id]: !prev[d.id] }))
                                  }
                                  className="text-slate-500 hover:text-amber-400"
                                  title={isPwdRevealed ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                  {isPwdRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => openEditDriverModal(d)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar / Credenciais</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleDriverActive(d)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                              isActive
                                ? 'bg-slate-800 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                            }`}
                            title={isActive ? 'Bloquear acesso do motorista' : 'Reativar acesso do motorista'}
                          >
                            {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            <span>{isActive ? 'Bloquear' : 'Ativar'}</span>
                          </button>

                          <button
                            onClick={() => setDeleteTarget({
                              type: 'driver',
                              id: d.id,
                              title: `Excluir Motorista ${d.name}`,
                              description: `Tem certeza que deseja excluir o motorista ${d.name} (CPF: ${d.cpf}) e revogar suas credenciais de acesso?`,
                            })}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Excluir motorista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                        onClick={() => setDeleteTarget({
                          type: 'dailyRate',
                          id: rate.id,
                          title: `Excluir Vigência de Diária`,
                          description: `Tem certeza que deseja excluir esta vigência iniciada em ${rate.effectiveDate} (Motorista: R$ ${rate.driverDailyRate.toFixed(2)} / Ajudante: R$ ${rate.helperDailyRate.toFixed(2)})?`,
                        })}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
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
                        onClick={() => setDeleteTarget({
                          type: 'toll',
                          id: t.id,
                          title: `Excluir Registro de Pedágio`,
                          description: `Tem certeza que deseja excluir o pedágio "${t.route}" no valor de R$ ${t.cost.toFixed(2)}?`,
                        })}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title="Excluir pedágio"
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
                        onClick={() => setDeleteTarget({
                          type: 'payment',
                          id: p.id,
                          title: `Excluir Histórico de Liquidação`,
                          description: `Tem certeza que deseja excluir o pagamento arquivado de ${p.driverName}?`,
                        })}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
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
                Relatório Financeiro Consolidado
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

          {/* Operational & Financial Indicators Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h5 className="text-xs uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                Operação e Consumo
              </h5>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Quilometragem total percorrida:</span>
                  <strong className="font-mono text-slate-100 text-sm">{metrics.totalKm.toLocaleString('pt-BR')} km</strong>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Quantidade total de combustível (litros):</span>
                  <strong className="font-mono text-slate-100 text-sm">{metrics.totalFuelLiters.toLocaleString('pt-BR')} L</strong>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Valor total gasto com combustível:</span>
                  <strong className="font-mono text-amber-400 text-sm">R$ {metrics.totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Média de quilômetros por litro:</span>
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
                  <span className="text-slate-400">Gastos com motorista:</span>
                  <strong className="font-mono text-slate-200">R$ {metrics.driverExpenses.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Gastos com ajudante:</span>
                  <strong className="font-mono text-slate-200">R$ {metrics.helperExpenses.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Gastos com pedágios:</span>
                  <strong className="font-mono text-slate-200">R$ {metrics.totalTollsCost.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Gastos diversos:</span>
                  <strong className="font-mono text-slate-200">R$ {metrics.totalOtherExpenses.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between py-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-bold">
                  <span className="text-rose-400">Total de Despesas:</span>
                  <span className="font-mono text-rose-400 text-sm">R$ {metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-bold">
                  <span className="text-emerald-400">Valor Total dos Fretes:</span>
                  <span className="font-mono text-emerald-400 text-sm">R$ {metrics.totalFreightRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2.5 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 font-bold">
                  <span className="text-amber-400 text-sm">Lucro Líquido:</span>
                  <span className="font-mono text-amber-400 text-base">R$ {metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* TAB 10: CHECKLIST DE INSPEÇÃO & ANOMALIAS */}
      {activeTab === 'checklists' && (
        <AdminChecklistsView
          checklists={checklists}
          vehicles={vehicles}
          drivers={drivers}
          adminProfile={adminProfile}
          onRefreshData={onRefreshData}
          onRequestDelete={(chk) =>
            setDeleteTarget({
              type: 'checklist',
              id: chk.id,
              title: `Excluir Checklist (${chk.vehiclePlate})`,
              description: `Tem certeza que deseja excluir o checklist realizado por ${chk.driverName} em ${chk.date}?`,
            })
          }
        />
      )}

      {/* MODAL: CADASTRAR / EDITAR MOTORISTA E CREDENCIAIS (Section 3) */}
      <Modal
        isOpen={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setEditingDriver(null);
          setDriverFormError(null);
        }}
        title={editingDriver ? `Editar Motorista: ${editingDriver.name}` : 'Cadastrar Novo Motorista'}
        subtitle="O motorista cadastrado terá acesso exclusivamente às funções do Portal do Motorista"
        maxWidth="xl"
      >
        <form onSubmit={handleSaveDriver} className="space-y-4">
          {driverFormError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{driverFormError}</span>
            </div>
          )}

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

          {/* Dedicated Driver Credentials Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Credenciais de Acesso Exclusivo do Motorista
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Perfil: Somente Motorista
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Login / E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  placeholder="motorista@truckgestao.com"
                  value={newDriver.loginEmail}
                  onChange={(e) => setNewDriver({ ...newDriver, loginEmail: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha de Acesso {editingDriver ? '(deixe igual ou altere)' : '*'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required={!editingDriver}
                    placeholder="Ex: Trk@2026"
                    value={newDriver.password}
                    onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateDriverPassword}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] font-semibold shrink-0 border border-slate-700"
                  >
                    Gerar
                  </button>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={newDriver.active}
                onChange={(e) => setNewDriver({ ...newDriver, active: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-amber-500"
              />
              <span>Acesso ativo (desmarque para bloquear o login deste motorista)</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDriverModalOpen(false);
                setEditingDriver(null);
              }}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingDriver}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs disabled:opacity-50"
            >
              {isSavingDriver
                ? 'Salvando...'
                : editingDriver
                ? 'Atualizar Motorista & Credenciais'
                : 'Cadastrar Motorista'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CADASTRAR VEÍCULO (Section 4) */}
      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        title="Cadastrar Novo Veículo"
        subtitle="Registro de caminhão com quilometragem, limite de revisão preventiva e troca de óleo"
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Limite Revisão Prev. *</label>
              <input
                type="number"
                required
                value={newVehicle.nextPreventiveMaintenanceKm}
                onChange={(e) => setNewVehicle({ ...newVehicle, nextPreventiveMaintenanceKm: parseInt(e.target.value) || 0 })}
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Km Próxima Troca Óleo *</label>
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

      {/* MODAL: CONFIGURAR QUILOMETRAGEM E LIMITE DA REVISÃO PREVENTIVA */}
      <Modal
        isOpen={isMileageConfigModalOpen}
        onClose={() => {
          setIsMileageConfigModalOpen(false);
          setSelectedVehicleForMileage(null);
        }}
        title={selectedVehicleForMileage ? `Monitoramento de Km: ${selectedVehicleForMileage.plate}` : 'Configurar Monitoramento'}
        subtitle="Configure o odômetro atual e o limite de quilometragem para a próxima revisão preventiva"
        maxWidth="md"
      >
        <form onSubmit={handleSaveMileageConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Odômetro Atual do Veículo (km) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={mileageConfigForm.currentKm}
              onChange={(e) => setMileageConfigForm({ ...mileageConfigForm, currentKm: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Limite Configurado para Próxima Revisão Preventiva (km) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={mileageConfigForm.nextPreventiveMaintenanceKm}
              onChange={(e) => setMileageConfigForm({ ...mileageConfigForm, nextPreventiveMaintenanceKm: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
            {mileageConfigForm.currentKm > mileageConfigForm.nextPreventiveMaintenanceKm && (
              <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  Atenção: Este veículo ficará sinalizado como LIMITE ULTRAPASSADO (+{(mileageConfigForm.currentKm - mileageConfigForm.nextPreventiveMaintenanceKm).toLocaleString('pt-BR')} km).
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Limite Próxima Troca de Óleo (km)
            </label>
            <input
              type="number"
              required
              min={0}
              value={mileageConfigForm.nextOilChangeKm}
              onChange={(e) => setMileageConfigForm({ ...mileageConfigForm, nextOilChangeKm: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsMileageConfigModalOpen(false);
                setSelectedVehicleForMileage(null);
              }}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Salvar Monitoramento
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: REGISTRAR REVISÃO PREVENTIVA CONCLUÍDA */}
      <Modal
        isOpen={isPreventiveModalOpen}
        onClose={() => {
          setIsPreventiveModalOpen(false);
          setSelectedVehicleForPreventive(null);
        }}
        title={selectedVehicleForPreventive ? `Registrar Revisão Preventiva: ${selectedVehicleForPreventive.plate}` : ''}
        subtitle="Zera o alerta de limite ultrapassado e programa o próximo ciclo preventivo"
        maxWidth="md"
      >
        <form onSubmit={handlePerformPreventiveMaintenance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Quilometragem no Momento da Revisão (km) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={preventiveForm.currentKm}
              onChange={(e) => setPreventiveForm({ ...preventiveForm, currentKm: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Intervalo para a Próxima Revisão Preventiva (km) *
            </label>
            <input
              type="number"
              required
              min={1000}
              value={preventiveForm.intervalKm}
              onChange={(e) => setPreventiveForm({ ...preventiveForm, intervalKm: parseInt(e.target.value) || 20000 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
            <span className="text-[11px] text-emerald-400 font-mono block mt-1">
              Novo limite preventivo será: {(preventiveForm.currentKm + preventiveForm.intervalKm).toLocaleString('pt-BR')} km
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custo da Revisão / Manutenção (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={preventiveForm.cost}
              onChange={(e) => setPreventiveForm({ ...preventiveForm, cost: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsPreventiveModalOpen(false);
                setSelectedVehicleForPreventive(null);
              }}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Confirmar Revisão Preventiva
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custo da Troca de Óleo / Filtros (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={oilChangeForm.cost}
              onChange={(e) => setOilChangeForm({ ...oilChangeForm, cost: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
            />
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

      {/* MODAL: CENTRAL DE GERENCIAMENTO & EXCLUSÃO DE DADOS */}
      <Modal
        isOpen={isDeleteManagerOpen}
        onClose={() => setIsDeleteManagerOpen(false)}
        title="Central de Exclusão de Dados (Exclusivo Administrador)"
        subtitle="Gerencie e remova registros de motoristas, veículos, relatórios e despesas com confirmação"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Entity Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            {[
              { id: 'reports', label: `Relatórios (${dailyReports.length})`, icon: FileText },
              { id: 'checklists', label: `Checklists (${checklists.length})`, icon: ClipboardCheck },
              { id: 'drivers', label: `Motoristas (${drivers.length})`, icon: Users },
              { id: 'vehicles', label: `Veículos (${vehicles.length})`, icon: Truck },
              { id: 'rates', label: `Diárias (${dailyRates.length})`, icon: Receipt },
              { id: 'tolls', label: `Pedágios (${tolls.length})`, icon: DollarSign },
              { id: 'payments', label: `Pagamentos (${payments.length})`, icon: History },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = deleteEntityTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setDeleteEntityTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback banner if an action was recently performed */}
          {deleteFeedback && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              deleteFeedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {deleteFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{deleteFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteFeedback(null)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* List Area with Direct Deletion */}
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {/* REPORTS */}
            {deleteEntityTab === 'reports' && (
              <div className="space-y-2">
                {dailyReports.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum relatório diário cadastrado.</p>
                ) : (
                  dailyReports.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-slate-200 block">{r.driverName} · Placa: {r.vehiclePlate}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Data: {r.date} · {r.distanceKm} km · Frete: R$ {r.totalFreight.toFixed(2)} · Status: {r.status}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({
                          type: 'dailyReport',
                          id: r.id,
                          title: `Excluir Relatório Diário`,
                          description: `Tem certeza que deseja excluir o relatório de ${r.driverName} da data ${r.date} (Placa: ${r.vehiclePlate})?`,
                        })}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CHECKLISTS */}
            {deleteEntityTab === 'checklists' && (
              <div className="space-y-2">
                {checklists.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum checklist de inspeção cadastrado.</p>
                ) : (
                  checklists.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-slate-200 block">{c.vehiclePlate} · {c.driverName}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Data: {c.date} · Anomalias: {c.anomaliesCount} · Status: {c.resolutionStatus}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({
                          type: 'checklist',
                          id: c.id,
                          title: `Excluir Checklist (${c.vehiclePlate})`,
                          description: `Tem certeza que deseja excluir o checklist de ${c.driverName} da data ${c.date}?`,
                        })}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* DRIVERS */}
            {deleteEntityTab === 'drivers' && (
              <div className="space-y-2">
                {drivers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum motorista cadastrado.</p>
                ) : (
                  drivers.map((d) => (
                    <div key={d.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-slate-200 block">{d.name}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">
                          CPF: {d.cpf} · CNH: {d.cnhNumber} (Cat. {d.cnhCategory}) · Venc: {d.cnhExpiry}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({
                          type: 'driver',
                          id: d.id,
                          title: `Excluir Motorista ${d.name}`,
                          description: `Tem certeza que deseja excluir o motorista ${d.name} e suas credenciais de acesso?`,
                        })}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* VEHICLES */}
            {deleteEntityTab === 'vehicles' && (
              <div className="space-y-2">
                {vehicles.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum veículo cadastrado.</p>
                ) : (
                  vehicles.map((v) => (
                    <div key={v.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-slate-200 block">{v.plate} - {v.model}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Odômetro: {v.currentKm.toLocaleString('pt-BR')} km · Próx. Óleo: {v.nextOilChangeKm.toLocaleString('pt-BR')} km
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({
                          type: 'vehicle',
                          id: v.id,
                          title: `Excluir Veículo ${v.plate}`,
                          description: `Tem certeza que deseja excluir o veículo ${v.plate} (${v.model})?`,
                        })}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* DAILY RATES */}
            {deleteEntityTab === 'rates' && (
              <div className="space-y-2">
                {dailyRates.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhuma diária cadastrada.</p>
                ) : (
                  dailyRates.map((rt) => (
                    <div key={rt.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-slate-200 block">Vigência a partir de {rt.effectiveDate}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Motorista: R$ {rt.driverDailyRate.toFixed(2)} · Ajudante: R$ {rt.helperDailyRate.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({
                          type: 'dailyRate',
                          id: rt.id,
                          title: `Excluir Vigência de Diária`,
                          description: `Tem certeza que deseja excluir esta vigência iniciada em ${rt.effectiveDate}?`,
                        })}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TOLLS */}
            {deleteEntityTab === 'tolls' && (
              <div className="space-y-2">
                {tolls.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum pedágio cadastrado.</p>
                ) : (
                  tolls.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-slate-200 block">{t.route}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Data: {t.date} · Veículo: {t.vehiclePlate || 'Geral'} · Valor: R$ {t.cost.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({
                          type: 'toll',
                          id: t.id,
                          title: `Excluir Pedágio`,
                          description: `Tem certeza que deseja excluir o pedágio "${t.route}" no valor de R$ ${t.cost.toFixed(2)}?`,
                        })}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PAYMENTS */}
            {deleteEntityTab === 'payments' && (
              <div className="space-y-2">
                {payments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum histórico de pagamento arquivado.</p>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-slate-200 block">{p.driverName}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Período: {p.startDate} a {p.endDate} · Pago: R$ {p.driverAmount.toFixed(2)} · Líquido: R$ {p.netReceived.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({
                          type: 'payment',
                          id: p.id,
                          title: `Excluir Liquidação`,
                          description: `Tem certeza que deseja excluir o histórico de liquidação de ${p.driverName}?`,
                        })}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Atenção: A exclusão é definitiva no banco de dados.</span>
            <button
              onClick={() => setIsDeleteManagerOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO (100% funcional em iFrame sem dependência de window.confirm) */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title={deleteTarget?.title || 'Confirmar Exclusão'}
        subtitle="Esta ação removerá o registro permanentemente do banco de dados"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200 space-y-1">
              <p className="font-semibold text-slate-100">{deleteTarget?.title}</p>
              <p>{deleteTarget?.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Confirmar Exclusão</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: DESPACHAR NOVA SOLICITAÇÃO DE VIAGEM */}
      <Modal
        isOpen={isTripDispatchModalOpen}
        onClose={() => setIsTripDispatchModalOpen(false)}
        title="Despachar Solicitação de Viagem"
        subtitle="Envia a viagem pendente e dispara alerta sonoro em tempo real no painel do motorista"
        maxWidth="lg"
      >
        <form onSubmit={handleDispatchTrip} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motorista Destinatário *
              </label>
              <select
                required
                value={tripDispatchForm.driverId}
                onChange={(e) => {
                  const selectedDrv = drivers.find((d) => d.id === e.target.value);
                  setTripDispatchForm((prev) => ({
                    ...prev,
                    driverId: e.target.value,
                    vehicleId: selectedDrv?.vehicleId || prev.vehicleId,
                  }));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Veículo / Placa *
              </label>
              <select
                required
                value={tripDispatchForm.vehicleId}
                onChange={(e) =>
                  setTripDispatchForm((prev) => ({ ...prev, vehicleId: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Origem *
              </label>
              <input
                type="text"
                required
                value={tripDispatchForm.origin}
                onChange={(e) =>
                  setTripDispatchForm((prev) => ({ ...prev, origin: e.target.value }))
                }
                placeholder="Ex: Campinas, SP"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Destino *
              </label>
              <input
                type="text"
                required
                value={tripDispatchForm.destination}
                onChange={(e) =>
                  setTripDispatchForm((prev) => ({ ...prev, destination: e.target.value }))
                }
                placeholder="Ex: Sorocaba, SP"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descrição da Carga *
            </label>
            <input
              type="text"
              required
              value={tripDispatchForm.cargoDescription}
              onChange={(e) =>
                setTripDispatchForm((prev) => ({ ...prev, cargoDescription: e.target.value }))
              }
              placeholder="Ex: 4 churrasqueiras pré-moldadas + 12 dutos"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data Programada *
              </label>
              <input
                type="date"
                required
                value={tripDispatchForm.scheduledDate}
                onChange={(e) =>
                  setTripDispatchForm((prev) => ({ ...prev, scheduledDate: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Frete Estimado (R$) *
              </label>
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={tripDispatchForm.estimatedFreight}
                onChange={(e) =>
                  setTripDispatchForm((prev) => ({
                    ...prev,
                    estimatedFreight: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Prioridade
              </label>
              <select
                value={tripDispatchForm.priority}
                onChange={(e) =>
                  setTripDispatchForm((prev) => ({
                    ...prev,
                    priority: e.target.value as 'normal' | 'urgent',
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgente (Alerta Crítico)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações para o Motorista
            </label>
            <textarea
              rows={2}
              value={tripDispatchForm.notes}
              onChange={(e) =>
                setTripDispatchForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Instruções de horário, cliente ou descarga..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTripDispatchModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isDispatchingTrip}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isDispatchingTrip ? 'Enviando...' : 'Enviar Solicitação'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RELATÓRIO OPERACIONAL DE VIAGENS E CUSTOS (PDF IMPRIMÍVEL) */}
      <PrintReportsModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setReportForPrint(null);
        }}
        reports={filteredReports}
        startDate={startDateFilter}
        endDate={endDateFilter}
        selectedDriverName={selectedDriverFilter !== 'all' ? drivers.find((d) => d.id === selectedDriverFilter)?.name : undefined}
        selectedVehiclePlate={selectedVehicleFilter !== 'all' ? vehicles.find((v) => v.id === selectedVehicleFilter)?.plate : undefined}
        adminEmail={adminProfile?.email}
        initialReport={reportForPrint}
      />
    </div>
  );
}
