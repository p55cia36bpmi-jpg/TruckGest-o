import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
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
  TripRequest,
  TripRequestStatus,
  FcmDeviceRegistration
} from '@/types/truck-service';

export function sanitizeFirestoreData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = sanitizeFirestoreData(v);
      }
    }
    return out as T;
  }
  return value;
}

// --- USERS & PROFILES ---
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- DRIVERS ---
export async function getDrivers(): Promise<Driver[]> {
  const path = 'drivers';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Driver));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createDriver(driverData: Omit<Driver, 'id' | 'createdAt'>): Promise<Driver> {
  const path = 'drivers';
  try {
    const id = `drv-${Date.now()}`;
    const cleanEmail = (driverData.loginEmail || `${id}@truckgestao.com`).trim().toLowerCase();
    const cleanPassword = (driverData.password || '').trim();
    if (!cleanPassword) {
      throw new Error('É obrigatório definir uma senha de acesso para o motorista.');
    }

    const newDriver: Driver = {
      ...driverData,
      loginEmail: cleanEmail,
      password: cleanPassword,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), newDriver);

    // Also sync user profile for authentication (strictly role: 'driver')
    const userProfile: UserProfile = {
      uid: `user-${id}`,
      email: cleanEmail,
      name: newDriver.name,
      role: 'driver',
      driverId: id,
      password: cleanPassword,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', `user-${id}`), userProfile);

    return newDriver;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateDriver(driver: Driver): Promise<void> {
  const path = `drivers/${driver.id}`;
  try {
    const cleanEmail = (driver.loginEmail || `${driver.id}@truckgestao.com`).trim().toLowerCase();
    const updatedDriver: Driver = {
      ...driver,
      loginEmail: cleanEmail,
    };
    await setDoc(doc(db, 'drivers', driver.id), updatedDriver, { merge: true });

    // Keep users profile in sync (strictly role: 'driver')
    const userProfile: Partial<UserProfile> = {
      uid: `user-${driver.id}`,
      name: driver.name,
      email: cleanEmail,
      role: 'driver',
      driverId: driver.id,
      ...(driver.password ? { password: driver.password.trim() } : {}),
    };
    await setDoc(doc(db, 'users', `user-${driver.id}`), userProfile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDriver(id: string): Promise<void> {
  const path = `drivers/${id}`;
  try {
    await deleteDoc(doc(db, 'drivers', id));
    await deleteDoc(doc(db, 'users', `user-${id}`));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- VEHICLES ---
export async function getVehicles(): Promise<Vehicle[]> {
  const path = 'vehicles';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Vehicle));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
  const path = 'vehicles';
  try {
    const id = `veh-${Date.now()}`;
    const newVehicle: Vehicle = {
      ...vehicleData,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), newVehicle);
    return newVehicle;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateVehicle(vehicle: Vehicle): Promise<void> {
  const path = `vehicles/${vehicle.id}`;
  try {
    await setDoc(doc(db, 'vehicles', vehicle.id), vehicle, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  const path = `vehicles/${id}`;
  try {
    await deleteDoc(doc(db, 'vehicles', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  const path = 'maintenance';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as MaintenanceRecord))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function recordOilChange(
  vehicleId: string, 
  currentKm: number, 
  intervalKm: number = 20000, 
  filtersReplaced: boolean = true,
  cost: number = 0
): Promise<void> {
  const path = `vehicles/${vehicleId}`;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const updates = {
      lastOilChangeDate: today,
      lastOilChangeKm: currentKm,
      nextOilChangeKm: currentKm + intervalKm,
      filtersReplaced,
      alertDismissed: false,
    };
    await updateDoc(doc(db, 'vehicles', vehicleId), updates);

    // Also persist into maintenance collection (Section 13)
    const maintId = `maint-${Date.now()}`;
    await setDoc(doc(db, 'maintenance', maintId), {
      id: maintId,
      vehicleId,
      date: today,
      odometer: currentKm,
      type: 'Troca de Óleo e Filtros',
      cost: Math.max(0, Number(cost) || 0),
      filtersReplaced,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateVehicleMileageMonitor(
  vehicleId: string,
  currentKm: number,
  nextPreventiveMaintenanceKm: number,
  nextOilChangeKm?: number,
  nextPreventiveMaintenanceDate?: string
): Promise<void> {
  const path = `vehicles/${vehicleId}`;
  try {
    const updates: Record<string, unknown> = {
      currentKm,
      nextPreventiveMaintenanceKm,
    };
    if (typeof nextOilChangeKm === 'number' && !Number.isNaN(nextOilChangeKm)) {
      updates.nextOilChangeKm = nextOilChangeKm;
    }
    if (typeof nextPreventiveMaintenanceDate === 'string') {
      updates.nextPreventiveMaintenanceDate = nextPreventiveMaintenanceDate.trim();
    }
    await updateDoc(doc(db, 'vehicles', vehicleId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordPreventiveMaintenance(
  vehicleId: string,
  currentKm: number,
  intervalKm: number = 20000,
  cost: number = 0,
  intervalDays: number = 180,
  nextDateOverride?: string
): Promise<void> {
  const path = `vehicles/${vehicleId}`;
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const nextKm = currentKm + intervalKm;

    let nextDate = nextDateOverride?.trim() || '';
    if (!nextDate) {
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.max(1, intervalDays));
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      nextDate = `${y}-${m}-${d}`;
    }

    await updateDoc(doc(db, 'vehicles', vehicleId), {
      currentKm,
      lastPreventiveMaintenanceDate: today,
      lastPreventiveMaintenanceKm: currentKm,
      nextPreventiveMaintenanceKm: nextKm,
      nextPreventiveMaintenanceDate: nextDate,
      preventiveIntervalKm: intervalKm,
      preventiveIntervalDays: intervalDays,
    });

    const maintId = `maint-rev-${Date.now()}`;
    await setDoc(doc(db, 'maintenance', maintId), {
      id: maintId,
      vehicleId,
      date: today,
      odometer: currentKm,
      type: 'Revisão Preventiva Programada',
      cost: Math.max(0, Number(cost) || 0),
      filtersReplaced: true,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- DAILY REPORTS ---
export async function getDailyReports(): Promise<DailyReport[]> {
  const path = 'dailyReports';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as DailyReport))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getDriverReports(driverId: string): Promise<DailyReport[]> {
  const path = 'dailyReports';
  try {
    const q = query(collection(db, path), where('driverId', '==', driverId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as DailyReport))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function checkDailyReportExists(driverId: string, date: string, excludeId?: string): Promise<boolean> {
  const path = 'dailyReports';
  try {
    const q = query(collection(db, path), where('driverId', '==', driverId), where('date', '==', date));
    const snap = await getDocs(q);
    if (snap.empty) return false;
    if (excludeId) {
      return snap.docs.some((d) => d.id !== excludeId);
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return false;
  }
}

export async function getDailyReportByDriverAndDate(driverId: string, date: string): Promise<DailyReport | null> {
  const path = 'dailyReports';
  try {
    const q = query(collection(db, path), where('driverId', '==', driverId), where('date', '==', date));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { ...docSnap.data(), id: docSnap.id } as DailyReport;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
}

export async function createDailyReport(reportData: Omit<DailyReport, 'id' | 'createdAt'>): Promise<DailyReport> {
  const path = 'dailyReports';
  try {
    const id = `rep-${Date.now()}`;
    const newReport: DailyReport = {
      ...reportData,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), newReport);

    // Also sync into dedicated collections (Section 13)
    // 1. Deliveries
    if (reportData.deliveries && reportData.deliveries.length > 0) {
      for (const del of reportData.deliveries) {
        await setDoc(doc(db, 'deliveries', del.id), {
          ...del,
          reportId: id,
          driverId: reportData.driverId,
          vehiclePlate: reportData.vehiclePlate,
          date: reportData.date,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 2. Fuel Records
    if (reportData.fuelCost > 0 || reportData.fuelLiters > 0) {
      const fuelId = `fuel-${id}`;
      await setDoc(doc(db, 'fuelRecords', fuelId), {
        id: fuelId,
        reportId: id,
        driverId: reportData.driverId,
        vehicleId: reportData.vehicleId,
        date: reportData.date,
        fuelLiters: reportData.fuelLiters,
        fuelCost: reportData.fuelCost,
        odometer: reportData.endKm,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Expenses
    if (reportData.otherExpenses && reportData.otherExpenses.length > 0) {
      for (const exp of reportData.otherExpenses) {
        await setDoc(doc(db, 'expenses', exp.id), {
          ...exp,
          reportId: id,
          driverId: reportData.driverId,
          date: reportData.date,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Automatically update vehicle's currentKm if endKm is higher
    if (reportData.vehicleId && reportData.endKm) {
      const vSnap = await getDoc(doc(db, 'vehicles', reportData.vehicleId));
      if (vSnap.exists()) {
        const v = vSnap.data() as Vehicle;
        if (reportData.endKm > (v.currentKm || 0)) {
          await updateDoc(doc(db, 'vehicles', reportData.vehicleId), {
            currentKm: reportData.endKm,
          });
        }
      }
    }

    return newReport;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateDailyReport(report: DailyReport): Promise<void> {
  const path = `dailyReports/${report.id}`;
  try {
    await setDoc(doc(db, 'dailyReports', report.id), report, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDailyReport(id: string): Promise<void> {
  const path = `dailyReports/${id}`;
  try {
    await deleteDoc(doc(db, 'dailyReports', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- DAILY RATES ---
export async function getDailyRates(): Promise<DailyRateConfig[]> {
  const path = 'dailyRates';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as DailyRateConfig))
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getCurrentDailyRate(targetDate?: string): Promise<DailyRateConfig> {
  const rates = await getDailyRates();
  if (rates.length === 0) {
    return {
      id: 'default-rate',
      driverDailyRate: 220.00,
      helperDailyRate: 130.00,
      effectiveDate: '2026-01-01',
      createdAt: new Date().toISOString(),
    };
  }

  if (!targetDate) return rates[0];

  // Find the rate that was effective on targetDate
  const applicable = rates
    .filter((r) => r.effectiveDate <= targetDate)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  return applicable[0] || rates[rates.length - 1];
}

export async function createDailyRate(rateData: Omit<DailyRateConfig, 'id' | 'createdAt'>): Promise<DailyRateConfig> {
  const path = 'dailyRates';
  try {
    const id = `rate-${Date.now()}`;
    const newRate: DailyRateConfig = {
      ...rateData,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), newRate);
    return newRate;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function deleteDailyRate(id: string): Promise<void> {
  const path = `dailyRates/${id}`;
  try {
    await deleteDoc(doc(db, 'dailyRates', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- TOLLS ---
export async function getTolls(): Promise<TollRecord[]> {
  const path = 'tolls';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as TollRecord))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createToll(tollData: Omit<TollRecord, 'id' | 'createdAt'>): Promise<TollRecord> {
  const path = 'tolls';
  try {
    const id = `toll-${Date.now()}`;
    const newToll: TollRecord = {
      ...tollData,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), newToll);
    return newToll;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateToll(toll: TollRecord): Promise<void> {
  const path = `tolls/${toll.id}`;
  try {
    await setDoc(doc(db, 'tolls', toll.id), toll, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteToll(id: string): Promise<void> {
  const path = `tolls/${id}`;
  try {
    await deleteDoc(doc(db, 'tolls', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- PAYMENTS ---
export async function getPayments(): Promise<PaymentRecord[]> {
  const path = 'payments';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as PaymentRecord))
      .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function checkPaymentExistsForPeriod(driverId: string, startDate: string, endDate: string): Promise<boolean> {
  const payments = await getPayments();
  return payments.some((p) => {
    if (p.driverId !== driverId) return false;
    // Check overlapping periods
    return !(p.endDate < startDate || p.startDate > endDate);
  });
}

export async function createPayment(paymentData: Omit<PaymentRecord, 'id'>): Promise<PaymentRecord> {
  const path = 'payments';
  try {
    const id = `pay-${Date.now()}`;
    const newPayment: PaymentRecord = {
      ...paymentData,
      id,
    };
    await setDoc(doc(db, path, id), newPayment);
    return newPayment;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function deletePayment(id: string): Promise<void> {
  const path = `payments/${id}`;
  try {
    await deleteDoc(doc(db, 'payments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- NOTIFICATIONS ---
export async function getNotifications(): Promise<SystemNotification[]> {
  const path = 'notifications';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as SystemNotification))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createNotification(notifData: Omit<SystemNotification, 'id' | 'createdAt'>): Promise<SystemNotification> {
  const path = 'notifications';
  try {
    const id = `notif-${Date.now()}`;
    const newNotif: SystemNotification = {
      ...notifData,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), newNotif);
    return newNotif;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeDriverNotifications(
  driverId: string,
  onData: (notifications: SystemNotification[]) => void
): () => void {
  const path = 'notifications';
  const q = query(collection(db, path), where('targetRole', 'in', ['driver', 'all']));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as SystemNotification))
        .filter((n) => !n.targetUserId || n.targetUserId === driverId)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// --- VEHICLE CHECKLISTS (INSPEÇÃO E VERIFICAÇÃO DE ANOMALIAS) ---
export async function getVehicleChecklists(): Promise<VehicleChecklist[]> {
  const path = 'vehicleChecklists';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as VehicleChecklist))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getDriverChecklists(driverId: string): Promise<VehicleChecklist[]> {
  const path = 'vehicleChecklists';
  try {
    const q = query(collection(db, path), where('driverId', '==', driverId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as VehicleChecklist))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createVehicleChecklist(
  checklistData: Omit<VehicleChecklist, 'id' | 'createdAt'>
): Promise<VehicleChecklist> {
  const path = 'vehicleChecklists';
  try {
    const id = `chk-${Date.now()}`;
    const newChecklist: VehicleChecklist = sanitizeFirestoreData({
      ...checklistData,
      id,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, path, id), newChecklist);

    // Update vehicle currentKm if odometer in checklist is higher
    if (checklistData.vehicleId && checklistData.odometerKm) {
      const vSnap = await getDoc(doc(db, 'vehicles', checklistData.vehicleId));
      if (vSnap.exists()) {
        const v = vSnap.data() as Vehicle;
        if (checklistData.odometerKm > (v.currentKm || 0)) {
          await updateDoc(doc(db, 'vehicles', checklistData.vehicleId), {
            currentKm: checklistData.odometerKm,
          });
        }
      }
    }

    // Generate admin alert notification when anomalies are detected
    if (checklistData.anomaliesCount > 0) {
      const anomalyLabels = checklistData.items
        .filter((i) => i.status === 'anomaly')
        .map((i) => i.label)
        .slice(0, 3)
        .join(', ');
      await createNotification({
        targetRole: 'admin',
        title: `Anomalia reportada: Veículo ${checklistData.vehiclePlate}`,
        message: `Motorista ${checklistData.driverName} registrou ${checklistData.anomaliesCount} anomalia(s) no checklist (${anomalyLabels}).`,
        type: checklistData.criticalAnomaliesCount > 0 ? 'critical' : 'warning',
        read: false,
      });
    }

    return newChecklist;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateVehicleChecklist(checklist: VehicleChecklist): Promise<void> {
  const path = `vehicleChecklists/${checklist.id}`;
  try {
    await setDoc(doc(db, 'vehicleChecklists', checklist.id), checklist, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteVehicleChecklist(id: string): Promise<void> {
  const path = `vehicleChecklists/${id}`;
  try {
    await deleteDoc(doc(db, 'vehicleChecklists', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeDriverChecklists(
  driverId: string,
  onData: (checklists: VehicleChecklist[]) => void
): () => void {
  const path = 'vehicleChecklists';
  const q = query(collection(db, path), where('driverId', '==', driverId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as VehicleChecklist))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeAllVehicleChecklists(
  onData: (checklists: VehicleChecklist[]) => void
): () => void {
  const path = 'vehicleChecklists';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as VehicleChecklist))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- TRIP REQUESTS (SOLICITAÇÕES DE VIAGENS PENDENTES) ---
export async function getTripRequests(): Promise<TripRequest[]> {
  const path = 'tripRequests';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as TripRequest))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createTripRequest(
  tripData: Omit<TripRequest, 'id' | 'createdAt' | 'status'>
): Promise<TripRequest> {
  const path = 'tripRequests';
  try {
    const id = `trip-${Date.now()}`;
    const newTrip: TripRequest = sanitizeFirestoreData({
      ...tripData,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, path, id), newTrip);

    // Also emit driver notification for real-time alert tracking
    await createNotification({
      targetRole: 'driver',
      targetUserId: tripData.driverId,
      title: `Nova solicitação de viagem: ${tripData.origin} → ${tripData.destination}`,
      message: `Carga: ${tripData.cargoDescription} · Veículo ${tripData.vehiclePlate} · Data: ${tripData.scheduledDate.split('-').reverse().join('/')}.`,
      type: tripData.priority === 'urgent' ? 'critical' : 'warning',
      read: false,
    });

    return newTrip;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateTripRequestStatus(
  id: string,
  status: TripRequestStatus
): Promise<void> {
  const path = `tripRequests/${id}`;
  try {
    await updateDoc(doc(db, 'tripRequests', id), {
      status,
      respondedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTripRequest(id: string): Promise<void> {
  const path = `tripRequests/${id}`;
  try {
    await deleteDoc(doc(db, 'tripRequests', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeDriverTripRequests(
  driverId: string,
  onData: (trips: TripRequest[]) => void
): () => void {
  const path = 'tripRequests';
  const q = query(collection(db, path), where('driverId', '==', driverId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as TripRequest))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeAllTripRequests(
  onData: (trips: TripRequest[]) => void
): () => void {
  const path = 'tripRequests';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as TripRequest))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- FCM DEVICE TOKENS (NOTIFICAÇÕES PUSH PARA MOTORISTAS) ---
function hashTokenShort(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildFcmTokenDocId(driverId: string, token: string): string {
  const safeDriver = driverId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'drv';
  return `fcm-${safeDriver}-${hashTokenShort(token)}`.slice(0, 128);
}

export async function saveDriverFcmToken(input: {
  driverId: string;
  driverName: string;
  vehicleId?: string;
  token: string;
  registrationMode: 'fcm' | 'web_push_fallback';
  browserLabel: string;
  enabled: boolean;
  notifyTrips: boolean;
  notifyMaintenance: boolean;
}): Promise<FcmDeviceRegistration> {
  const id = buildFcmTokenDocId(input.driverId, input.token);
  const path = `fcmTokens/${id}`;
  try {
    const existingSnap = await getDoc(doc(db, 'fcmTokens', id));
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as Partial<FcmDeviceRegistration>)
      : null;

    const now = new Date().toISOString();
    const record: FcmDeviceRegistration = {
      id,
      driverId: input.driverId.slice(0, 128),
      driverName: (input.driverName || 'Motorista').slice(0, 120),
      ...(input.vehicleId ? { vehicleId: input.vehicleId.slice(0, 128) } : {}),
      token: input.token.slice(0, 512),
      registrationMode: input.registrationMode,
      platform: 'web',
      browserLabel: (input.browserLabel || 'Navegador').slice(0, 120),
      enabled: Boolean(input.enabled),
      notifyTrips: Boolean(input.notifyTrips),
      notifyMaintenance: Boolean(input.notifyMaintenance),
      createdAt: existingData?.createdAt || now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'fcmTokens', id), record, { merge: true });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateDriverFcmPreferences(
  id: string,
  prefs: Partial<Pick<FcmDeviceRegistration, 'enabled' | 'notifyTrips' | 'notifyMaintenance'>>
): Promise<void> {
  const path = `fcmTokens/${id}`;
  try {
    await updateDoc(doc(db, 'fcmTokens', id), {
      ...prefs,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getDriverFcmTokens(driverId: string): Promise<FcmDeviceRegistration[]> {
  const path = 'fcmTokens';
  try {
    const q = query(collection(db, path), where('driverId', '==', driverId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as FcmDeviceRegistration))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAllFcmTokens(): Promise<FcmDeviceRegistration[]> {
  const path = 'fcmTokens';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FcmDeviceRegistration));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function disableDriverFcmToken(id: string): Promise<void> {
  const path = `fcmTokens/${id}`;
  try {
    await updateDoc(doc(db, 'fcmTokens', id), {
      enabled: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeDriverFcmTokens(
  driverId: string,
  onData: (regs: FcmDeviceRegistration[]) => void
): () => void {
  const path = 'fcmTokens';
  const q = query(collection(db, path), where('driverId', '==', driverId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as FcmDeviceRegistration))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// --- AUTHENTICATION & CREDENTIAL VERIFICATION ---
export interface AuthResult {
  success: boolean;
  profile?: UserProfile;
  driver?: Driver;
  error?: string;
}

export async function authenticateUser(identifier: string, password: string): Promise<AuthResult> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPwd = password.trim();

  if (!cleanId || !cleanPwd) {
    return { success: false, error: 'Por favor, informe seu login e senha.' };
  }

  try {
    // 1. Check in users collection (Admin and driver user accounts)
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const d of usersSnap.docs) {
      const u = d.data() as UserProfile;
      const matchEmail = u.email && u.email.toLowerCase() === cleanId;
      const matchUid = u.uid && u.uid.toLowerCase() === cleanId;
      if (matchEmail || matchUid) {
        if (!u.password || u.password === cleanPwd) {
          let drv: Driver | undefined;
          if (u.driverId) {
            const drvSnap = await getDoc(doc(db, 'drivers', u.driverId));
            if (drvSnap.exists()) {
              drv = { ...drvSnap.data(), id: drvSnap.id } as Driver;
              if (drv.active === false) {
                return { success: false, error: 'Acesso deste motorista está bloqueado pelo administrador.' };
              }
            } else if (u.role === 'driver') {
              return { success: false, error: 'Cadastro do motorista não encontrado ou removido.' };
            }
          }
          return { success: true, profile: u, driver: drv };
        } else {
          return { success: false, error: 'Senha incorreta para o usuário informado.' };
        }
      }
    }

    // 2. Check in drivers collection (Motoristas by loginEmail, CPF, or ID)
    const drivers = await getDrivers();
    for (const drv of drivers) {
      const matchEmail = drv.loginEmail && drv.loginEmail.toLowerCase() === cleanId;
      const cleanCpfInput = cleanId.replace(/\D/g, '');
      const matchCpf = cleanCpfInput.length >= 11 && drv.cpf && drv.cpf.replace(/\D/g, '') === cleanCpfInput;
      const matchId = drv.id && drv.id.toLowerCase() === cleanId;

      if (matchEmail || matchCpf || matchId) {
        if (drv.active === false) {
          return { success: false, error: 'Acesso deste motorista está bloqueado pelo administrador.' };
        }
        const expectedPwd = drv.password;
        if (expectedPwd && expectedPwd === cleanPwd) {
          const profile: UserProfile = {
            uid: `user-${drv.id}`,
            email: drv.loginEmail || `${drv.id}@truckgestao.com`,
            name: drv.name,
            role: 'driver',
            driverId: drv.id,
            password: expectedPwd,
            createdAt: drv.createdAt || new Date().toISOString(),
          };
          // Sync profile into users collection too
          await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
          return { success: true, profile, driver: drv };
        } else {
          return { success: false, error: 'Senha incorreta para o motorista informado.' };
        }
      }
    }

    // 3. Fallback for admin credentials (allows immediate access)
    if (cleanId === 'admin' || cleanId === 'admin@truckgestao.com') {
      if (cleanPwd === 'admin123' || cleanPwd === 'admin') {
        const adminProfile: UserProfile = {
          uid: 'admin-master',
          email: 'admin@truckgestao.com',
          name: 'Gestor de Frota (Administrador)',
          role: 'admin',
          password: 'admin123',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', adminProfile.uid), adminProfile, { merge: true });
        return { success: true, profile: adminProfile };
      } else {
        return { success: false, error: 'Senha incorreta para o administrador.' };
      }
    }

    return { success: false, error: 'Usuário não encontrado. Use o e-mail, login ou CPF cadastrado.' };
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return { success: false, error: 'Erro de conexão com o banco de dados.' };
  }
}

// --- INITIAL SEEDING HELPER ---
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    // Check if the system was already initialized
    const adminSnap = await getDoc(doc(db, 'users', 'admin-master'));
    if (adminSnap.exists()) {
      return; // System already initialized. Do not re-seed or override user deletions!
    }

    const vehiclesSnap = await getDocs(collection(db, 'vehicles'));
    if (!vehiclesSnap.empty) {
      // Ensure admin account is present
      await setDoc(doc(db, 'users', 'admin-master'), {
        uid: 'admin-master',
        email: 'admin@truckgestao.com',
        name: 'Gestor de Frota (Administrador)',
        role: 'admin',
        password: 'admin123',
        createdAt: new Date().toISOString(),
      });
      return;
    }

    console.log('Seeding initial functional TruckGestão data into Firestore...');

    // 0. Seed Users with Login & Password
    const adminUser: UserProfile = {
      uid: 'admin-master',
      email: 'admin@truckgestao.com',
      name: 'Gestor de Frota (Administrador)',
      role: 'admin',
      password: 'admin123',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', adminUser.uid), adminUser);

    // 1. Initial Vehicles
    // Vehicle 1: Currently at 19.850 km with next oil change at 20.000 km (150 km left -> triggers < 200 km alert!)
    const v1: Vehicle = {
      id: 'veh-01',
      plate: 'BRA2E19',
      model: 'Scania R 450 Highline 6x2',
      currentKm: 19850,
      lastOilChangeDate: '2026-08-10',
      lastOilChangeKm: 0,
      nextOilChangeKm: 20000,
      filtersReplaced: true,
      alertDismissed: false,
      createdAt: '2026-08-10T10:00:00Z',
    };

    // Vehicle 2: Safe margin
    const v2: Vehicle = {
      id: 'veh-02',
      plate: 'PRN9J84',
      model: 'Volvo FH 540 Globetrotter 6x4',
      currentKm: 84320,
      lastOilChangeDate: '2026-09-15',
      lastOilChangeKm: 80000,
      nextOilChangeKm: 100000,
      filtersReplaced: true,
      alertDismissed: false,
      createdAt: '2026-09-15T10:00:00Z',
    };

    // Vehicle 3: Mercedes Actros
    const v3: Vehicle = {
      id: 'veh-03',
      plate: 'SPB4A77',
      model: 'Mercedes-Benz Actros 2651',
      currentKm: 142100,
      lastOilChangeDate: '2026-10-01',
      lastOilChangeKm: 140000,
      nextOilChangeKm: 160000,
      filtersReplaced: true,
      alertDismissed: false,
      createdAt: '2026-10-01T10:00:00Z',
    };

    await setDoc(doc(db, 'vehicles', v1.id), v1);
    await setDoc(doc(db, 'vehicles', v2.id), v2);
    await setDoc(doc(db, 'vehicles', v3.id), v3);

    // 2. Initial Drivers with Passwords
    const d1: Driver = {
      id: 'drv-01',
      name: 'Carlos Eduardo Silveira',
      rg: '38.419.028-1',
      cpf: '284.912.834-02',
      address: 'Rua das Palmeiras, 450 - Campinas, SP',
      cnhCategory: 'E',
      cnhNumber: '04829184029',
      cnhExpiry: '2027-08-15',
      vehicleId: 'veh-01',
      loginEmail: 'carlos.silveira@truckgestao.com',
      password: 'carlos123',
      phone: '(19) 99841-2091',
      active: true,
      createdAt: '2026-08-10T10:00:00Z',
    };

    const d2: Driver = {
      id: 'drv-02',
      name: 'Marcos Vinicius de Souza',
      rg: '42.918.204-5',
      cpf: '194.029.381-45',
      address: 'Av. Brasil, 1200 - Americana, SP',
      cnhCategory: 'E',
      cnhNumber: '05928103948',
      cnhExpiry: '2026-11-28', // CNH expiring soon
      vehicleId: 'veh-02',
      loginEmail: 'marcos.souza@truckgestao.com',
      password: 'marcos123',
      phone: '(19) 98712-4402',
      active: true,
      createdAt: '2026-08-10T10:00:00Z',
    };

    await setDoc(doc(db, 'drivers', d1.id), d1);
    await setDoc(doc(db, 'drivers', d2.id), d2);

    // Seed Driver User Accounts
    await setDoc(doc(db, 'users', 'user-drv-01'), {
      uid: 'user-drv-01',
      email: d1.loginEmail,
      name: d1.name,
      role: 'driver',
      driverId: d1.id,
      password: 'carlos123',
      createdAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'users', 'user-drv-02'), {
      uid: 'user-drv-02',
      email: d2.loginEmail,
      name: d2.name,
      role: 'driver',
      driverId: d2.id,
      password: 'marcos123',
      createdAt: new Date().toISOString(),
    });

    // 3. Initial Daily Rates
    const initialRate: DailyRateConfig = {
      id: 'rate-2026-01',
      driverDailyRate: 220.00,
      helperDailyRate: 130.00,
      effectiveDate: '2026-01-01',
      createdAt: '2026-01-01T00:00:00Z',
    };
    await setDoc(doc(db, 'dailyRates', initialRate.id), initialRate);

    // 4. Initial Daily Reports matching user specification examples
    const rep1: DailyReport = {
      id: 'rep-01',
      driverId: d1.id,
      driverName: d1.name,
      vehicleId: v1.id,
      vehiclePlate: v1.plate,
      date: '2026-11-06',
      startKm: 19500,
      endKm: 19850,
      distanceKm: 350,
      tollsCount: 4,
      hasHelper: true,
      fuelCost: 780.00,
      fuelLiters: 135.0,
      calculatedKmL: 2.59,
      otherExpenses: [
        { id: 'exp-1', category: 'Óleo', amount: 45.00, description: '1L Óleo Top lubrificação quinta roda' },
      ],
      deliveries: [
        { id: 'del-1', city: 'Indaiatuba', material: 'Churrasqueira pré-moldada', quantity: 1, freightValue: 170.00 },
        { id: 'del-2', city: 'Americana', material: 'Churrasqueira pré-moldada', quantity: 1, freightValue: 140.00 },
        { id: 'del-3', city: 'Campinas', material: 'Churrasqueira pré-moldada', quantity: 1, freightValue: 170.00 },
        { id: 'del-4', city: 'Campinas', material: 'Dutos de exaustão', quantity: 11, freightValue: 44.00 },
        { id: 'del-5', city: 'Campinas', material: 'Módulos refratários', quantity: 5, freightValue: 75.00 },
      ],
      totalDeliveries: 5,
      totalFreight: 599.00,
      totalOtherExpenses: 45.00,
      status: 'submitted',
      createdAt: '2026-11-06T18:30:00Z',
    };

    const rep2: DailyReport = {
      id: 'rep-02',
      driverId: d2.id,
      driverName: d2.name,
      vehicleId: v2.id,
      vehiclePlate: v2.plate,
      date: '2026-11-05',
      startKm: 83900,
      endKm: 84320,
      distanceKm: 420,
      tollsCount: 6,
      hasHelper: false,
      fuelCost: 920.00,
      fuelLiters: 165.0,
      calculatedKmL: 2.54,
      otherExpenses: [
        { id: 'exp-2', category: 'Manutenção', amount: 80.00, description: 'Reparo de bico de mangueira pneumática' },
      ],
      deliveries: [
        { id: 'del-6', city: 'Limeira', material: 'Churrasqueira 3 gavetas', quantity: 2, freightValue: 320.00 },
        { id: 'del-7', city: 'Piracicaba', material: 'Kit refratário com dutos', quantity: 8, freightValue: 280.00 },
      ],
      totalDeliveries: 2,
      totalFreight: 600.00,
      totalOtherExpenses: 80.00,
      status: 'approved',
      createdAt: '2026-11-05T19:00:00Z',
    };

    await setDoc(doc(db, 'dailyReports', rep1.id), rep1);
    await setDoc(doc(db, 'dailyReports', rep2.id), rep2);

    // 5. Initial Tolls
    const t1: TollRecord = {
      id: 'toll-01',
      date: '2026-11-06',
      route: 'Rodovia Anhanguera (Praça Nova Odessa)',
      vehicleId: v1.id,
      vehiclePlate: v1.plate,
      cost: 42.50,
      createdAt: '2026-11-06T08:00:00Z',
    };
    const t2: TollRecord = {
      id: 'toll-02',
      date: '2026-11-06',
      route: 'Rodovia dos Bandeirantes (Praça Limeira)',
      vehicleId: v1.id,
      vehiclePlate: v1.plate,
      cost: 38.00,
      createdAt: '2026-11-06T10:00:00Z',
    };
    await setDoc(doc(db, 'tolls', t1.id), t1);
    await setDoc(doc(db, 'tolls', t2.id), t2);

    console.log('Initial data seeded successfully into Firestore!');
  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
}
