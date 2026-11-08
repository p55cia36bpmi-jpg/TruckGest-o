'use client';

import React, { useState } from 'react';
import { Vehicle } from '@/types/fleet';
import { 
  Calculator, 
  MapPin, 
  DollarSign, 
  Truck, 
  Fuel, 
  TrendingUp, 
  ShieldCheck, 
  Percent, 
  RotateCcw,
  Navigation
} from 'lucide-react';

interface FreightCalculatorModuleProps {
  vehicles: Vehicle[];
}

interface RoutePreset {
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  tollEstimate: number;
  tripDays: number;
  defaultTons: number;
}

const PRESET_ROUTES: RoutePreset[] = [
  {
    name: 'Corredor Grãos MT x Santos (BR-163 / BR-364)',
    origin: 'Rondonópolis - MT',
    destination: 'Porto de Santos - SP',
    distanceKm: 1540,
    tollEstimate: 1420.00,
    tripDays: 4,
    defaultTons: 32.0,
  },
  {
    name: 'Descida da Serra do Mar (BR-277 Exportação)',
    origin: 'Curitiba - PR',
    destination: 'Porto de Paranaguá - PR',
    distanceKm: 98,
    tollEstimate: 145.00,
    tripDays: 1,
    defaultTons: 45.0,
  },
  {
    name: 'Eixo Industrial Fernão Dias (BR-381)',
    origin: 'Campinas - SP',
    destination: 'Betim / Belo Horizonte - MG',
    distanceKm: 580,
    tollEstimate: 280.00,
    tripDays: 2,
    defaultTons: 25.0,
  },
  {
    name: 'Agronegócio GO x Triângulo Mineiro',
    origin: 'Rio Verde - GO',
    destination: 'Uberlândia - MG',
    distanceKm: 285,
    tollEstimate: 195.00,
    tripDays: 1,
    defaultTons: 50.0,
  },
];

export function FreightCalculatorModule({ vehicles }: FreightCalculatorModuleProps) {
  const [origin, setOrigin] = useState('Rondonópolis - MT');
  const [destination, setDestination] = useState('Porto de Santos - SP');
  const [distanceKm, setDistanceKm] = useState(1540);
  const [cargoTons, setCargoTons] = useState(32);
  const [avgKmL, setAvgKmL] = useState(2.45);
  const [dieselPrice, setDieselPrice] = useState(5.99);
  const [tollCost, setTollCost] = useState(1420);
  const [tripDays, setTripDays] = useState(4);
  const [driverDailyRate, setDriverDailyRate] = useState(250); // R$ 250/dia
  const [profitMargin, setProfitMargin] = useState(22); // 22% margem

  const handleApplyPreset = (route: RoutePreset) => {
    setOrigin(route.origin);
    setDestination(route.destination);
    setDistanceKm(route.distanceKm);
    setTollCost(route.tollEstimate);
    setTripDays(route.tripDays);
    setCargoTons(route.defaultTons);
  };

  // Calculations
  const totalFuelLiters = distanceKm > 0 && avgKmL > 0 ? distanceKm / avgKmL : 0;
  const totalDieselCost = totalFuelLiters * dieselPrice;
  // Arla 32 is approx 5% of diesel volume @ ~R$ 3.20/L
  const totalArlaLiters = totalFuelLiters * 0.05;
  const totalArlaCost = totalArlaLiters * 3.20;

  const totalDriverCost = tripDays * driverDailyRate;
  // Wear and tear estimation (pneus, amortecedores, revisões periódicas ~ R$ 0,45 / km)
  const maintenanceDepreciationCost = distanceKm * 0.48;

  // Direct Trip Operational Cost
  const totalOperationalCost = totalDieselCost + totalArlaCost + tollCost + totalDriverCost + maintenanceDepreciationCost;

  // Suggested Commercial Freight
  const marginMultiplier = 1 + (profitMargin / 100);
  const suggestedFreightValue = totalOperationalCost * marginMultiplier;
  const netEstimatedProfit = suggestedFreightValue - totalOperationalCost;

  const costPerKm = distanceKm > 0 ? totalOperationalCost / distanceKm : 0;
  const freightPerTon = cargoTons > 0 ? suggestedFreightValue / cargoTons : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-400" />
          Calculadora de Frete, Diesel e Custos de Viagem
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Simule a composição completa de custos operacionais (combustível, pedágios, diárias e depreciação) para formar o preço de frete rentável
        </p>

        {/* Route Presets */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-medium block mb-2">
            Rotas Comerciais Rápidas:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_ROUTES.map((route) => (
              <button
                key={route.name}
                onClick={() => handleApplyPreset(route)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 text-xs text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <Navigation className="w-3 h-3 text-amber-400" />
                <span>{route.name}</span>
                <span className="text-slate-500 font-mono">({route.distanceKm} km)</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Inputs (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 pb-2 border-b border-slate-800">
            Parâmetros da Rota e Carga
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Origem da Carga
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Destino / Descarregamento
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Distância Total (km)
              </label>
              <input
                type="number"
                min="1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Peso da Carga (ton)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={cargoTons}
                onChange={(e) => setCargoTons(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Duração da Viagem (dias)
              </label>
              <input
                type="number"
                min="1"
                value={tripDays}
                onChange={(e) => setTripDays(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 pt-3 pb-2 border-b border-slate-800">
            Custos Operacionais Unitários
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Consumo Médio (km/L)
              </label>
              <input
                type="number"
                step="0.05"
                value={avgKmL}
                onChange={(e) => setAvgKmL(parseFloat(e.target.value) || 2.45)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preço Diesel S10 (R$/L)
              </label>
              <input
                type="number"
                step="0.01"
                value={dieselPrice}
                onChange={(e) => setDieselPrice(parseFloat(e.target.value) || 5.99)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Pedágios Estimados (R$)
              </label>
              <input
                type="number"
                step="10"
                value={tollCost}
                onChange={(e) => setTollCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Diária do Motorista (R$/dia)
              </label>
              <input
                type="number"
                step="10"
                value={driverDailyRate}
                onChange={(e) => setDriverDailyRate(parseFloat(e.target.value) || 250)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Margem de Lucro Alvo (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={profitMargin}
                onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 20)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Pricing Summary & Profit Margin (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 pb-2 border-b border-slate-800">
              Resultado da Cotação de Frete
            </h4>

            {/* Commercial Suggested Freight Box */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mt-3">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                Valor Sugerido do Frete (Comercial)
              </span>
              <div className="text-3xl font-bold font-mono text-slate-100 mt-1">
                R$ {suggestedFreightValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>R$ {freightPerTon.toFixed(2)} por Tonelada</span>
                <span className="font-semibold text-emerald-400">Margem {profitMargin}%</span>
              </div>
            </div>

            {/* Detailed Cost Table */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" /> Diesel S10 ({totalFuelLiters.toFixed(0)} L):
                </span>
                <span className="font-mono font-semibold text-slate-100">
                  R$ {totalDieselCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-400">Reagente Arla 32 ({totalArlaLiters.toFixed(0)} L):</span>
                <span className="font-mono font-semibold text-slate-100">
                  R$ {totalArlaCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-400">Pedágios nas Rodovias:</span>
                <span className="font-mono font-semibold text-slate-100">
                  R$ {tollCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-400">Diárias do Condutor ({tripDays} dias):</span>
                <span className="font-mono font-semibold text-slate-100">
                  R$ {totalDriverCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-400">Provisão de Manutenção/Pneus (R$ 0,48/km):</span>
                <span className="font-mono font-semibold text-slate-100">
                  R$ {maintenanceDepreciationCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Total Break-Even Cost */}
              <div className="flex justify-between py-2 text-xs bg-slate-950 p-2 rounded-lg border border-slate-800 font-bold">
                <span className="text-slate-300">Custo Total de Operação:</span>
                <span className="font-mono text-slate-100">
                  R$ {totalOperationalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Net Profit */}
              <div className="flex justify-between py-2 text-xs bg-emerald-950/20 p-2 rounded-lg border border-emerald-800/30 font-bold">
                <span className="text-emerald-400">Lucro Líquido Estimado:</span>
                <span className="font-mono text-emerald-400">
                  + R$ {netEstimatedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800 flex justify-between">
            <span>Custo por Quilômetro: <strong className="text-slate-300 font-mono">R$ {costPerKm.toFixed(2)}/km</strong></span>
            <span>Conforme tabela de referência ANTT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
