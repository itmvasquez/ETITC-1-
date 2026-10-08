import React from 'react';
import { Superscript } from 'lucide-react';

export interface InsertSymbolOptions {
  value: string;
  cursorOffset?: number; // Desplazamiento del cursor tras insertar
  isExponent?: boolean; // Indica si es un operador de exponente
  wrapSelection?: boolean; // Si hay texto seleccionado, envolverlo o precederlo
}

interface SymbolBarProps {
  onInsert: (options: InsertSymbolOptions) => void;
}

export const SymbolBar: React.FC<SymbolBarProps> = ({ onInsert }) => {
  // Exponentes independientes (aplicables a cualquier letra o expresión)
  const exponentButtons: { label: string; tooltip: string; value: string; isExponent: boolean; cursorOffset?: number }[] = [
    { label: '▢²', tooltip: 'Elevar al cuadrado cualquier variable o número (^2)', value: '^2', isExponent: true },
    { label: '▢³', tooltip: 'Elevar al cubo cualquier variable o número (^3)', value: '^3', isExponent: true },
    { label: '▢⁴', tooltip: 'Elevar a la cuarta potencia (^4)', value: '^4', isExponent: true },
    { label: '▢⁵', tooltip: 'Elevar a la quinta potencia (^5)', value: '^5', isExponent: true },
    { label: '▢ⁿ', tooltip: 'Elevar a la potencia n (^n)', value: '^n', isExponent: true },
    { label: '▢^( )', tooltip: 'Exponente libre para escribir cualquier potencia (^)', value: '^', isExponent: true, cursorOffset: 1 },
  ];

  // Variables algebraicas comunes
  const variableButtons = ['x', 'y', 'z', 'a', 'b', 'c', 'm', 'n'];

  // Operadores y símbolos de agrupación
  const operatorButtons = [
    { label: '( )', tooltip: 'Paréntesis para agrupar numerador o denominador', value: '()', cursorOffset: 1, wrapSelection: true },
    { label: '/', tooltip: 'Barra divisoria de fracción', value: '/' },
    { label: '+', tooltip: 'Signo más (suma de cocientes)', value: ' + ' },
    { label: '−', tooltip: 'Signo menos (resta de cocientes)', value: ' - ' },
    { label: '×', tooltip: 'Multiplicación entre cocientes (*)', value: ' * ' },
  ];

  return (
    <div className="bg-slate-100/90 rounded-xl border border-slate-200/90 p-2.5 sm:p-3 space-y-2.5 shadow-2xs">
      {/* Fila 1: Exponentes libres (protagonista de la solicitud del usuario) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 text-[11px] font-bold text-sky-800 uppercase tracking-wider mr-1 shrink-0">
          <Superscript className="w-3.5 h-3.5 text-sky-600" />
          <span>Exponentes libres:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {exponentButtons.map((exp) => (
            <button
              key={exp.label}
              type="button"
              onClick={() =>
                onInsert({
                  value: exp.value,
                  isExponent: exp.isExponent,
                  cursorOffset: exp.cursorOffset,
                  wrapSelection: true,
                })
              }
              title={exp.tooltip}
              className="h-8 px-2.5 min-w-[36px] text-xs font-mono font-bold bg-white hover:bg-sky-50 hover:border-sky-300 text-sky-900 active:bg-sky-100 rounded-lg border border-slate-200 transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-0.5 hover:scale-105"
            >
              <span>{exp.label}</span>
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-500 italic hidden xl:inline ml-auto">
          Escribe cualquier letra (ej. a, y, m) y pulsa ▢² para formar a², y²...
        </span>
      </div>

      {/* Fila 2: Variables y Operadores */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
        {/* Variables */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Variables:
          </span>
          {variableButtons.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onInsert({ value: v })}
              title={`Insertar variable ${v}`}
              className="h-7 w-7 text-xs font-serif italic font-semibold bg-white hover:bg-slate-200/80 text-slate-800 active:bg-slate-300 rounded-md border border-slate-200 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            >
              {v}
            </button>
          ))}
        </div>

        {/* Operadores y agrupación */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Operaciones:
          </span>
          {operatorButtons.map((op) => (
            <button
              key={op.label}
              type="button"
              onClick={() =>
                onInsert({
                  value: op.value,
                  cursorOffset: op.cursorOffset,
                  wrapSelection: op.wrapSelection,
                })
              }
              title={op.tooltip}
              className="h-7 px-2 min-w-[28px] text-xs font-mono font-bold bg-white hover:bg-slate-200/80 text-slate-800 active:bg-slate-300 rounded-md border border-slate-200 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
