import React from 'react';
import { WhyExplanation } from '../types/math';
import { MathView } from './MathView';
import { HelpCircle, X, AlertTriangle, Lightbulb } from 'lucide-react';

interface WhyModalProps {
  explanation: WhyExplanation | null;
  onClose: () => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({ explanation, onClose }) => {
  if (!explanation) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 text-slate-800 relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-sky-700 tracking-wide uppercase">
                Profundización Matemática
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {explanation.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-sm text-slate-600 leading-relaxed">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 font-medium text-slate-700">
            {explanation.question}
          </div>

          <p className="text-slate-700">{explanation.answer}</p>

          {explanation.mathFormula && (
            <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-100/80 text-center">
              <span className="block text-xs font-semibold text-sky-800 mb-1">
                Fórmula o Propiedad Involucrada:
              </span>
              <MathView math={explanation.mathFormula} block />
            </div>
          )}

          {explanation.commonMistake && (
            <div className="p-3.5 bg-amber-50/80 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-950 mb-0.5">
                  Error común de principiante:
                </strong>
                {explanation.commonMistake}
              </div>
            </div>
          )}

          <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100 text-emerald-900 text-xs flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>
              <strong>Regla de oro:</strong> Nunca canceles sumandos sueltos. Factoriza primero para convertir sumas en productos, y cancela únicamente factores idénticos multiplicando arriba y abajo.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
