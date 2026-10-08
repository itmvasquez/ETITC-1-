import React, { useState } from 'react';
import { PRESET_EXERCISES } from '../data/presetExercises';
import { PresetExercise } from '../types/math';
import { BookOpen, Check, Sparkles, Filter } from 'lucide-react';

interface ExerciseCatalogProps {
  onSelectExercise: (expr: string) => void;
  currentExpression: string;
}

export const ExerciseCatalog: React.FC<ExerciseCatalogProps> = ({
  onSelectExercise,
  currentExpression,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Todos los casos' },
    { id: 'diferencia_cuadrados', label: 'Diferencia de cuadrados' },
    { id: 'diferencia_cubos', label: 'Diferencia de cubos' },
    { id: 'suma_cubos', label: 'Suma de cubos' },
    { id: 'trinomio_x2_bx_c', label: 'Trinomio x² + bx + c' },
    { id: 'trinomio_cuadrado_perfecto', label: 'Trinomio cuadrado perfecto' },
    { id: 'trinomio_ax2_bx_c', label: 'Trinomio ax² + bx + c' },
    { id: 'factor_comun_agrupacion', label: 'Agrupación' },
    { id: 'potencias_diferencia_general', label: 'Potencias n-ésimas' },
    { id: 'operacion_compuesta', label: 'Operaciones entre cocientes' },
    { id: 'no_notable_o_no_factorizable', label: 'Casos trampa / Comprobación' },
  ];

  const filteredExercises = selectedCategory === 'all'
    ? PRESET_EXERCISES
    : PRESET_EXERCISES.filter((ex) => ex.category === selectedCategory);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-700" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Ejercicios Guiados de Demostración
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {filteredExercises.length} ejercicios disponibles
        </span>
      </div>

      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        Selecciona cualquiera de los ejercicios de la lista para cargarlo en el simulador y analizar su procedimiento paso a paso.
      </p>

      {/* Filtro por categorías */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 mr-0.5" />
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de ejercicios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredExercises.map((ex: PresetExercise) => {
          const isSelected = currentExpression.replace(/\s+/g, '') === ex.expression.replace(/\s+/g, '');
          const isTrap = ex.category === 'no_notable_o_no_factorizable';

          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => onSelectExercise(ex.expression)}
              className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-sky-50/60 border-sky-400 ring-1 ring-sky-300'
                  : 'bg-slate-50/50 hover:bg-white hover:border-slate-300 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-semibold text-slate-500">
                    {ex.categoryName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isTrap
                        ? 'bg-amber-100 text-amber-800'
                        : ex.difficulty === 'Básico'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ex.difficulty === 'Intermedio'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {ex.difficulty}
                  </span>
                </div>

                <div className="font-mono text-sm font-bold text-slate-900 tracking-tight my-1">
                  {ex.expression}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                  {ex.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-sky-700 font-semibold">
                <span>{isSelected ? 'Cargado en el simulador' : 'Probar este ejercicio'}</span>
                {isSelected ? (
                  <Check className="w-4 h-4 text-sky-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
