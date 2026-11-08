'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import { AdminDashboard } from '@/components/AdminDashboard';
import { DriverPortal } from '@/components/DriverPortal';
import { Modal } from '@/components/Modal';
import { testFirestoreConnection } from '@/lib/firebase';
import { seedInitialDataIfEmpty, getDrivers, getVehicles, getDailyReports, getDailyRates, getTolls, getPayments } from '@/services/firestoreService';
import { Driver, Vehicle, DailyReport, DailyRateConfig, TollRecord, PaymentRecord } from '@/types/truck-service';
import { 
  Truck, 
  ShieldCheck, 
  UserCheck, 
  LogIn, 
  LogOut, 
  Lock,
  KeyRound,
  User,
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

function TruckAppInner() {
  const { 
    user, 
    profile, 
    role, 
    currentDriver, 
    loading, 
    signInWithGoogle, 
    signInWithCredentials, 
    signOut, 
    switchDemoRole 
  } = useAuth();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [dailyRates, setDailyRates] = useState<DailyRateConfig[]>([]);
  const [tolls, setTolls] = useState<TollRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('admin@truckgestao.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Load all operational data from Firestore
  const loadData = async () => {
    setDataLoading(true);
    try {
      const [d, v, rep, rat, t, p] = await Promise.all([
        getDrivers(),
        getVehicles(),
        getDailyReports(),
        getDailyRates(),
        getTolls(),
        getPayments(),
      ]);
      setDrivers(d);
      setVehicles(v);
      setDailyReports(rep);
      setDailyRates(rat);
      setTolls(t);
      setPayments(p);
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

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmittingLogin(true);

    const res = await signInWithCredentials(loginIdentifier, loginPassword);
    setIsSubmittingLogin(false);

    if (res.success) {
      setIsLoginModalOpen(false);
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

  // Active driver for Driver Portal view
  const activeDriver = currentDriver || drivers[0] || {
    id: 'drv-01',
    name: 'Carlos Eduardo Silveira',
    rg: '38.419.028-1',
    cpf: '284.912.834-02',
    address: 'Campinas, SP',
    cnhCategory: 'E',
    cnhNumber: '04829184029',
    cnhExpiry: '2027-08-15',
    vehicleId: 'veh-01',
    active: true,
    createdAt: '',
  };

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

        {/* Profile / Role Selector Banner */}
        <div className="flex items-center gap-3">
          {/* Quick Access Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                if (profile?.role === 'admin') {
                  switchDemoRole('admin');
                } else {
                  setLoginError('Acesso Restrito: Somente os usuários cadastrados no Supabase com perfil de Administrador têm acesso ao Painel com todas as funções.');
                  setIsLoginModalOpen(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                role === 'admin' && profile?.role === 'admin'
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
                role === 'driver' || profile?.role !== 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Portal Motorista</span>
            </button>

            {drivers.length > 1 && (
              <select
                value={activeDriver.id}
                onChange={(e) => switchDemoRole('driver', e.target.value)}
                className="bg-slate-900 border border-slate-700 text-amber-400 text-xs font-semibold rounded-lg px-2 py-1 ml-1 focus:outline-none focus:border-amber-500"
                title="Alternar motorista ativo"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* User Sign-In & Account Lockup */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
              title="Entrar com login e senha ou trocar de perfil"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-left hidden sm:block">
                <span className="block text-[11px] font-bold text-slate-100 leading-tight">
                  {profile?.name || (role === 'admin' ? 'Administrador' : activeDriver.name)}
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  {profile?.role === 'admin' ? '👑 Admin' : '🚚 Motorista'}
                </span>
              </div>
            </button>

            {/* Logout button */}
            <button
              onClick={signOut}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Desconectar sessão atual"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Role-Based Routing */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {role === 'admin' && profile?.role === 'admin' ? (
          <AdminDashboard
            drivers={drivers}
            vehicles={vehicles}
            dailyReports={dailyReports}
            dailyRates={dailyRates}
            tolls={tolls}
            payments={payments}
            adminProfile={profile}
            onRefreshData={loadData}
          />
        ) : (
          <DriverPortal
            currentDriver={activeDriver}
            vehicles={vehicles}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* MODAL: LOGIN & CREDENCIAIS DE ACESSO */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Acesso ao Sistema TruckGestão"
        subtitle="Somente usuários cadastrados no Supabase com perfil de Administrador têm acesso ao Painel com todas as funções"
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Quick-Fill Test Accounts */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Contas de Acesso Cadastradas
            </span>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@truckgestao.com', 'admin123')}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <strong className="text-slate-100 block">👑 Administrador Supabase</strong>
                  <span className="text-[11px] text-slate-400 font-mono">admin@truckgestao.com / admin123 (Acesso total + Exclusão de dados)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('carlos.silveira@truckgestao.com', 'carlos123')}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <strong className="text-slate-100 block">🚚 Motorista Carlos Eduardo</strong>
                  <span className="text-[11px] text-slate-400 font-mono">carlos.silveira@truckgestao.com / carlos123 (Portal do Motorista)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('marcos.souza@truckgestao.com', 'marcos123')}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <strong className="text-slate-100 block">🚚 Motorista Marcos Souza</strong>
                  <span className="text-[11px] text-slate-400 font-mono">marcos.souza@truckgestao.com / marcos123 (Portal do Motorista)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>

          {/* Login Form */}
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
                placeholder="Ex: admin@truckgestao.com ou seu CPF"
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
            <span className="text-[11px] text-slate-400 text-center">
              Ou acesse com sua conta Google vinculada:
            </span>
            <button
              type="button"
              onClick={async () => {
                await signInWithGoogle();
                setIsLoginModalOpen(false);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Entrar com Google</span>
            </button>
          </div>
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
