-- ============================================================================
-- TRUCKGESÃO - SUPABASE SEED DATA MIGRATION
-- Migration: 20261108000001_seed_data.sql
-- Descrição: Insere dados iniciais de veículos, motoristas com credenciais,
--            diárias vigentes, pedágios e relatórios operacionais.
-- ============================================================================

-- 1. VEÍCULOS INICIAIS
INSERT INTO public.vehicles (id, plate, model, current_km, last_oil_change_date, last_oil_change_km, next_oil_change_km, filters_replaced)
VALUES 
    ('veh-01', 'BRA2E19', 'Scania R450 6x2 Highline', 142100, '2026-10-15', 125000, 145000, true),
    ('veh-02', 'RTO4A88', 'Volvo FH 540 6x4 Globetrotter', 89850, '2026-08-10', 70000, 90000, true),
    ('veh-03', 'FKS9D12', 'Mercedes-Benz Actros 2651', 210400, '2026-09-01', 195000, 215000, false)
ON CONFLICT (id) DO NOTHING;

-- 2. DIÁRIAS VIGENTES (Seção 7)
INSERT INTO public.daily_rates (id, driver_daily_rate, helper_daily_rate, effective_date)
VALUES 
    ('rate-01', 220.00, 130.00, '2026-01-01'),
    ('rate-02', 200.00, 110.00, '2025-06-01')
ON CONFLICT (id) DO NOTHING;

-- 3. MOTORISTAS COM CREDENCIAIS (Seção 3)
INSERT INTO public.drivers (id, name, rg, cpf, address, cnh_category, cnh_number, cnh_expiry, vehicle_id, phone, login_email, password, active)
VALUES 
    ('drv-01', 'Carlos Eduardo Silveira', '38.419.028-1', '284.912.834-02', 'Rua das Acácias, 412, Campinas - SP', 'E', '04829184029', '2027-08-15', 'veh-01', '(19) 98124-7711', 'carlos.silveira@truckgestao.com', 'carlos123', true),
    ('drv-02', 'Marcos Antônio de Souza', '41.802.193-4', '391.028.481-90', 'Av. Brasil, 1850, Paulínia - SP', 'E', '05910284711', '2026-11-28', 'veh-02', '(19) 99341-8822', 'marcos.souza@truckgestao.com', 'marcos123', true)
ON CONFLICT (id) DO NOTHING;

-- 4. USUÁRIOS E PERFIS DE ACESSO
INSERT INTO public.users (uid, email, name, role, driver_id, password)
VALUES 
    ('admin-master', 'admin@truckgestao.com', 'Gestor de Frota (Administrador)', 'admin', NULL, 'admin123'),
    ('user-drv-01', 'carlos.silveira@truckgestao.com', 'Carlos Eduardo Silveira', 'driver', 'drv-01', 'carlos123'),
    ('user-drv-02', 'marcos.souza@truckgestao.com', 'Marcos Antônio de Souza', 'driver', 'drv-02', 'marcos123')
ON CONFLICT (uid) DO NOTHING;

-- 5. PEDÁGIOS POR ROTA (Seção 8)
INSERT INTO public.tolls (id, date, route, vehicle_id, vehicle_plate, cost)
VALUES 
    ('toll-01', '2026-11-02', 'Rodovia dos Bandeirantes km 77 (Itupeva)', 'veh-01', 'BRA2E19', 11.80),
    ('toll-02', '2026-11-02', 'Rodovia Anhanguera km 115 (Sumaré)', 'veh-01', 'BRA2E19', 10.40),
    ('toll-03', '2026-11-03', 'Rodovia Dom Pedro I km 84 (Atibaia)', 'veh-02', 'RTO4A88', 12.50)
ON CONFLICT (id) DO NOTHING;

-- 6. RELATÓRIOS DIÁRIOS E ENTREGAS (Seção 5)
INSERT INTO public.daily_reports (
    id, driver_id, driver_name, vehicle_id, vehicle_plate, date,
    start_km, end_km, tolls_count, has_helper, fuel_cost, fuel_liters,
    total_other_expenses, total_freight, total_deliveries, status, can_edit
) VALUES 
    ('rep-01', 'drv-01', 'Carlos Eduardo Silveira', 'veh-01', 'BRA2E19', '2026-11-02', 141750, 142100, 2, true, 480.00, 80.00, 35.00, 1850.00, 2, 'approved', false),
    ('rep-02', 'drv-02', 'Marcos Antônio de Souza', 'veh-02', 'RTO4A88', '2026-11-03', 89500, 89850, 1, false, 420.00, 70.00, 0.00, 1400.00, 1, 'submitted', false)
ON CONFLICT (id) DO NOTHING;

-- Entregas dos relatórios
INSERT INTO public.deliveries (id, report_id, city, freight_value, material, quantity)
VALUES 
    ('del-01', 'rep-01', 'Campinas, SP', 1100.00, 'Peças Automotivas', '18 pallets'),
    ('del-02', 'rep-01', 'Jundiaí, SP', 750.00, 'Embalagens Industriais', '12 caixas'),
    ('del-03', 'rep-02', 'Ribeirão Preto, SP', 1400.00, 'Cereais Ensacados', '25 toneladas')
ON CONFLICT (id) DO NOTHING;

-- Gastos diversos
INSERT INTO public.report_expenses (id, report_id, category, description, amount)
VALUES 
    ('exp-01', 'rep-01', 'Outros', 'Alimentação e Café da Manhã', 35.00)
ON CONFLICT (id) DO NOTHING;
