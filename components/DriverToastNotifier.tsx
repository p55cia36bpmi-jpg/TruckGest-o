'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ClipboardCheck,
  Navigation,
  AlertOctagon,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  X,
  Check,
  ArrowRight,
} from 'lucide-react';
import { NotificationSoundVariant } from '@/lib/notificationSound';

export interface DriverToastItem {
  id: string;
  category: NotificationSoundVariant;
  title: string;
  message: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  persistent?: boolean;
  createdAt: string;
}

interface DriverAlertControlBarProps {
  soundMuted: boolean;
  audioBlocked: boolean;
  activeAlertsCount: number;
  onToggleMute: () => void;
  onUnlockAudio: () => void;
  onTestSoundToast: () => void;
  onReplayPendingAlerts: () => void;
}

export function DriverAlertControlBar({
  soundMuted,
  audioBlocked,
  activeAlertsCount,
  onToggleMute,
  onUnlockAudio,
  onTestSoundToast,
  onReplayPendingAlerts,
}: DriverAlertControlBarProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
            activeAlertsCount > 0
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}
        >
          <Bell className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <strong className="text-slate-100 block">
            Central de Alertas Sonoros do Motorista
          </strong>
          <span className="text-slate-400">
            {activeAlertsCount > 0
              ? `${activeAlertsCount} alerta${activeAlertsCount > 1 ? 's' : ''} pendente${activeAlertsCount > 1 ? 's' : ''} de atenção`
              : 'Monitoramento em tempo real de checklists e viagens ativo'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {audioBlocked && !soundMuted && (
          <button
            type="button"
            onClick={onUnlockAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Ativar Áudio Agora</span>
          </button>
        )}

        {activeAlertsCount > 0 && (
          <button
            type="button"
            onClick={onReplayPendingAlerts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/35 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <BellRing className="w-3.5 h-3.5 text-rose-400" />
            <span>Ver Alertas ({activeAlertsCount})</span>
          </button>
        )}

        <button
          type="button"
          onClick={onTestSoundToast}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          title="Disparar notificação sonora de teste"
        >
          <BellRing className="w-3.5 h-3.5 text-amber-400" />
          <span>Testar Som</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            soundMuted
              ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
          }`}
          title={soundMuted ? 'Reativar alertas sonoros' : 'Silenciar alertas sonoros'}
        >
          {soundMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Som Silenciado</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Som Ativo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface DriverToastStackProps {
  toasts: DriverToastItem[];
  onDismiss: (id: string) => void;
}

export function DriverToastStack({ toasts, onDismiss }: DriverToastStackProps) {
  return (
    <div
      aria-live="polite"
      aria-label="Notificações do motorista"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col gap-2.5 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const isCritical = toast.category === 'critical';
          const isTrip = toast.category === 'trip';
          const isChecklist = toast.category === 'checklist';

          const containerClasses = isCritical
            ? 'bg-slate-900 border-rose-500/70 shadow-2xl shadow-rose-950/50'
            : isTrip
            ? 'bg-slate-900 border-amber-500/70 shadow-2xl shadow-amber-950/40'
            : isChecklist
            ? 'bg-slate-900 border-orange-500/70 shadow-2xl shadow-orange-950/40'
            : 'bg-slate-900 border-slate-700 shadow-2xl';

          const iconWrapClasses = isCritical
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
            : isTrip
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            : isChecklist
            ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
            : 'bg-sky-500/20 text-sky-400 border-sky-500/40';

          const actionButtonClasses = isCritical
            ? 'bg-rose-500 hover:bg-rose-400 text-white'
            : isTrip
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            : isChecklist
            ? 'bg-orange-500 hover:bg-orange-400 text-slate-950'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-100';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto rounded-2xl border p-4 space-y-3 ${containerClasses}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${iconWrapClasses}`}
                >
                  {isCritical ? (
                    <AlertOctagon className="w-4 h-4" />
                  ) : isTrip ? (
                    <Navigation className="w-4 h-4" />
                  ) : isChecklist ? (
                    <ClipboardCheck className="w-4 h-4" />
                  ) : (
                    <BellRing className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-100 leading-snug">
                      {toast.title}
                    </h5>
                    <button
                      type="button"
                      onClick={() => onDismiss(toast.id)}
                      className="text-slate-400 hover:text-slate-100 p-0.5 rounded-lg transition-colors shrink-0"
                      title="Dispensar alerta"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {toast.meta && (
                    <p className="text-[11px] font-mono text-slate-400 truncate">
                      {toast.meta}
                    </p>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {toast.message}
                  </p>
                </div>
              </div>

              {(toast.actionLabel || toast.secondaryLabel) && (
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                  {toast.secondaryLabel && toast.onSecondaryAction && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.onSecondaryAction?.();
                        onDismiss(toast.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      {toast.secondaryLabel}
                    </button>
                  )}

                  {toast.actionLabel && toast.onAction && (
                    <button
                      type="button"
                      onClick={async () => {
                        await toast.onAction?.();
                        onDismiss(toast.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${actionButtonClasses}`}
                    >
                      {isTrip ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                      <span>{toast.actionLabel}</span>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
