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
