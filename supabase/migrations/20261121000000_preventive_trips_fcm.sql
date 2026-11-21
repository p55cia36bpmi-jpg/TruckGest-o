-- ============================================================================
-- TRUCKGESTÃO - SUPABASE MIGRATION: PREVENTIVE MAINTENANCE, TRIPS & FCM PUSH
-- Migration: 20261121000000_preventive_trips_fcm.sql
-- Descrição: Alinha o esquema SQL com manutenção preventiva por km/data,
--            histórico de manutenções, solicitações de viagem e tokens FCM.
-- ============================================================================

-- 1. Colunas de Manutenção Preventiva em public.vehicles
ALTER TABLE public.vehicles
    ADD COLUMN IF NOT EXISTS last_preventive_maintenance_date DATE,
    ADD COLUMN IF NOT EXISTS last_preventive_maintenance_km INTEGER CHECK (last_preventive_maintenance_km >= 0),
    ADD COLUMN IF NOT EXISTS next_preventive_maintenance_km INTEGER CHECK (next_preventive_maintenance_km >= 0),
    ADD COLUMN IF NOT EXISTS next_preventive_maintenance_date DATE,
    ADD COLUMN IF NOT EXISTS preventive_interval_km INTEGER DEFAULT 20000 CHECK (preventive_interval_km > 0),
    ADD COLUMN IF NOT EXISTS preventive_interval_days INTEGER DEFAULT 180 CHECK (preventive_interval_days > 0),
    ADD COLUMN IF NOT EXISTS alert_dismissed BOOLEAN NOT NULL DEFAULT false;

-- 2. Tabela de Registros de Manutenção (maintenance_records)
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    odometer INTEGER NOT NULL CHECK (odometer >= 0),
    type VARCHAR(120) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0),
    filters_replaced BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle ON public.maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON public.maintenance_records(date DESC);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_records' AND policyname = 'Acesso a Registros de Manutenção'
    ) THEN
        CREATE POLICY "Acesso a Registros de Manutenção"
        ON public.maintenance_records FOR ALL USING (true);
    END IF;
END $$;

-- 3. Tabela de Solicitações de Viagens (trip_requests)
CREATE TABLE IF NOT EXISTS public.trip_requests (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    driver_name VARCHAR(150) NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(10) NOT NULL,
    origin VARCHAR(120) NOT NULL,
    destination VARCHAR(120) NOT NULL,
    cargo_description VARCHAR(200) NOT NULL,
    estimated_freight NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_freight >= 0),
    scheduled_date DATE NOT NULL,
    priority VARCHAR(15) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected')),
    created_by_admin_email VARCHAR(150) NOT NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_requests_driver ON public.trip_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON public.trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_date ON public.trip_requests(scheduled_date DESC);

DROP TRIGGER IF EXISTS trg_trip_requests_updated_at ON public.trip_requests;
CREATE TRIGGER trg_trip_requests_updated_at
BEFORE UPDATE ON public.trip_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trip_requests' AND policyname = 'Acesso a Solicitações de Viagem'
    ) THEN
        CREATE POLICY "Acesso a Solicitações de Viagem"
        ON public.trip_requests FOR ALL USING (true);
    END IF;
END $$;

-- 4. Tabela de Tokens FCM e Preferências Push (fcm_tokens)
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    driver_name VARCHAR(150) NOT NULL,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    token VARCHAR(512) NOT NULL,
    registration_mode VARCHAR(30) NOT NULL CHECK (registration_mode IN ('fcm', 'web_push_fallback')),
    platform VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (platform = 'web'),
    browser_label VARCHAR(120),
    enabled BOOLEAN NOT NULL DEFAULT true,
    notify_trips BOOLEAN NOT NULL DEFAULT true,
    notify_maintenance BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fcm_driver_token UNIQUE (driver_id, token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_driver ON public.fcm_tokens(driver_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_enabled ON public.fcm_tokens(enabled);

DROP TRIGGER IF EXISTS trg_fcm_tokens_updated_at ON public.fcm_tokens;
CREATE TRIGGER trg_fcm_tokens_updated_at
BEFORE UPDATE ON public.fcm_tokens
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fcm_tokens' AND policyname = 'Acesso a Tokens FCM'
    ) THEN
        CREATE POLICY "Acesso a Tokens FCM"
        ON public.fcm_tokens FOR ALL USING (true);
    END IF;
END $$;
