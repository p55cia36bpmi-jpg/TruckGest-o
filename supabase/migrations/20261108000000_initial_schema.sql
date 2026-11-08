-- ============================================================================
-- TRUCKGESÃO - SUPABASE DATABASE MIGRATION
-- Migration: 20261108000000_initial_schema.sql
-- Descrição: Estrutura completa de tabelas relacionais, integridade referencial,
--            restrições de negócio, índices e Row Level Security (RLS).
-- ============================================================================

-- 1. EXTENSÕES DO POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função utilitária para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. TABELA: USUÁRIOS E PERFIS DE ACESSO (users)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_users_uid ON public.users(uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_driver_id ON public.users(driver_id);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 3. TABELA: VEÍCULOS (vehicles) - Seção 4
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    plate VARCHAR(10) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    current_km INTEGER NOT NULL DEFAULT 0 CHECK (current_km >= 0),
    last_oil_change_date DATE NOT NULL,
    last_oil_change_km INTEGER NOT NULL DEFAULT 0 CHECK (last_oil_change_km >= 0),
    next_oil_change_km INTEGER NOT NULL DEFAULT 20000 CHECK (next_oil_change_km >= 0),
    filters_replaced BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate);

CREATE TRIGGER trg_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. TABELA: MOTORISTAS (drivers) - Seção 3
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_drivers_cpf ON public.drivers(cpf);
CREATE INDEX IF NOT EXISTS idx_drivers_cnh_expiry ON public.drivers(cnh_expiry);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle ON public.drivers(vehicle_id);

CREATE TRIGGER trg_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 5. TABELA: DIÁRIAS COM HISTÓRICO DE VIGÊNCIA (daily_rates) - Seção 7
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_rates (
    id TEXT PRIMARY KEY,
    driver_daily_rate NUMERIC(10, 2) NOT NULL CHECK (driver_daily_rate >= 0),
    helper_daily_rate NUMERIC(10, 2) NOT NULL CHECK (helper_daily_rate >= 0),
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_rates_effective ON public.daily_rates(effective_date DESC);

-- ============================================================================
-- 6. TABELA: PEDÁGIOS POR ROTA (tolls) - Seção 8
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tolls (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    route VARCHAR(255) NOT NULL,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    vehicle_plate VARCHAR(10),
    cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tolls_date ON public.tolls(date);
CREATE INDEX IF NOT EXISTS idx_tolls_vehicle ON public.tolls(vehicle_id);

-- ============================================================================
-- 7. TABELA: RELATÓRIOS DIÁRIOS DE TRABALHO (daily_reports) - Seção 5
-- ============================================================================
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
    tolls_count INTEGER NOT NULL DEFAULT 0 CHECK (tolls_count >= 0),
    has_helper BOOLEAN NOT NULL DEFAULT false,
    fuel_cost NUMERIC(10, 2) NOT NULL CHECK (fuel_cost >= 0),
    fuel_liters NUMERIC(10, 2) NOT NULL CHECK (fuel_liters >= 0),
    total_other_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_other_expenses >= 0),
    total_freight NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_freight >= 0),
    total_deliveries INTEGER NOT NULL DEFAULT 0 CHECK (total_deliveries >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'paid')),
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_end_km_gte_start CHECK (end_km >= start_km),
    CONSTRAINT uq_driver_date UNIQUE (driver_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_driver ON public.daily_reports(driver_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_vehicle ON public.daily_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON public.daily_reports(status);

CREATE TRIGGER trg_daily_reports_updated_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 8. TABELA: ENTREGAS POR CIDADE (deliveries) - Etapa 2 do Relatório
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    freight_value NUMERIC(10, 2) NOT NULL CHECK (freight_value >= 0),
    material VARCHAR(150) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_report ON public.deliveries(report_id);

-- ============================================================================
-- 9. TABELA: GASTOS DIVERSOS DO RELATÓRIO (report_expenses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.report_expenses (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('Óleo', 'Manutenção', 'Outros')),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_expenses_report ON public.report_expenses(report_id);

-- ============================================================================
-- 10. TABELA: HISTÓRICO DE PAGAMENTOS CONFIRMADOS (payments) - Seções 10 & 11
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_payments_driver ON public.payments(driver_id);
CREATE INDEX IF NOT EXISTS idx_payments_period ON public.payments(start_date, end_date);

-- ============================================================================
-- 11. TABELA: HISTÓRICO DE TROCAS DE ÓLEO (oil_maintenance_logs)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_oil_logs_vehicle ON public.oil_maintenance_logs(vehicle_id);

-- ============================================================================
-- 12. TABELA: CENTRAL DE NOTIFICAÇÕES (system_notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_notifications (
    id TEXT PRIMARY KEY,
    type VARCHAR(30) NOT NULL CHECK (type IN ('oil_change', 'cnh_expiry', 'payment_pending', 'report_submitted', 'general')),
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    date DATE NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    vehicle_id TEXT,
    driver_id TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.system_notifications(read);

-- ============================================================================
-- 13. POLÍTICAS DE ROW LEVEL SECURITY (RLS) NO SUPABASE
-- ============================================================================

-- Habilita RLS em todas as tabelas
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

-- Políticas para usuários anon / autenticados
-- 1. Veículos, Diárias e Pedágios: Leitura permitida para todos autenticados
CREATE POLICY "Leitura de Veículos permitida para todos"
ON public.vehicles FOR SELECT USING (true);

CREATE POLICY "Gestão de Veículos por Administrador"
ON public.vehicles FOR ALL USING (true);

CREATE POLICY "Leitura de Diárias permitida"
ON public.daily_rates FOR SELECT USING (true);

CREATE POLICY "Gestão de Diárias por Administrador"
ON public.daily_rates FOR ALL USING (true);

CREATE POLICY "Leitura de Pedágios permitida"
ON public.tolls FOR SELECT USING (true);

CREATE POLICY "Gestão de Pedágios por Administrador"
ON public.tolls FOR ALL USING (true);

-- 2. Motoristas
CREATE POLICY "Leitura de Motoristas permitida"
ON public.drivers FOR SELECT USING (true);

CREATE POLICY "Gestão de Motoristas por Administrador"
ON public.drivers FOR ALL USING (true);

-- 3. Relatórios Diários
CREATE POLICY "Leitura de Relatórios"
ON public.daily_reports FOR SELECT USING (true);

CREATE POLICY "Criação de Relatórios Diários"
ON public.daily_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Atualização de Relatórios Diários"
ON public.daily_reports FOR UPDATE USING (true);

CREATE POLICY "Exclusão de Relatórios Diários"
ON public.daily_reports FOR DELETE USING (true);

-- 4. Entregas e Gastos Diversos
CREATE POLICY "Acesso a Entregas"
ON public.deliveries FOR ALL USING (true);

CREATE POLICY "Acesso a Gastos Diversos"
ON public.report_expenses FOR ALL USING (true);

-- 5. Pagamentos e Histórico
CREATE POLICY "Acesso ao Histórico de Pagamentos"
ON public.payments FOR ALL USING (true);

-- 6. Notificações e Manutenção
CREATE POLICY "Acesso a Notificações"
ON public.system_notifications FOR ALL USING (true);

CREATE POLICY "Acesso a Logs de Troca de Óleo"
ON public.oil_maintenance_logs FOR ALL USING (true);

CREATE POLICY "Acesso a Usuários"
ON public.users FOR ALL USING (true);
