'use client';

import React, { useState } from 'react';
import { MaintenanceOrder, Vehicle, MaintenanceType, MaintenanceStatus, Priority } from '@/types/fleet';
import { MercosulPlate } from './MercosulPlate';
import { Modal } from './Modal';
import { 
  Wrench, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  CircleDot, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  FileText,
  Trash2
} from 'lucide-react';

interface MaintenanceModuleProps {
  maintenanceOrders: MaintenanceOrder[];
  vehicles: Vehicle[];
  onAddMaintenanceOrder: (order: Omit<MaintenanceOrder, 'id'>) => void;
  onUpdateMaintenanceOrder: (order: MaintenanceOrder) => void;
  onDeleteMaintenanceOrder: (id: string) => void;
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  onOpenModal?: () => void;
}

export function MaintenanceModule({
  maintenanceOrders,
  vehicles,
  onAddMaintenanceOrder,
  onUpdateMaintenanceOrder,
  onDeleteMaintenanceOrder,
  isModalOpen: externalIsModalOpen,
  onCloseModal: externalOnCloseModal,
  onOpenModal: externalOnOpenModal,
}: MaintenanceModuleProps) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalIsModalOpen ?? internalModalOpen;
  const setModalOpen = (open: boolean) => {
    if (open) {
      if (externalOnOpenModal) externalOnOpenModal();
      else setInternalModalOpen(true);
    } else {
      if (externalOnCloseModal) externalOnCloseModal();
      else setInternalModalOpen(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Form state
  const [newOrder, setNewOrder] = useState({
    orderNumber: 'OS-2026-0895',
    vehicleId: vehicles[0]?.id || '',
    type: 'Preventiva' as MaintenanceType,
    description: '',
    workshopName: 'Oficina Central TruckGestão',
    partsCost: 1500,
    laborCost: 600,
    status: 'Agendada' as MaintenanceStatus,
    dateScheduled: new Date().toISOString().slice(0, 10),
    odometer: 160000,
    priority: 'Alta' as Priority,
    mechanicNotes: '',
  });

  const totalSpentInMaintenance = maintenanceOrders.reduce((acc, m) => acc + m.totalCost, 0);
  const activeOrdersCount = maintenanceOrders.filter((m) => m.status === 'Em Andamento' || m.status === 'Agendada').length;
  const completedOrdersCount = maintenanceOrders.filter((m) => m.status === 'Concluída').length;

  const filteredOrders = maintenanceOrders.filter((order) => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.workshopName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = typeFilter === 'all' || order.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.vehicleId || !newOrder.description) return;

    const totalCost = Number(newOrder.partsCost) + Number(newOrder.laborCost);

    onAddMaintenanceOrder({
      ...newOrder,
      totalCost,
    });

    setModalOpen(false);
    setNewOrder({
      orderNumber: `OS-2026-0${Date.now().toString().slice(-3)}`,
      vehicleId: vehicles[0]?.id || '',
      type: 'Preventiva',
      description: '',
      workshopName: 'Oficina Central TruckGestão',
      partsCost: 1500,
      laborCost: 600,
      status: 'Agendada',
      dateScheduled: new Date().toISOString().slice(0, 10),
      odometer: 160000,
      priority: 'Alta',
      mechanicNotes: '',
    });
  };

  const handleStatusToggle = (order: MaintenanceOrder, newStatus: MaintenanceStatus) => {
    onUpdateMaintenanceOrder({
      ...order,
      status: newStatus,
      dateCompleted: newStatus === 'Concluída' ? new Date().toISOString().slice(0, 10) : order.dateCompleted,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Maintenance Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Ordens em Andamento / Agendadas</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-400">
              {activeOrdersCount}
            </span>
            <span className="text-xs text-slate-400">serviços</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Paradas programadas e socorro mecânico
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Investimento em Manutenção</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              R$ {totalSpentInMaintenance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Peças genuínas e mão de obra credenciada
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">OS Concluídas</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
              {completedOrdersCount}
            </span>
            <span className="text-xs text-slate-400">liberações</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Revisões preventivas cumpridas no prazo
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Conformidade Cronotacógrafo</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-blue-400">
              100%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Todos os certificados Inmetro válidos
          </div>
        </div>
      </div>

      {/* Action Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por OS, descrição ou oficina..."
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
            <option value="Agendada">Agendada</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluída">Concluída</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="hidden md:block bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value="Preventiva">Preventiva</option>
            <option value="Corretiva">Corretiva</option>
            <option value="Pneus">Pneus & Geometria</option>
            <option value="Tacógrafo / ANTT">Tacógrafo / ANTT</option>
          </select>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Abrir Ordem de Serviço</span>
        </button>
      </div>

      {/* Orders List / Cards */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const truck = vehicles.find((v) => v.id === order.vehicleId);

          const priorityBadge = 
            order.priority === 'Crítica' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
            order.priority === 'Alta' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
            'bg-slate-800 text-slate-300 border-slate-700';

          return (
            <div
              key={order.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {order.orderNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${priorityBadge}`}>
                    Prioridade {order.priority}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium">
                    {order.type}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Programado para: {order.dateScheduled.split('-').reverse().join('/')}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {truck && <MercosulPlate plate={truck.plate} size="sm" />}
                  <span className="text-sm font-semibold text-slate-100">
                    {truck ? `${truck.brand} ${truck.model}` : 'Veículo não vinculado'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({order.odometer.toLocaleString('pt-BR')} km)
                  </span>
                </div>

                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  {order.description}
                </p>

                {order.mechanicNotes && (
                  <div className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="font-semibold text-slate-300">Parecer da Oficina ({order.workshopName}): </span>
                    {order.mechanicNotes}
                  </div>
                )}
              </div>

              {/* Status and Cost summary */}
              <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Custo Total (Peças + Mão de Obra)</div>
                  <div className="text-base font-bold font-mono text-slate-100">
                    R$ {order.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Peças: R$ {order.partsCost.toFixed(0)} · Mão de obra: R$ {order.laborCost.toFixed(0)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusToggle(order, e.target.value as MaintenanceStatus)}
                    className={`text-xs font-semibold rounded px-2.5 py-1.5 border cursor-pointer focus:outline-none ${
                      order.status === 'Concluída' ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' :
                      order.status === 'Em Andamento' ? 'bg-amber-950/80 border-amber-600 text-amber-300' :
                      'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    <option value="Agendada">Agendada</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>

                  <button
                    onClick={() => onDeleteMaintenanceOrder(order.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Excluir OS"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Abrir Ordem de Serviço */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="Abrir Nova Ordem de Serviço (OS)"
        subtitle="Agendamento de revisão preventiva, corretiva ou manutenção de pneus"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Número da OS
              </label>
              <input
                type="text"
                readOnly
                value={newOrder.orderNumber}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Caminhão / Veículo *
              </label>
              <select
                required
                value={newOrder.vehicleId}
                onChange={(e) => {
                  const v = vehicles.find((item) => item.id === e.target.value);
                  setNewOrder({
                    ...newOrder,
                    vehicleId: e.target.value,
                    odometer: v ? v.currentKm : newOrder.odometer,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.brand} {v.model} ({v.currentKm} km)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tipo de Manutenção
              </label>
              <select
                value={newOrder.type}
                onChange={(e) => setNewOrder({ ...newOrder, type: e.target.value as MaintenanceType })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Preventiva">Preventiva (Revisão Periódica)</option>
                <option value="Corretiva">Corretiva (Falha mecânica)</option>
                <option value="Pneus">Pneus & Geometria</option>
                <option value="Elétrica">Elétrica & Injeção Eletrônica</option>
                <option value="Tacógrafo / ANTT">Tacógrafo / ANTT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Prioridade
              </label>
              <select
                value={newOrder.priority}
                onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value as Priority })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica (Veículo parado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Data Prevista
              </label>
              <input
                type="date"
                required
                value={newOrder.dateScheduled}
                onChange={(e) => setNewOrder({ ...newOrder, dateScheduled: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descrição dos Serviços e Peças *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Troca de óleo de motor 15W40, filtro de óleo, filtro de combustível racor, verificação de folga na quinta roda e pastilhas de freio..."
              value={newOrder.description}
              onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Oficina / Concessionária
              </label>
              <input
                type="text"
                value={newOrder.workshopName}
                onChange={(e) => setNewOrder({ ...newOrder, workshopName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Custo de Peças (R$)
              </label>
              <input
                type="number"
                min="0"
                value={newOrder.partsCost}
                onChange={(e) => setNewOrder({ ...newOrder, partsCost: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Custo de Mão de Obra (R$)
              </label>
              <input
                type="number"
                min="0"
                value={newOrder.laborCost}
                onChange={(e) => setNewOrder({ ...newOrder, laborCost: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Previsto da OS:</span>
            <span className="text-lg font-bold font-mono text-amber-400">
              R$ {(Number(newOrder.partsCost) + Number(newOrder.laborCost)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
            >
              Criar Ordem de Serviço
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
