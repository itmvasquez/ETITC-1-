import React from 'react';
import { MathView } from './MathView';
import { BookOpen, CheckCircle, Info } from 'lucide-react';

export const CasesGuide: React.FC = () => {
  const cases = [
    {
      number: 1,
      name: 'Factor común por agrupación de términos',
      formula: 'ax + bx + ay + by = x(a + b) + y(a + b) = (a + b)(x + y)',
      explanation:
        'Se utiliza cuando los términos no tienen un factor común global para todos, pero sí se pueden emparejar para extraer factores comunes repetidos.',
      example: '(ax + bx + ay + by) / (a + b) = x + y',
    },
    {
      number: 2,
      name: 'Trinomio cuadrado perfecto (TCP)',
      formula: 'a^2 \\pm 2ab + b^2 = (a \\pm b)^2',
      explanation:
        'Resulta de elevar un binomio al cuadrado. El primer y tercer término tienen raíz cuadrada exacta y el término central es el doble producto de ambas raíces.',
      example: '(x^2 - 6x + 9) / (x - 3) = (x - 3)^2 / (x - 3) = x - 3',
    },
    {
      number: 3,
      name: 'Trinomio de la forma x² + bx + c',
      formula: 'x^2 + (p+q)x + (p \\cdot q) = (x + p)(x + q)',
      explanation:
        'Buscamos dos números p y q que sumados den el coeficiente central b y multiplicados den el término independiente c.',
      example: '(x^2 + 5x + 6) / (x + 2) = [(x + 2)(x + 3)] / (x + 2) = x + 3',
    },
    {
      number: 4,
      name: 'Trinomio de la forma ax² + bx + c',
      formula: 'ax^2 + bx + c = (mx + p)(nx + q)',
      explanation:
        'Cuando el coeficiente de x² no es 1. Se multiplica a por c para encontrar dos números cuya suma sea b y se factoriza por agrupación.',
      example: '(2x^2 + 7x + 3) / (2x + 1) = [(2x + 1)(x + 3)] / (2x + 1) = x + 3',
    },
    {
      number: 5,
      name: 'Diferencia de cuadrados',
      formula: 'a^2 - b^2 = (a - b)(a + b)',
      explanation:
        'Dos términos con signo menos entre sí, ambos con raíz cuadrada exacta. Se descompone en el producto de la suma por la diferencia de las raíces.',
      example: '(x^2 - 9) / (x - 3) = [(x - 3)(x + 3)] / (x - 3) = x + 3',
    },
  ];

  const extensions = [
    {
      name: 'Diferencia de cubos',
      formula: 'a^3 - b^3 = (a - b)(a^2 + ab + b^2)',
      condition: 'Siempre divisible entre (a - b). Genera trinomio con signos positivos.',
    },
    {
      name: 'Suma de cubos',
      formula: 'a^3 + b^3 = (a + b)(a^2 - ab + b^2)',
      condition: 'Siempre divisible entre (a + b). Genera trinomio con signos alternados.',
    },
    {
      name: 'Diferencia de potencias n-ésimas (aⁿ - bⁿ)',
      formula: '\\frac{a^n - b^n}{a - b} = a^{n-1} + a^{n-2}b + \\dots + b^{n-1}',
      condition: 'Válido para cualquier exponente n natural ≥ 2.',
    },
    {
      name: 'Suma de potencias impares (aⁿ + bⁿ)',
      formula: '\\frac{a^n + b^n}{a + b} = a^{n-1} - a^{n-2}b + \\dots + b^{n-1}',
      condition: 'Válido ÚNICAMENTE si el exponente n es IMPAR. Si n es par, no es divisible en reales.',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-sky-700" />
          <h3 className="text-base font-bold text-slate-900">
            Conocimientos Previos de Factorización
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Estos son los 5 casos de factorización fundamentales en los que se apoya todo el razonamiento del simulador. Cada cociente notable se conecta directamente con uno de ellos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cases.map((c) => (
          <div
            key={c.number}
            className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0">
                  {c.number}
                </span>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {c.name}
                </h4>
              </div>

              <div className="bg-white p-2 rounded border border-slate-200 my-2 text-center overflow-x-auto text-xs">
                <MathView math={c.formula} />
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {c.explanation}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-700">
              <span className="font-semibold text-sky-800 block text-[11px] uppercase tracking-wide">
                Ejemplo en cociente:
              </span>
              <span className="font-mono text-xs">{c.example}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600" />
          <span>Extensiones a Cocientes Notables Cúbicos y de Potencias</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {extensions.map((ext) => (
            <div key={ext.name} className="p-3 bg-sky-50/50 rounded-lg border border-sky-100">
              <span className="font-bold text-sky-950 block mb-1">{ext.name}</span>
              <div className="bg-white p-1.5 rounded border border-sky-100 mb-1.5 text-center">
                <MathView math={ext.formula} />
              </div>
              <p className="text-slate-600 text-[11px]">{ext.condition}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
