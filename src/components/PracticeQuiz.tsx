import React, { useState } from 'react';
import { MathView } from './MathView';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, HelpCircle } from 'lucide-react';

interface QuizQuestion {
  id: string;
  expression: string;
  question: string;
  options: { text: string; math?: string; isCorrect: boolean; feedback: string }[];
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    expression: '(x^2 - 16)/(x - 4)',
    question: '¿Qué caso de factorización corresponde al numerador x² - 16?',
    options: [
      {
        text: 'Diferencia de cuadrados: x² - 4²',
        math: 'a^2 - b^2 = (a-b)(a+b)',
        isCorrect: true,
        feedback: '¡Exacto! Tiene dos términos que son cuadrados perfectos y se están restando.',
      },
      {
        text: 'Trinomio cuadrado perfecto',
        isCorrect: false,
        feedback: 'Incorrecto. Un trinomio tiene 3 términos; x² - 16 tiene sólo 2 términos y no tiene término central.',
      },
      {
        text: 'Factor común monomio',
        isCorrect: false,
        feedback: 'Incorrecto. x² y 16 no comparten ninguna variable ni divisor común mayor a 1.',
      },
      {
        text: 'Suma de cuadrados',
        isCorrect: false,
        feedback: 'Incorrecto. El signo entre los dos términos es un menos (-), por lo que es una resta o diferencia.',
      },
    ],
    explanation: 'El numerador x² - 16 = x² - 4² cumple a² - b² = (a-b)(a+b) = (x-4)(x+4).',
  },
  {
    id: 'q2',
    expression: '(x^2 - 25)/(x - 5)',
    question: '¿Por qué existe la restricción x ≠ 5?',
    options: [
      {
        text: 'Porque al sustituir x = 5 en el denominador original (x - 5), se produce una división entre cero (5 - 5 = 0).',
        isCorrect: true,
        feedback: '¡Correcto! En matemáticas no se puede dividir entre cero; la restricción garantiza la validez de la función.',
      },
      {
        text: 'Porque el resultado final no puede ser igual a 5.',
        isCorrect: false,
        feedback: 'Incorrecto. La restricción proviene del divisor original, no del valor que toma el resultado simplificado.',
      },
      {
        text: 'Porque x siempre debe ser un número negativo.',
        isCorrect: false,
        feedback: 'Incorrecto. x puede tomar cualquier número real, salvo el valor exacto que anula el denominador.',
      },
    ],
    explanation: 'Siempre que simplifiques factores racionales, debes registrar los valores que anulaban el denominador antes de cancelar.',
  },
  {
    id: 'q3',
    expression: '(x^3 - 8)/(x - 2)',
    question: '¿Cuál es el factor que se cancela entre el numerador y el denominador?',
    options: [
      {
        text: 'El factor binomio (x - 2)',
        isCorrect: true,
        feedback: '¡Correcto! x³ - 8 = (x - 2)(x² + 2x + 4), por lo que (x - 2) aparece multiplicando arriba y como divisor abajo.',
      },
      {
        text: 'Sólo la variable x',
        isCorrect: false,
        feedback: '¡Error común! Nunca se cancelan variables sueltas dentro de una suma o resta. Solo se cancela el factor binomio completo.',
      },
      {
        text: 'El trinomio (x² + 2x + 4)',
        isCorrect: false,
        feedback: 'Incorrecto. Ese trinomio no está en el denominador, es el resultado que permanece tras cancelar (x - 2).',
      },
    ],
    explanation: 'Cancelamos factores completos que multiplican a toda la expresión, nunca términos aislados.',
  },
  {
    id: 'q4',
    expression: '(x^2 + 5x + 6)/(x + 2)',
    question: '¿Cómo se factoriza el trinomio x² + 5x + 6?',
    options: [
      {
        text: '(x + 2)(x + 3)',
        math: '(x + 2)(x + 3)',
        isCorrect: true,
        feedback: '¡Excelente! Buscamos dos números que sumados den 5 y multiplicados den 6: 2 + 3 = 5 y 2 · 3 = 6.',
      },
      {
        text: '(x - 2)(x - 3)',
        math: '(x - 2)(x - 3)',
        isCorrect: false,
        feedback: 'Incorrecto. (-2) + (-3) = -5, pero el término central es +5x.',
      },
      {
        text: '(x + 1)(x + 6)',
        math: '(x + 1)(x + 6)',
        isCorrect: false,
        feedback: 'Incorrecto. 1 + 6 = 7, no 5.',
      },
    ],
    explanation: 'x² + 5x + 6 = (x + 2)(x + 3). Luego al dividir entre (x + 2), queda x + 3 con x ≠ -2.',
  },
  {
    id: 'q5',
    expression: '(x^2 - 9)/(x - 3) + (x^2 - 25)/(x - 5)',
    question: 'Al resolver la suma (x² - 9)/(x - 3) + (x² - 25)/(x - 5), ¿cuál es el procedimiento y resultado correcto?',
    options: [
      {
        text: 'Primero simplificamos cada cociente: (x + 3) + (x + 5), y luego sumamos términos semejantes obteniendo 2x + 8 con x ≠ 3 y x ≠ 5.',
        math: '(x + 3) + (x + 5) = 2x + 8',
        isCorrect: true,
        feedback: '¡Excelente razonamiento! Cada cociente notable se resuelve independientemente por diferencia de cuadrados y luego se reducen los términos semejantes.',
      },
      {
        text: 'Se suman primero los numeradores y luego los denominadores directamente.',
        isCorrect: false,
        feedback: '¡Cuidado! Nunca se suman fracciones algebraicas sumando numeradores entre sí y denominadores entre sí.',
      },
      {
        text: 'El resultado es x² + 8 porque las variables x se cancelan al sumarse.',
        isCorrect: false,
        feedback: 'Incorrecto. x + x es igual a 2x, las variables se suman, no se cancelan.',
      },
    ],
    explanation: '(x² - 9)/(x - 3) = x + 3 y (x² - 25)/(x - 5) = x + 5. Su suma es (x + 3) + (x + 5) = 2x + 8.',
  },
];

interface PracticeQuizProps {
  onLoadExerciseInSimulator: (expr: string) => void;
}

export const PracticeQuiz: React.FC<PracticeQuizProps> = ({ onLoadExerciseInSimulator }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const currentQ = QUIZ_QUESTIONS[currentIndex];

  const formattedQuizExpr = React.useMemo(() => {
    const expr = currentQ.expression;
    if (expr.includes(' + ') || expr.includes(' - ') || expr.includes(' * ')) {
      return expr.replace(/\(([^)]+)\)\/\(([^)]+)\)/g, '\\frac{$1}{$2}');
    }
    return `\\frac{${expr.replace(/^\(/, '').replace(/\)$/, '').replace(')/(', '}{')}}`;
  }, [currentQ.expression]);

  const handleSelect = (idx: number) => {
    if (hasAnswered) return;
    setSelectedOption(idx);
    setHasAnswered(true);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setCurrentIndex((prev) => (prev + 1) % QUIZ_QUESTIONS.length);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setCurrentIndex(0);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div>
          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
            Comprueba tu Comprensión
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Pregunta {currentIndex + 1} de {QUIZ_QUESTIONS.length}
          </h3>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar</span>
        </button>
      </div>

      {/* Ejercicio a evaluar */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80 mb-5 text-center">
        <span className="text-xs text-slate-500 font-semibold uppercase block mb-1">
          Expresión bajo análisis:
        </span>
        <div className="text-base font-mono font-bold text-slate-900">
          <MathView math={formattedQuizExpr} block />
        </div>
      </div>

      <h4 className="text-sm font-semibold text-slate-800 mb-3">
        {currentQ.question}
      </h4>

      {/* Opciones */}
      <div className="space-y-2.5 mb-5">
        {currentQ.options.map((opt, idx) => {
          let btnStyle = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700';

          if (hasAnswered) {
            if (opt.isCorrect) {
              btnStyle = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium ring-1 ring-emerald-200';
            } else if (selectedOption === idx) {
              btnStyle = 'bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-200';
            } else {
              btnStyle = 'opacity-60 bg-slate-50 border-slate-200 text-slate-500';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={hasAnswered}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
            >
              <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 font-bold text-xs text-slate-600">
                {String.fromCharCode(65 + idx)}
              </span>
              <div className="flex-1">
                <span>{opt.text}</span>
                {opt.math && (
                  <div className="mt-1 text-xs">
                    <MathView math={opt.math} />
                  </div>
                )}
              </div>
              {hasAnswered && opt.isCorrect && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              {hasAnswered && selectedOption === idx && !opt.isCorrect && (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Retroalimentación inmediata */}
      {hasAnswered && selectedOption !== null && (
        <div
          className={`p-4 rounded-lg border mb-5 text-xs sm:text-sm animate-in fade-in duration-150 ${
            currentQ.options[selectedOption].isCorrect
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5 mb-1">
            {currentQ.options[selectedOption].isCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡Respuesta Correcta!</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Revisa este concepto:</span>
              </>
            )}
          </div>
          <p className="mb-2">{currentQ.options[selectedOption].feedback}</p>
          <p className="text-slate-600 text-xs pt-2 border-t border-slate-200/60 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{currentQ.explanation}</span>
          </p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onLoadExerciseInSimulator(currentQ.expression)}
          className="text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors cursor-pointer"
        >
          Cargar este ejercicio en el simulador completo →
        </button>

        {hasAnswered && (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
          >
            <span>Siguiente Pregunta</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
