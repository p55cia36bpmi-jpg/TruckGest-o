'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Fuel, 
  Wrench, 
  ClipboardCheck, 
  Calculator, 
  FileText,
  Radio,
  MapPin
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  activeVehiclesCount: number;
  totalAlertsCount: number;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  activeVehiclesCount,
  totalAlertsCount,
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'fleet', label: 'Frota de Veículos', icon: Truck, badge: activeVehiclesCount },
    { id: 'drivers', label: 'Motoristas & CNH', icon: Users },
    { id: 'fuel', label: 'Combustível & Arla', icon: Fuel },
    { id: 'maintenance', label: 'Oficina & Manutenção', icon: Wrench, alertBadge: totalAlertsCount },
    { id: 'checklist', label: 'Checklist Pré-Viagem', icon: ClipboardCheck },
    { id: 'calculator', label: 'Calculadora de Frete', icon: Calculator },
    { id: 'reports', label: 'Relatórios & DRE', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden lg:flex min-h-[calc(100vh-61px)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Módulos Operacionais
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.alertBadge && item.alertBadge > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold">
                  {item.alertBadge}
                </span>
              ) : item.badge !== undefined ? (
                <span className="text-[11px] font-mono text-slate-500 font-medium">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Footer Info in Sidebar */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Telemetria CAN
            </span>
            <span className="text-emerald-400 font-bold font-mono text-[10px]">CONECTADO</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Protocolo J1939 / GPS Satelital
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
          <span>TruckGestão Pro v2.4</span>
          <span>ANTT / Brasil</span>
        </div>
      </div>
    </aside>
  );
}
