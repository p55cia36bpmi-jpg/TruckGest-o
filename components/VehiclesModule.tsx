/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import { Vehicle, Driver, VehicleStatus, VehicleCategory } from '@/types/fleet';
import { MercosulPlate } from './MercosulPlate';
import { Modal } from './Modal';
import { 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  LayoutGrid, 
  List, 
  MapPin, 
  Fuel, 
  Gauge, 
  Wrench, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface VehiclesModuleProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onSelectVehicleForInspection?: (vehicle: Vehicle) => void;
}

export function VehiclesModule({
  vehicles,
  drivers,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onSelectVehicleForInspection,
}: VehiclesModuleProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState<Vehicle | null>(null);

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    renavam: '',
    chassis: '',
    brand: 'Scania',
    model: '',
    year: 2024,
    category: 'Cavalo Mecânico 6x2' as VehicleCategory,
    status: 'Disponível' as VehicleStatus,
    currentKm: 0,
    tankCapacity: 800,
    averageKmL: 2.50,
    currentDriverId: '',
    currentCity: 'São Paulo - SP',
    currentLoadTons: 0,
    maxCapacityTons: 35.0,
    photoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
    anttRegister: 'RNTRC 49182903',
  });

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = 
      v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.currentCity.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate || !newVehicle.model) return;

    onAddVehicle({
      ...newVehicle,
      plate: newVehicle.plate.toUpperCase().trim(),
      lastMaintenanceKm: newVehicle.currentKm,
      nextMaintenanceKm: newVehicle.currentKm + 20000,
      telemetry: {
        speedKmH: 0,
        rpm: 0,
        fuelLevelPercent: 100,
        brakeWearPercent: 5,
        tirePressureStatus: 'Normal',
        engineTempC: 22,
        latitude: -23.5505,
        longitude: -46.6333,
        lastGpsUpdate: 'Cadastrado agora',
        isEngineOn: false,
      },
    });

    setIsAddModalOpen(false);
    // Reset form
    setNewVehicle({
      plate: '',
      renavam: '',
      chassis: '',
      brand: 'Scania',
      model: '',
      year: 2024,
      category: 'Cavalo Mecânico 6x2',
      status: 'Disponível',
      currentKm: 0,
      tankCapacity: 800,
      averageKmL: 2.50,
      currentDriverId: '',
      currentCity: 'São Paulo - SP',
      currentLoadTons: 0,
      maxCapacityTons: 35.0,
      photoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
      anttRegister: 'RNTRC 49182903',
    });
  };

  const handleQuickStatusChange = (vehicle: Vehicle, newStatus: VehicleStatus) => {
    onUpdateVehicle({
      ...vehicle,
      status: newStatus,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por placa, modelo, marca ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Status</option>
            <option value="Em Viagem">Em Viagem</option>
            <option value="Disponível">Disponível</option>
            <option value="Em Carga/Descarga">Em Carga/Descarga</option>
            <option value="Em Manutenção">Em Manutenção</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="hidden sm:block bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas as Categorias</option>
            <option value="Cavalo Mecânico 6x2">Cavalo 6x2</option>
            <option value="Cavalo Mecânico 6x4">Cavalo 6x4</option>
            <option value="Bitrem 9 Eixos">Bitrem 9 Eixos</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Vehicle Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Veículo</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => {
            const driver = drivers.find((d) => d.id === vehicle.currentDriverId);
            const kmToNextMaint = vehicle.nextMaintenanceKm - vehicle.currentKm;
            const isMaintOverdue = kmToNextMaint <= 0;

            return (
              <div
                key={vehicle.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Card Truck Image & Overlay Badges */}
                  <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                    <img
                      src={vehicle.photoUrl}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                    
                    {/* Plate in top corner */}
                    <div className="absolute top-3 left-3 shadow-md">
                      <MercosulPlate plate={vehicle.plate} size="sm" />
                    </div>

                    {/* Status badge in top right */}
                    <div className="absolute top-3 right-3">
                      <select
                        value={vehicle.status}
                        onChange={(e) => handleQuickStatusChange(vehicle, e.target.value as VehicleStatus)}
                        className={`text-[11px] font-semibold rounded px-2 py-1 border shadow-md focus:outline-none cursor-pointer ${
                          vehicle.status === 'Em Viagem' ? 'bg-emerald-950/90 border-emerald-600 text-emerald-300' :
                          vehicle.status === 'Em Carga/Descarga' ? 'bg-amber-950/90 border-amber-600 text-amber-300' :
                          vehicle.status === 'Em Manutenção' ? 'bg-rose-950/90 border-rose-600 text-rose-300' :
                          'bg-slate-900/90 border-slate-700 text-slate-300'
                        }`}
                      >
                        <option value="Em Viagem">Em Viagem</option>
                        <option value="Disponível">Disponível</option>
                        <option value="Em Carga/Descarga">Em Carga/Descarga</option>
                        <option value="Em Manutenção">Em Manutenção</option>
                      </select>
                    </div>

                    {/* Truck Title & Category at bottom of photo */}
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <h4 className="text-base font-bold text-white tracking-tight">
                        {vehicle.brand} {vehicle.model}
                      </h4>
                      <p className="text-xs text-slate-300">
                        {vehicle.category} · Ano {vehicle.year}
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 text-xs">
                    {/* Location & Destination */}
                    <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{vehicle.currentCity}</span>
                      </div>
                      {vehicle.destinationCity && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[100px] text-right font-medium text-slate-200">
                            {vehicle.destinationCity}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Odômetro, Consumo & Motorista */}
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div className="p-2 bg-slate-950/40 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Odômetro</span>
                        <span className="font-mono tabular-nums font-bold text-slate-100">
                          {vehicle.currentKm.toLocaleString('pt-BR')} km
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/40 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Consumo Médio</span>
                        <span className="font-mono tabular-nums font-bold text-slate-100">
                          {vehicle.averageKmL} km/L
                        </span>
                      </div>
                    </div>

                    {/* Driver Tag */}
                    <div className="flex items-center justify-between pt-1 text-slate-400">
                      <span>Condutor Atual:</span>
                      <span className="font-medium text-slate-200 truncate max-w-[180px]">
                        {driver ? driver.name : 'Nenhum atribuído'}
                      </span>
                    </div>

                    {/* Maintenance Alert bar */}
                    <div className={`p-2 rounded text-[11px] flex items-center justify-between border ${
                      isMaintOverdue 
                        ? 'bg-rose-950/30 border-rose-900/50 text-rose-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}>
                      <span className="flex items-center gap-1">
                        {isMaintOverdue ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Wrench className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        Próxima Revisão:
                      </span>
                      <span className="font-mono tabular-nums font-semibold">
                        {isMaintOverdue 
                          ? `VENCIDA (${Math.abs(kmToNextMaint)} km)` 
                          : `em ${kmToNextMaint.toLocaleString('pt-BR')} km`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedVehicleDetail(vehicle)}
                    className="text-amber-400 hover:text-amber-300 font-medium text-xs flex items-center gap-1 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ficha Técnica</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeleteVehicle(vehicle.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      title="Excluir Veículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Placa / Veículo</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4">Motorista</th>
                  <th className="py-3 px-4 text-right">Odômetro</th>
                  <th className="py-3 px-4 text-right">Média km/L</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredVehicles.map((vehicle) => {
                  const driver = drivers.find((d) => d.id === vehicle.currentDriverId);
                  return (
                    <tr key={vehicle.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <MercosulPlate plate={vehicle.plate} size="sm" />
                          <div>
                            <div className="font-semibold text-slate-100">{vehicle.brand} {vehicle.model}</div>
                            <div className="text-[11px] text-slate-500 font-mono">Renavam: {vehicle.renavam}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {vehicle.category}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          vehicle.status === 'Em Viagem' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          vehicle.status === 'Em Carga/Descarga' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                          vehicle.status === 'Em Manutenção' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                          'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200">{vehicle.currentCity}</div>
                        {vehicle.destinationCity && (
                          <div className="text-[11px] text-slate-500">Destino: {vehicle.destinationCity}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {driver ? driver.name : <span className="text-slate-500 italic">Livre</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-100">
                        {vehicle.currentKm.toLocaleString('pt-BR')} km
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-100">
                        {vehicle.averageKmL}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedVehicleDetail(vehicle)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors"
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Novo Caminhão */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cadastrar Novo Veículo na Frota"
        subtitle="Adicione caminhões pesados, cavalos mecânicos ou implementos com documentação completa"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateVehicle} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Placa (Padrão Mercosul) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: BRA2E19"
                maxLength={7}
                value={newVehicle.plate}
                onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tracking-wider focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Renavam *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 01294819283"
                value={newVehicle.renavam}
                onChange={(e) => setNewVehicle({ ...newVehicle, renavam: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Marca / Montadora
              </label>
              <select
                value={newVehicle.brand}
                onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Scania">Scania</option>
                <option value="Volvo">Volvo</option>
                <option value="Mercedes-Benz">Mercedes-Benz</option>
                <option value="DAF">DAF</option>
                <option value="Volkswagen">Volkswagen Caminhões</option>
                <option value="Iveco">Iveco</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Modelo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: R 450 Highline 6x2"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ano de Fabricação
              </label>
              <input
                type="number"
                min={2005}
                max={2026}
                value={newVehicle.year}
                onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) || 2024 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Categoria Operacional
              </label>
              <select
                value={newVehicle.category}
                onChange={(e) => setNewVehicle({ ...newVehicle, category: e.target.value as VehicleCategory })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Cavalo Mecânico 6x2">Cavalo Mecânico 6x2</option>
                <option value="Cavalo Mecânico 6x4">Cavalo Mecânico 6x4</option>
                <option value="Bitrem 9 Eixos">Bitrem 9 Eixos</option>
                <option value="Carreta Baú">Carreta Baú</option>
                <option value="Carreta Graneleiro">Carreta Graneleiro</option>
                <option value="Carreta Sider">Carreta Sider</option>
                <option value="Carreta Frigorífica">Carreta Frigorífica</option>
                <option value="Caminhão VUC 3/4">Caminhão VUC 3/4</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Odômetro Atual (km)
              </label>
              <input
                type="number"
                min={0}
                value={newVehicle.currentKm}
                onChange={(e) => setNewVehicle({ ...newVehicle, currentKm: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tanque (Litros)
              </label>
              <input
                type="number"
                value={newVehicle.tankCapacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, tankCapacity: parseInt(e.target.value) || 800 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Média Alvo (km/L)
              </label>
              <input
                type="number"
                step="0.01"
                value={newVehicle.averageKmL}
                onChange={(e) => setNewVehicle({ ...newVehicle, averageKmL: parseFloat(e.target.value) || 2.5 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Capacidade Máx (ton)
              </label>
              <input
                type="number"
                step="0.5"
                value={newVehicle.maxCapacityTons}
                onChange={(e) => setNewVehicle({ ...newVehicle, maxCapacityTons: parseFloat(e.target.value) || 35 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Base Operacional / Garagem
              </label>
              <input
                type="text"
                placeholder="Ex: São Paulo - SP (Pátio Marginal)"
                value={newVehicle.currentCity}
                onChange={(e) => setNewVehicle({ ...newVehicle, currentCity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Registro ANTT (RNTRC)
              </label>
              <input
                type="text"
                value={newVehicle.anttRegister}
                onChange={(e) => setNewVehicle({ ...newVehicle, anttRegister: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              Cadastrar Veículo
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Ficha Técnica Detalhada do Caminhão */}
      <Modal
        isOpen={!!selectedVehicleDetail}
        onClose={() => setSelectedVehicleDetail(null)}
        title={selectedVehicleDetail ? `Ficha Técnica: ${selectedVehicleDetail.brand} ${selectedVehicleDetail.model}` : ''}
        subtitle={selectedVehicleDetail ? `Placa ${selectedVehicleDetail.plate} · ${selectedVehicleDetail.category}` : ''}
        maxWidth="2xl"
      >
        {selectedVehicleDetail && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
              <MercosulPlate plate={selectedVehicleDetail.plate} size="lg" />
              <div className="space-y-1 text-xs">
                <div className="text-slate-400">
                  Renavam: <span className="font-mono text-slate-200">{selectedVehicleDetail.renavam}</span>
                </div>
                <div className="text-slate-400">
                  Chassi: <span className="font-mono text-slate-200">{selectedVehicleDetail.chassis}</span>
                </div>
                <div className="text-slate-400">
                  Registro ANTT: <span className="font-mono text-slate-200">{selectedVehicleDetail.anttRegister}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Odômetro</span>
                <span className="font-mono font-bold text-base text-slate-100">
                  {selectedVehicleDetail.currentKm.toLocaleString('pt-BR')} km
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Capacidade</span>
                <span className="font-mono font-bold text-base text-slate-100">
                  {selectedVehicleDetail.maxCapacityTons} Ton
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Tanque</span>
                <span className="font-mono font-bold text-base text-slate-100">
                  {selectedVehicleDetail.tankCapacity} Litros
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Média Estimada</span>
                <span className="font-mono font-bold text-base text-slate-100">
                  {selectedVehicleDetail.averageKmL} km/L
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Última Revisão Preventiva Realizada:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {selectedVehicleDetail.lastMaintenanceKm.toLocaleString('pt-BR')} km
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Próxima Revisão Programada:</span>
                <span className="font-mono font-semibold text-amber-400">
                  {selectedVehicleDetail.nextMaintenanceKm.toLocaleString('pt-BR')} km
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedVehicleDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
              >
                Fechar Ficha Técnica
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
