export type FactorizationMethodId =
  | 'diferencia_cuadrados'
  | 'diferencia_cubos'
  | 'suma_cubos'
  | 'potencias_diferencia_general'
  | 'potencias_suma_impar'
  | 'trinomio_x2_bx_c'
  | 'trinomio_cuadrado_perfecto'
  | 'trinomio_ax2_bx_c'
  | 'factor_comun_agrupacion'
  | 'no_notable_o_no_factorizable';

export interface WhyExplanation {
  title: string;
  question: string;
  answer: string;
  mathFormula?: string;
  commonMistake?: string;
}

export interface StepExplanation {
  stepNumber: number;
  title: string;
  description: string;
  mathExpression: string; // KaTeX format
  isEssential: boolean; // For 'resumida' view
  highlightFactor?: string;
  whyExplanation?: WhyExplanation;
  teacherTip?: string;
}

export type OperatorBetweenQuotients = '+' | '-' | '*';

export interface SubQuotientItem {
  id: string;
  index: number;
  rawExpression: string;
  operatorBefore: OperatorBetweenQuotients | null;
  analysis: AnalysisResult;
}

export interface AnalysisResult {
  isQuotient: boolean;
  isComposite?: boolean;
  subQuotients?: SubQuotientItem[];
  compositeOperationFormula?: string; // KaTeX showing [Q1] + [Q2]
  substitutedFormula?: string; // KaTeX showing (x+3) + (x+5)
  isValid: boolean;
  originalInput: string;
  numeratorRaw: string;
  denominatorRaw: string;
  numeratorFormatted: string; // KaTeX
  denominatorFormatted: string; // KaTeX
  methodId: FactorizationMethodId;
  methodName: string;
  methodDescription: string;
  generalFormula: string; // KaTeX general rule
  factoredNumerator: string; // KaTeX
  commonFactor: string; // KaTeX (the factor being canceled)
  canceledExpression: string; // KaTeX with strike
  simplifiedResult: string; // KaTeX
  restrictions: string[]; // e.g., ["x \\neq 3"]
  restrictionsExplanation: string;
  steps: StepExplanation[];
  errorMessage?: string;
  errorSuggestion?: string;
  canBeFactoredFurther: boolean;
}

export interface PresetExercise {
  id: string;
  title: string;
  expression: string;
  category: string;
  categoryName: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  description: string;
  methodName: string;
}
