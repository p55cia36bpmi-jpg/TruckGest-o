'use client';

import React from 'react';

interface MercosulPlateProps {
  plate: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MercosulPlate({ plate, size = 'md' }: MercosulPlateProps) {
  const formattedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const sizeClasses = {
    sm: 'w-24 h-7 text-xs border-[1.5px]',
    md: 'w-32 h-9 text-sm border-2',
    lg: 'w-40 h-11 text-base border-2',
  };

  const headerClasses = {
    sm: 'text-[7px] py-[1px] px-1',
    md: 'text-[9px] py-[2px] px-1.5',
    lg: 'text-[11px] py-[2px] px-2',
  };

  return (
    <div 
      className={`inline-flex flex-col bg-white border-slate-700 rounded shadow-sm overflow-hidden select-none font-mono font-bold tracking-wider ${sizeClasses[size]}`}
      title={`Placa Padrão Mercosul: ${formattedPlate}`}
    >
      {/* Top Blue Mercosul Header */}
      <div className={`bg-blue-700 text-white flex items-center justify-between font-sans font-semibold tracking-widest ${headerClasses[size]}`}>
        <span className="flex items-center gap-0.5">
          <span className="text-yellow-400 font-bold">★</span>
          <span>MERCOSUL</span>
        </span>
        <span className="font-bold tracking-widest text-slate-100">BRASIL</span>
      </div>

      {/* Main Plate Characters */}
      <div className="flex-1 flex items-center justify-center text-slate-900 tracking-widest leading-none font-black px-1">
        {formattedPlate}
      </div>
    </div>
  );
}
