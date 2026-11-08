'use client';

import React, { useState, useEffect } from 'react';
import { Vehicle, Driver } from '@/types/fleet';
import { MercosulPlate } from './MercosulPlate';
import { 
  Compass, 
  Gauge, 
  Fuel, 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  Radio, 
  Thermometer, 
  Play, 
  Pause 
} from 'lucide-react';

interface LiveTelemetryMapProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

// Normalized map points for Brazil freight corridors in our stylized vector map
interface MapCoordinate {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
}

// Hubs in Brazil
const HUBS: Record<string, { name: string; state: string; coords: MapCoordinate }> = {
  'rondonopolis': { name: 'Rondonópolis', state: 'MT', coords: { x: 44, y: 48 } },
  'santos': { name: 'Santos (Porto)', state: 'SP', coords: { x: 67, y: 72 } },
  'campinas': { name: 'Campinas', state: 'SP', coords: { x: 64, y: 68 } },
  'curitiba': { name: 'Curitiba', state: 'PR', coords: { x: 58, y: 78 } },
  'paranagua': { name: 'Paranaguá (Porto)', state: 'PR', coords: { x: 61, y: 79 } },
  'betim': { name: 'Betim', state: 'MG', coords: { x: 70, y: 60 } },
  'itajai': { name: 'Itajaí (Porto)', state: 'SC', coords: { x: 59, y: 84 } },
  'rioverde': { name: 'Rio Verde', state: 'GO', coords: { x: 51, y: 55 } },
  'uberlandia': { name: 'Uberlândia', state: 'MG', coords: { x: 58, y: 58 } },
};

export function LiveTelemetryMap({ vehicles, drivers, onSelectVehicle }: LiveTelemetryMapProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);

  // Active vehicle
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  const driver = drivers.find((d) => d.id === selectedVehicle?.currentDriverId);

  // Live simulation ticker for moving needles / speeds
  useEffect(() => {
    if (!isSimulatingGps) return;
    const interval = setInterval(() => {
      setSimTick((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [isSimulatingGps]);

  // Derived simulation jitter for active vehicles
  const currentSpeed = selectedVehicle?.status === 'Em Viagem'
    ? Math.max(50, Math.min(88, selectedVehicle.telemetry.speedKmH + ((simTick % 5) - 2) * 2))
    : 0;

  const currentRpm = selectedVehicle?.status === 'Em Viagem'
    ? Math.max(1100, Math.min(1500, selectedVehicle.telemetry.rpm + ((simTick % 4) - 2) * 30))
    : selectedVehicle?.status === 'Em Carga/Descarga' ? 650 : 0;

  // Compute map position coordinate for vehicle based on its city
  const getVehicleCoordinates = (v: Vehicle, index: number): MapCoordinate => {
    const city = v.currentCity.toLowerCase();
    if (city.includes('rondon')) return { x: 44 + (index % 3) * 1.5, y: 48 + (index % 2) * 1.5 };
    if (city.includes('curitiba')) return { x: 58, y: 78 };
    if (city.includes('campinas')) return { x: 64, y: 68 };
    if (city.includes('betim')) return { x: 70, y: 60 };
    if (city.includes('itajai')) return { x: 59, y: 84 };
    if (city.includes('rio verde')) return { x: 51, y: 55 };
    if (city.includes('santos')) return { x: 67, y: 72 };
    return { x: 55 + (index * 4), y: 65 + (index * 3) };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Module Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Telemetria & Rastreamento em Tempo Real
            </h3>
            <p className="text-xs text-slate-400">
              Posicionamento GPS via satélite e barramento CAN Bus dos cavalos mecânicos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSimulatingGps(!isSimulatingGps)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isSimulatingGps
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
            title="Pausar ou retomar atualização contínua de telemetria"
          >
            {isSimulatingGps ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulatingGps ? 'Transmissão Ativa (3s)' : 'Pausado'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Cartographic Visualizer Canvas (8 cols) */}
        <div className="lg:col-span-8 p-4 relative bg-slate-950 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          {/* Legend / Status Overlay */}
          <div className="flex items-center justify-between gap-4 z-10 text-xs">
            <div className="flex items-center gap-2 text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Em Viagem
              <span className="text-slate-600">·</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Carga/Descarga
              <span className="text-slate-600">·</span>
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> Em Oficina
              <span className="text-slate-600">·</span>
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> Disponível
            </div>
            <div className="text-slate-400 text-[11px] font-mono tabular-nums">
              GPS Atualizado: {selectedVehicle?.telemetry.lastGpsUpdate || 'Ao vivo'}
            </div>
          </div>

          {/* Interactive Stylized Brazil Map Frame */}
          <div className="relative w-full h-[360px] my-2 rounded-lg bg-slate-950/80 border border-slate-900 overflow-hidden flex items-center justify-center">
            {/* Ambient Grid Lines */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
                backgroundSize: '28px 28px'
              }}
            />

            {/* Stylized Brazilian Freight Arteries (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Route Lines: Rondonópolis -> Santos (BR-364 / BR-050 / SP-348) */}
              <line x1="44" y1="48" x2="51" y2="55" stroke="#334155" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
              <line x1="51" y1="55" x2="58" y2="58" stroke="#334155" strokeWidth="0.8" />
              <line x1="58" y1="58" x2="64" y2="68" stroke="#334155" strokeWidth="1" />
              <line x1="64" y1="68" x2="67" y2="72" stroke="#f59e0b" strokeWidth="1.2" /> {/* Highlighted freight vein to port */}

              {/* Route Lines: Curitiba -> Paranaguá (BR-277) */}
              <line x1="58" y1="78" x2="61" y2="79" stroke="#10b981" strokeWidth="1.2" />
              {/* Route Lines: Curitiba -> Itajaí (BR-101) */}
              <line x1="58" y1="78" x2="59" y2="84" stroke="#334155" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
              {/* Route Lines: Campinas -> Betim (Fernão Dias BR-381) */}
              <line x1="64" y1="68" x2="70" y2="60" stroke="#334155" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
            </svg>

            {/* Hubs Markers */}
            {Object.entries(HUBS).map(([key, hub]) => (
              <div
                key={key}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center"
                style={{ left: `${hub.coords.x}%`, top: `${hub.coords.y}%` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-auto" />
                <span className="text-[9px] text-slate-500 font-sans tracking-tight block whitespace-nowrap mt-0.5">
                  {hub.name}
                </span>
              </div>
            ))}

            {/* Vehicle Interactive Pins */}
            {vehicles.map((v, idx) => {
              const coords = getVehicleCoordinates(v, idx);
              const isSelected = v.id === selectedVehicleId;
              const statusColor = 
                v.status === 'Em Viagem' ? 'bg-emerald-500 text-emerald-950 border-emerald-300' :
                v.status === 'Em Carga/Descarga' ? 'bg-amber-500 text-amber-950 border-amber-300' :
                v.status === 'Em Manutenção' ? 'bg-rose-500 text-rose-950 border-rose-300' :
                'bg-slate-500 text-slate-950 border-slate-300';

              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVehicleId(v.id);
                    if (onSelectVehicle) onSelectVehicle(v);
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 cursor-pointer focus:outline-none z-20 ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-115'
                  }`}
                  style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                  title={`${v.plate} · ${v.model} (${v.status})`}
                >
                  <div className={`relative px-2 py-1 rounded shadow-md border text-[11px] font-bold font-mono tracking-wider flex items-center gap-1 transition-all ${statusColor} ${
                    isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950' : ''
                  }`}>
                    <Navigation className={`w-3 h-3 ${v.status === 'Em Viagem' ? 'rotate-45' : ''}`} />
                    <span>{v.plate}</span>
                  </div>
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 pointer-events-none bg-slate-900 border border-slate-700 text-slate-200 text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-40">
                    <div className="font-semibold">{v.brand} {v.model}</div>
                    <div className="text-slate-400">{v.currentCity} · {v.status === 'Em Viagem' ? `${v.telemetry.speedKmH} km/h` : v.status}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Select Bar for all vehicles */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 z-10 border-t border-slate-900">
            <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">Caminhões:</span>
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVehicleId(v.id);
                  if (onSelectVehicle) onSelectVehicle(v);
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium whitespace-nowrap transition-colors border ${
                  v.id === selectedVehicleId
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {v.plate} ({v.brand})
              </button>
            ))}
          </div>
        </div>

        {/* Selected Vehicle Telemetry Console (4 cols) */}
        <div className="lg:col-span-4 p-5 bg-slate-900/95 flex flex-col justify-between space-y-4">
          <div>
            {/* Vehicle Header Card */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <MercosulPlate plate={selectedVehicle?.plate || 'BRA2E19'} size="md" />
                <h4 className="text-sm font-semibold text-slate-100 mt-2">
                  {selectedVehicle?.brand} {selectedVehicle?.model}
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedVehicle?.category} · Ano {selectedVehicle?.year}
                </p>
              </div>

              <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                selectedVehicle?.status === 'Em Viagem' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                selectedVehicle?.status === 'Em Carga/Descarga' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                selectedVehicle?.status === 'Em Manutenção' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {selectedVehicle?.status}
              </span>
            </div>

            {/* Current Route & Driver */}
            <div className="py-3 border-b border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Posição Atual:
                </span>
                <span className="font-medium text-right">{selectedVehicle?.currentCity}</span>
              </div>
              {selectedVehicle?.destinationCity && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-400" /> Destino:
                  </span>
                  <span className="font-medium text-right">{selectedVehicle?.destinationCity}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-300 pt-1">
                <span className="text-slate-400">Motorista Atribuído:</span>
                <span className="font-semibold text-slate-200">
                  {driver ? driver.name : 'Nenhum motorista alocado'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Carga Transportada:</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {selectedVehicle?.currentLoadTons} ton / {selectedVehicle?.maxCapacityTons} ton máx
                </span>
              </div>
            </div>

            {/* CAN Bus Live Telemetry Gauges */}
            <div className="pt-3 space-y-3">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Diagnóstico CAN Bus / Sensores
              </div>

              {/* Speed & RPM Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" /> Velocidade
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-100">
                    {currentSpeed} <span className="text-xs text-slate-400 font-normal">km/h</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (currentSpeed / 90) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-amber-400" /> Rotação Motor
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-100">
                    {currentRpm} <span className="text-xs text-slate-400 font-normal">RPM</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (currentRpm / 2200) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Fuel Level & Engine Temperature */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-emerald-400" /> Combustível
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-100">
                    {selectedVehicle?.telemetry.fuelLevelPercent}%
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        (selectedVehicle?.telemetry.fuelLevelPercent || 0) < 25 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedVehicle?.telemetry.fuelLevelPercent || 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Temp. Motor
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-100">
                    {selectedVehicle?.telemetry.engineTempC}°C
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Faixa normal (80° - 95°)
                  </div>
                </div>
              </div>

              {/* Critical Alert status */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Pressão de Pneus:</span>
                <span className={`font-semibold flex items-center gap-1 ${
                  selectedVehicle?.telemetry.tirePressureStatus === 'Normal' ? 'text-emerald-400' :
                  selectedVehicle?.telemetry.tirePressureStatus === 'Atenção' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {selectedVehicle?.telemetry.tirePressureStatus === 'Normal' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {selectedVehicle?.telemetry.tirePressureStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Odômetro: <strong className="text-slate-300 font-mono">{selectedVehicle?.currentKm.toLocaleString('pt-BR')} km</strong></span>
            <span>Média: <strong className="text-slate-300 font-mono">{selectedVehicle?.averageKmL} km/L</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
