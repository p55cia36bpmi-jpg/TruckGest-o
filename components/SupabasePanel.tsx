'use client';

import React, { useState, useEffect } from 'react';
import { testSupabaseConnection, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Database, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Table,
  ShieldAlert,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react';

const SCHEMA_SQL = `-- ============================================================================
-- TRUCKGESÃO - SUPABASE DATABASE MIGRATION
-- Migration: 20261108000000_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. USUÁRIOS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
    driver_id TEXT,
    password TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. VEÍCULOS
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    plate VARCHAR(10) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    current_km INTEGER NOT NULL DEFAULT 0 CHECK (current_km >= 0),
    last_oil_change_date DATE NOT NULL,
    last_oil_change_km INTEGER NOT NULL DEFAULT 0,
    next_oil_change_km INTEGER NOT NULL DEFAULT 20000,
    filters_replaced BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MOTORISTAS
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    rg VARCHAR(30) NOT NULL,
    cpf VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    cnh_category VARCHAR(2) NOT NULL CHECK (cnh_category IN ('C', 'D', 'E')),
    cnh_number VARCHAR(30) NOT NULL,
    cnh_expiry DATE NOT NULL,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    phone VARCHAR(30),
    login_email VARCHAR(150),
    password VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DIÁRIAS COM HISTÓRICO
CREATE TABLE IF NOT EXISTS public.daily_rates (
    id TEXT PRIMARY KEY,
    driver_daily_rate NUMERIC(10, 2) NOT NULL CHECK (driver_daily_rate >= 0),
    helper_daily_rate NUMERIC(10, 2) NOT NULL CHECK (helper_daily_rate >= 0),
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PEDÁGIOS
CREATE TABLE IF NOT EXISTS public.tolls (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    route VARCHAR(255) NOT NULL,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    vehicle_plate VARCHAR(10),
    cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RELATÓRIOS DIÁRIOS
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    driver_name VARCHAR(150) NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    start_km INTEGER NOT NULL CHECK (start_km >= 0),
    end_km INTEGER NOT NULL CHECK (end_km >= 0),
    distance_km INTEGER GENERATED ALWAYS AS (end_km - start_km) STORED,
    tolls_count INTEGER NOT NULL DEFAULT 0,
    has_helper BOOLEAN NOT NULL DEFAULT false,
    fuel_cost NUMERIC(10, 2) NOT NULL CHECK (fuel_cost >= 0),
    fuel_liters NUMERIC(10, 2) NOT NULL CHECK (fuel_liters >= 0),
    total_other_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_freight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_deliveries INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'paid')),
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_end_km_gte_start CHECK (end_km >= start_km),
    CONSTRAINT uq_driver_date UNIQUE (driver_id, date)
);

-- 7. ENTREGAS
CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    freight_value NUMERIC(10, 2) NOT NULL CHECK (freight_value >= 0),
    material VARCHAR(150) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. GASTOS DIVERSOS
CREATE TABLE IF NOT EXISTS public.report_expenses (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('Óleo', 'Manutenção', 'Outros')),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PAGAMENTOS
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
    driver_name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_worked INTEGER NOT NULL DEFAULT 0,
    helper_days_worked INTEGER NOT NULL DEFAULT 0,
    driver_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    helper_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_freight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_fuel NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_tolls NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_received NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    confirmed_at TIMESTAMPTZ,
    confirmed_by_admin_email VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TROCAS DE ÓLEO
CREATE TABLE IF NOT EXISTS public.oil_maintenance_logs (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    km_at_change INTEGER NOT NULL,
    next_km_due INTEGER NOT NULL,
    filters_replaced BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.system_notifications (
    id TEXT PRIMARY KEY,
    type VARCHAR(30) NOT NULL CHECK (type IN ('oil_change', 'cnh_expiry', 'payment_pending', 'report_submitted', 'general')),
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    date DATE NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    vehicle_id TEXT,
    driver_id TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilita Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oil_maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS padrão
CREATE POLICY "Acesso Total Veículos" ON public.vehicles FOR ALL USING (true);
CREATE POLICY "Acesso Total Diárias" ON public.daily_rates FOR ALL USING (true);
CREATE POLICY "Acesso Total Pedágios" ON public.tolls FOR ALL USING (true);
CREATE POLICY "Acesso Total Motoristas" ON public.drivers FOR ALL USING (true);
CREATE POLICY "Acesso Total Relatórios" ON public.daily_reports FOR ALL USING (true);
CREATE POLICY "Acesso Total Entregas" ON public.deliveries FOR ALL USING (true);
CREATE POLICY "Acesso Total Despesas" ON public.report_expenses FOR ALL USING (true);
CREATE POLICY "Acesso Total Pagamentos" ON public.payments FOR ALL USING (true);
CREATE POLICY "Acesso Total Notificações" ON public.system_notifications FOR ALL USING (true);
CREATE POLICY "Acesso Total Logs Óleo" ON public.oil_maintenance_logs FOR ALL USING (true);
CREATE POLICY "Acesso Total Usuários" ON public.users FOR ALL USING (true);`;

const SEED_SQL = `-- ============================================================================
-- TRUCKGESÃO - SEED DATA INICIAL
-- Migration: 20261108000001_seed_data.sql
-- ============================================================================

INSERT INTO public.vehicles (id, plate, model, current_km, last_oil_change_date, last_oil_change_km, next_oil_change_km, filters_replaced)
VALUES 
    ('veh-01', 'BRA2E19', 'Scania R450 6x2 Highline', 142100, '2026-10-15', 125000, 145000, true),
    ('veh-02', 'RTO4A88', 'Volvo FH 540 6x4 Globetrotter', 89850, '2026-08-10', 70000, 90000, true),
    ('veh-03', 'FKS9D12', 'Mercedes-Benz Actros 2651', 210400, '2026-09-01', 195000, 215000, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.daily_rates (id, driver_daily_rate, helper_daily_rate, effective_date)
VALUES 
    ('rate-01', 220.00, 130.00, '2026-01-01'),
    ('rate-02', 200.00, 110.00, '2025-06-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.drivers (id, name, rg, cpf, address, cnh_category, cnh_number, cnh_expiry, vehicle_id, phone, login_email, password, active)
VALUES 
    ('drv-01', 'Carlos Eduardo Silveira', '38.419.028-1', '284.912.834-02', 'Rua das Acácias, 412, Campinas - SP', 'E', '04829184029', '2027-08-15', 'veh-01', '(19) 98124-7711', 'carlos.silveira@truckgestao.com', 'carlos123', true),
    ('drv-02', 'Marcos Antônio de Souza', '41.802.193-4', '391.028.481-90', 'Av. Brasil, 1850, Paulínia - SP', 'E', '05910284711', '2026-11-28', 'veh-02', '(19) 99341-8822', 'marcos.souza@truckgestao.com', 'marcos123', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (uid, email, name, role, driver_id, password)
VALUES 
    ('admin-master', 'admin@truckgestao.com', 'Gestor de Frota (Administrador)', 'admin', NULL, 'admin123'),
    ('user-drv-01', 'carlos.silveira@truckgestao.com', 'Carlos Eduardo Silveira', 'driver', 'drv-01', 'carlos123'),
    ('user-drv-02', 'marcos.souza@truckgestao.com', 'Marcos Antônio de Souza', 'driver', 'drv-02', 'marcos123')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO public.tolls (id, date, route, vehicle_id, vehicle_plate, cost)
VALUES 
    ('toll-01', '2026-11-02', 'Rodovia dos Bandeirantes km 77 (Itupeva)', 'veh-01', 'BRA2E19', 11.80),
    ('toll-02', '2026-11-02', 'Rodovia Anhanguera km 115 (Sumaré)', 'veh-01', 'BRA2E19', 10.40)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.daily_reports (
    id, driver_id, driver_name, vehicle_id, vehicle_plate, date,
    start_km, end_km, tolls_count, has_helper, fuel_cost, fuel_liters,
    total_other_expenses, total_freight, total_deliveries, status, can_edit
) VALUES 
    ('rep-01', 'drv-01', 'Carlos Eduardo Silveira', 'veh-01', 'BRA2E19', '2026-11-02', 141750, 142100, 2, true, 480.00, 80.00, 35.00, 1850.00, 2, 'approved', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.deliveries (id, report_id, city, freight_value, material, quantity)
VALUES 
    ('del-01', 'rep-01', 'Campinas, SP', 1100.00, 'Peças Automotivas', '18 pallets'),
    ('del-02', 'rep-01', 'Jundiaí, SP', 750.00, 'Embalagens Industriais', '12 caixas')
ON CONFLICT (id) DO NOTHING;`;

export function SupabasePanel() {
  const [activeTab, setActiveTab] = useState<'schema' | 'seed' | 'tables'>('schema');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    connected: boolean;
    configured: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleCopy = () => {
    const textToCopy = activeTab === 'schema' ? SCHEMA_SQL : SEED_SQL;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeTab === 'schema' ? '20261108000000_initial_schema.sql' : '20261108000001_seed_data.sql';
    const content = activeTab === 'schema' ? SCHEMA_SQL : SEED_SQL;
    const blob = new Blob([content], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult({
      tested: true,
      connected: res.connected,
      configured: res.configured,
      message: res.message,
    });
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Integração com Supabase & Migrations PostgreSQL
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SQL Ativo
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scripts de migrations completos, tabelas relacionais, integridade referencial, triggers e políticas RLS
              </p>
            </div>
          </div>
        </div>

        {/* Connection Test Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Testar Conexão Supabase</span>
          </button>
        </div>
      </div>

      {/* Connection Test Alert */}
      {testResult && (
        <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
          testResult.connected
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}>
          {testResult.connected ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <strong className="block font-semibold">
              {testResult.connected ? 'Supabase Conectado' : 'Configuração de Conexão'}
            </strong>
            <p className="leading-relaxed">{testResult.message}</p>
          </div>
        </div>
      )}

      {/* Instructions Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">1</span>
            Criar Projeto no Supabase
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-amber-400 underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a>, crie uma organização e um novo projeto PostgreSQL.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">2</span>
            Executar as Migrations
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            No painel do Supabase, abra o <strong>SQL Editor</strong>, cole o conteúdo das migrations abaixo e clique em <strong>Run</strong>.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[11px]">3</span>
            Variáveis de Ambiente
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Adicione <code className="text-amber-300 font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_URL</code> e <code className="text-amber-300 font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no seu arquivo <code className="font-mono">.env</code>.
          </p>
        </div>
      </div>

      {/* Migration Files & SQL Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Sub Navigation */}
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'schema'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>1. Schema & RLS (20261108000000)</span>
            </button>

            <button
              onClick={() => setActiveTab('seed')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'seed'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Seed Data (20261108000001)</span>
            </button>

            <button
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'tables'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>11 Tabelas Mapeadas</span>
            </button>
          </div>

          {activeTab !== 'tables' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                title="Copiar código SQL"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
                title="Baixar arquivo SQL"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar .SQL</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Viewer */}
        {activeTab !== 'tables' ? (
          <div className="relative">
            <pre className="p-5 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed bg-slate-950 select-all">
              {activeTab === 'schema' ? SCHEMA_SQL : SEED_SQL}
            </pre>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
              Dicionário de Dados Relacional PostgreSQL (Supabase)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { name: 'users', desc: 'Perfis de administradores e motoristas com senha', pkey: 'id (UUID)', fkeys: 'driver_id' },
                { name: 'vehicles', desc: 'Caminhões, odômetro atual, controle de óleo e filtros', pkey: 'id (TEXT)', fkeys: '--' },
                { name: 'drivers', desc: 'Motoristas, RG, CPF, categoria e validade da CNH', pkey: 'id (TEXT)', fkeys: 'vehicle_id' },
                { name: 'daily_rates', desc: 'Vigência histórica de diárias de motorista e ajudante', pkey: 'id (TEXT)', fkeys: '--' },
                { name: 'tolls', desc: 'Praças de pedágio cadastradas por rota com valor monetário', pkey: 'id (TEXT)', fkeys: 'vehicle_id' },
                { name: 'daily_reports', desc: 'Relatório diário com km, litros, diesel e status', pkey: 'id (TEXT)', fkeys: 'driver_id, vehicle_id' },
                { name: 'deliveries', desc: 'Entregas dinâmicas por cidade, frete e material', pkey: 'id (TEXT)', fkeys: 'report_id' },
                { name: 'report_expenses', desc: 'Gastos diversos (óleo, manutenção e outros)', pkey: 'id (TEXT)', fkeys: 'report_id' },
                { name: 'payments', desc: 'Liquidações de pagamentos confirmados com recibo', pkey: 'id (TEXT)', fkeys: 'driver_id' },
                { name: 'oil_maintenance_logs', desc: 'Histórico de trocas de óleo e alertas de 200 km', pkey: 'id (TEXT)', fkeys: 'vehicle_id' },
                { name: 'system_notifications', desc: 'Avisos de manutenção de óleo e vencimento de CNH', pkey: 'id (TEXT)', fkeys: 'vehicle_id, driver_id' },
              ].map((t) => (
                <div key={t.name} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-amber-400 font-mono">{t.name}</strong>
                    <span className="text-[10px] font-mono text-slate-500">{t.pkey}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{t.desc}</p>
                  {t.fkeys !== '--' && (
                    <span className="text-[10px] font-mono text-slate-500 block">
                      FK: {t.fkeys}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
