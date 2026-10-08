import React, { useState, useEffect, useRef } from 'react';
import { analyzeCompositeOrSingle } from './utils/compositeEngine';
import { AnalysisResult, WhyExplanation } from './types/math';
import { MathView } from './components/MathView';
import { SymbolBar, InsertSymbolOptions } from './components/SymbolBar';
import { StepCard } from './components/StepCard';
import { WhyModal } from './components/WhyModal';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { PracticeQuiz } from './components/PracticeQuiz';
import { CasesGuide } from './components/CasesGuide';
import {
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  FileText,
  ListOrdered,
  Eye,
  GraduationCap,
} from 'lucide-react';

export default function App() {
  // Estado principal de la expresión
  const [expression, setExpression] = useState<string>('(x^2 - 9)/(x - 3)');
  const [activeTab, setActiveTab] = useState<'simulator' | 'exercises' | 'quiz' | 'guide'>('simulator');
  const [explanationMode, setExplanationMode] = useState<'completa' | 'resumida'>('completa');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Modo interactivo paso a paso (revelación secuencial)
  const [isInteractiveStepping, setIsInteractiveStepping] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);

  // Modal "¿Por qué?"
  const [selectedWhy, setSelectedWhy] = useState<WhyExplanation | null>(null);

  // Input ref para inserción de símbolos
  const inputRef = useRef<HTMLInputElement>(null);

  // Ejecutar análisis inicial
  useEffect(() => {
    handleSolve('(x^2 - 9)/(x - 3)');
  }, []);

  const handleSolve = (exprToSolve?: string) => {
    const target = exprToSolve !== undefined ? exprToSolve : expression;
    const res = analyzeCompositeOrSingle(target);
    setAnalysisResult(res);
    setIsInteractiveStepping(false);
    setCurrentStepIndex(res.steps.length > 0 ? res.steps.length : 1);
  };

  const handleStartStepByStep = () => {
    const res = analyzeCompositeOrSingle(expression);
    setAnalysisResult(res);
    setIsInteractiveStepping(true);
    setCurrentStepIndex(1);
  };

  const handleClear = () => {
    setExpression('');
    setAnalysisResult(null);
    setIsInteractiveStepping(false);
    setCurrentStepIndex(1);
    inputRef.current?.focus();
  };

  const handleInsertSymbol = (options: InsertSymbolOptions) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selected = expression.slice(start, end);
    const before = expression.slice(0, start);
    const after = expression.slice(end);

    let insertion = options.value;
    let newCursorPos = start + insertion.length;

    // Caso 1: Envolver selección con paréntesis ()
    if (options.wrapSelection && selected.length > 0 && options.value === '()') {
      insertion = `(${selected})`;
      newCursorPos = start + insertion.length;
    }
    // Caso 2: Elevar texto seleccionado a un exponente (^2, ^3, ^n, ^)
    else if (options.isExponent && selected.length > 0) {
      const needsParens = /[\s+\-*/]/.test(selected) && !(selected.startsWith('(') && selected.endsWith(')'));
      const base = needsParens ? `(${selected})` : selected;
      insertion = `${base}${options.value}`;
      newCursorPos = start + insertion.length;
    }
    // Caso 3: Inserción de paréntesis vacíos -> cursor adentro (|)
    else if (options.value === '()' && selected.length === 0) {
      insertion = '()';
      newCursorPos = start + 1;
    }
    // Caso 4: Desplazamiento explícito de cursor (ej. '^' para exponente libre)
    else if (options.cursorOffset !== undefined) {
      insertion = options.value;
      newCursorPos = start + options.cursorOffset;
    } else {
      insertion = options.value;
      newCursorPos = start + insertion.length;
    }

    const updated = before + insertion + after;
    setExpression(updated);

    // Reposicionar cursor con precisión
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSelectPreset = (presetExpr: string) => {
    setExpression(presetExpr);
    handleSolve(presetExpr);
    setActiveTab('simulator');
  };

  // Filtrado de pasos según modo ("completa" vs "resumida")
  const displayedSteps = analysisResult
    ? (explanationMode === 'resumida'
        ? analysisResult.steps.filter((s) => s.isEssential)
        : analysisResult.steps
      ).filter((s) => !isInteractiveStepping || s.stepNumber <= currentStepIndex)
    : [];

  const totalStepsCount = analysisResult ? analysisResult.steps.length : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* ========================================================================= */}
      {/* 1. TOP BAR CONTRACT: Brand — Nav Links — Action                          */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              CN
            </div>
            <a
              href="#simulator"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('simulator');
              }}
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-sky-700 transition-colors"
            >
              Simulador de Cocientes Notables
            </a>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`hover:text-slate-900 transition-colors cursor-pointer py-1 ${
                activeTab === 'simulator' ? 'text-slate-900 font-semibold border-b-2 border-slate-900' : ''
              }`}
            >
              Simulador Explicativo
            </button>
            <button
              onClick={() => setActiveTab('exercises')}
              className={`hover:text-slate-900 transition-colors cursor-pointer py-1 ${
                activeTab === 'exercises' ? 'text-slate-900 font-semibold border-b-2 border-slate-900' : ''
              }`}
            >
              Catálogo de Ejercicios
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`hover:text-slate-900 transition-colors cursor-pointer py-1 ${
                activeTab === 'quiz' ? 'text-slate-900 font-semibold border-b-2 border-slate-900' : ''
              }`}
            >
              Comprueba tu Comprensión
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`hover:text-slate-900 transition-colors cursor-pointer py-1 ${
                activeTab === 'guide' ? 'text-slate-900 font-semibold border-b-2 border-slate-900' : ''
              }`}
            >
              Guía de Factorización
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setExpression('(x^2 - 25)/(x - 5)');
                handleSolve('(x^2 - 25)/(x - 5)');
                setActiveTab('simulator');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap hidden sm:inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Ejemplo Rápido</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navegación móvil secundaria */}
      <div className="md:hidden flex items-center gap-2 p-2 bg-slate-100/90 border-b border-slate-200 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer ${
            activeTab === 'simulator' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
          }`}
        >
          Simulador
        </button>
        <button
          onClick={() => setActiveTab('exercises')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer ${
            activeTab === 'exercises' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
          }`}
        >
          Ejercicios
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer ${
            activeTab === 'quiz' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
          }`}
        >
          Comprobación
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer ${
            activeTab === 'guide' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
          }`}
        >
          Guía de Casos
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONTENIDO PRINCIPAL                                                   */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Renderizado condicional según pestaña */}
        {activeTab === 'exercises' && (
          <ExerciseCatalog
            onSelectExercise={handleSelectPreset}
            currentExpression={expression}
          />
        )}

        {activeTab === 'quiz' && (
          <PracticeQuiz onLoadExerciseInSimulator={handleSelectPreset} />
        )}

        {activeTab === 'guide' && <CasesGuide />}

        {activeTab === 'simulator' && (
          <div className="space-y-6">
            {/* --------------------------------------------------------------- */}
            {/* TARJETA DE ENTRADA Y CONTROLES                                  */}
            {/* --------------------------------------------------------------- */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Expresión del Cociente Notable
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Introduce un cociente notable o una <strong>operación combinada</strong> como <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">(x² - 9)/(x - 3) + (x² - 25)/(x - 5)</code>.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setExplanationMode('completa')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      explanationMode === 'completa'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Explicación completa
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplanationMode('resumida')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      explanationMode === 'resumida'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Explicación resumida
                  </button>
                </div>
              </div>

              {/* Input y botones principales */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSolve();
                    }}
                    placeholder="Ejemplo: (x^2 - 9)/(x - 3) + (x^2 - 25)/(x - 5)"
                    className="w-full h-12 pl-4 pr-10 text-base sm:text-lg font-mono font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs"
                  />
                  {expression && (
                    <button
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                      title="Borrar texto"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Barra de símbolos rápidos */}
                <SymbolBar onInsert={handleInsertSymbol} />

                {/* Botones de acción */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSolve()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      <Play className="w-4 h-4 text-sky-400" />
                      <span>Resolver</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartStepByStep}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <ListOrdered className="w-4 h-4 text-sky-600" />
                      <span>Mostrar paso a paso</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClear}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpiar</span>
                    </button>
                  </div>

                  {/* Atajos de ejemplos populares y operaciones combinadas */}
                  <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-400 mr-1">Pruebas rápidas:</span>
                    <button
                      onClick={() => handleSelectPreset('(x^2 - 16)/(x + 4)')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono cursor-pointer transition-colors"
                      title="Diferencia de cuadrados individual"
                    >
                      (x²-16)/(x+4)
                    </button>
                    <button
                      onClick={() => handleSelectPreset('(x^2 - 9)/(x - 3) + (x^2 - 25)/(x - 5)')}
                      className="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 font-semibold rounded font-mono cursor-pointer transition-colors"
                      title="Suma de dos cocientes notables"
                    >
                      (Q1) + (Q2)
                    </button>
                    <button
                      onClick={() => handleSelectPreset('(x^2 - 16)/(x + 4) - (x^2 - 9)/(x - 3)')}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded font-mono cursor-pointer transition-colors"
                      title="Resta de dos cocientes notables con ley de signos"
                    >
                      (Q1) − (Q2)
                    </button>
                    <button
                      onClick={() => handleSelectPreset('(x^3 - 8)/(x - 2) + (x^2 - 4)/(x - 2)')}
                      className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold rounded font-mono cursor-pointer transition-colors"
                      title="Operación mixta: cubos y cuadrados"
                    >
                      Cubos + Cuadrados
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* --------------------------------------------------------------- */}
            {/* PANEL DE RESULTADOS Y DIAGNÓSTICO                                */}
            {/* --------------------------------------------------------------- */}
            {analysisResult && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* SI HAY ERROR O CASO NO FACTORIZABLE */}
                {!analysisResult.isValid ? (
                  <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-5 sm:p-6 text-amber-950 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2.5 text-amber-900 font-bold text-base">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <h3>Diagnóstico Pedagógico de la Expresión</h3>
                    </div>

                    <p className="text-sm font-medium text-amber-900 leading-relaxed">
                      {analysisResult.errorMessage}
                    </p>

                    {analysisResult.errorSuggestion && (
                      <div className="p-3.5 bg-white/80 rounded-lg border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                        <strong className="block font-semibold mb-1 text-amber-950">
                          Explicación del Profesor:
                        </strong>
                        {analysisResult.errorSuggestion}
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-amber-800">
                        ¿Quieres probar un ejercicio que sí cumpla las condiciones?
                      </span>
                      <button
                        onClick={() => handleSelectPreset('(x^2 - 9)/(x - 3)')}
                        className="px-3 py-1.5 bg-amber-900 text-white rounded-md text-xs font-semibold hover:bg-amber-800 transition-colors cursor-pointer"
                      >
                        Cargar (x² - 9)/(x - 3)
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* BANNER DE OPERACIÓN COMPUESTA SI CORRESPONDE */}
                    {analysisResult.isComposite && analysisResult.subQuotients && (
                      <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-sky-600" />
                            <span>Operación Compuesta entre {analysisResult.subQuotients.length} Cocientes Notables</span>
                          </span>
                          <span className="text-xs text-sky-800 font-medium">
                            Cada cociente se resuelve de forma independiente y luego se combinan
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {analysisResult.subQuotients.map((q) => (
                            <div key={q.id} className="bg-white p-3 rounded-lg border border-sky-100/90 shadow-2xs text-xs space-y-1">
                              <div className="flex items-center justify-between text-slate-500 font-medium">
                                <span className="font-bold text-sky-900">Cociente {q.index}</span>
                                {q.operatorBefore && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700 font-bold">
                                    Op: {q.operatorBefore}
                                  </span>
                                )}
                              </div>
                              <div className="py-1">
                                <MathView math={`\\frac{${q.analysis.numeratorFormatted}}{${q.analysis.denominatorFormatted}}`} />
                                <span className="mx-1 text-slate-400">→</span>
                                <span className="font-bold text-emerald-700 font-mono">{q.analysis.simplifiedResult}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>{q.analysis.methodName}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* APARTADOS VISIBLES OBLIGATORIOS: MÉTODO, RESTRICCIONES, RESULTADO FINAL */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 1. APARTADO: MÉTODO UTILIZADO */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">
                            <BookOpen className="w-4 h-4 text-sky-600" />
                            <span>Método Utilizado</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mb-2">
                            {analysisResult.methodName}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed mb-3">
                            {analysisResult.methodDescription}
                          </p>
                        </div>

                        {analysisResult.generalFormula && (
                          <div className="p-2.5 bg-sky-50/70 rounded-lg border border-sky-100 text-center text-xs">
                            <span className="block text-[11px] font-semibold text-sky-900 mb-1 uppercase">
                              Patrón General:
                            </span>
                            <MathView math={analysisResult.generalFormula} />
                          </div>
                        )}
                      </div>

                      {/* 2. APARTADO: RESTRICCIONES MATEMÁTICAS */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                            <span>Restricciones</span>
                          </div>
                          <div className="my-2">
                            {analysisResult.restrictions.map((r, i) => (
                              <div
                                key={i}
                                className="inline-block px-3 py-1.5 bg-amber-50 text-amber-900 font-mono font-bold text-sm rounded-lg border border-amber-200"
                              >
                                <MathView math={r} />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {analysisResult.restrictionsExplanation}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 italic">
                          Simplificar no elimina la restricción original del dominio real.
                        </div>
                      </div>

                      {/* 3. APARTADO: RESULTADO FINAL */}
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span>Resultado Final</span>
                          </div>
                          <div className="my-3 p-3 bg-white/10 rounded-lg text-center backdrop-blur-xs">
                            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
                              <MathView math={analysisResult.simplifiedResult} block />
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-white/10">
                          <div>
                            <span className="text-slate-400">Método: </span>
                            <span className="font-semibold text-white">{analysisResult.methodName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Cancelación: </span>
                            <span className="font-mono text-emerald-300">{analysisResult.commonFactor}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CONTROLADOR DE PASO A PASO INTERACTIVO */}
                    {isInteractiveStepping && (
                      <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sky-900 uppercase tracking-wide">
                            Modo Interactivo:
                          </span>
                          <span className="text-xs font-semibold text-sky-700 bg-white px-2.5 py-1 rounded border border-sky-200">
                            Paso {currentStepIndex} de {totalStepsCount}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={currentStepIndex <= 1}
                            onClick={() => setCurrentStepIndex((p) => Math.max(1, p - 1))}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Anterior</span>
                          </button>

                          <button
                            type="button"
                            disabled={currentStepIndex >= totalStepsCount}
                            onClick={() => setCurrentStepIndex((p) => Math.min(totalStepsCount, p + 1))}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <span>Siguiente</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsInteractiveStepping(false)}
                            className="px-3 py-1.5 text-xs text-sky-800 hover:text-sky-950 font-medium cursor-pointer"
                          >
                            Ver todos los pasos
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ----------------------------------------------------------- */}
                    {/* ÁREA DEL PROCEDIMIENTO PASO A PASO                          */}
                    {/* ----------------------------------------------------------- */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <ListOrdered className="w-5 h-5 text-slate-800" />
                          <h3 className="text-base font-bold text-slate-900">
                            Procedimiento Detallado de Razonamiento
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          Mostrando {displayedSteps.length} de {totalStepsCount} pasos ({explanationMode === 'completa' ? 'modo completo' : 'modo resumido'})
                        </span>
                      </div>

                      <div className="space-y-4">
                        {displayedSteps.map((step) => (
                          <StepCard
                            key={step.stepNumber}
                            step={step}
                            onOpenWhy={(why) => setSelectedWhy(why)}
                            isCurrentInteractiveStep={isInteractiveStepping && step.stepNumber === currentStepIndex}
                          />
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. MODAL "¿POR QUÉ?" PARA EXPLICACIONES PEDAGÓGICAS                       */}
      {/* ========================================================================= */}
      <WhyModal
        explanation={selectedWhy}
        onClose={() => setSelectedWhy(null)}
      />

      {/* ========================================================================= */}
      {/* 4. FOOTER DISCIPLINADO                                                   */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>Simulador de Cocientes Notables y Factorización</span>
            <span className="mx-2">·</span>
            <span>Matemáticas Básicas</span>
          </div>
          <div className="text-slate-400">
            Diseñado para la comprensión gradual y pedagógica de métodos algebraicos.
          </div>
        </div>
      </footer>
    </div>
  );
}
