import {
  AnalysisResult,
  OperatorBetweenQuotients,
  StepExplanation,
  SubQuotientItem,
  WhyExplanation,
} from '../types/math';
import { analyzeQuotient } from './algebraEngine';
import { toLatex, normalizeExpression } from './mathParser';

/**
 * Representación de un término en una expresión compuesta.
 */
interface ParsedCompositeTerm {
  raw: string;
  operatorBefore: OperatorBetweenQuotients | null;
  isQuotient: boolean;
}

/**
 * Divide una expresión compuesta en términos y operadores principales a nivel superior.
 * Ejemplo:
 *  "(x^2 - 9)/(x - 3) + (x^2 - 25)/(x - 5)"
 *  => [
 *       { raw: "(x^2 - 9)/(x - 3)", operatorBefore: null },
 *       { raw: "(x^2 - 25)/(x - 5)", operatorBefore: '+' }
 *     ]
 */
export function splitCompositeExpression(input: string): ParsedCompositeTerm[] {
  const normalized = normalizeExpression(input).trim();
  if (!normalized) return [];

  const terms: ParsedCompositeTerm[] = [];
  let depth = 0;
  let currentStart = 0;
  let currentOp: OperatorBetweenQuotients | null = null;
  let sawSlashAtDepth0 = false;
  let inDenominator = false;
  let denomParenDepth = 0;

  let i = 0;
  // Comprobar si empieza con signo unario (+ o -)
  if (normalized[0] === '+' || normalized[0] === '-') {
    currentOp = normalized[0] as OperatorBetweenQuotients;
    i = 1;
    currentStart = 1;
  }

  for (; i < normalized.length; i++) {
    const ch = normalized[i];

    if (ch === '(') {
      depth++;
      if (inDenominator) {
        denomParenDepth++;
      }
    } else if (ch === ')') {
      depth--;
      if (inDenominator) {
        denomParenDepth--;
        if (denomParenDepth <= 0) {
          inDenominator = false;
        }
      }
    } else if (ch === '/' && depth === 0) {
      sawSlashAtDepth0 = true;
      inDenominator = true;
      denomParenDepth = 0;
    } else if (depth === 0) {
      // Verificar si nos encontramos en un operador de separación (+, -, *) fuera de paréntesis y fuera de denominador
      if (!inDenominator && (ch === '+' || ch === '-' || ch === '*')) {
        // Verificar que no sea un operador unario al inicio o tras otro operador
        const textBefore = normalized.slice(currentStart, i).trim();
        if (textBefore.length > 0) {
          // Extraer término previo
          terms.push({
            raw: cleanOuterParens(textBefore),
            operatorBefore: currentOp,
            isQuotient: textBefore.includes('/'),
          });
          currentOp = ch as OperatorBetweenQuotients;
          currentStart = i + 1;
          sawSlashAtDepth0 = false;
          inDenominator = false;
        }
      }
    }
  }

  // Último término
  const remaining = normalized.slice(currentStart).trim();
  if (remaining.length > 0) {
    terms.push({
      raw: cleanOuterParens(remaining),
      operatorBefore: currentOp,
      isQuotient: remaining.includes('/'),
    });
  }

  return terms;
}

/**
 * Quita paréntesis envolventes redundantes: ((A)/(B)) -> (A)/(B)
 */
function cleanOuterParens(expr: string): string {
  let str = expr.trim();
  while (str.startsWith('(') && str.endsWith(')')) {
    // Comprobar si el paréntesis exterior envuelve todo el bloque balanceadamente
    let depth = 0;
    let wrapsEntirely = true;
    for (let i = 0; i < str.length - 1; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      if (depth === 0) {
        wrapsEntirely = false;
        break;
      }
    }
    if (wrapsEntirely && depth === 1) {
      str = str.slice(1, -1).trim();
    } else {
      break;
    }
  }
  return str;
}

/**
 * Analiza un polinomio lineal o cuadrático a partir de su resultado simplificado (ej: "x + 3", "2x + 8", "x^2 + 2x + 4", "a + b", "5")
 * Devuelve un mapa de términos: clave ("x^2", "x", "a", "" para constante) -> coeficiente.
 */
function parseResultToPolynomial(str: string): Map<string, number> {
  const map = new Map<string, number>();
  const cleaned = str.replace(/\s+/g, '');
  if (!cleaned) return map;

  const termMatches = cleaned.match(/([+-]?[^+-]+)/g);
  if (!termMatches) return map;

  for (const t of termMatches) {
    const raw = t.trim();
    if (!raw) continue;

    // Caso cuadrático: ax^2
    const quadMatch = raw.match(/^([+-]?[0-9]*)\*?([a-zA-Z])\^2$/);
    if (quadMatch) {
      let coeff = 1;
      if (quadMatch[1] === '' || quadMatch[1] === '+') coeff = 1;
      else if (quadMatch[1] === '-') coeff = -1;
      else coeff = parseFloat(quadMatch[1]);
      const key = `${quadMatch[2]}^2`;
      map.set(key, (map.get(key) || 0) + coeff);
      continue;
    }

    // Caso lineal: ax
    const linMatch = raw.match(/^([+-]?[0-9]*)\*?([a-zA-Z])$/);
    if (linMatch) {
      let coeff = 1;
      if (linMatch[1] === '' || linMatch[1] === '+') coeff = 1;
      else if (linMatch[1] === '-') coeff = -1;
      else coeff = parseFloat(linMatch[1]);
      const key = linMatch[2];
      map.set(key, (map.get(key) || 0) + coeff);
      continue;
    }

    // Caso constante: c
    const constVal = parseFloat(raw);
    if (!isNaN(constVal)) {
      map.set('', (map.get('') || 0) + constVal);
    } else {
      // Clave genérica para términos no parseados
      map.set(raw, (map.get(raw) || 0) + 1);
    }
  }

  return map;
}

/**
 * Suma o resta dos polinomios: P1 ± P2
 */
function combinePolynomials(
  p1: Map<string, number>,
  p2: Map<string, number>,
  sign: 1 | -1
): Map<string, number> {
  const res = new Map<string, number>(p1);
  for (const [key, val] of p2.entries()) {
    res.set(key, (res.get(key) || 0) + sign * val);
  }
  return res;
}

/**
 * Multiplica dos polinomios lineales o simples de 1 variable
 */
function multiplySimplePolynomials(
  p1: Map<string, number>,
  p2: Map<string, number>,
  v: string = 'x'
): Map<string, number> {
  const res = new Map<string, number>();

  for (const [k1, c1] of p1.entries()) {
    for (const [k2, c2] of p2.entries()) {
      const prod = c1 * c2;
      // Determinar grado de k1
      const d1 = k1 === `${v}^2` ? 2 : k1 === v ? 1 : k1 === '' ? 0 : 0;
      const d2 = k2 === `${v}^2` ? 2 : k2 === v ? 1 : k2 === '' ? 0 : 0;
      const dTotal = d1 + d2;

      let key = '';
      if (dTotal === 0) key = '';
      else if (dTotal === 1) key = v;
      else if (dTotal === 2) key = `${v}^2`;
      else key = `${v}^${dTotal}`;

      res.set(key, (res.get(key) || 0) + prod);
    }
  }

  return res;
}

/**
 * Convierte un mapa de términos a string algebraico ordenado: "2x + 8", "x^2 + 3x + 6", "1", "0"
 */
function formatPolynomialToString(poly: Map<string, number>): string {
  // Ordenar claves: potencias más altas primero, luego lineales, luego constantes
  const keys = Array.from(poly.keys()).sort((a, b) => {
    const isConstA = a === '';
    const isConstB = b === '';
    if (isConstA && !isConstB) return 1;
    if (!isConstA && isConstB) return -1;

    const degA = a.includes('^') ? parseInt(a.split('^')[1], 10) : a !== '' ? 1 : 0;
    const degB = b.includes('^') ? parseInt(b.split('^')[1], 10) : b !== '' ? 1 : 0;
    if (degA !== degB) return degB - degA;
    return a.localeCompare(b);
  });

  const parts: string[] = [];

  for (const k of keys) {
    const coeff = poly.get(k) || 0;
    if (Math.abs(coeff) < 1e-7) continue;

    if (k === '') {
      // Constante
      const signStr = coeff > 0 ? (parts.length > 0 ? '+ ' : '') : '- ';
      parts.push(`${signStr}${Math.abs(coeff)}`);
    } else {
      // Término con variable
      let coeffStr = '';
      if (coeff === 1) coeffStr = parts.length > 0 ? '+ ' : '';
      else if (coeff === -1) coeffStr = '- ';
      else if (coeff > 0) coeffStr = parts.length > 0 ? `+ ${coeff}` : `${coeff}`;
      else coeffStr = `- ${Math.abs(coeff)}`;

      parts.push(`${coeffStr}${k}`);
    }
  }

  if (parts.length === 0) return '0';
  return parts.join(' ').trim();
}

/**
 * Resuelve expresiones compuestas con múltiples cocientes notables operando entre sí.
 * Ejemplos:
 *  - (x^2 - 9)/(x - 3) + (x^2 - 25)/(x - 5)
 *  - (x^2 - 16)/(x + 4) - (x^2 - 9)/(x - 3)
 *  - (x^3 - 8)/(x - 2) + (x^2 - 4)/(x - 2)
 */
export function analyzeCompositeOrSingle(input: string): AnalysisResult {
  const compositeTerms = splitCompositeExpression(input);

  // Si sólo hay un término o no tiene operadores entre términos, resolver con el motor clásico
  if (compositeTerms.length <= 1) {
    return analyzeQuotient(input);
  }

  // Hay múltiples términos: resolver cada cociente por separado
  const subQuotientItems: SubQuotientItem[] = [];
  const allRestrictions: string[] = [];
  const restrictionsExplanations: string[] = [];
  const methodsUsed: string[] = [];
  let detectedVariable = 'x';

  for (let idx = 0; idx < compositeTerms.length; idx++) {
    const item = compositeTerms[idx];
    const subAnalysis = analyzeQuotient(item.raw);

    // Si algún cociente es inválido o no se puede resolver
    if (!subAnalysis.isValid) {
      return {
        ...subAnalysis,
        errorMessage: `En el término ${idx + 1} ("${item.raw}"): ${subAnalysis.errorMessage}`,
        errorSuggestion: subAnalysis.errorSuggestion,
      };
    }

    subQuotientItems.push({
      id: `term-${idx + 1}`,
      index: idx + 1,
      rawExpression: item.raw,
      operatorBefore: item.operatorBefore,
      analysis: subAnalysis,
    });

    // Acumular restricciones sin duplicados
    for (const r of subAnalysis.restrictions) {
      if (!allRestrictions.includes(r)) {
        allRestrictions.push(r);
      }
    }
    if (subAnalysis.restrictionsExplanation) {
      restrictionsExplanations.push(`Término ${idx + 1}: ${subAnalysis.restrictionsExplanation}`);
    }

    if (!methodsUsed.includes(subAnalysis.methodName)) {
      methodsUsed.push(subAnalysis.methodName);
    }
  }

  // -------------------------------------------------------------------------
  // OPERAR POLINOMIOS RESULTANTES
  // -------------------------------------------------------------------------
  let runningPoly: Map<string, number> = new Map();
  const substitutedParts: string[] = [];
  const expansionFormulaParts: string[] = [];

  for (let idx = 0; idx < subQuotientItems.length; idx++) {
    const item = subQuotientItems[idx];
    const op = item.operatorBefore;
    const termPoly = parseResultToPolynomial(item.analysis.simplifiedResult);

    // Formatear para KaTeX con paréntesis si tiene múltiples términos
    const simpResult = item.analysis.simplifiedResult;
    const needsParen = simpResult.includes('+') || simpResult.includes('-');
    const formattedTerm = needsParen ? `(${simpResult})` : simpResult;

    if (idx === 0) {
      if (op === '-') {
        runningPoly = combinePolynomials(runningPoly, termPoly, -1);
        substitutedParts.push(`- ${formattedTerm}`);
        expansionFormulaParts.push(negatePolynomialString(simpResult));
      } else {
        runningPoly = termPoly;
        substitutedParts.push(formattedTerm);
        expansionFormulaParts.push(simpResult);
      }
    } else {
      const opSign = op || '+';
      if (opSign === '+') {
        runningPoly = combinePolynomials(runningPoly, termPoly, 1);
        substitutedParts.push(`+ ${formattedTerm}`);
        expansionFormulaParts.push(`+ ${simpResult}`);
      } else if (opSign === '-') {
        runningPoly = combinePolynomials(runningPoly, termPoly, -1);
        substitutedParts.push(`- ${formattedTerm}`);
        // Al restar, se invierten los signos del polinomio
        expansionFormulaParts.push(negatePolynomialString(simpResult));
      } else if (opSign === '*') {
        runningPoly = multiplySimplePolynomials(runningPoly, termPoly, detectedVariable);
        substitutedParts.push(`\\cdot ${formattedTerm}`);
      }
    }
  }

  const finalSimplifiedResult = formatPolynomialToString(runningPoly);
  const substitutedExpression = substitutedParts.join(' ');
  const expandedExpression = expansionFormulaParts.join(' ');

  // Crear la expresión completa en KaTeX
  const overallLatexParts = subQuotientItems.map((q, i) => {
    const op = q.operatorBefore ? (q.operatorBefore === '*' ? ' \\cdot ' : ` ${q.operatorBefore} `) : '';
    return `${op}\\left( \\frac{${q.analysis.numeratorFormatted}}{${q.analysis.denominatorFormatted}} \\right)`;
  });
  const overallLatex = overallLatexParts.join('');

  // -------------------------------------------------------------------------
  // GENERAR PASOS PEDAGÓGICOS GRADUALES
  // -------------------------------------------------------------------------
  const steps: StepExplanation[] = [];
  let stepNum = 1;

  // PASO 1: Identificar la operación compuesta
  steps.push({
    stepNumber: stepNum++,
    title: 'Identificar la operación compuesta entre cocientes notables',
    description: `Tenemos una expresión compuesta formada por ${subQuotientItems.length} cocientes notables operando entre sí (${subQuotientItems.map((q, i) => `Cociente ${i + 1}`).join(' y ')}). La estrategia pedagógica consiste en resolver primero cada cociente notable de forma individual y luego realizar la operación algebraica resultante.`,
    mathExpression: overallLatex,
    isEssential: true,
    teacherTip: 'Antes de realizar la suma o resta, debemos simplificar cada fracción por separado factorizando sus numeradores.',
  });

  // PASOS PARA CADA COCIENTE NOTABLE
  subQuotientItems.forEach((item, idx) => {
    const qAnalysis = item.analysis;
    const qNumber = idx + 1;

    steps.push({
      stepNumber: stepNum++,
      title: `Resolver el Cociente Notable ${qNumber}: \\frac{${qAnalysis.numeratorFormatted}}{${qAnalysis.denominatorFormatted}}`,
      description: `Analizamos el término ${qNumber}. El numerador ${qAnalysis.numeratorFormatted} se factoriza mediante "${qAnalysis.methodName}": ${qAnalysis.factoredNumerator}. Al colocarlo en la fracción, se cancela el factor común ${qAnalysis.commonFactor}, dando como resultado parcial: ${qAnalysis.simplifiedResult}.`,
      mathExpression: `\\frac{${qAnalysis.numeratorFormatted}}{${qAnalysis.denominatorFormatted}} = ${qAnalysis.canceledExpression} = ${qAnalysis.simplifiedResult}`,
      isEssential: true,
      whyExplanation: {
        title: `¿Cómo se resolvió el Cociente ${qNumber}?`,
        question: `¿Por qué ${qAnalysis.numeratorFormatted} se simplifica a ${qAnalysis.simplifiedResult}?`,
        answer: `El numerador corresponde a ${qAnalysis.methodName}. Se expresa como producto de factores: ${qAnalysis.factoredNumerator}. Como el factor ${qAnalysis.commonFactor} divide exactamente al numerador y al denominador, la razón es igual a 1, dejando ${qAnalysis.simplifiedResult}.`,
        mathFormula: qAnalysis.generalFormula,
      },
      teacherTip: `Restricción del Cociente ${qNumber}: ${qAnalysis.restrictions.join(', ')} porque el denominador no puede anularse.`,
    });
  });

  // PASO DE SUSTITUCIÓN
  steps.push({
    stepNumber: stepNum++,
    title: 'Sustituir los cocientes simplificados en la operación',
    description: `Reemplazamos cada cociente notable original por su respectivo resultado simplificado, conservando los paréntesis para respetar los signos de las operaciones:`,
    mathExpression: substitutedExpression,
    isEssential: true,
    whyExplanation: {
      title: '¿Por qué conservamos los paréntesis al sustituir?',
      question: '¿Por qué es fundamental no omitir los paréntesis de cada término?',
      answer:
        'Conservar los paréntesis protege la jerarquía de las operaciones. En particular, si hay un signo menos (-), este afecta y cambia el signo de TODOS los términos que estén dentro del paréntesis siguiente: -(A + B) = -A - B.',
      mathFormula: '-(A + B) = -A - B',
    },
  });

  // PASO DE REDUCCIÓN DE TÉRMINOS SEMEJANTES
  steps.push({
    stepNumber: stepNum++,
    title: 'Suprimir signos de agrupación y reducir términos semejantes',
    description: `Eliminamos los paréntesis aplicando la ley de signos correspondientes y agrupamos los términos semejantes (variables con igual exponente y constantes numéricas):`,
    mathExpression: `${substitutedExpression} = ${expandedExpression} = ${finalSimplifiedResult}`,
    isEssential: true,
    teacherTip: 'Agrupa las variables por un lado y los números constantes por el otro.',
  });

  // PASO DE CONSOLIDACIÓN DE RESTRICCIONES
  const combinedRestrictionsText = allRestrictions.join(' \\quad \\text{y} \\quad ');
  steps.push({
    stepNumber: stepNum++,
    title: 'Consolidación de las restricciones del dominio',
    description: `Para que la expresión compuesta sea válida en los números reales, NINGUNO de los denominadores originales de ningún cociente puede ser igual a cero. Unimos todas las restricciones individuales encontradas:`,
    mathExpression: combinedRestrictionsText,
    isEssential: true,
    whyExplanation: {
      title: '¿Por qué se deben conservar todas las restricciones?',
      question: '¿Por qué siguen vigentes las restricciones si los denominadores ya desaparecieron?',
      answer:
        'Aunque la expresión final simplificada sea un polinomio que aparentemente admite cualquier valor real, la equivalencia con la expresión original exige que la operación esté definida desde el inicio. Si sustituyéramos un valor restringido en la expresión inicial, provocaría una división entre cero.',
      mathFormula: '\\text{Dominio: } \\mathbb{R} \\setminus \\{ \\text{valores restringidos} \\}',
    },
  });

  // PASO FINAL
  steps.push({
    stepNumber: stepNum++,
    title: 'Resultado final de la operación compuesta',
    description: `Presentamos el polinomio simplificado final con su método global y su conjunto completo de restricciones:`,
    mathExpression: `\\mathbf{Resultado: } ${finalSimplifiedResult} \\quad \\text{con } ${combinedRestrictionsText}`,
    isEssential: true,
  });

  const combinedMethodsName = `Operación combinada (${methodsUsed.join(' + ')})`;

  return {
    isQuotient: true,
    isComposite: true,
    subQuotients: subQuotientItems,
    compositeOperationFormula: overallLatex,
    substitutedFormula: substitutedExpression,
    isValid: true,
    originalInput: input,
    numeratorRaw: subQuotientItems.map((q) => q.rawExpression).join(' '),
    denominatorRaw: '',
    numeratorFormatted: overallLatex,
    denominatorFormatted: '',
    methodId: 'diferencia_cuadrados', // Id base
    methodName: combinedMethodsName,
    methodDescription: `Operación algebraica entre ${subQuotientItems.length} cocientes notables resueltos individualmente por factorización y combinados mediante reducción de términos semejantes.`,
    generalFormula: subQuotientItems.map((q) => q.analysis.generalFormula).filter(Boolean).join(' \\quad \\text{y} \\quad '),
    factoredNumerator: subQuotientItems.map((q) => `[${q.analysis.factoredNumerator}]`).join(' '),
    commonFactor: subQuotientItems.map((q) => q.analysis.commonFactor).join(', '),
    canceledExpression: substitutedExpression,
    simplifiedResult: finalSimplifiedResult,
    restrictions: allRestrictions,
    restrictionsExplanation: `El dominio exige que ningún denominador original se anule: ${allRestrictions.join(', ')}.`,
    steps,
    canBeFactoredFurther: false,
  };
}

/**
 * Invierte los signos de un polinomio (para resta con paréntesis): (x + 3) -> - x - 3
 */
function negatePolynomialString(str: string): string {
  const poly = parseResultToPolynomial(str);
  const negated = new Map<string, number>();
  for (const [k, v] of poly.entries()) {
    negated.set(k, -v);
  }
  return formatPolynomialToString(negated);
}
