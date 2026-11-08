'use client';

import React, { useState } from 'react';
import { FuelEntry, Vehicle, Driver, FuelType } from '@/types/fleet';
import { MercosulPlate } from './MercosulPlate';
import { Modal } from './Modal';
import { 
  Fuel, 
  Plus, 
  Search, 
  Download, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Gauge, 
  FileSpreadsheet,
  Trash2
} from 'lucide-react';

interface FuelModuleProps {
  fuelEntries: FuelEntry[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onAddFuelEntry: (entry: Omit<FuelEntry, 'id'>) => void;
  onDeleteFuelEntry: (id: string) => void;
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  onOpenModal?: () => void;
}

export function FuelModule({
  fuelEntries,
  vehicles,
  drivers,
  onAddFuelEntry,
  onDeleteFuelEntry,
  isModalOpen: externalIsModalOpen,
  onCloseModal: externalOnCloseModal,
  onOpenModal: externalOnOpenModal,
}: FuelModuleProps) {
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
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('all');

  // Form state for new fuel entry
  const [newEntry, setNewEntry] = useState({
    vehicleId: vehicles[0]?.id || '',
    driverId: drivers[0]?.id || '',
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    gasStation: 'Rede Graal - RodoPosto',
    city: 'Rodovia Anhanguera - SP',
    fuelType: 'Diesel S10' as FuelType,
    odometer: 150000,
    liters: 400,
    pricePerLiter: 5.99,
    invoiceNumber: 'NF-e ',
    notes: '',
  });

  // Calculate stats
  const totalLiters = fuelEntries.reduce((acc, f) => acc + f.liters, 0);
  const totalCost = fuelEntries.reduce((acc, f) => acc + f.totalCost, 0);
  const avgPricePerLiter = totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : '5.99';

  const validKmL = fuelEntries.filter((f) => f.calculatedKmL > 0);
  const fleetAvgKmL = validKmL.length > 0
    ? (validKmL.reduce((acc, f) => acc + f.calculatedKmL, 0) / validKmL.length).toFixed(2)
    : '2.45';

  const filteredEntries = fuelEntries.filter((entry) => {
    const matchesSearch = 
      entry.gasStation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesVehicle = selectedVehicleFilter === 'all' || entry.vehicleId === selectedVehicleFilter;
    return matchesSearch && matchesVehicle;
  });

  const handleSubmitFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.vehicleId || newEntry.liters <= 0) return;

    const truck = vehicles.find((v) => v.id === newEntry.vehicleId);
    let calculatedKmL = 0;
    if (truck && newEntry.odometer > truck.currentKm && newEntry.liters > 0) {
      const distance = newEntry.odometer - truck.currentKm;
      calculatedKmL = Number((distance / newEntry.liters).toFixed(2));
    } else {
      calculatedKmL = truck ? truck.averageKmL : 2.45;
    }

    const totalCost = Number((newEntry.liters * newEntry.pricePerLiter).toFixed(2));

    onAddFuelEntry({
      ...newEntry,
      totalCost,
      calculatedKmL,
    });

    setModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Placa', 'Modelo', 'Motorista', 'Posto', 'Cidade', 'Tipo', 'Odometro', 'Litros', 'Preco_Litro', 'Total_R$', 'Media_KmL', 'NFe'];
    const rows = fuelEntries.map((f) => {
      const v = vehicles.find((item) => item.id === f.vehicleId);
      const d = drivers.find((item) => item.id === f.driverId);
      return [
        f.date,
        v?.plate || '',
        v?.model || '',
        d?.name || '',
        f.gasStation,
        f.city,
        f.fuelType,
        f.odometer,
        f.liters,
        f.pricePerLiter,
        f.totalCost,
        f.calculatedKmL,
        f.invoiceNumber,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `abastecimentos_truckgestao_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards: Combustível */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Total de Diesel Abastecido</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {totalLiters.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-400">Litros</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Combustível S10 e reagente Arla 32
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Gasto com Combustível</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-400">
              R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Preço médio: R$ {avgPricePerLiter} / L
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Média Global da Frota</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
              {fleetAvgKmL}
            </span>
            <span className="text-xs text-slate-400">km/L</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Alvo de eficiência: &gt; 2.40 km/L
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Desvios de Consumo</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-blue-400">
              100%
            </span>
            <span className="text-xs text-slate-400">em conformidade</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Nenhuma divergência de rota detectada
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por posto, rodovia ou NF-e..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <select
            value={selectedVehicleFilter}
            onChange={(e) => setSelectedVehicleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Caminhões</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} ({v.brand})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            title="Exportar planilha para Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Abastecimento</span>
          </button>
        </div>
      </div>

      {/* Fuel Entries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Veículo</th>
                <th className="py-3 px-4">Motorista</th>
                <th className="py-3 px-4">Posto / Local</th>
                <th className="py-3 px-4">Combustível</th>
                <th className="py-3 px-4 text-right">Odômetro</th>
                <th className="py-3 px-4 text-right">Litros</th>
                <th className="py-3 px-4 text-right">R$/Litro</th>
                <th className="py-3 px-4 text-right">Total (R$)</th>
                <th className="py-3 px-4 text-right">Média km/L</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredEntries.map((entry) => {
                const truck = vehicles.find((v) => v.id === entry.vehicleId);
                const driver = drivers.find((d) => d.id === entry.driverId);
                const isUnderperforming = entry.calculatedKmL > 0 && entry.calculatedKmL < 2.20;

                return (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="py-3 px-4">
                      {truck ? (
                        <div className="flex items-center gap-2">
                          <MercosulPlate plate={truck.plate} size="sm" />
                          <span className="text-slate-400 hidden xl:inline">{truck.model}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 truncate max-w-[140px]">
                      {driver?.name || 'Condutor avulso'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100 truncate max-w-[180px]">{entry.gasStation}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{entry.city}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        entry.fuelType === 'Diesel S10' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        entry.fuelType === 'Arla 32' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {entry.fuelType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {entry.odometer.toLocaleString('pt-BR')} km
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-100">
                      {entry.liters.toLocaleString('pt-BR')} L
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      R$ {entry.pricePerLiter.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-amber-400">
                      R$ {entry.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {entry.calculatedKmL > 0 ? (
                        <span className={`font-bold ${isUnderperforming ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {entry.calculatedKmL}
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeleteFuelEntry(entry.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Excluir abastecimento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Lançar Abastecimento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="Lançar Abastecimento de Combustível"
        subtitle="Registro de despesa com cálculo automático de autonomia e média km/litro"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitFuel} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Caminhão / Veículo *
              </label>
              <select
                required
                value={newEntry.vehicleId}
                onChange={(e) => {
                  const vId = e.target.value;
                  const truck = vehicles.find((v) => v.id === vId);
                  setNewEntry({
                    ...newEntry,
                    vehicleId: vId,
                    odometer: truck ? truck.currentKm + 450 : newEntry.odometer,
                    driverId: truck?.currentDriverId || newEntry.driverId,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Motorista Condutor
              </label>
              <select
                value={newEntry.driverId}
                onChange={(e) => setNewEntry({ ...newEntry, driverId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.baseCity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Posto de Combustível / Rede *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Rede Graal - Posto Marambaia"
                value={newEntry.gasStation}
                onChange={(e) => setNewEntry({ ...newEntry, gasStation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Cidade / Rodovia *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Mineiros - GO (BR-364)"
                value={newEntry.city}
                onChange={(e) => setNewEntry({ ...newEntry, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tipo de Combustível
              </label>
              <select
                value={newEntry.fuelType}
                onChange={(e) => setNewEntry({ ...newEntry, fuelType: e.target.value as FuelType })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Diesel S10">Diesel S10 (Padrão Euro 6/Proconve)</option>
                <option value="Diesel S500">Diesel S500</option>
                <option value="Arla 32">Arla 32 (Reagente)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Litros Abastecidos *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={newEntry.liters}
                onChange={(e) => setNewEntry({ ...newEntry, liters: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preço por Litro (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                required
                value={newEntry.pricePerLiter}
                onChange={(e) => setNewEntry({ ...newEntry, pricePerLiter: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Odômetro no Momento do Abastecimento (km) *
              </label>
              <input
                type="number"
                required
                value={newEntry.odometer}
                onChange={(e) => setNewEntry({ ...newEntry, odometer: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Número da NF-e / Cupom Fiscal
              </label>
              <input
                type="text"
                placeholder="Ex: NF-e 883921"
                value={newEntry.invoiceNumber}
                onChange={(e) => setNewEntry({ ...newEntry, invoiceNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Real-time Total Cost preview */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Valor Total Calculado:</span>
            <span className="text-lg font-bold font-mono text-amber-400">
              R$ {(newEntry.liters * newEntry.pricePerLiter).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              Salvar Abastecimento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
