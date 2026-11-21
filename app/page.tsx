'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import { AdminDashboard } from '@/components/AdminDashboard';
import { DriverPortal } from '@/components/DriverPortal';
import { Modal } from '@/components/Modal';
import { testFirestoreConnection } from '@/lib/firebase';
import {
  seedInitialDataIfEmpty,
  getDrivers,
  getVehicles,
  getDailyReports,
  getDailyRates,
  getTolls,
  getPayments,
  getVehicleChecklists,
  getMaintenanceRecords,
  getTripRequests,
  subscribeAllTripRequests,
  subscribeAllVehicleChecklists,
} from '@/services/firestoreService';
import {
  Driver,
  Vehicle,
  DailyReport,
  DailyRateConfig,
  TollRecord,
  PaymentRecord,
  VehicleChecklist,
  MaintenanceRecord,
  TripRequest,
} from '@/types/truck-service';
import {
  Truck,
  ShieldCheck,
  UserCheck,
  LogIn,
  LogOut,
  Lock,
  KeyRound,
  User,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';

function TruckAppInner() {
  const {
    profile,
    role,
    currentDriver,
    loading,
    signInWithGoogle,
    signInWithCredentials,
    signOut,
    switchDemoRole,
  } = useAuth();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [dailyRates, setDailyRates] = useState<DailyRateConfig[]>([]);
  const [tolls, setTolls] = useState<TollRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Login Form & Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Load all operational data from Firestore
  const loadData = async () => {
    setDataLoading(true);
    try {
      const [d, v, rep, rat, t, p, chk, maint, trips] = await Promise.all([
        getDrivers(),
        getVehicles(),
        getDailyReports(),
        getDailyRates(),
        getTolls(),
        getPayments(),
        getVehicleChecklists(),
        getMaintenanceRecords(),
        getTripRequests(),
      ]);
      setDrivers(d);
      setVehicles(v);
      setDailyReports(rep);
      setDailyRates(rat);
      setTolls(t);
      setPayments(p);
      setChecklists(chk);
      setMaintenanceRecords(maint);
      setTripRequests(trips);
    } catch (err) {
      console.error('Erro ao carregar dados do Firestore:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      await testFirestoreConnection();
      await seedInitialDataIfEmpty();
      await loadData();
    }
    init();
  }, []);

  // Real-time admin sync when drivers respond to trips or submit vehicle checklists
  const profileUid = profile?.uid;
  const profileRole = profile?.role;
  useEffect(() => {
    if (!profileUid || profileRole !== 'admin') return;
    const unsubTrips = subscribeAllTripRequests((items) => {
      setTripRequests(items);
    });
    const unsubChecklists = subscribeAllVehicleChecklists((items) => {
      setChecklists(items);
    });
    return () => {
      unsubTrips();
      unsubChecklists();
    };
  }, [profileUid, profileRole]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmittingLogin(true);

    const res = await signInWithCredentials(loginIdentifier, loginPassword);
    setIsSubmittingLogin(false);

    if (res.success) {
      setIsLoginModalOpen(false);
      setLoginPassword('');
      await loadData();
    } else {
      setLoginError(res.error || 'Credenciais inválidas. Verifique usuário e senha.');
    }
  };

  const handleQuickFill = (identifier: string, pass: string) => {
    setLoginIdentifier(identifier);
    setLoginPassword(pass);
    setLoginError(null);
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-mono text-xs space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span>Conectando ao Cloud Firestore & TruckGestão...</span>
      </div>
    );
  }

  // Dedicated Full-Page Login Screen when unauthenticated
  if (!profile) {
    const activeDriversList = drivers.filter((d) => d.active !== false && d.loginEmail);
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans selection:bg-amber-500 selection:text-slate-950">
        <div className="w-full max-w-md space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 mx-auto">
              <Truck className="w-8 h-8" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">TruckGestão</h1>
              <span className="text-[11px] font-mono uppercase bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700 font-bold">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Acesso seguro para Administradores e Motoristas da Frota
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Usuário / E-mail / CPF
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Ex: motorista@truckgestao.com ou CPF"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Informe sua senha"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingLogin ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verificando Credenciais...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>

            {/* Google Auth Alternative */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  await signInWithGoogle();
                  await loadData();
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Entrar com Google</span>
              </button>
            </div>

            {/* Quick-Fill Registered Accounts */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Acesso Rápido (Contas de Teste)
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@truckgestao.com', 'admin123')}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-left transition-colors"
                >
                  <div>
                    <strong className="text-slate-100 block">👑 Administrador</strong>
                    <span className="text-[11px] text-slate-400 font-mono">admin@truckgestao.com · Painel Completo</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                </button>

                {activeDriversList.slice(0, 2).map((drv) => (
                  <button
                    key={drv.id}
                    type="button"
                    onClick={() => handleQuickFill(drv.loginEmail || '', drv.password || '')}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-left transition-colors"
                  >
                    <div>
                      <strong className="text-slate-100 block">🚚 Motorista: {drv.name}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {drv.loginEmail} · Somente Funções de Motorista
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';

  // Resolve active driver: for a logged-in driver, strictly lock to their own profile.driverId
  const resolvedDriver = isAdmin
    ? currentDriver || drivers[0]
    : drivers.find((d) => d.id === profile.driverId) || currentDriver;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Universal Top Header */}
      <header className="px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 flex items-center justify-between gap-4">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                TruckGestão
              </h1>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
              Gestão de Serviços de Caminhão & Finanças
            </p>
          </div>
        </div>

        {/* Profile / Role Controls */}
        <div className="flex items-center gap-3">
          {isAdmin ? (
            /* Admin Preview Toggle (strictly visible only to Admin accounts) */
            <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => switchDemoRole('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  role === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Painel Administrador</span>
              </button>

              <button
                onClick={() => switchDemoRole('driver', drivers[0]?.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  role === 'driver'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Portal Motorista</span>
              </button>

              {role === 'driver' && drivers.length > 1 && resolvedDriver && (
                <select
                  value={resolvedDriver.id}
                  onChange={(e) => switchDemoRole('driver', e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-amber-400 text-xs font-semibold rounded-lg px-2 py-1 ml-1 focus:outline-none focus:border-amber-500"
                  title="Visualizar portal de outro motorista"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            /* Strict Driver-Only Read-Only Badge (no admin button, no driver switcher) */
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acesso Exclusivo Motorista</span>
            </div>
          )}

          {/* User Account Lockup & Logout */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
                title="Trocar conta conectada"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <div className="text-left hidden sm:block">
                  <span className="block text-[11px] font-bold text-slate-100 leading-tight">
                    {profile.name}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">
                    👑 Admin
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <div className="text-left">
                  <span className="block text-[11px] font-bold text-slate-100 leading-tight">
                    {resolvedDriver?.name || profile.name}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    🚚 Motorista
                  </span>
                </div>
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-2.5 py-2 text-slate-300 hover:text-rose-400 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 transition-colors text-xs font-semibold"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Strict Role-Based Routing */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {isAdmin && role === 'admin' ? (
          <AdminDashboard
            drivers={drivers}
            vehicles={vehicles}
            dailyReports={dailyReports}
            dailyRates={dailyRates}
            tolls={tolls}
            payments={payments}
            checklists={checklists}
            maintenanceRecords={maintenanceRecords}
            tripRequests={tripRequests}
            adminProfile={profile}
            onRefreshData={loadData}
          />
        ) : resolvedDriver && resolvedDriver.active !== false ? (
          <DriverPortal
            currentDriver={resolvedDriver}
            vehicles={vehicles}
            onRefreshData={loadData}
          />
        ) : (
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center max-w-md mx-auto my-12 space-y-4">
            <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-100">Acesso Bloqueado ou Cadastro Pendente</h2>
            <p className="text-xs text-slate-400">
              Seu cadastro de motorista está temporariamente bloqueado ou ainda não foi vinculado a um perfil ativo. Entre em contato com o administrador.
            </p>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs"
            >
              Voltar para Tela de Login
            </button>
          </div>
        )}
      </main>

      {/* MODAL: TROCAR CONTA (Apenas quando admin deseja trocar sessão) */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Trocar Conta no TruckGestão"
        subtitle="Entre com credenciais de Administrador ou Motorista cadastrado"
        maxWidth="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Usuário / E-mail / CPF
              </label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="Ex: motorista@truckgestao.com ou CPF"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Senha de Acesso
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Informe sua senha"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {loginError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmittingLogin ? 'Verificando...' : 'Entrar com esta Conta'}</span>
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TruckAppInner />
    </AuthProvider>
  );
}
