'use client';

import React from 'react';
import { Truck, Plus } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onNavigateTab: (tabId: string) => void;
  onQuickAction: () => void;
}

export function Navbar({ activeTab, onNavigateTab, onQuickAction }: NavbarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Visão Geral' },
    { id: 'fleet', label: 'Frota' },
    { id: 'drivers', label: 'Motoristas' },
    { id: 'fuel', label: 'Abastecimento' },
    { id: 'maintenance', label: 'Oficina' },
    { id: 'reports', label: 'Relatórios' },
  ];

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div 
        onClick={() => onNavigateTab('dashboard')} 
        className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
          <Truck className="w-5 h-5" />
        </div>
        <span>TruckGestão</span>
      </div>

      {/* Zone 2: Concise single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigateTab(item.id)}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === item.id 
                ? 'text-amber-400 font-semibold border-b-2 border-amber-400' 
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onQuickAction}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Lançar Rápido</span>
        </button>
      </div>
    </header>
  );
}
