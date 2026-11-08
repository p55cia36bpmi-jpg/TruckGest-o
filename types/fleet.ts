export type VehicleCategory = 
  | 'Cavalo Mecânico 6x2'
  | 'Cavalo Mecânico 6x4'
  | 'Carreta Baú'
  | 'Carreta Graneleiro'
  | 'Carreta Sider'
  | 'Carreta Frigorífica'
  | 'Caminhão VUC 3/4'
  | 'Bitrem 9 Eixos';

export type VehicleStatus = 
  | 'Em Viagem'
  | 'Disponível'
  | 'Em Manutenção'
  | 'Em Carga/Descarga'
  | 'Desativado';

export interface VehicleTelemetry {
  speedKmH: number;
  rpm: number;
  fuelLevelPercent: number;
  brakeWearPercent: number;
  tirePressureStatus: 'Normal' | 'Atenção' | 'Crítico';
  engineTempC: number;
  latitude: number;
  longitude: number;
  lastGpsUpdate: string;
  isEngineOn: boolean;
}

export interface Vehicle {
  id: string;
  plate: string; // Ex: BRA2E19
  renavam: string;
  chassis: string;
  brand: string; // Ex: Scania, Volvo, Mercedes-Benz, DAF, VW
  model: string; // Ex: R 450, FH 540, Actros 2651
  year: number;
  category: VehicleCategory;
  status: VehicleStatus;
  currentKm: number;
  tankCapacity: number; // litros
  averageKmL: number; // meta km/l
  currentDriverId?: string;
  currentCity: string;
  destinationCity?: string;
  currentLoadTons: number;
  maxCapacityTons: number;
  photoUrl: string;
  lastMaintenanceKm: number;
  nextMaintenanceKm: number;
  anttRegister: string;
  telemetry: VehicleTelemetry;
}

export type DriverStatus = 'Em Trânsito' | 'Disponível' | 'Em Folga' | 'Férias' | 'Afastado';

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  cnhNumber: string;
  cnhCategory: 'C' | 'D' | 'E';
  cnhExpiry: string; // YYYY-MM-DD
  toxicologicalExpiry: string; // YYYY-MM-DD
  moppCertified: boolean;
  phone: string;
  status: DriverStatus;
  assignedVehicleId?: string;
  ecoScore: number; // 0-100
  totalTrips: number;
  photoUrl: string;
  baseCity: string;
}

export type FuelType = 'Diesel S10' | 'Diesel S500' | 'Arla 32';

export interface FuelEntry {
  id: string;
  date: string; // YYYY-MM-DD HH:mm
  vehicleId: string;
  driverId: string;
  gasStation: string;
  city: string;
  fuelType: FuelType;
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  calculatedKmL: number;
  invoiceNumber: string;
  notes?: string;
}

export type MaintenanceType = 'Preventiva' | 'Corretiva' | 'Pneus' | 'Elétrica' | 'Tacógrafo / ANTT';
export type MaintenanceStatus = 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export interface MaintenanceOrder {
  id: string;
  orderNumber: string;
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  workshopName: string;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  status: MaintenanceStatus;
  dateScheduled: string;
  dateCompleted?: string;
  odometer: number;
  priority: Priority;
  mechanicNotes?: string;
}

export interface InspectionChecklist {
  id: string;
  vehicleId: string;
  driverId: string;
  date: string;
  status: 'Aprovado' | 'Aprovado com Ressalvas' | 'Reprovado';
  odometer: number;
  items: {
    oilLevel: boolean;
    coolantLevel: boolean;
    tiresPressure: boolean;
    tiresTreadDepth: boolean;
    lightsAndBlinkers: boolean;
    brakesAirPressure: boolean;
    safetyKitExtinguisher: boolean;
    tachographTape: boolean;
    windshieldWipers: boolean;
    cargoLashing: boolean;
  };
  notes?: string;
}

export interface FreightCalculation {
  id?: string;
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  cargoWeightTons: number;
  truckModel: string;
  avgKmL: number;
  dieselPrice: number;
  tollEstimate: number;
  driverDailyRate: number;
  tripDays: number;
  arla32Cost: number;
  otherExpenses: number;
  profitMarginPercent: number;
  totalCost: number;
  suggestedFreight: number;
  estimatedProfit: number;
}

export interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  date: string;
  resolved: boolean;
  targetTab?: string;
}
