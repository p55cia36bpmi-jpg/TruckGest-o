/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import { Driver, Vehicle, DriverStatus } from '@/types/fleet';
import { Modal } from './Modal';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Award, 
  Phone, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  FileCheck,
  ShieldAlert,
  Trash2
} from 'lucide-react';

interface DriversModuleProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onAddDriver: (driver: Omit<Driver, 'id'>) => void;
  onUpdateDriver: (driver: Driver) => void;
  onDeleteDriver: (id: string) => void;
}

export function DriversModule({
  drivers,
  vehicles,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
}: DriversModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New driver form
  const [newDriver, setNewDriver] = useState({
    name: '',
    cpf: '',
    cnhNumber: '',
    cnhCategory: 'E' as 'C' | 'D' | 'E',
    cnhExpiry: '2028-12-31',
    toxicologicalExpiry: '2027-06-30',
    moppCertified: true,
    phone: '',
    status: 'Disponível' as DriverStatus,
    assignedVehicleId: '',
    ecoScore: 92,
    totalTrips: 0,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    baseCity: 'São Paulo - SP',
  });

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.cpf.includes(searchQuery) ||
      d.cnhNumber.includes(searchQuery) ||
      d.baseCity.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.cpf || !newDriver.cnhNumber) return;

    onAddDriver({
      ...newDriver,
    });

    setIsAddModalOpen(false);
    setNewDriver({
      name: '',
      cpf: '',
      cnhNumber: '',
      cnhCategory: 'E',
      cnhExpiry: '2028-12-31',
      toxicologicalExpiry: '2027-06-30',
      moppCertified: true,
      phone: '',
      status: 'Disponível',
      assignedVehicleId: '',
      ecoScore: 92,
      totalTrips: 0,
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      baseCity: 'São Paulo - SP',
    });
  };

  const isDateExpiringSoon = (dateString: string) => {
    const target = new Date(dateString);
    const now = new Date('2026-11-07');
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 30;
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, CNH ou base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Status</option>
            <option value="Em Trânsito">Em Trânsito</option>
            <option value="Disponível">Disponível</option>
            <option value="Em Folga">Em Folga</option>
            <option value="Férias">Férias</option>
          </select>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Motorista</span>
        </button>
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.map((driver) => {
          const assignedTruck = vehicles.find((v) => v.id === driver.assignedVehicleId);
          const cnhExpiring = isDateExpiringSoon(driver.cnhExpiry);
          const toxExpiring = isDateExpiringSoon(driver.toxicologicalExpiry);

          return (
            <div
              key={driver.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm space-y-4"
            >
              <div>
                {/* Header Profile */}
                <div className="flex items-start gap-3">
                  <img
                    src={driver.photoUrl}
                    alt={driver.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">
                      {driver.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      CPF: {driver.cpf}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                        CNH Cat. {driver.cnhCategory}
                      </span>
                      {driver.moppCertified && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium" title="Curso MOPP de Produtos Perigosos Concluído">
                          MOPP OK
                        </span>
                      )}
                    </div>
                  </div>

                  <select
                    value={driver.status}
                    onChange={(e) => onUpdateDriver({ ...driver, status: e.target.value as DriverStatus })}
                    className={`text-[11px] font-semibold rounded px-2 py-0.5 border focus:outline-none cursor-pointer ${
                      driver.status === 'Em Trânsito' ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' :
                      driver.status === 'Disponível' ? 'bg-blue-950/80 border-blue-600 text-blue-300' :
                      'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    <option value="Em Trânsito">Em Trânsito</option>
                    <option value="Disponível">Disponível</option>
                    <option value="Em Folga">Em Folga</option>
                    <option value="Férias">Férias</option>
                  </select>
                </div>

                {/* Eco-Score Bar */}
                <div className="mt-4 p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 flex items-center gap-1 font-medium">
                      <Award className="w-3.5 h-3.5 text-amber-400" /> Eco-Drive (Condução Segura)
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {driver.ecoScore} <span className="text-slate-500 font-normal">/ 100</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        driver.ecoScore >= 90 ? 'bg-emerald-500' : driver.ecoScore >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${driver.ecoScore}%` }}
                    />
                  </div>
                </div>

                {/* Exames & Validades Regulatórias */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className={`p-2 rounded flex items-center justify-between border ${
                    cnhExpiring 
                      ? 'bg-rose-950/30 border-rose-900/50 text-rose-300' 
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-400" /> Validade CNH:
                    </span>
                    <span className="font-mono font-semibold">
                      {driver.cnhExpiry.split('-').reverse().join('/')}
                      {cnhExpiring && ' (A VENCER)'}
                    </span>
                  </div>

                  <div className={`p-2 rounded flex items-center justify-between border ${
                    toxExpiring 
                      ? 'bg-amber-950/30 border-amber-900/50 text-amber-300' 
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Exame Toxicológico:
                    </span>
                    <span className="font-mono font-semibold">
                      {driver.toxicologicalExpiry.split('-').reverse().join('/')}
                      {toxExpiring && ' (URGENTE)'}
                    </span>
                  </div>

                  {/* Truck and Phone */}
                  <div className="pt-2 flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-500" /> Caminhão:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {assignedTruck ? `${assignedTruck.plate} (${assignedTruck.brand})` : 'Nenhum'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" /> Contato:
                    </span>
                    <span className="font-mono text-slate-200">
                      {driver.phone || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {driver.totalTrips} viagens realizadas
                </span>
                <button
                  onClick={() => onDeleteDriver(driver.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Excluir cadastro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Cadastrar Motorista */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cadastrar Novo Motorista"
        subtitle="Registro de condutor com controle rigoroso de CNH, exame toxicológico e certificação MOPP"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateDriver} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Eduardo Silveira"
              value={newDriver.name}
              onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                CPF *
              </label>
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                value={newDriver.cpf}
                onChange={(e) => setNewDriver({ ...newDriver, cpf: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Número CNH *
              </label>
              <input
                type="text"
                required
                placeholder="00000000000"
                value={newDriver.cnhNumber}
                onChange={(e) => setNewDriver({ ...newDriver, cnhNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Categoria CNH
              </label>
              <select
                value={newDriver.cnhCategory}
                onChange={(e) => setNewDriver({ ...newDriver, cnhCategory: e.target.value as 'C' | 'D' | 'E' })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="E">Categoria E (Articulados / Bitrem)</option>
                <option value="D">Categoria D (Caminhões Pesados)</option>
                <option value="C">Categoria C (Caminhões Médios)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Validade da CNH *
              </label>
              <input
                type="date"
                required
                value={newDriver.cnhExpiry}
                onChange={(e) => setNewDriver({ ...newDriver, cnhExpiry: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Validade Exame Toxicológico *
              </label>
              <input
                type="date"
                required
                value={newDriver.toxicologicalExpiry}
                onChange={(e) => setNewDriver({ ...newDriver, toxicologicalExpiry: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Vincular Caminhão Inicial
              </label>
              <select
                value={newDriver.assignedVehicleId}
                onChange={(e) => setNewDriver({ ...newDriver, assignedVehicleId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="">Nenhum (Deixar Disponível)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="moppCheck"
              checked={newDriver.moppCertified}
              onChange={(e) => setNewDriver({ ...newDriver, moppCertified: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="moppCheck" className="text-xs text-slate-300 font-medium">
              Possui Certificação MOPP para transporte de cargas perigosas
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
            >
              Cadastrar Motorista
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
