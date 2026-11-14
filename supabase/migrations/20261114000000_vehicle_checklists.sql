-- ============================================================================
-- TRUCKGESÃO - SUPABASE MIGRATION: CHECKLIST VEICULAR E ANOMALIAS
-- Migration: 20261114000000_vehicle_checklists.sql
-- Descrição: Cria tabela de checklists de inspeção veicular e anomalias
--            reportadas pelos motoristas e acompanhadas pelo administrador.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_checklists (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    driver_name VARCHAR(150) NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(10) NOT NULL,
    vehicle_model VARCHAR(100),
    date DATE NOT NULL,
    inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('pre_trip', 'post_trip', 'routine')),
    odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    anomalies_count INTEGER NOT NULL DEFAULT 0 CHECK (anomalies_count >= 0),
    critical_anomalies_count INTEGER NOT NULL DEFAULT 0 CHECK (critical_anomalies_count >= 0),
    overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('approved', 'attention', 'critical')),
    resolution_status VARCHAR(20) NOT NULL DEFAULT 'ok' CHECK (resolution_status IN ('ok', 'pending_review', 'in_maintenance', 'resolved')),
    general_notes TEXT,
    admin_notes TEXT,
    resolved_by VARCHAR(150),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_checklists_driver ON public.vehicle_checklists(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checklists_vehicle ON public.vehicle_checklists(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checklists_status ON public.vehicle_checklists(resolution_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_checklists_date ON public.vehicle_checklists(date DESC);

CREATE TRIGGER trg_vehicle_checklists_updated_at
BEFORE UPDATE ON public.vehicle_checklists
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.vehicle_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a Checklists Veiculares"
ON public.vehicle_checklists FOR ALL USING (true);
