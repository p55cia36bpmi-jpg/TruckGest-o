'use client';

import React, { useState } from 'react';
import { InspectionChecklist, Vehicle, Driver } from '@/types/fleet';
import { MercosulPlate } from './MercosulPlate';
import { Modal } from './Modal';
import { 
  ClipboardCheck, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Truck, 
  Calendar,
  Search,
  FileCheck2
} from 'lucide-react';

interface ChecklistModuleProps {
  checklists: InspectionChecklist[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onAddChecklist: (checklist: Omit<InspectionChecklist, 'id'>) => void;
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  onOpenModal?: () => void;
}

export function ChecklistModule({
  checklists,
  vehicles,
  drivers,
  onAddChecklist,
  isModalOpen: externalIsModalOpen,
  onCloseModal: externalOnCloseModal,
  onOpenModal: externalOnOpenModal,
}: ChecklistModuleProps) {
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

  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.id || '');
  const [odometer, setOdometer] = useState(vehicles[0]?.currentKm || 150000);
  const [notes, setNotes] = useState('');

  // Checklist 10 key items
  const [items, setItems] = useState({
    oilLevel: true,
    coolantLevel: true,
    tiresPressure: true,
    tiresTreadDepth: true,
    lightsAndBlinkers: true,
    brakesAirPressure: true,
    safetyKitExtinguisher: true,
    tachographTape: true,
    windshieldWipers: true,
    cargoLashing: true,
  });

  const checklistItemsMetadata: { key: keyof typeof items; label: string; desc: string }[] = [
    { key: 'oilLevel', label: 'Nível de Óleo do Motor', desc: 'Verificação na vareta medidora entre marcas MIN/MAX' },
    { key: 'coolantLevel', label: 'Líquido de Arrefecimento', desc: 'Nível do reservatório de expansão e tampa vedada' },
    { key: 'tiresPressure', label: 'Calibragem dos Pneus', desc: 'Pressão PSI adequada conforme carga nos eixos' },
    { key: 'tiresTreadDepth', label: 'Profundidade dos Sulcos', desc: 'Sulco de banda de rodagem acima de 1.6mm (limite TWI)' },
    { key: 'lightsAndBlinkers', label: 'Iluminação & Sinalização', desc: 'Farol alto/baixo, lanternas traseiras, setas e freio' },
    { key: 'brakesAirPressure', label: 'Pressão Pneumática de Freios', desc: 'Manômetro de ar atingindo pressão nominal de trabalho' },
    { key: 'safetyKitExtinguisher', label: 'Extintor & Kit Segurança', desc: 'Extintor com manômetro no verde e lacre inviolado' },
    { key: 'tachographTape', label: 'Disco / Fita de Tacógrafo', desc: 'Tacógrafo aferido com disco/fita devidamente inserido' },
    { key: 'windshieldWipers', label: 'Limpadores de Para-brisa', desc: 'Palhetas íntegras e reservatório de água abastecido' },
    { key: 'cargoLashing', label: 'Amarração da Carga / Engate', desc: 'Cintas, catracas e travamento seguro da quinta roda' },
  ];

  const handleToggleItem = (key: keyof typeof items) => {
    setItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();

    // Determine status
    const allPassed = Object.values(items).every((val) => val === true);
    const criticalFails = !items.brakesAirPressure || !items.tachographTape || !items.tiresPressure;
    
    let status: 'Aprovado' | 'Aprovado com Ressalvas' | 'Reprovado' = 'Aprovado';
    if (criticalFails) {
      status = 'Reprovado';
    } else if (!allPassed) {
      status = 'Aprovado com Ressalvas';
    }

    onAddChecklist({
      vehicleId: selectedVehicleId,
      driverId: selectedDriverId,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status,
      odometer,
      items,
      notes,
    });

    setModalOpen(false);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Overview & Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
            Checklist Pré-Viagem Digital (Inspeção Veicular)
          </h3>
          <p className="text-xs text-slate-400">
            Garantia de segurança operacional e liberação obrigatória de cavalos e carretas antes da viagem
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Vistoria de Saída</span>
        </button>
      </div>

      {/* Historical Checklists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checklists.map((chk) => {
          const truck = vehicles.find((v) => v.id === chk.vehicleId);
          const driver = drivers.find((d) => d.id === chk.driverId);

          const statusStyles = 
            chk.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
            chk.status === 'Aprovado com Ressalvas' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
            'bg-rose-500/10 text-rose-400 border-rose-500/30';

          const passedItemsCount = Object.values(chk.items).filter(Boolean).length;

          return (
            <div
              key={chk.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {truck && <MercosulPlate plate={truck.plate} size="sm" />}
                    <span className="font-semibold text-slate-100 text-xs">
                      {truck ? `${truck.brand} ${truck.model}` : 'Veículo'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Condutor: <strong className="text-slate-200">{driver?.name || 'Não informado'}</strong>
                  </div>
                </div>

                <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusStyles}`}>
                  {chk.status}
                </span>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between border-y border-slate-800 py-2">
                <span>Data: <strong className="text-slate-300 font-mono">{chk.date}</strong></span>
                <span>Odômetro: <strong className="text-slate-300 font-mono">{chk.odometer.toLocaleString('pt-BR')} km</strong></span>
                <span>Itens em dia: <strong className="text-emerald-400 font-mono">{passedItemsCount} / 10</strong></span>
              </div>

              {chk.notes && (
                <div className="text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                  <span className="font-semibold text-slate-400">Observações: </span>
                  {chk.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Nova Vistoria / Checklist */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="Checklist Pré-Viagem de Inspeção Veicular"
        subtitle="Verificação dos 10 itens obrigatórios de segurança antes de liberar o veículo para o trajeto"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateChecklist} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Veículo *
              </label>
              <select
                required
                value={selectedVehicleId}
                onChange={(e) => {
                  setSelectedVehicleId(e.target.value);
                  const v = vehicles.find((item) => item.id === e.target.value);
                  if (v) setOdometer(v.currentKm);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
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
                Motorista Responsável *
              </label>
              <select
                required
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.baseCity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Odômetro de Saída (km) *
            </label>
            <input
              type="number"
              required
              value={odometer}
              onChange={(e) => setOdometer(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Checklist 10 items inspection checklist */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Itens Obrigatórios de Vistoria
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {checklistItemsMetadata.map(({ key, label, desc }) => {
                const isChecked = items[key];
                return (
                  <div
                    key={key}
                    onClick={() => handleToggleItem(key)}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked 
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200' 
                        : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-100">{label}</div>
                      <div className="text-[11px] text-slate-400">{desc}</div>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      {isChecked ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="w-4 h-4" /> OK
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400">
                          <XCircle className="w-4 h-4" /> REPROVADO
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Observações / Ressalvas do Condutor ou Mecânico
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Pneu calibrado na saída, estepe verificado com 110 PSI..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
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
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold"
            >
              Finalizar e Registrar Vistoria
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
