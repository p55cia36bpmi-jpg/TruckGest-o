import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Driver, 
  Vehicle, 
  DailyReport, 
  DailyRateConfig, 
  TollRecord, 
  PaymentRecord, 
  UserProfile, 
  DeliveryItem, 
  OtherExpenseItem 
} from '@/types/truck-service';

// --- DRIVERS ---
export async function getDriversFromSupabase(): Promise<Driver[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar motoristas no Supabase:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    rg: row.rg,
    cpf: row.cpf,
    address: row.address || '',
    cnhCategory: row.cnh_category,
    cnhNumber: row.cnh_number,
    cnhExpiry: row.cnh_expiry,
    vehicleId: row.vehicle_id || '',
    phone: row.phone || '',
    loginEmail: row.login_email || '',
    password: row.password || '',
    active: row.active ?? true,
    createdAt: row.created_at,
  }));
}

export async function createDriverInSupabase(driverData: Omit<Driver, 'id' | 'createdAt'>): Promise<Driver> {
  const id = `drv-${Date.now()}`;
  const newDriver: Driver = {
    ...driverData,
    id,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return newDriver;

  const { error } = await supabase.from('drivers').insert({
    id,
    name: driverData.name,
    rg: driverData.rg,
    cpf: driverData.cpf,
    address: driverData.address,
    cnh_category: driverData.cnhCategory,
    cnh_number: driverData.cnhNumber,
    cnh_expiry: driverData.cnhExpiry,
    vehicle_id: driverData.vehicleId || null,
    phone: driverData.phone,
    login_email: driverData.loginEmail,
    password: driverData.password,
    active: driverData.active,
  });

  if (error) {
    console.error('Erro ao criar motorista no Supabase:', error);
    throw error;
  }

  // Also sync user profile
  await supabase.from('users').insert({
    uid: `user-${id}`,
    email: driverData.loginEmail || `${id}@truckgestao.com`,
    name: driverData.name,
    role: 'driver',
    driver_id: id,
    password: driverData.password || '123456',
  });

  return newDriver;
}

export async function updateDriverInSupabase(driver: Driver): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('drivers').update({
    name: driver.name,
    rg: driver.rg,
    cpf: driver.cpf,
    address: driver.address,
    cnh_category: driver.cnhCategory,
    cnh_number: driver.cnhNumber,
    cnh_expiry: driver.cnhExpiry,
    vehicle_id: driver.vehicleId || null,
    phone: driver.phone,
    login_email: driver.loginEmail,
    password: driver.password,
    active: driver.active,
  }).eq('id', driver.id);

  if (error) console.error('Erro ao atualizar motorista no Supabase:', error);
}

export async function deleteDriverInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('drivers').delete().eq('id', id);
  await supabase.from('users').delete().eq('driver_id', id);
}

// --- VEHICLES ---
export async function getVehiclesFromSupabase(): Promise<Vehicle[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('plate', { ascending: true });

  if (error) {
    console.error('Erro ao buscar veículos no Supabase:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    plate: row.plate,
    model: row.model,
    currentKm: row.current_km,
    lastOilChangeDate: row.last_oil_change_date,
    lastOilChangeKm: row.last_oil_change_km,
    nextOilChangeKm: row.next_oil_change_km,
    filtersReplaced: row.filters_replaced,
    createdAt: row.created_at,
  }));
}

export async function createVehicleInSupabase(vehicleData: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
  const id = `veh-${Date.now()}`;
  const newVehicle: Vehicle = {
    ...vehicleData,
    id,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return newVehicle;

  const { error } = await supabase.from('vehicles').insert({
    id,
    plate: vehicleData.plate,
    model: vehicleData.model,
    current_km: vehicleData.currentKm,
    last_oil_change_date: vehicleData.lastOilChangeDate,
    last_oil_change_km: vehicleData.lastOilChangeKm,
    next_oil_change_km: vehicleData.nextOilChangeKm,
    filters_replaced: vehicleData.filtersReplaced,
  });

  if (error) {
    console.error('Erro ao criar veículo no Supabase:', error);
    throw error;
  }

  return newVehicle;
}

export async function updateVehicleInSupabase(vehicle: Vehicle): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('vehicles').update({
    plate: vehicle.plate,
    model: vehicle.model,
    current_km: vehicle.currentKm,
    last_oil_change_date: vehicle.lastOilChangeDate,
    last_oil_change_km: vehicle.lastOilChangeKm,
    next_oil_change_km: vehicle.nextOilChangeKm,
    filters_replaced: vehicle.filtersReplaced,
  }).eq('id', vehicle.id);
}

export async function deleteVehicleInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('vehicles').delete().eq('id', id);
}

// --- DAILY REPORTS & DELIVERIES ---
export async function getDailyReportsFromSupabase(): Promise<DailyReport[]> {
  if (!isSupabaseConfigured()) return [];
  const { data: reports, error } = await supabase
    .from('daily_reports')
    .select(`
      *,
      deliveries (*),
      report_expenses (*)
    `)
    .order('date', { ascending: false });

  if (error) {
    console.error('Erro ao buscar relatórios no Supabase:', error);
    return [];
  }

  return (reports || []).map((r) => ({
    id: r.id,
    driverId: r.driver_id,
    driverName: r.driver_name,
    vehicleId: r.vehicle_id,
    vehiclePlate: r.vehicle_plate,
    date: r.date,
    startKm: r.start_km,
    endKm: r.end_km,
    distanceKm: r.distance_km,
    tollsCount: r.tolls_count,
    hasHelper: r.has_helper,
    fuelCost: Number(r.fuel_cost),
    fuelLiters: Number(r.fuel_liters),
    totalOtherExpenses: Number(r.total_other_expenses),
    totalFreight: Number(r.total_freight),
    totalDeliveries: r.total_deliveries,
    status: r.status,
    canEdit: r.can_edit,
    createdAt: r.created_at,
    deliveries: (r.deliveries || []).map((d: any) => ({
      id: d.id,
      city: d.city,
      freightValue: Number(d.freight_value),
      material: d.material,
      quantity: d.quantity,
    })),
    otherExpenses: (r.report_expenses || []).map((e: any) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
    })),
  }));
}

export async function createDailyReportInSupabase(reportData: Omit<DailyReport, 'id' | 'createdAt'>): Promise<DailyReport> {
  const id = `rep-${Date.now()}`;
  const newReport: DailyReport = {
    ...reportData,
    id,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return newReport;

  // Insert main report
  const { error: repError } = await supabase.from('daily_reports').insert({
    id,
    driver_id: reportData.driverId,
    driver_name: reportData.driverName,
    vehicle_id: reportData.vehicleId,
    vehicle_plate: reportData.vehiclePlate,
    date: reportData.date,
    start_km: reportData.startKm,
    end_km: reportData.endKm,
    tolls_count: reportData.tollsCount,
    has_helper: reportData.hasHelper,
    fuel_cost: reportData.fuelCost,
    fuel_liters: reportData.fuelLiters,
    total_other_expenses: reportData.totalOtherExpenses,
    total_freight: reportData.totalFreight,
    total_deliveries: reportData.totalDeliveries,
    status: reportData.status,
    can_edit: reportData.canEdit,
  });

  if (repError) throw repError;

  // Insert deliveries
  if (reportData.deliveries?.length) {
    await supabase.from('deliveries').insert(
      reportData.deliveries.map((del) => ({
        id: del.id || `del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        report_id: id,
        city: del.city,
        freight_value: del.freightValue,
        material: del.material,
        quantity: del.quantity,
      }))
    );
  }

  // Insert expenses
  if (reportData.otherExpenses?.length) {
    await supabase.from('report_expenses').insert(
      reportData.otherExpenses.map((exp) => ({
        id: exp.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        report_id: id,
        category: exp.category,
        description: exp.description,
        amount: exp.amount,
      }))
    );
  }

  return newReport;
}

export async function deleteDailyReportInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('daily_reports').delete().eq('id', id);
}

// --- DAILY RATES ---
export async function getDailyRatesFromSupabase(): Promise<DailyRateConfig[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('daily_rates')
    .select('*')
    .order('effective_date', { ascending: false });

  if (error) return [];

  return (data || []).map((row) => ({
    id: row.id,
    driverDailyRate: Number(row.driver_daily_rate),
    helperDailyRate: Number(row.helper_daily_rate),
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
  }));
}

export async function createDailyRateInSupabase(rateData: Omit<DailyRateConfig, 'id' | 'createdAt'>): Promise<DailyRateConfig> {
  const id = `rate-${Date.now()}`;
  const newRate: DailyRateConfig = {
    ...rateData,
    id,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return newRate;

  await supabase.from('daily_rates').insert({
    id,
    driver_daily_rate: rateData.driverDailyRate,
    helper_daily_rate: rateData.helperDailyRate,
    effective_date: rateData.effectiveDate,
  });

  return newRate;
}

export async function deleteDailyRateInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('daily_rates').delete().eq('id', id);
}

// --- TOLLS ---
export async function getTollsFromSupabase(): Promise<TollRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('tolls')
    .select('*')
    .order('date', { ascending: false });

  if (error) return [];

  return (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    route: row.route,
    vehicleId: row.vehicle_id || undefined,
    vehiclePlate: row.vehicle_plate || undefined,
    cost: Number(row.cost),
    createdAt: row.created_at,
  }));
}

export async function createTollInSupabase(tollData: Omit<TollRecord, 'id' | 'createdAt'>): Promise<TollRecord> {
  const id = `toll-${Date.now()}`;
  const newToll: TollRecord = {
    ...tollData,
    id,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) return newToll;

  await supabase.from('tolls').insert({
    id,
    date: tollData.date,
    route: tollData.route,
    vehicle_id: tollData.vehicleId || null,
    vehicle_plate: tollData.vehiclePlate || null,
    cost: tollData.cost,
  });

  return newToll;
}

export async function deleteTollInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('tolls').delete().eq('id', id);
}

// --- PAYMENTS ---
export async function getPaymentsFromSupabase(): Promise<PaymentRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []).map((row) => ({
    id: row.id,
    driverId: row.driver_id,
    driverName: row.driver_name,
    startDate: row.start_date,
    endDate: row.end_date,
    daysWorked: row.days_worked,
    daysWithHelper: row.days_with_helper || row.helper_days_worked || 0,
    driverAmount: Number(row.driver_amount),
    helperAmount: Number(row.helper_amount),
    totalFreight: Number(row.total_freight),
    netReceived: Number(row.net_received),
    confirmedAt: row.confirmed_at || '',
    confirmedByAdminEmail: row.confirmed_by_admin_email,
  }));
}

export async function createPaymentInSupabase(paymentData: Omit<PaymentRecord, 'id'>): Promise<PaymentRecord> {
  const id = `pay-${Date.now()}`;
  const newPayment: PaymentRecord = {
    ...paymentData,
    id,
  };

  if (!isSupabaseConfigured()) return newPayment;

  await supabase.from('payments').insert({
    id,
    driver_id: paymentData.driverId,
    driver_name: paymentData.driverName,
    start_date: paymentData.startDate,
    end_date: paymentData.endDate,
    days_worked: paymentData.daysWorked,
    days_with_helper: paymentData.daysWithHelper,
    driver_amount: paymentData.driverAmount,
    helper_amount: paymentData.helperAmount,
    total_freight: paymentData.totalFreight,
    net_received: paymentData.netReceived,
    confirmed_at: paymentData.confirmedAt,
    confirmed_by_admin_email: paymentData.confirmedByAdminEmail,
  });

  return newPayment;
}

export async function deletePaymentInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.from('payments').delete().eq('id', id);
}

// --- AUTHENTICATION IN SUPABASE ---
export async function authenticateUserSupabase(identifier: string, password: string): Promise<{
  success: boolean;
  profile?: UserProfile;
  driver?: Driver;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado nas variáveis de ambiente.' };
  }

  const cleanId = identifier.trim().toLowerCase();
  const cleanPwd = password.trim();

  // 1. Search in users table
  const { data: users, error: uError } = await supabase
    .from('users')
    .select('*');

  if (!uError && users) {
    const userMatch = users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.uid && u.uid.toLowerCase() === cleanId)
    );

    if (userMatch) {
      if (!userMatch.password || userMatch.password === cleanPwd) {
        let drv: Driver | undefined;
        if (userMatch.driver_id) {
          const { data: drvData } = await supabase
            .from('drivers')
            .select('*')
            .eq('id', userMatch.driver_id)
            .single();
          if (drvData) {
            drv = {
              id: drvData.id,
              name: drvData.name,
              rg: drvData.rg,
              cpf: drvData.cpf,
              address: drvData.address || '',
              cnhCategory: drvData.cnh_category,
              cnhNumber: drvData.cnh_number,
              cnhExpiry: drvData.cnh_expiry,
              vehicleId: drvData.vehicle_id || '',
              phone: drvData.phone || '',
              loginEmail: drvData.login_email || '',
              password: drvData.password || '',
              active: drvData.active,
              createdAt: drvData.created_at,
            };
          }
        }
        return {
          success: true,
          profile: {
            uid: userMatch.uid,
            email: userMatch.email,
            name: userMatch.name,
            role: userMatch.role,
            driverId: userMatch.driver_id || undefined,
            password: userMatch.password,
            createdAt: userMatch.created_at,
          },
          driver: drv,
        };
      } else {
        return { success: false, error: 'Senha incorreta no Supabase.' };
      }
    }
  }

  return { success: false, error: 'Usuário não encontrado no Supabase.' };
}
