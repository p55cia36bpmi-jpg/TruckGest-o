'use client';

import { Vehicle, Driver, FuelEntry, MaintenanceOrder, InspectionChecklist, SystemAlert } from '@/types/fleet';
import { 
  INITIAL_VEHICLES, 
  INITIAL_DRIVERS, 
  INITIAL_FUEL_ENTRIES, 
  INITIAL_MAINTENANCE_ORDERS, 
  INITIAL_CHECKLISTS, 
  INITIAL_ALERTS 
} from './mock-data';

const STORAGE_KEYS = {
  VEHICLES: 'truckgestao_vehicles_v1',
  DRIVERS: 'truckgestao_drivers_v1',
  FUEL: 'truckgestao_fuel_v1',
  MAINTENANCE: 'truckgestao_maintenance_v1',
  CHECKLISTS: 'truckgestao_checklists_v1',
  ALERTS: 'truckgestao_alerts_v1',
};

// Safe localStorage accessor for SSR
function getStoredItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) {
      window.localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('truckgestao_storage_update'));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

export const FleetStorage = {
  getVehicles: (): Vehicle[] => getStoredItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES),
  setVehicles: (vehicles: Vehicle[]) => setStoredItem(STORAGE_KEYS.VEHICLES, vehicles),

  getDrivers: (): Driver[] => getStoredItem<Driver[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS),
  setDrivers: (drivers: Driver[]) => setStoredItem(STORAGE_KEYS.DRIVERS, drivers),

  getFuelEntries: (): FuelEntry[] => getStoredItem<FuelEntry[]>(STORAGE_KEYS.FUEL, INITIAL_FUEL_ENTRIES),
  setFuelEntries: (entries: FuelEntry[]) => setStoredItem(STORAGE_KEYS.FUEL, entries),

  getMaintenanceOrders: (): MaintenanceOrder[] => getStoredItem<MaintenanceOrder[]>(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_ORDERS),
  setMaintenanceOrders: (orders: MaintenanceOrder[]) => setStoredItem(STORAGE_KEYS.MAINTENANCE, orders),

  getChecklists: (): InspectionChecklist[] => getStoredItem<InspectionChecklist[]>(STORAGE_KEYS.CHECKLISTS, INITIAL_CHECKLISTS),
  setChecklists: (checklists: InspectionChecklist[]) => setStoredItem(STORAGE_KEYS.CHECKLISTS, checklists),

  getAlerts: (): SystemAlert[] => getStoredItem<SystemAlert[]>(STORAGE_KEYS.ALERTS, INITIAL_ALERTS),
  setAlerts: (alerts: SystemAlert[]) => setStoredItem(STORAGE_KEYS.ALERTS, alerts),

  resetToDefaults: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
    window.localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(INITIAL_DRIVERS));
    window.localStorage.setItem(STORAGE_KEYS.FUEL, JSON.stringify(INITIAL_FUEL_ENTRIES));
    window.localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(INITIAL_MAINTENANCE_ORDERS));
    window.localStorage.setItem(STORAGE_KEYS.CHECKLISTS, JSON.stringify(INITIAL_CHECKLISTS));
    window.localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(INITIAL_ALERTS));
    window.dispatchEvent(new Event('truckgestao_storage_update'));
  },

  exportDatabaseJson: (): string => {
    const data = {
      vehicles: FleetStorage.getVehicles(),
      drivers: FleetStorage.getDrivers(),
      fuelEntries: FleetStorage.getFuelEntries(),
      maintenanceOrders: FleetStorage.getMaintenanceOrders(),
      checklists: FleetStorage.getChecklists(),
      alerts: FleetStorage.getAlerts(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },
};
