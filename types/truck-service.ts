export type UserRole = 'admin' | 'driver';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  driverId?: string; // Link to Driver document if role is driver
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  rg: string;
  cpf: string;
  address: string;
  cnhCategory: 'C' | 'D' | 'E';
  cnhNumber: string;
  cnhExpiry: string; // YYYY-MM-DD
  vehicleId?: string; // Placa ou ID do veículo vinculado
  loginEmail?: string;
  password?: string; // Senha do motorista conforme Seção 3
  accessCode?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  currentKm: number;
  lastOilChangeDate: string;
  lastOilChangeKm: number;
  nextOilChangeKm: number;
  lastPreventiveMaintenanceDate?: string;
  lastPreventiveMaintenanceKm?: number;
  nextPreventiveMaintenanceKm?: number;
  preventiveIntervalKm?: number;
  filtersReplaced: boolean;
  alertDismissed?: boolean;
  createdAt: string;
}

export type ExpenseCategory = 'Óleo' | 'Manutenção' | 'Outros';

export interface OtherExpenseItem {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
}

export interface DeliveryItem {
  id: string;
  city: string;
  material: string;
  quantity: number | string;
  freightValue: number;
}

export interface DailyReport {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string; // YYYY-MM-DD
  startKm: number;
  endKm: number;
  distanceKm: number; // endKm - startKm
  tollsCount: number;
  hasHelper: boolean;
  fuelCost: number;
  fuelLiters: number;
  calculatedKmL?: number;
  otherExpenses: OtherExpenseItem[];
  deliveries: DeliveryItem[];
  totalDeliveries: number;
  totalFreight: number;
  totalOtherExpenses: number;
  canEdit?: boolean; // Permissão de edição autorizada pelo administrador (Seção 5)
  status: 'submitted' | 'approved' | 'paid';
  createdAt: string;
}

export interface DailyRateConfig {
  id: string;
  driverDailyRate: number;
  helperDailyRate: number;
  effectiveDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface TollRecord {
  id: string;
  date: string;
  route: string;
  vehicleId?: string;
  vehiclePlate?: string;
  cost: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  driverId: string;
  driverName: string;
  startDate: string;
  endDate: string;
  daysWorked: number;
  daysWithHelper: number;
  driverAmount: number;
  helperAmount: number;
  netReceived: number; // totalFreight - driverAmount - helperAmount
  totalFreight: number;
  confirmedAt: string;
  confirmedByAdminEmail: string;
}

export interface SystemNotification {
  id: string;
  targetRole: 'all' | 'admin' | 'driver';
  targetUserId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  read: boolean;
  createdAt: string;
}

export type ChecklistItemStatus = 'ok' | 'anomaly';
export type AnomalySeverity = 'low' | 'medium' | 'critical';
export type ChecklistCategory =
  | 'Pneus & Rodagem'
  | 'Freios & Pneumático'
  | 'Iluminação & Sinalização'
  | 'Motor & Fluidos'
  | 'Cabine & Segurança'
  | 'Carroceria & Carga';

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  label: string;
  status: ChecklistItemStatus;
  severity?: AnomalySeverity;
  notes?: string;
}

export type ChecklistOverallStatus = 'approved' | 'attention' | 'critical';
export type ChecklistResolutionStatus = 'ok' | 'pending_review' | 'in_maintenance' | 'resolved';

export interface VehicleChecklist {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel?: string;
  date: string; // YYYY-MM-DD
  inspectionType: 'pre_trip' | 'post_trip' | 'routine';
  odometerKm: number;
  items: ChecklistItem[];
  anomaliesCount: number;
  criticalAnomaliesCount: number;
  overallStatus: ChecklistOverallStatus;
  resolutionStatus: ChecklistResolutionStatus;
  generalNotes?: string;
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  type: string;
  cost?: number;
  filtersReplaced?: boolean;
  createdAt: string;
}

export type TripRequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';

export interface TripRequest {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  origin: string;
  destination: string;
  cargoDescription: string;
  estimatedFreight: number;
  scheduledDate: string; // YYYY-MM-DD
  priority: 'normal' | 'urgent';
  notes?: string;
  status: TripRequestStatus;
  createdByAdminEmail: string;
  createdAt: string;
  respondedAt?: string;
}

