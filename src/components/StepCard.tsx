import React from 'react';
import { StepExplanation, WhyExplanation } from '../types/math';
import { MathView } from './MathView';
import { HelpCircle, Lightbulb } from 'lucide-react';

interface StepCardProps {
  step: StepExplanation;
  onOpenWhy: (why: WhyExplanation) => void;
  isCurrentInteractiveStep?: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  onOpenWhy,
  isCurrentInteractiveStep = false,
}) => {
  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-5 ${
        isCurrentInteractiveStep
          ? 'bg-white border-sky-400 ring-2 ring-sky-100 shadow-md'
          : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* Header del paso */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
            {step.stepNumber}
          </span>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">
            PASO {step.stepNumber}. {step.title}
          </h4>
        </div>

        {step.whyExplanation && (
          <button
            type="button"
            onClick={() => onOpenWhy(step.whyExplanation!)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 active:bg-sky-200 border border-sky-200/80 rounded-md transition-colors cursor-pointer"
            title="Ver explicación matemática detallada"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Por qué?</span>
          </button>
        )}
      </div>

      {/* Explicación pedagógica */}
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        {step.description}
      </p>

      {/* Expresión matemática destacada */}
      {step.mathExpression && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 my-2 text-center overflow-x-auto">
          <MathView math={step.mathExpression} block />
        </div>
      )}

      {/* Consejo del profesor */}
      {step.teacherTip && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-2 text-xs text-amber-800 bg-amber-50/50 p-2.5 rounded-md border border-amber-100/80">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="leading-snug">
            <strong className="font-semibold text-amber-900">Nota del Profesor: </strong>
            {step.teacherTip}
          </span>
        </div>
      )}
    </div>
  );
};
