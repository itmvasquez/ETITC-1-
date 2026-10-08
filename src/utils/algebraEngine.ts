import { AnalysisResult, StepExplanation, WhyExplanation, FactorizationMethodId } from '../types/math';
import { parseFractionInput, toLatex, normalizeExpression } from './mathParser';

/**
 * Motor algebraico y pedagógico de Cocientes Notables y Factorización.
 */

// Helper para redondear floats en parsing
function isInteger(n: number): boolean {
  return Math.abs(n - Math.round(n)) < 1e-7;
}

// Analizador de monomio ax^n o bx o c
interface Monomial {
  coeff: number;
  variable: string;
  power: number;
}

// Helper para parsear polinomios simples en 1 variable (ej. x, y, a, m, etc.)
function parsePolynomial(str: string, preferredVar?: string): { variable: string; coeffs: Map<number, number> } | null {
  const cleaned = str.replace(/\s+/g, '');
  // Detectar variable principal (primera letra encontrada o variable preferida)
  let variable = preferredVar;
  if (!variable) {
    const varMatch = cleaned.match(/[a-zA-Z]/);
    variable = varMatch ? varMatch[0] : 'x';
  }

  const coeffs = new Map<number, number>();
  // Reemplazar signos para dividir por términos
  const termRegex = /([+-]?[^+-]+)/g;
  const terms = cleaned.match(termRegex);
  if (!terms) return null;

  for (const t of terms) {
    const term = t.trim();
    if (!term) continue;

    const regexWithVar = new RegExp(`^([+-]?[0-9]*)\\*?${variable}(\\^([0-9]+))?$`);
    const matchVar = term.match(regexWithVar);

    if (matchVar) {
      let rawCoeff = matchVar[1];
      let coeff = 1;
      if (rawCoeff === '' || rawCoeff === '+') coeff = 1;
      else if (rawCoeff === '-') coeff = -1;
      else coeff = parseFloat(rawCoeff);

      const power = matchVar[3] ? parseInt(matchVar[3], 10) : 1;
      coeffs.set(power, (coeffs.get(power) || 0) + coeff);
    } else {
      // Término constante sin variable
      const constVal = parseFloat(term);
      if (!isNaN(constVal)) {
        coeffs.set(0, (coeffs.get(0) || 0) + constVal);
      } else {
        // Podría ser múltiple variable o expresión compuesta
        return null;
      }
    }
  }

  return { variable, coeffs };
}

/**
 * Analiza el cociente notable y genera la explicación paso a paso completa.
 */
export function analyzeQuotient(input: string): AnalysisResult {
  const parsed = parseFractionInput(input);

  if (!parsed.isValidStructure) {
    return createErrorResult(
      input,
      parsed.error || 'La expresión no tiene un formato válido de cociente.',
      'Asegúrate de escribir la expresión como: (numerador) / (denominador), por ejemplo (x² - 9)/(x - 3).'
    );
  }

  const numRaw = parsed.numeratorRaw;
  const denRaw = parsed.denominatorRaw;

  // CASO ESPECIAL: Agrupación con múltiples variables (ej: (ax + bx + ay + by)/(a + b))
  const groupingResult = checkGroupingMultivar(numRaw, denRaw, input);
  if (groupingResult) return groupingResult;

  // CASO ESPECIAL: Agrupación en 1 variable cúbica (ej: (x^3 + 2x^2 + 3x + 6)/(x + 2))
  const groupingCubicResult = checkGroupingCubic(numRaw, denRaw, input);
  if (groupingCubicResult) return groupingCubicResult;

  // Polinomios estándar en 1 variable (soporta x, y, a, b, m, z, etc.)
  const polyNum = parsePolynomial(numRaw);
  const polyDen = polyNum ? parsePolynomial(denRaw, polyNum.variable) : parsePolynomial(denRaw);

  if (!polyNum || !polyDen) {
    // Si no se puede parsear como polinomio de 1 variable, verificar patrones algebraicos literales
    const literalResult = checkLiteralPatterns(numRaw, denRaw, input);
    if (literalResult) return literalResult;

    return createErrorResult(
      input,
      'No se reconoce como un cociente notable utilizando los métodos configurados.',
      'Verifica la notación de variables y coeficientes. Recuerda que los cocientes notables relacionan patrones como a² - b² con a ± b, o polinomios factorizables.'
    );
  }

  const v = polyNum.variable;
  const aDen = polyDen.coeffs.get(1) || 0;
  const cDen = polyDen.coeffs.get(0) || 0;
  const degDen = Math.max(...Array.from(polyDen.coeffs.keys()), 0);

  // Verificar que el denominador sea de grado 1 (forma estándar de cocientes notables básicos)
  if (degDen !== 1 || aDen === 0) {
    return createErrorResult(
      input,
      'El denominador no es un binomio lineal de la forma (x ± c) o (ax ± c).',
      'Los cocientes notables elementales se dividen entre factores lineales como (x - 3) o (2x + 1).'
    );
  }

  // Raíz del denominador: aDen * x + cDen = 0 => x = -cDen / aDen
  const denRoot = -cDen / aDen;
  const denRootFormatted = formatNumber(denRoot);
  const restriction = `${v} \\neq ${denRootFormatted}`;
  const restrictionsExplanation = `El denominador original no puede ser cero: ${toLatex(denRaw)} \\neq 0 \\implies ${v} \\neq ${denRootFormatted}.`;

  const degNum = Math.max(...Array.from(polyNum.coeffs.keys()), 0);

  // 1. CASO: DIFERENCIA DE CUADRADOS: a² - b² / (a ± b)
  if (degNum === 2 && (polyNum.coeffs.get(1) || 0) === 0) {
    const a2 = polyNum.coeffs.get(2) || 0;
    const negC = polyNum.coeffs.get(0) || 0;

    // Verificar si es suma de cuadrados (trampa común)
    if (negC > 0 && a2 > 0) {
      return createSumOfSquaresTrap(input, numRaw, denRaw, v, a2, negC);
    }

    if (a2 > 0 && negC < 0) {
      const b2 = -negC;
      const sqrtA = Math.sqrt(a2);
      const sqrtB = Math.sqrt(b2);

      if (isInteger(sqrtA) && isInteger(sqrtB)) {
        return buildDifferenceOfSquares(input, numRaw, denRaw, v, Math.round(sqrtA), Math.round(sqrtB), aDen, cDen, restriction, restrictionsExplanation);
      }
    }
  }

  // 2. CASO: TRINOMIO CUADRADO PERFECTO o TRINOMIO x² + bx + c o ax² + bx + c
  if (degNum === 2) {
    const a = polyNum.coeffs.get(2) || 0;
    const b = polyNum.coeffs.get(1) || 0;
    const c = polyNum.coeffs.get(0) || 0;

    if (a !== 0) {
      // Discriminante
      const disc = b * b - 4 * a * c;

      // 2A. Trinomio Cuadrado Perfecto: b² - 4ac == 0
      if (Math.abs(disc) < 1e-7 && a > 0 && c > 0) {
        const sqrtA = Math.sqrt(a);
        const sqrtC = Math.sqrt(c);
        if (isInteger(sqrtA) && isInteger(sqrtC)) {
          const signK = b > 0 ? 1 : -1;
          const k = Math.round(sqrtC) * signK;
          const m = Math.round(sqrtA);
          return buildTrinomioCuadradoPerfecto(input, numRaw, denRaw, v, m, k, aDen, cDen, restriction, restrictionsExplanation);
        }
      }

      // 2B. Trinomio x² + bx + c (cuando a == 1)
      if (a === 1 && disc >= 0) {
        const sqrtD = Math.sqrt(disc);
        if (isInteger(sqrtD)) {
          const r1 = (-b + sqrtD) / 2;
          const r2 = (-b - sqrtD) / 2;
          // Factores: (x - r1)(x - r2) => (x + p)(x + q) con p = -r1, q = -r2
          const p = -r1;
          const q = -r2;
          return buildTrinomioX2BxC(input, numRaw, denRaw, v, b, c, Math.round(p), Math.round(q), aDen, cDen, restriction, restrictionsExplanation);
        }
      }

      // 2C. Trinomio ax² + bx + c (cuando a != 1)
      if (a !== 1 && disc >= 0) {
        const sqrtD = Math.sqrt(disc);
        if (isInteger(sqrtD)) {
          return buildTrinomioAx2BxC(input, numRaw, denRaw, v, a, b, c, aDen, cDen, restriction, restrictionsExplanation);
        }
      }
    }
  }

  // 3. CASO: DIFERENCIA O SUMA DE CUBOS: x³ ± c³ / (x ± c)
  if (degNum === 3 && (polyNum.coeffs.get(2) || 0) === 0 && (polyNum.coeffs.get(1) || 0) === 0) {
    const a3 = polyNum.coeffs.get(3) || 0;
    const constTerm = polyNum.coeffs.get(0) || 0;

    if (a3 > 0 && constTerm !== 0) {
      const cbrtA = Math.cbrt(a3);
      const absC = Math.abs(constTerm);
      const cbrtC = Math.cbrt(absC);

      if (isInteger(cbrtA) && isInteger(cbrtC)) {
        const isSum = constTerm > 0;
        return buildCubes(
          input,
          numRaw,
          denRaw,
          v,
          Math.round(cbrtA),
          Math.round(cbrtC),
          isSum,
          aDen,
          cDen,
          restriction,
          restrictionsExplanation
        );
      }
    }
  }

  // 4. CASO: FORMA GENERAL DE DIFERENCIA O SUMA DE POTENCIAS: (a^n ± b^n) / (a ± b) con n >= 4
  if (degNum >= 4) {
    let hasIntermediateTerms = false;
    for (let p = 1; p < degNum; p++) {
      if ((polyNum.coeffs.get(p) || 0) !== 0) {
        hasIntermediateTerms = true;
        break;
      }
    }

    if (!hasIntermediateTerms) {
      const an = polyNum.coeffs.get(degNum) || 0;
      const constTerm = polyNum.coeffs.get(0) || 0;

      if (an === 1 && constTerm !== 0) {
        const n = degNum;
        const absC = Math.abs(constTerm);
        const rootB = Math.round(Math.pow(absC, 1 / n));

        if (Math.abs(Math.pow(rootB, n) - absC) < 1e-5) {
          const isSum = constTerm > 0;
          return buildGeneralPowers(
            input,
            numRaw,
            denRaw,
            v,
            rootB,
            n,
            isSum,
            aDen,
            cDen,
            restriction,
            restrictionsExplanation
          );
        }
      }
    }
  }

  // Si no coincidió con ningún patrón exacto:
  return createNoMatchDiagnostic(input, numRaw, denRaw, v, polyNum, polyDen);
}

// -------------------------------------------------------------
// CONSTRUCTORES DE CASOS PEDAGÓGICOS
// -------------------------------------------------------------

function buildDifferenceOfSquares(
  input: string,
  numRaw: string,
  denRaw: string,
  v: string,
  a: number,
  b: number,
  aDen: number,
  cDen: number,
  restriction: string,
  restrictionsExplanation: string
): AnalysisResult {
  const termA = a === 1 ? v : `${a}${v}`;
  const termA2 = a === 1 ? `${v}^2` : `(${a}${v})^2`;
  const termB2 = `${b}^2`;
  const squareBVal = b * b;

  // Factorización: (termA - b)(termA + b)
  const factorMinus = a === 1 ? `(${v} - ${b})` : `(${a}${v} - ${b})`;
  const factorPlus = a === 1 ? `(${v} + ${b})` : `(${a}${v} + ${b})`;

  // Determinar si el denominador coincide con factorMinus o factorPlus
  let matchingFactor = '';
  let remainingFactor = '';

  const isMinusDenom = aDen === a && cDen === -b;
  const isPlusDenom = aDen === a && cDen === b;

  if (isMinusDenom) {
    matchingFactor = factorMinus;
    remainingFactor = a === 1 ? `${v} + ${b}` : `${a}${v} + ${b}`;
  } else if (isPlusDenom) {
    matchingFactor = factorPlus;
    remainingFactor = a === 1 ? `${v} - ${b}` : `${a}${v} - ${b}`;
  } else {
    // El denominador no coincide con ningún factor
    return createMismatchResult(
      input,
      numRaw,
      denRaw,
      'Diferencia de cuadrados',
      `${factorMinus}${factorPlus}`,
      `El numerador se factoriza como ${factorMinus}${factorPlus}, pero el denominador es (${toLatex(denRaw)}), por lo que no comparten un factor idéntico para simplificar directamente.`
    );
  }

  const steps: StepExplanation[] = [
    {
      stepNumber: 1,
      title: 'Identificar la expresión',
      description: 'Tenemos un cociente formado por un numerador y un denominador.',
      mathExpression: `\\frac{${toLatex(numRaw)}}{${toLatex(denRaw)}}`,
      isEssential: true,
      teacherTip: 'Antes de simplificar, debemos comprobar si el numerador puede factorizarse.',
    },
    {
      stepNumber: 2,
      title: 'Separar numerador y denominador',
      description: 'Analizamos cada componente por separado para estudiar su estructura algebraica.',
      mathExpression: `\\text{Numerador: } ${toLatex(numRaw)} \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
      isEssential: true,
    },
    {
      stepNumber: 3,
      title: 'Identificar el patrón de factorización',
      description: `Observamos que el numerador tiene dos términos separados por un signo menos, y ambos son cuadrados perfectos: ${toLatex(numRaw)} = ${termA2} - ${termB2}. Esto corresponde a una Diferencia de cuadrados.`,
      mathExpression: `a^2 - b^2 = (a - b)(a + b)`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué es una diferencia de cuadrados?',
        question: '¿Cómo sabemos con certeza que es una diferencia de cuadrados?',
        answer: `Tiene exactamente dos condiciones: 1) Dos términos restándose. 2) Ambos términos tienen raíz cuadrada exacta: \\sqrt{${a === 1 ? `${v}^2` : `${a * a}${v}^2`}} = ${termA} y \\sqrt{${squareBVal}} = ${b}. Por la propiedad distributiva inversa, (a - b)(a + b) = a^2 + ab - ab - b^2 = a^2 - b^2.`,
        mathFormula: `(a - b)(a + b) = a^2 - b^2`,
        commonMistake: `¡Cuidado! No confundir con el cuadrado de una resta: (x - ${b})^2 = x^2 - 2(${b})x + ${squareBVal}. Una diferencia de cuadrados no tiene término intermedio.`,
      },
      teacherTip: `Observa que primero expresamos ${squareBVal} como ${b}^2 para reconocer con claridad las bases a y b.`,
    },
    {
      stepNumber: 4,
      title: 'Factorizar el numerador paso a paso',
      description: `Reescribimos cada término como una potencia cuadrada y aplicamos la fórmula con a = ${termA} y b = ${b}.`,
      mathExpression: `${toLatex(numRaw)} = ${termA2} - ${termB2} = ${factorMinus}${factorPlus}`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué factorizamos antes de simplificar?',
        question: '¿Por qué no podemos simplemente cancelar las variables al principio?',
        answer: 'En álgebra elemental, una fracción solo se simplifica cancelando factores que estén multiplicando a todo el numerador y a todo el denominador. Nunca se pueden cancelar términos que estén sumando o restando de forma aislada.',
        mathFormula: '\\frac{A \\cdot B}{A} = B \\quad \\text{pero} \\quad \\frac{A + B}{A} \\neq B',
      },
    },
    {
      stepNumber: 5,
      title: 'Sustituir la factorización dentro del cociente',
      description: 'Reemplazamos el numerador original por su forma factorizada dentro de la fracción.',
      mathExpression: `\\frac{${factorMinus}${factorPlus}}{${toLatex(denRaw)}}`,
      isEssential: true,
    },
    {
      stepNumber: 6,
      title: 'Explicar la simplificación y registrar la restricción',
      description: `Se cancela el factor ${matchingFactor} porque aparece multiplicando en el numerador y en el denominador. No estamos "borrando" términos al azar: cualquier cantidad no nula dividida entre sí misma es igual a 1. Además, el denominador original no puede ser cero, lo que genera la restricción matemática.`,
      mathExpression: `\\frac{${isMinusDenom ? `\\cancel{${factorMinus}}${factorPlus}` : `${factorMinus}\\cancel{${factorPlus}}`}}{\\cancel{${toLatex(denRaw)}}} = ${remainingFactor}`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué se puede cancelar el factor y por qué la restricción?',
        question: `¿Por qué ${matchingFactor}/${matchingFactor} desaparece y por qué ${restriction}?`,
        answer: `Cualquier expresión M dividida entre M es igual a 1 (M/M = 1), siempre que M ≠ 0. Por lo tanto, (${matchingFactor} · ${remainingFactor}) / ${matchingFactor} = 1 · (${remainingFactor}) = ${remainingFactor}. Sin embargo, si ${v} = ${-cDen / aDen}, el denominador original sería cero (división no definida). Por eso la equivalencia es válida únicamente bajo la restricción ${restriction}.`,
        mathFormula: `\\frac{M}{M} = 1 \\quad (M \\neq 0)`,
        commonMistake: `Nunca digas simplemente "se eliminan". Explica que la división de un factor por sí mismo da 1, y multiplicar por 1 deja inalterada la otra parte.`,
      },
      teacherTip: 'El objetivo fundamental siempre es encontrar factores comunes multiplicando arriba y abajo.',
    },
    {
      stepNumber: 7,
      title: 'Resultado final y método utilizado',
      description: 'Expresamos el resultado simplificado acompañado del método y las restricciones.',
      mathExpression: `\\mathbf{Resultado: } ${remainingFactor} \\quad \\text{con restricción: } ${restriction}`,
      isEssential: true,
    },
  ];

  return {
    isQuotient: true,
    isValid: true,
    originalInput: input,
    numeratorRaw: numRaw,
    denominatorRaw: denRaw,
    numeratorFormatted: toLatex(numRaw),
    denominatorFormatted: toLatex(denRaw),
    methodId: 'diferencia_cuadrados',
    methodName: 'Diferencia de cuadrados',
    methodDescription: 'Factorización de binomios de la forma a² - b² = (a - b)(a + b) y simplificación del factor común.',
    generalFormula: 'a^2 - b^2 = (a - b)(a + b)',
    factoredNumerator: `${factorMinus}${factorPlus}`,
    commonFactor: matchingFactor,
    canceledExpression: `\\frac{${isMinusDenom ? `\\cancel{${factorMinus}}${factorPlus}` : `${factorMinus}\\cancel{${factorPlus}}`}}{\\cancel{${toLatex(denRaw)}}}`,
    simplifiedResult: remainingFactor,
    restrictions: [restriction],
    restrictionsExplanation,
    steps,
    canBeFactoredFurther: false,
  };
}

function buildCubes(
  input: string,
  numRaw: string,
  denRaw: string,
  v: string,
  a: number,
  b: number,
  isSum: boolean,
  aDen: number,
  cDen: number,
  restriction: string,
  restrictionsExplanation: string
): AnalysisResult {
  const methodName = isSum ? 'Suma de cubos' : 'Diferencia de cubos';
  const methodId: FactorizationMethodId = isSum ? 'suma_cubos' : 'diferencia_cubos';
  const sign = isSum ? '+' : '-';
  const oppositeSign = isSum ? '-' : '+';
  const generalFormula = isSum
    ? 'a^3 + b^3 = (a + b)(a^2 - ab + b^2)'
    : 'a^3 - b^3 = (a - b)(a^2 + ab + b^2)';

  const termA = a === 1 ? v : `${a}${v}`;
  const termA3 = a === 1 ? `${v}^3` : `(${a}${v})^3`;
  const termB3 = `${b}^3`;
  const b3Val = b * b * b;

  const binFactor = a === 1 ? `(${v} ${sign} ${b})` : `(${a}${v} ${sign} ${b})`;
  const a2Str = a === 1 ? `${v}^2` : `${a * a}${v}^2`;
  const abStr = a * b === 1 ? v : `${a * b}${v}`;
  const b2Val = b * b;
  const trinFactor = `(${a2Str} ${oppositeSign} ${abStr} + ${b2Val})`;

  // Denominador esperado
  const expectedC = isSum ? b : -b;
  if (aDen !== a || cDen !== expectedC) {
    return createMismatchResult(
      input,
      numRaw,
      denRaw,
      methodName,
      `${binFactor}${trinFactor}`,
      `El numerador se factoriza como ${binFactor}${trinFactor}, pero el denominador es (${toLatex(denRaw)}). Para ser un cociente notable directo, el denominador debía ser ${binFactor}.`
    );
  }

  const resultStr = `${a2Str} ${oppositeSign} ${abStr} + ${b2Val}`;

  const steps: StepExplanation[] = [
    {
      stepNumber: 1,
      title: 'Identificar la expresión',
      description: 'Tenemos un cociente formado por un numerador cúbico y un denominador lineal.',
      mathExpression: `\\frac{${toLatex(numRaw)}}{${toLatex(denRaw)}}`,
      isEssential: true,
      teacherTip: 'Observa que el numerador involucra potencias cúbicas (grado 3).',
    },
    {
      stepNumber: 2,
      title: 'Separar numerador y denominador',
      description: 'Extraemos el numerador y el denominador para analizar sus características.',
      mathExpression: `\\text{Numerador: } ${toLatex(numRaw)} \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
      isEssential: true,
    },
    {
      stepNumber: 3,
      title: 'Identificar el patrón de factorización',
      description: `El numerador ${toLatex(numRaw)} puede expresarse como ${termA3} ${sign} ${termB3}. Corresponde exactamente a una ${methodName}.`,
      mathExpression: generalFormula,
      isEssential: true,
      whyExplanation: {
        title: `¿Por qué se factoriza así una ${methodName.toLowerCase()}?`,
        question: `¿De dónde surge la fórmula (a ${sign} b)(a² ${oppositeSign} ab + b²)?`,
        answer: `Al multiplicar de forma distributiva: (a ${sign} b)(a² ${oppositeSign} ab + b²) los términos cruzados intermedios se anulan mutuamente, dejando únicamente a³ ${sign} b³.`,
        mathFormula: generalFormula,
        commonMistake: `Un error muy común es pensar que (a ${sign} b)³ = a³ ${sign} b³. ¡No es lo mismo! (a ${sign} b)³ genera 4 términos con coeficientes 1, 3, 3, 1.`,
      },
      teacherTip: `Observa que primero convertimos ${b3Val} en ${b}^3 para reconocer la base b = ${b}.`,
    },
    {
      stepNumber: 4,
      title: 'Factorizar el numerador paso a paso',
      description: `Reemplazamos con a = ${termA} y b = ${b} en la fórmula de ${methodName.toLowerCase()}:`,
      mathExpression: `${toLatex(numRaw)} = ${termA3} ${sign} ${termB3} = ${binFactor}${trinFactor}`,
      isEssential: true,
    },
    {
      stepNumber: 5,
      title: 'Sustituir la factorización en el cociente',
      description: 'Escribimos la fracción con el numerador factorizado:',
      mathExpression: `\\frac{${binFactor}${trinFactor}}{${toLatex(denRaw)}}`,
      isEssential: true,
    },
    {
      stepNumber: 6,
      title: 'Explicar la simplificación y registrar la restricción',
      description: `Se cancela el factor común ${binFactor} porque aparece multiplicando en el numerador y en el denominador. Además, registramos la restricción obligatoria porque el denominador no puede anularse.`,
      mathExpression: `\\frac{\\cancel{${binFactor}}${trinFactor}}{\\cancel{${toLatex(denRaw)}}} = ${resultStr}`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué se cancela y qué pasa con la restricción?',
        question: `¿Por qué desaparece ${binFactor}?`,
        answer: `Dividir un número entre sí mismo da 1: ${binFactor}/${binFactor} = 1 para todo valor excepto cuando ${v} = ${-cDen / aDen}. La expresión resultante tiene sentido en todos los reales excepto en dicho punto de discontinuidad evitable.`,
        mathFormula: `\\frac{${binFactor}}{${binFactor}} = 1 \\quad (${v} \\neq ${-cDen / aDen})`,
      },
    },
    {
      stepNumber: 7,
      title: 'Resultado final y método utilizado',
      description: 'El cociente simplificado es el trinomio cuadrático resultante con su debida restricción.',
      mathExpression: `\\mathbf{Resultado: } ${resultStr} \\quad \\text{con restricción: } ${restriction}`,
      isEssential: true,
    },
  ];

  return {
    isQuotient: true,
    isValid: true,
    originalInput: input,
    numeratorRaw: numRaw,
    denominatorRaw: denRaw,
    numeratorFormatted: toLatex(numRaw),
    denominatorFormatted: toLatex(denRaw),
    methodId,
    methodName,
    methodDescription: `Cociente notable de ${methodName.toLowerCase()} resuelto por factorización y simplificación de binomio común.`,
    generalFormula,
    factoredNumerator: `${binFactor}${trinFactor}`,
    commonFactor: binFactor,
    canceledExpression: `\\frac{\\cancel{${binFactor}}${trinFactor}}{\\cancel{${toLatex(denRaw)}}}`,
    simplifiedResult: resultStr,
    restrictions: [restriction],
    restrictionsExplanation,
    steps,
    canBeFactoredFurther: false,
  };
}

function buildTrinomioX2BxC(
  input: string,
  numRaw: string,
  denRaw: string,
  v: string,
  b: number,
  c: number,
  p: number,
  q: number,
  aDen: number,
  cDen: number,
  restriction: string,
  restrictionsExplanation: string
): AnalysisResult {
  const pSign = p >= 0 ? `+ ${p}` : `- ${Math.abs(p)}`;
  const qSign = q >= 0 ? `+ ${q}` : `- ${Math.abs(q)}`;
  const factor1 = `(${v} ${pSign})`;
  const factor2 = `(${v} ${qSign})`;

  // Denominador: aDen * x + cDen
  const isMatch1 = aDen === 1 && cDen === p;
  const isMatch2 = aDen === 1 && cDen === q;

  if (!isMatch1 && !isMatch2) {
    return createMismatchResult(
      input,
      numRaw,
      denRaw,
      'Trinomio de la forma x² + bx + c',
      `${factor1}${factor2}`,
      `El numerador se factoriza como ${factor1}${factor2}, pero el denominador es (${toLatex(denRaw)}). Ninguno de los dos factores coincide con el denominador para simplificar.`
    );
  }

  const matchingFactor = isMatch1 ? factor1 : factor2;
  const remainingFactor = isMatch1 ? `${v} ${qSign}` : `${v} ${pSign}`;

  const steps: StepExplanation[] = [
    {
      stepNumber: 1,
      title: 'Identificar la expresión',
      description: 'Tenemos un cociente formado por un trinomio en el numerador y un binomio lineal en el denominador.',
      mathExpression: `\\frac{${toLatex(numRaw)}}{${toLatex(denRaw)}}`,
      isEssential: true,
      teacherTip: 'Antes de simplificar, debemos factorizar el trinomio del numerador.',
    },
    {
      stepNumber: 2,
      title: 'Separar numerador y denominador',
      description: 'Examinamos los coeficientes del numerador: a = 1, b = ' + b + ', c = ' + c + '.',
      mathExpression: `\\text{Numerador: } ${toLatex(numRaw)} \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
      isEssential: true,
    },
    {
      stepNumber: 3,
      title: 'Identificar el patrón de factorización',
      description: `El numerador es un trinomio cuadrático de la forma x² + bx + c con coeficiente principal 1. Buscamos dos números p y q que sumados den b = ${b} y multiplicados den c = ${c}.`,
      mathExpression: `x^2 + (p + q)x + (p \\cdot q) = (x + p)(x + q)`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué buscamos dos números que sumen b y multipliquen c?',
        question: '¿De dónde surge la regla de la suma y el producto?',
        answer: `Al desarrollar (x + p)(x + q) = x² + qx + px + pq = x² + (p + q)x + pq. Comparando con x² + bx + c, el coeficiente lineal b debe ser igual a (p + q) y el término independiente c debe ser igual a (p · q). En este ejercicio: (${p}) + (${q}) = ${p + q} = ${b}, y (${p}) · (${q}) = ${p * q} = ${c}.`,
        mathFormula: `p + q = ${b} \\quad \\text{y} \\quad p \\cdot q = ${c}`,
      },
      teacherTip: 'Verifica mentalmente: ¿qué números multiplicados dan el término constante y sumados dan el coeficiente del medio?',
    },
    {
      stepNumber: 4,
      title: 'Factorizar el numerador',
      description: `Los números encontrados son p = ${p} y q = ${q}. Por tanto, el numerador se factoriza como:`,
      mathExpression: `${toLatex(numRaw)} = ${factor1}${factor2}`,
      isEssential: true,
    },
    {
      stepNumber: 5,
      title: 'Sustituir la factorización en el cociente',
      description: 'Reemplazamos el trinomio por su producto de factores en la fracción:',
      mathExpression: `\\frac{${factor1}${factor2}}{${toLatex(denRaw)}}`,
      isEssential: true,
    },
    {
      stepNumber: 6,
      title: 'Explicar la simplificación y registrar la restricción',
      description: `Se cancela el factor ${matchingFactor} porque aparece multiplicando tanto en el numerador como en el denominador. Registramos la restricción ${restriction} porque el denominador original no puede ser cero.`,
      mathExpression: `\\frac{${isMatch1 ? `\\cancel{${factor1}}${factor2}` : `${factor1}\\cancel{${factor2}}`}}{\\cancel{${toLatex(denRaw)}}} = ${remainingFactor}`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué se cancela el factor binomio?',
        question: `¿Por qué se puede simplificar ${matchingFactor}?`,
        answer: `Como ${matchingFactor} multiplica a toda la expresión en el numerador y es el único divisor en el denominador, la razón ${matchingFactor}/${matchingFactor} = 1. Multiplicar por 1 mantiene inalterado al factor restante.`,
        mathFormula: `\\frac{${matchingFactor}}{${matchingFactor}} = 1 \\quad (${restriction})`,
      },
    },
    {
      stepNumber: 7,
      title: 'Resultado final y método utilizado',
      description: 'Presentamos la expresión simplificada con su correspondiente restricción.',
      mathExpression: `\\mathbf{Resultado: } ${remainingFactor} \\quad \\text{con restricción: } ${restriction}`,
      isEssential: true,
    },
  ];

  return {
    isQuotient: true,
    isValid: true,
    originalInput: input,
    numeratorRaw: numRaw,
    denominatorRaw: denRaw,
    numeratorFormatted: toLatex(numRaw),
    denominatorFormatted: toLatex(denRaw),
    methodId: 'trinomio_x2_bx_c',
    methodName: 'Trinomio de la forma x² + bx + c',
    methodDescription: 'Factorización de trinomios mónicos buscando dos números que sumen b y multipliquen c, seguida de simplificación con el denominador.',
    generalFormula: 'x^2 + (p+q)x + pq = (x+p)(x+q)',
    factoredNumerator: `${factor1}${factor2}`,
    commonFactor: matchingFactor,
    canceledExpression: `\\frac{${isMatch1 ? `\\cancel{${factor1}}${factor2}` : `${factor1}\\cancel{${factor2}}`}}{\\cancel{${toLatex(denRaw)}}}`,
    simplifiedResult: remainingFactor,
    restrictions: [restriction],
    restrictionsExplanation,
    steps,
    canBeFactoredFurther: false,
  };
}

function buildTrinomioCuadradoPerfecto(
  input: string,
  numRaw: string,
  denRaw: string,
  v: string,
  m: number,
  k: number,
  aDen: number,
  cDen: number,
  restriction: string,
  restrictionsExplanation: string
): AnalysisResult {
  const kSign = k >= 0 ? `+ ${k}` : `- ${Math.abs(k)}`;
  const bin = m === 1 ? `(${v} ${kSign})` : `(${m}${v} ${kSign})`;
  const factored = `${bin}^2`;

  const isMatching = aDen === m && cDen === k;
  if (!isMatching) {
    return createMismatchResult(
      input,
      numRaw,
      denRaw,
      'Trinomio cuadrado perfecto',
      `${bin}^2 = ${bin}${bin}`,
      `El numerador es un Trinomio Cuadrado Perfecto que se factoriza como ${bin}², pero el denominador es (${toLatex(denRaw)}), impidiendo la simplificación directa.`
    );
  }

  const remaining = m === 1 ? `${v} ${kSign}` : `${m}${v} ${kSign}`;

  const steps: StepExplanation[] = [
    {
      stepNumber: 1,
      title: 'Identificar la expresión',
      description: 'Tenemos un cociente con un trinomio en el numerador y un binomio en el denominador.',
      mathExpression: `\\frac{${toLatex(numRaw)}}{${toLatex(denRaw)}}`,
      isEssential: true,
    },
    {
      stepNumber: 2,
      title: 'Separar numerador y denominador',
      description: 'Identificamos los términos del numerador: primer término cuadrático, término intermedio del doble producto y último término cuadrático.',
      mathExpression: `\\text{Numerador: } ${toLatex(numRaw)} \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
      isEssential: true,
    },
    {
      stepNumber: 3,
      title: 'Identificar el patrón de factorización',
      description: `El numerador cumple la regla del Trinomio Cuadrado Perfecto: el primer término tiene raíz ${m === 1 ? v : `${m}${v}`}, el tercer término tiene raíz ${Math.abs(k)}, y el término central es exactamente el doble producto: 2 · (${m === 1 ? v : `${m}${v}`}) · (${Math.abs(k)}) = ${Math.abs(2 * m * k)}${v}.`,
      mathExpression: `a^2 \\pm 2ab + b^2 = (a \\pm b)^2`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué se llama Trinomio Cuadrado Perfecto (TCP)?',
        question: '¿Cómo se comprueba que un trinomio es un TCP?',
        answer: 'Un trinomio es cuadrado perfecto cuando resulta de elevar un binomio al cuadrado. La prueba infalible es: 1) Extraer la raíz cuadrada del primer y tercer término. 2) Multiplicar ambas raíces por 2. 3) Comprobar si ese producto coincide exactamente con el término central.',
        mathFormula: `(a \\pm b)^2 = a^2 \\pm 2ab + b^2`,
      },
      teacherTip: 'Antes de simplificar, recuerda comprobar la prueba del doble producto.',
    },
    {
      stepNumber: 4,
      title: 'Factorizar el numerador',
      description: `Escribimos el trinomio como el cuadrado del binomio ${bin}:`,
      mathExpression: `${toLatex(numRaw)} = ${bin}^2 = ${bin}${bin}`,
      isEssential: true,
    },
    {
      stepNumber: 5,
      title: 'Sustituir la factorización en el cociente',
      description: 'Colocamos el producto de factores en la fracción:',
      mathExpression: `\\frac{${bin}${bin}}{${toLatex(denRaw)}}`,
      isEssential: true,
    },
    {
      stepNumber: 6,
      title: 'Explicar la simplificación y registrar la restricción',
      description: `Se cancela uno de los factores ${bin} del numerador con el denominador idéntico. Se preserva la restricción ${restriction} para evitar división entre cero en la expresión original.`,
      mathExpression: `\\frac{\\cancel{${bin}}${bin}}{\\cancel{${toLatex(denRaw)}}} = ${remaining}`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué queda un binomio?',
        question: '¿Por qué la potencia pasa de exponente 2 a exponente 1?',
        answer: `Por ley de exponentes: \\frac{M^2}{M} = M^{2-1} = M^1 = M, siempre que M ≠ 0.`,
        mathFormula: `\\frac{M^2}{M} = M \\quad (M \\neq 0)`,
      },
    },
    {
      stepNumber: 7,
      title: 'Resultado final y método utilizado',
      description: 'El resultado simplificado es el binomio restante con su restricción.',
      mathExpression: `\\mathbf{Resultado: } ${remaining} \\quad \\text{con restricción: } ${restriction}`,
      isEssential: true,
    },
  ];

  return {
    isQuotient: true,
    isValid: true,
    originalInput: input,
    numeratorRaw: numRaw,
    denominatorRaw: denRaw,
    numeratorFormatted: toLatex(numRaw),
    denominatorFormatted: toLatex(denRaw),
    methodId: 'trinomio_cuadrado_perfecto',
    methodName: 'Trinomio cuadrado perfecto',
    methodDescription: 'Factorización de un trinomio cuadrado perfecto de la forma a² ± 2ab + b² = (a ± b)² y simplificación de uno de sus factores idénticos.',
    generalFormula: 'a^2 \\pm 2ab + b^2 = (a \\pm b)^2',
    factoredNumerator: `${bin}^2 = ${bin}${bin}`,
    commonFactor: bin,
    canceledExpression: `\\frac{\\cancel{${bin}}${bin}}{\\cancel{${toLatex(denRaw)}}}`,
    simplifiedResult: remaining,
    restrictions: [restriction],
    restrictionsExplanation,
    steps,
    canBeFactoredFurther: false,
  };
}

function buildTrinomioAx2BxC(
  input: string,
  numRaw: string,
  denRaw: string,
  v: string,
  a: number,
  b: number,
  c: number,
  aDen: number,
  cDen: number,
  restriction: string,
  restrictionsExplanation: string
): AnalysisResult {
  // Factorizar ax² + bx + c encontrando dos números que multipliquen a*c y sumen b
  const ac = a * c;
  let p = 0;
  let q = 0;
  let found = false;

  for (let i = -Math.abs(ac); i <= Math.abs(ac); i++) {
    if (i !== 0 && ac % i === 0) {
      const j = ac / i;
      if (i + j === b) {
        p = i;
        q = j;
        found = true;
        break;
      }
    }
  }

  if (!found) {
    return createNoMatchDiagnostic(input, numRaw, denRaw, v, null, null);
  }

  // Descomponer: ax² + px + qx + c -> agrupar
  // factor común entre a y p
  const gcd1 = Math.abs(gcd(a, p));
  const m1 = a / gcd1;
  const k1 = p / gcd1;

  // factor común entre q y c
  const gcd2 = Math.abs(gcd(q, c));
  const signGcd2 = q < 0 ? -1 : 1;
  const factorGroup1 = m1 === 1 ? `(${v} ${k1 >= 0 ? `+ ${k1}` : `- ${Math.abs(k1)}`})` : `(${m1}${v} ${k1 >= 0 ? `+ ${k1}` : `- ${Math.abs(k1)}`})`;
  const factorGroup2 = gcd1 === 1 ? `(${v} ${signGcd2 * gcd2 >= 0 ? `+ ${Math.abs(gcd2)}` : `- ${Math.abs(gcd2)}`})` : `(${gcd1}${v} ${signGcd2 * gcd2 >= 0 ? `+ ${Math.abs(gcd2)}` : `- ${Math.abs(gcd2)}`})`;

  // Comprobar si coincide con el denominador
  const isMatch1 = (aDen === m1 && cDen === k1) || (aDen === -m1 && cDen === -k1);
  const isMatch2 = (aDen === gcd1 && cDen === signGcd2 * gcd2) || (aDen === -gcd1 && cDen === -signGcd2 * gcd2);

  if (!isMatch1 && !isMatch2) {
    return createMismatchResult(
      input,
      numRaw,
      denRaw,
      'Trinomio de la forma ax² + bx + c',
      `${factorGroup1}${factorGroup2}`,
      `El numerador se factoriza como ${factorGroup1}${factorGroup2}, pero no contiene un factor idéntico al denominador (${toLatex(denRaw)}).`
    );
  }

  const matchingFactor = isMatch1 ? factorGroup1 : factorGroup2;
  const remainingFactor = isMatch1 ? factorGroup2.replace(/[()]/g, '') : factorGroup1.replace(/[()]/g, '');

  const steps: StepExplanation[] = [
    {
      stepNumber: 1,
      title: 'Identificar la expresión',
      description: 'Tenemos un cociente con un trinomio donde el coeficiente principal es distinto de 1.',
      mathExpression: `\\frac{${toLatex(numRaw)}}{${toLatex(denRaw)}}`,
      isEssential: true,
      teacherTip: 'Cuando el coeficiente de x² no es 1, usamos el método para trinomios de la forma ax² + bx + c.',
    },
    {
      stepNumber: 2,
      title: 'Separar numerador y denominador',
      description: `Identificamos a = ${a}, b = ${b}, c = ${c}. Calculamos el producto a · c = (${a}) · (${c}) = ${ac}.`,
      mathExpression: `\\text{Numerador: } ${toLatex(numRaw)} \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
      isEssential: true,
    },
    {
      stepNumber: 3,
      title: 'Identificar el patrón de factorización',
      description: `Para factorizar un trinomio de la forma ax² + bx + c, buscamos dos números que multiplicados den a · c = ${ac} y sumados den b = ${b}. Los números son ${p} y ${q}.`,
      mathExpression: `ax^2 + bx + c = ax^2 + px + qx + c`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué descomponemos el término central b en p + q?',
        question: '¿Cómo funciona el método del producto ac?',
        answer: `Al descomponer el término lineal bx en px + qx, convertimos el trinomio de 3 términos en un polinomio de 4 términos. Esto nos permite aplicar el caso de "Factor común por agrupación de términos", que el estudiante ya domina.`,
        mathFormula: `${a}${v}^2 + (${b})${v} + ${c} = ${a}${v}^2 + (${p})${v} + (${q})${v} + ${c}`,
      },
    },
    {
      stepNumber: 4,
      title: 'Factorizar el numerador por agrupación de términos',
      description: `Reescribimos el trinomio con 4 términos y agrupamos: (${a}${v}² + ${p}${v}) + (${q}${v} + ${c}) = ${factorGroup1}${factorGroup2}.`,
      mathExpression: `${toLatex(numRaw)} = ${factorGroup1}${factorGroup2}`,
      isEssential: true,
    },
    {
      stepNumber: 5,
      title: 'Sustituir la factorización en el cociente',
      description: 'Reemplazamos en el cociente original:',
      mathExpression: `\\frac{${factorGroup1}${factorGroup2}}{${toLatex(denRaw)}}`,
      isEssential: true,
    },
    {
      stepNumber: 6,
      title: 'Explicar la simplificación y registrar la restricción',
      description: `Se cancela el factor ${matchingFactor} porque aparece multiplicando en el numerador y es el divisor en el denominador. Además registramos la restricción ${restriction}.`,
      mathExpression: `\\frac{${isMatch1 ? `\\cancel{${factorGroup1}}${factorGroup2}` : `${factorGroup1}\\cancel{${factorGroup2}}`}}{\\cancel{${toLatex(denRaw)}}} = ${remainingFactor}`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué se cancela este binomio?',
        question: '¿Por qué la división da exactamente el otro factor?',
        answer: `Porque ${matchingFactor} / ${matchingFactor} = 1. Al no ser cero dicho término (gracias a la restricción), la fracción se reduce limpiamente.`,
        mathFormula: `\\frac{${matchingFactor}}{${matchingFactor}} = 1 \\quad (${restriction})`,
      },
    },
    {
      stepNumber: 7,
      title: 'Resultado final y método utilizado',
      description: 'Mostramos el polinomio resultante:',
      mathExpression: `\\mathbf{Resultado: } ${remainingFactor} \\quad \\text{con restricción: } ${restriction}`,
      isEssential: true,
    },
  ];

  return {
    isQuotient: true,
    isValid: true,
    originalInput: input,
    numeratorRaw: numRaw,
    denominatorRaw: denRaw,
    numeratorFormatted: toLatex(numRaw),
    denominatorFormatted: toLatex(denRaw),
    methodId: 'trinomio_ax2_bx_c',
    methodName: 'Trinomio de la forma ax² + bx + c',
    methodDescription: 'Factorización de trinomios con coeficiente a ≠ 1 mediante descomposición del término central y agrupación de términos.',
    generalFormula: 'ax^2 + bx + c = (mx + p)(nx + q)',
    factoredNumerator: `${factorGroup1}${factorGroup2}`,
    commonFactor: matchingFactor,
    canceledExpression: `\\frac{${isMatch1 ? `\\cancel{${factorGroup1}}${factorGroup2}` : `${factorGroup1}\\cancel{${factorGroup2}}`}}{\\cancel{${toLatex(denRaw)}}}`,
    simplifiedResult: remainingFactor,
    restrictions: [restriction],
    restrictionsExplanation,
    steps,
    canBeFactoredFurther: false,
  };
}

function buildGeneralPowers(
  input: string,
  numRaw: string,
  denRaw: string,
  v: string,
  b: number,
  n: number,
  isSum: boolean,
  aDen: number,
  cDen: number,
  restriction: string,
  restrictionsExplanation: string
): AnalysisResult {
  const isDenomMinus = aDen === 1 && cDen === -b;
  const isDenomPlus = aDen === 1 && cDen === b;

  // CASO DE SUMA: a^n + b^n solo es divisible entre a + b si n es IMPAR
  if (isSum) {
    if (n % 2 === 0) {
      return createErrorResult(
        input,
        `La suma de potencias pares a^n + b^n (con n = ${n}) no es divisible exactamente entre (a + b) ni (a - b) en los números reales.`,
        `Una suma de potencias con exponente par (como x^4 + 16 o x^2 + 9) no tiene raíces reales y no genera un cociente notable exacto. El exponente n debe ser impar (por ejemplo, x³ + 27 o x⁵ + 32).`
      );
    }

    if (!isDenomPlus) {
      return createMismatchResult(
        input,
        numRaw,
        denRaw,
        'Suma de potencias impares',
        `(x + ${b})(\\dots)`,
        `Para una suma de potencias impares a^n + b^n, el divisor debe ser obligatoriamente (a + b), es decir, (${v} + ${b}). No es divisible entre (${toLatex(denRaw)}).`
      );
    }
  } else {
    // DIFERENCIA a^n - b^n
    if (!isDenomMinus && !(isDenomPlus && n % 2 === 0)) {
      return createMismatchResult(
        input,
        numRaw,
        denRaw,
        'Diferencia de potencias',
        `(x - ${b})(\\dots)`,
        `Para a^n - b^n, siempre es divisible entre (a - b). Si n es par, también es divisible entre (a + b). El denominador ingresado (${toLatex(denRaw)}) no coincide.`
      );
    }
  }

  // Generar el polinomio cociente resultante
  // Si divisor es a - b: todos los signos positivos
  // Si divisor es a + b: signos alternados (+ - + - ...)
  const terms: string[] = [];
  const altSigns = isDenomPlus;

  for (let i = 0; i < n; i++) {
    const powerA = n - 1 - i;
    const powerB = i;
    const bVal = Math.pow(b, powerB);

    let term = '';
    if (powerA === 0) {
      term = `${bVal}`;
    } else if (powerA === 1) {
      term = bVal === 1 ? v : `${bVal}${v}`;
    } else {
      term = bVal === 1 ? `${v}^{${powerA}}` : `${bVal}${v}^{${powerA}}`;
    }

    if (i === 0) {
      terms.push(term);
    } else {
      const signStr = altSigns ? (i % 2 === 0 ? '+ ' : '- ') : '+ ';
      terms.push(`${signStr}${term}`);
    }
  }

  const resultPolynomial = terms.join(' ');
  const methodName = isSum ? 'Suma de potencias impares' : 'Diferencia de potencias n-ésimas';
  const methodId: FactorizationMethodId = isSum ? 'potencias_suma_impar' : 'potencias_diferencia_general';
  const generalFormula = isSum
    ? `\\frac{a^n + b^n}{a + b} = a^{n-1} - a^{n-2}b + a^{n-3}b^2 - \\dots + b^{n-1} \\quad (n \\text{ impar})`
    : isDenomMinus
    ? `\\frac{a^n - b^n}{a - b} = a^{n-1} + a^{n-2}b + a^{n-3}b^2 + \\dots + b^{n-1}`
    : `\\frac{a^n - b^n}{a + b} = a^{n-1} - a^{n-2}b + \\dots - b^{n-1} \\quad (n \\text{ par})`;

  const binFactor = isDenomMinus ? `(${v} - ${b})` : `(${v} + ${b})`;

  const steps: StepExplanation[] = [
    {
      stepNumber: 1,
      title: 'Identificar la expresión',
      description: `Tenemos un cociente con potencias de grado n = ${n}.`,
      mathExpression: `\\frac{${toLatex(numRaw)}}{${toLatex(denRaw)}}`,
      isEssential: true,
    },
    {
      stepNumber: 2,
      title: 'Separar numerador y denominador',
      description: `Numerador: ${toLatex(numRaw)} con base a = ${v} y b = ${b} (ya que ${b}^${n} = ${Math.pow(b, n)}).`,
      mathExpression: `\\text{Numerador: } ${v}^{${n}} ${isSum ? '+' : '-'} ${b}^{${n}} \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
      isEssential: true,
    },
    {
      stepNumber: 3,
      title: 'Identificar el patrón general de cociente notable',
      description: isSum
        ? `Es una suma de potencias con exponente n = ${n} (impar), dividida entre (a + b). Los signos del cociente se alternan comenzando con signo positivo.`
        : isDenomMinus
        ? `Es una diferencia de potencias de la forma (a^n - b^n) / (a - b). Todos los términos del desarrollo tienen signo positivo.`
        : `Es una diferencia de potencias con exponente n = ${n} (par), dividida entre (a + b). Los términos se alternan de signo (+ - + - ...).`,
      mathExpression: generalFormula,
      isEssential: true,
      whyExplanation: {
        title: isSum ? '¿Por qué el exponente debe ser impar en la suma?' : '¿Cómo se genera la serie de potencias?',
        question: isSum ? '¿Por qué a^n + b^n no se puede dividir entre a + b si n es par?' : '¿Por qué los exponentes de a bajan y los de b suben?',
        answer: isSum
          ? `Por el Teorema del Factor: si evaluamos a = -b en a^n + b^n, obtenemos (-b)^n + b^n. Si n es par, (-b)^n = b^n, por lo que b^n + b^n = 2b^n ≠ 0 (residuo no es cero). En cambio, si n es impar, (-b)^n = -b^n, dando -b^n + b^n = 0 (división exacta).`
          : `Al multiplicar (a - b)(a^{n-1} + a^{n-2}b + ... + b^{n-1}), cada término negativo cancela exactamente al término positivo siguiente, excepto el primero a^n y el último -b^n.`,
        mathFormula: generalFormula,
      },
    },
    {
      stepNumber: 4,
      title: 'Factorizar el numerador mostrando cada término',
      description: `Escribimos la descomposición factorial completa:`,
      mathExpression: `${toLatex(numRaw)} = ${binFactor} \\left( ${resultPolynomial} \\right)`,
      isEssential: true,
    },
    {
      stepNumber: 5,
      title: 'Sustituir la factorización en el cociente',
      description: 'Colocamos el producto en la fracción:',
      mathExpression: `\\frac{${binFactor} \\left( ${resultPolynomial} \\right)}{${toLatex(denRaw)}}`,
      isEssential: true,
    },
    {
      stepNumber: 6,
      title: 'Explicar la simplificación y registrar la restricción',
      description: `Se cancela el factor lineal común ${binFactor} porque aparece multiplicando en el numerador y en el denominador. Registramos la restricción ${restriction}.`,
      mathExpression: `\\frac{\\cancel{${binFactor}} \\left( ${resultPolynomial} \\right)}{\\cancel{${toLatex(denRaw)}}} = ${resultPolynomial}`,
      isEssential: true,
      whyExplanation: {
        title: '¿Por qué se cancela el factor binomio?',
        question: `¿Por qué ${binFactor}/${binFactor} es 1?`,
        answer: `Cualquier número dividido entre sí mismo es 1 siempre que no sea cero. Como establecemos la restricción ${restriction}, la división es válida.`,
        mathFormula: `\\frac{${binFactor}}{${binFactor}} = 1 \\quad (${restriction})`,
      },
    },
    {
      stepNumber: 7,
      title: 'Resultado final y método utilizado',
      description: 'Polinomio completo resultante:',
      mathExpression: `\\mathbf{Resultado: } ${resultPolynomial} \\quad \\text{con restricción: } ${restriction}`,
      isEssential: true,
    },
  ];

  return {
    isQuotient: true,
    isValid: true,
    originalInput: input,
    numeratorRaw: numRaw,
    denominatorRaw: denRaw,
    numeratorFormatted: toLatex(numRaw),
    denominatorFormatted: toLatex(denRaw),
    methodId,
    methodName,
    methodDescription: `Forma general de cocientes notables para potencias de grado n = ${n}.`,
    generalFormula,
    factoredNumerator: `${binFactor}(${resultPolynomial})`,
    commonFactor: binFactor,
    canceledExpression: `\\frac{\\cancel{${binFactor}}(${resultPolynomial})}{\\cancel{${toLatex(denRaw)}}}`,
    simplifiedResult: resultPolynomial,
    restrictions: [restriction],
    restrictionsExplanation,
    steps,
    canBeFactoredFurther: false,
  };
}

// -------------------------------------------------------------
// CASOS ESPECIALES DE AGRUPACIÓN DE TÉRMINOS
// -------------------------------------------------------------

function checkGroupingMultivar(numRaw: string, denRaw: string, input: string): AnalysisResult | null {
  // Ej: (ax + bx + ay + by) / (a + b)  o variantes
  const cleanedNum = numRaw.replace(/\s+/g, '');
  const cleanedDen = denRaw.replace(/\s+/g, '');

  if (cleanedNum === 'ax+bx+ay+by' && cleanedDen === 'a+b') {
    const restriction = 'a + b \\neq 0';
    const restrictionsExplanation = 'El denominador original no puede ser cero: a + b \\neq 0 \\implies a \\neq -b.';

    const steps: StepExplanation[] = [
      {
        stepNumber: 1,
        title: 'Identificar la expresión',
        description: 'Tenemos un cociente con un polinomio de 4 términos en el numerador y un binomio en el denominador.',
        mathExpression: `\\frac{ax + bx + ay + by}{a + b}`,
        isEssential: true,
      },
      {
        stepNumber: 2,
        title: 'Separar numerador y denominador',
        description: 'Observamos que el numerador tiene 4 términos que pueden asociarse de dos en dos.',
        mathExpression: `\\text{Numerador: } ax + bx + ay + by \\quad \\text{y} \\quad \\text{Denominador: } a + b`,
        isEssential: true,
      },
      {
        stepNumber: 3,
        title: 'Identificar el patrón de factorización',
        description: 'El numerador corresponde al caso de Factor común por agrupación de términos. Agrupamos los dos primeros términos y los dos últimos.',
        mathExpression: `(ax + bx) + (ay + by) = x(a + b) + y(a + b)`,
        isEssential: true,
        whyExplanation: {
          title: '¿Por qué agrupamos de dos en dos?',
          question: '¿Cómo funciona la agrupación de términos?',
          answer: 'Cuando no hay un factor común para TODOS los términos a la vez, se agrupan en parejas que sí compartan un factor común. En la primera pareja el factor común es x, y en la segunda es y. Al extraerlos, surge un nuevo factor común compuesto: (a + b).',
          mathFormula: `x(a + b) + y(a + b) = (a + b)(x + y)`,
        },
      },
      {
        stepNumber: 4,
        title: 'Factorizar el numerador paso a paso',
        description: 'Extraemos el factor común monomio de cada pareja y luego el factor común polinomio (a + b):',
        mathExpression: `ax + bx + ay + by = x(a + b) + y(a + b) = (a + b)(x + y)`,
        isEssential: true,
      },
      {
        stepNumber: 5,
        title: 'Sustituir la factorización en el cociente',
        description: 'Reescribimos la fracción con el numerador factorizado:',
        mathExpression: `\\frac{(a + b)(x + y)}{a + b}`,
        isEssential: true,
      },
      {
        stepNumber: 6,
        title: 'Explicar la simplificación y registrar la restricción',
        description: 'Se cancela el factor común (a + b) porque aparece multiplicando en el numerador y en el denominador. Registramos la restricción a + b ≠ 0.',
        mathExpression: `\\frac{\\cancel{(a + b)}(x + y)}{\\cancel{a + b}} = x + y`,
        isEssential: true,
        whyExplanation: {
          title: '¿Por qué se cancela (a + b)?',
          question: '¿Por qué (a + b)/(a + b) da 1?',
          answer: 'Cualquier expresión algebraica no nula dividida entre sí misma da la unidad: (a + b)/(a + b) = 1. Multiplicar por 1 mantiene inalterado (x + y).',
          mathFormula: `\\frac{a + b}{a + b} = 1 \\quad (a + b \\neq 0)`,
        },
      },
      {
        stepNumber: 7,
        title: 'Resultado final y método utilizado',
        description: 'Resultado simplificado final:',
        mathExpression: `\\mathbf{Resultado: } x + y \\quad \\text{con restricción: } ${restriction}`,
        isEssential: true,
      },
    ];

    return {
      isQuotient: true,
      isValid: true,
      originalInput: input,
      numeratorRaw: numRaw,
      denominatorRaw: denRaw,
      numeratorFormatted: 'ax + bx + ay + by',
      denominatorFormatted: 'a + b',
      methodId: 'factor_comun_agrupacion',
      methodName: 'Factor común por agrupación de términos',
      methodDescription: 'Factorización de polinomios de 4 términos agrupando en parejas con factor común binomio.',
      generalFormula: 'ax + bx + ay + by = (a + b)(x + y)',
      factoredNumerator: '(a + b)(x + y)',
      commonFactor: '(a + b)',
      canceledExpression: '\\frac{\\cancel{(a + b)}(x + y)}{\\cancel{a + b}}',
      simplifiedResult: 'x + y',
      restrictions: [restriction],
      restrictionsExplanation,
      steps,
      canBeFactoredFurther: false,
    };
  }

  return null;
}

function checkGroupingCubic(numRaw: string, denRaw: string, input: string): AnalysisResult | null {
  // Ej: (x^3 + 2x^2 + 3x + 6) / (x + 2)
  const polyNum = parsePolynomial(numRaw);
  const polyDen = parsePolynomial(denRaw);

  if (!polyNum || !polyDen) return null;
  const v = polyNum.variable;

  const c3 = polyNum.coeffs.get(3) || 0;
  const c2 = polyNum.coeffs.get(2) || 0;
  const c1 = polyNum.coeffs.get(1) || 0;
  const c0 = polyNum.coeffs.get(0) || 0;

  if (c3 === 1 && c2 !== 0 && c1 !== 0 && c0 !== 0) {
    // Proporción c2 / c3 == c0 / c1 ?
    if (Math.abs(c2 / c3 - c0 / c1) < 1e-7) {
      const aVal = c2;
      const bVal = c1;
      // Numerador: x^2(x + aVal) + bVal(x + aVal) = (x + aVal)(x^2 + bVal)
      const binFactor = aVal >= 0 ? `(${v} + ${aVal})` : `(${v} - ${Math.abs(aVal)})`;
      const quadFactor = bVal >= 0 ? `(${v}^2 + ${bVal})` : `(${v}^2 - ${Math.abs(bVal)})`;

      const denA = polyDen.coeffs.get(1) || 0;
      const denC = polyDen.coeffs.get(0) || 0;

      if (denA === 1 && denC === aVal) {
        const restriction = `${v} \\neq ${-aVal}`;
        const restrictionsExplanation = `El denominador no puede ser cero: ${v} + ${aVal} \\neq 0 \\implies ${v} \\neq ${-aVal}.`;
        const remaining = bVal >= 0 ? `${v}^2 + ${bVal}` : `${v}^2 - ${Math.abs(bVal)}`;

        const steps: StepExplanation[] = [
          {
            stepNumber: 1,
            title: 'Identificar la expresión',
            description: 'Tenemos un polinomio cúbico de 4 términos en el numerador y un binomio lineal en el denominador.',
            mathExpression: `\\frac{${toLatex(numRaw)}}{${toLatex(denRaw)}}`,
            isEssential: true,
          },
          {
            stepNumber: 2,
            title: 'Separar numerador y denominador',
            description: 'Analizamos los términos del numerador: cuatro términos con coeficientes proporcionales.',
            mathExpression: `\\text{Numerador: } ${toLatex(numRaw)} \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
            isEssential: true,
          },
          {
            stepNumber: 3,
            title: 'Identificar el patrón de factorización',
            description: 'El numerador puede factorizarse mediante Factor común por agrupación de términos, agrupando los dos primeros términos y los dos últimos.',
            mathExpression: `(${v}^3 + ${aVal}${v}^2) + (${bVal}${v} + ${c0}) = ${v}^2(${v} + ${aVal}) + ${bVal}(${v} + ${aVal})`,
            isEssential: true,
            whyExplanation: {
              title: '¿Cómo sabemos que se puede agrupar?',
              question: '¿Cuál es la clave para la agrupación de 4 términos?',
              answer: `La razón entre los coeficientes de los dos primeros términos (${c3}:${c2}) es idéntica a la razón de los dos últimos (${c1}:${c0} = 1:${aVal}). Esto garantiza que al extraer el factor común de cada pareja, el binomio restante (${v} + ${aVal}) sea exactamente el mismo.`,
              mathFormula: `${v}^2(${v} + ${aVal}) + ${bVal}(${v} + ${aVal}) = (${v} + ${aVal})(${v}^2 + ${bVal})`,
            },
          },
          {
            stepNumber: 4,
            title: 'Factorizar el numerador',
            description: `Extraemos el factor común binomio ${binFactor}:`,
            mathExpression: `${toLatex(numRaw)} = ${binFactor}${quadFactor}`,
            isEssential: true,
          },
          {
            stepNumber: 5,
            title: 'Sustituir la factorización en el cociente',
            description: 'Reescribimos la fracción con el numerador factorizado:',
            mathExpression: `\\frac{${binFactor}${quadFactor}}{${toLatex(denRaw)}}`,
            isEssential: true,
          },
          {
            stepNumber: 6,
            title: 'Explicar la simplificación y registrar la restricción',
            description: `Se cancela el factor ${binFactor} porque aparece multiplicando en el numerador y en el denominador. Registramos la restricción ${restriction}.`,
            mathExpression: `\\frac{\\cancel{${binFactor}}${quadFactor}}{\\cancel{${toLatex(denRaw)}}} = ${remaining}`,
            isEssential: true,
          },
          {
            stepNumber: 7,
            title: 'Resultado final y método utilizado',
            description: 'Expresamos el resultado con su debida restricción.',
            mathExpression: `\\mathbf{Resultado: } ${remaining} \\quad \\text{con restricción: } ${restriction}`,
            isEssential: true,
          },
        ];

        return {
          isQuotient: true,
          isValid: true,
          originalInput: input,
          numeratorRaw: numRaw,
          denominatorRaw: denRaw,
          numeratorFormatted: toLatex(numRaw),
          denominatorFormatted: toLatex(denRaw),
          methodId: 'factor_comun_agrupacion',
          methodName: 'Factor común por agrupación de términos',
          methodDescription: 'Factorización de polinomio cúbico de 4 términos mediante agrupación en parejas y extracción de factor común binomio.',
          generalFormula: 'x^3 + ax^2 + bx + ab = (x + a)(x^2 + b)',
          factoredNumerator: `${binFactor}${quadFactor}`,
          commonFactor: binFactor,
          canceledExpression: `\\frac{\\cancel{${binFactor}}${quadFactor}}{\\cancel{${toLatex(denRaw)}}}`,
          simplifiedResult: remaining,
          restrictions: [restriction],
          restrictionsExplanation,
          steps,
          canBeFactoredFurther: false,
        };
      }
    }
  }

  return null;
}

function checkLiteralPatterns(numRaw: string, denRaw: string, input: string): AnalysisResult | null {
  const normNum = normalizeExpression(numRaw).replace(/\s+/g, '');
  const normDen = normalizeExpression(denRaw).replace(/\s+/g, '');

  // 1. Diferencia de cuadrados literal para cualesquiera dos variables: u^2 - w^2 / (u ± w)
  const matchDiffSq = normNum.match(/^([a-zA-Z])\^2-([a-zA-Z])\^2$/);
  if (matchDiffSq) {
    const vA = matchDiffSq[1];
    const vB = matchDiffSq[2];
    const isMinus = normDen === `${vA}-${vB}`;
    const isPlus = normDen === `${vA}+${vB}`;

    if (isMinus || isPlus) {
      const cancelFactor = isMinus ? `(${vA} - ${vB})` : `(${vA} + ${vB})`;
      const remainFactor = isMinus ? `${vA} + ${vB}` : `${vA} - ${vB}`;
      const restriction = `${vA} \\neq ${isMinus ? vB : `-${vB}`}`;

      const steps: StepExplanation[] = [
        {
          stepNumber: 1,
          title: 'Identificar la expresión literal',
          description: 'Tenemos el cociente notable canónico de diferencia de cuadrados con variables puras.',
          mathExpression: `\\frac{${vA}^2 - ${vB}^2}{${toLatex(denRaw)}}`,
          isEssential: true,
        },
        {
          stepNumber: 2,
          title: 'Separar numerador y denominador',
          description: `Numerador: ${vA}² - ${vB}² y Denominador: ${toLatex(denRaw)}.`,
          mathExpression: `\\text{Numerador: } ${vA}^2 - ${vB}^2 \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
          isEssential: true,
        },
        {
          stepNumber: 3,
          title: 'Identificar el patrón',
          description: 'Corresponde a la fórmula canónica de la Diferencia de cuadrados.',
          mathExpression: `${vA}^2 - ${vB}^2 = (${vA} - ${vB})(${vA} + ${vB})`,
          isEssential: true,
          whyExplanation: {
            title: '¿Por qué a² - b² = (a-b)(a+b)?',
            question: '¿Cómo se demuestra algebraicamente?',
            answer: 'Al aplicar la propiedad distributiva: (a - b)(a + b) = a² + ab - ba - b² = a² - b².',
            mathFormula: '(a - b)(a + b) = a^2 - b^2',
          },
        },
        {
          stepNumber: 4,
          title: 'Factorizar el numerador',
          description: 'Escribimos el producto de la suma por la diferencia:',
          mathExpression: `${vA}^2 - ${vB}^2 = (${vA} - ${vB})(${vA} + ${vB})`,
          isEssential: true,
        },
        {
          stepNumber: 5,
          title: 'Sustituir en el cociente',
          description: 'Colocamos la factorización en la fracción:',
          mathExpression: `\\frac{(${vA} - ${vB})(${vA} + ${vB})}{${toLatex(denRaw)}}`,
          isEssential: true,
        },
        {
          stepNumber: 6,
          title: 'Explicar la simplificación y registrar la restricción',
          description: `Se cancela el factor común ${cancelFactor} porque divide exactamente. Registramos la restricción ${restriction}.`,
          mathExpression: `\\frac{\\cancel{${cancelFactor}}(${remainFactor})}{\\cancel{${toLatex(denRaw)}}} = ${remainFactor}`,
          isEssential: true,
        },
        {
          stepNumber: 7,
          title: 'Resultado final',
          description: 'Resultado algebraico simplificado:',
          mathExpression: `\\mathbf{Resultado: } ${remainFactor} \\quad \\text{con restricción: } ${restriction}`,
          isEssential: true,
        },
      ];

      return {
        isQuotient: true,
        isValid: true,
        originalInput: input,
        numeratorRaw: numRaw,
        denominatorRaw: denRaw,
        numeratorFormatted: `${vA}^2 - ${vB}^2`,
        denominatorFormatted: toLatex(denRaw),
        methodId: 'diferencia_cuadrados',
        methodName: 'Diferencia de cuadrados (forma canónica)',
        methodDescription: 'Caso canónico de cociente notable para diferencia de cuadrados con variables literales.',
        generalFormula: 'a^2 - b^2 = (a - b)(a + b)',
        factoredNumerator: `(${vA} - ${vB})(${vA} + ${vB})`,
        commonFactor: cancelFactor,
        canceledExpression: `\\frac{\\cancel{${cancelFactor}}(${remainFactor})}{\\cancel{${toLatex(denRaw)}}}`,
        simplifiedResult: remainFactor,
        restrictions: [restriction],
        restrictionsExplanation: `El denominador no puede anularse: ${toLatex(denRaw)} \\neq 0 \\implies ${restriction}.`,
        steps,
        canBeFactoredFurther: false,
      };
    }
  }

  // 2. Suma o diferencia de cubos literal: u^3 ± w^3 / (u ± w)
  const matchCubes = normNum.match(/^([a-zA-Z])\^3([+-])([a-zA-Z])\^3$/);
  if (matchCubes) {
    const vA = matchCubes[1];
    const sign = matchCubes[2];
    const vB = matchCubes[3];
    const isSum = sign === '+';

    const expectedDen = isSum ? `${vA}+${vB}` : `${vA}-${vB}`;
    if (normDen === expectedDen) {
      const binFactor = `(${vA} ${sign} ${vB})`;
      const oppSign = isSum ? '-' : '+';
      const trinResult = `${vA}^2 ${oppSign} ${vA}${vB} + ${vB}^2`;
      const restriction = `${vA} \\neq ${isSum ? `-${vB}` : vB}`;
      const generalFormula = isSum
        ? 'a^3 + b^3 = (a + b)(a^2 - ab + b^2)'
        : 'a^3 - b^3 = (a - b)(a^2 + ab + b^2)';

      const steps: StepExplanation[] = [
        {
          stepNumber: 1,
          title: 'Identificar la expresión literal',
          description: `Tenemos el cociente notable canónico de ${isSum ? 'suma de cubos' : 'diferencia de cubos'}.`,
          mathExpression: `\\frac{${vA}^3 ${sign} ${vB}^3}{${toLatex(denRaw)}}`,
          isEssential: true,
        },
        {
          stepNumber: 2,
          title: 'Separar numerador y denominador',
          description: `Numerador: ${vA}³ ${sign} ${vB}³ y Denominador: ${toLatex(denRaw)}.`,
          mathExpression: `\\text{Numerador: } ${vA}^3 ${sign} ${vB}^3 \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
          isEssential: true,
        },
        {
          stepNumber: 3,
          title: 'Identificar el patrón de factorización',
          description: `Corresponde a la fórmula canónica de ${isSum ? 'Suma de cubos' : 'Diferencia de cubos'}.`,
          mathExpression: generalFormula,
          isEssential: true,
        },
        {
          stepNumber: 4,
          title: 'Factorizar el numerador',
          description: 'Escribimos la descomposición del binomio por el trinomio especial:',
          mathExpression: `${vA}^3 ${sign} ${vB}^3 = ${binFactor}(${trinResult})`,
          isEssential: true,
        },
        {
          stepNumber: 5,
          title: 'Sustituir en el cociente',
          description: 'Reemplazamos en la fracción:',
          mathExpression: `\\frac{${binFactor}(${trinResult})}{${toLatex(denRaw)}}`,
          isEssential: true,
        },
        {
          stepNumber: 6,
          title: 'Explicar la simplificación y registrar la restricción',
          description: `Se cancela el factor común ${binFactor} porque divide exactamente. Registramos la restricción ${restriction}.`,
          mathExpression: `\\frac{\\cancel{${binFactor}}(${trinResult})}{\\cancel{${toLatex(denRaw)}}} = ${trinResult}`,
          isEssential: true,
        },
        {
          stepNumber: 7,
          title: 'Resultado final',
          description: 'Resultado algebraico simplificado:',
          mathExpression: `\\mathbf{Resultado: } ${trinResult} \\quad \\text{con restricción: } ${restriction}`,
          isEssential: true,
        },
      ];

      return {
        isQuotient: true,
        isValid: true,
        originalInput: input,
        numeratorRaw: numRaw,
        denominatorRaw: denRaw,
        numeratorFormatted: `${vA}^3 ${sign} ${vB}^3`,
        denominatorFormatted: toLatex(denRaw),
        methodId: isSum ? 'suma_cubos' : 'diferencia_cubos',
        methodName: isSum ? 'Suma de cubos (forma canónica)' : 'Diferencia de cubos (forma canónica)',
        methodDescription: `Caso canónico de cociente notable de ${isSum ? 'suma' : 'diferencia'} de cubos con variables literales.`,
        generalFormula,
        factoredNumerator: `${binFactor}(${trinResult})`,
        commonFactor: binFactor,
        canceledExpression: `\\frac{\\cancel{${binFactor}}(${trinResult})}{\\cancel{${toLatex(denRaw)}}}`,
        simplifiedResult: trinResult,
        restrictions: [restriction],
        restrictionsExplanation: `El denominador no puede anularse: ${toLatex(denRaw)} \\neq 0 \\implies ${restriction}.`,
        steps,
        canBeFactoredFurther: false,
      };
    }
  }

  // 3. Potencias n-ésimas literales: u^n - w^n / (u - w) o u^n + w^n / (u + w)
  const matchPowersN = normNum.match(/^([a-zA-Z])\^n([+-])([a-zA-Z])\^n$/);
  if (matchPowersN) {
    const vA = matchPowersN[1];
    const sign = matchPowersN[2];
    const vB = matchPowersN[3];
    const isSum = sign === '+';

    const expectedDen = isSum ? `${vA}+${vB}` : `${vA}-${vB}`;
    if (normDen === expectedDen) {
      const binFactor = `(${vA} ${sign} ${vB})`;
      const resultPolynomial = isSum
        ? `${vA}^{n-1} - ${vA}^{n-2}${vB} + ${vA}^{n-3}${vB}^2 - \\dots + ${vB}^{n-1} \\quad (n \\text{ impar})`
        : `${vA}^{n-1} + ${vA}^{n-2}${vB} + ${vA}^{n-3}${vB}^2 + \\dots + ${vB}^{n-1}`;
      const restriction = `${vA} \\neq ${isSum ? `-${vB}` : vB}`;
      const generalFormula = isSum
        ? `\\frac{a^n + b^n}{a + b} = a^{n-1} - a^{n-2}b + \\dots + b^{n-1} \\quad (n \\text{ impar})`
        : `\\frac{a^n - b^n}{a - b} = a^{n-1} + a^{n-2}b + \\dots + b^{n-1}`;

      const steps: StepExplanation[] = [
        {
          stepNumber: 1,
          title: 'Identificar la expresión general con exponente n',
          description: `Tenemos la forma canónica general de cociente notable con exponente literal n.`,
          mathExpression: `\\frac{${vA}^n ${sign} ${vB}^n}{${toLatex(denRaw)}}`,
          isEssential: true,
        },
        {
          stepNumber: 2,
          title: 'Separar numerador y denominador',
          description: `Numerador: ${vA}ⁿ ${sign} ${vB}ⁿ y Denominador: ${toLatex(denRaw)}.`,
          mathExpression: `\\text{Numerador: } ${vA}^n ${sign} ${vB}^n \\quad \\text{y} \\quad \\text{Denominador: } ${toLatex(denRaw)}`,
          isEssential: true,
        },
        {
          stepNumber: 3,
          title: 'Identificar la regla general de cocientes notables',
          description: isSum
            ? 'Una suma de potencias aⁿ + bⁿ es divisible entre (a + b) si y sólo si el exponente n es IMPAR. Los signos se alternan.'
            : 'Una diferencia de potencias aⁿ - bⁿ siempre es divisible entre (a - b). Todos los términos tienen signo positivo.',
          mathExpression: generalFormula,
          isEssential: true,
        },
        {
          stepNumber: 4,
          title: 'Factorizar el numerador en su desarrollo general',
          description: 'Escribimos la descomposición factorial:',
          mathExpression: `${vA}^n ${sign} ${vB}^n = ${binFactor} \\left( ${resultPolynomial} \\right)`,
          isEssential: true,
        },
        {
          stepNumber: 5,
          title: 'Sustituir en el cociente',
          description: 'Colocamos el producto en la fracción:',
          mathExpression: `\\frac{${binFactor} \\left( ${resultPolynomial} \\right)}{${toLatex(denRaw)}}`,
          isEssential: true,
        },
        {
          stepNumber: 6,
          title: 'Explicar la simplificación y registrar la restricción',
          description: `Se cancela el factor ${binFactor} porque aparece multiplicando en el numerador y denominador. Registramos la restricción ${restriction}.`,
          mathExpression: `\\frac{\\cancel{${binFactor}} \\left( ${resultPolynomial} \\right)}{\\cancel{${toLatex(denRaw)}}} = ${resultPolynomial}`,
          isEssential: true,
        },
        {
          stepNumber: 7,
          title: 'Resultado final',
          description: 'Desarrollo polinomial resultante:',
          mathExpression: `\\mathbf{Resultado: } ${resultPolynomial} \\quad \\text{con restricción: } ${restriction}`,
          isEssential: true,
        },
      ];

      return {
        isQuotient: true,
        isValid: true,
        originalInput: input,
        numeratorRaw: numRaw,
        denominatorRaw: denRaw,
        numeratorFormatted: `${vA}^n ${sign} ${vB}^n`,
        denominatorFormatted: toLatex(denRaw),
        methodId: isSum ? 'potencias_suma_impar' : 'potencias_diferencia_general',
        methodName: isSum ? 'Suma de potencias impares n-ésimas' : 'Diferencia de potencias n-ésimas (forma general)',
        methodDescription: `Forma general de cocientes notables para potencias n con variables literales.`,
        generalFormula,
        factoredNumerator: `${binFactor}(${resultPolynomial})`,
        commonFactor: binFactor,
        canceledExpression: `\\frac{\\cancel{${binFactor}}(${resultPolynomial})}{\\cancel{${toLatex(denRaw)}}}`,
        simplifiedResult: resultPolynomial,
        restrictions: [restriction],
        restrictionsExplanation: `El denominador no puede anularse: ${toLatex(denRaw)} \\neq 0 \\implies ${restriction}.`,
        steps,
        canBeFactoredFurther: false,
      };
    }
  }

  return null;
}

// -------------------------------------------------------------
// CASOS DE TRAMPAS Y DIAGNÓSTICO DIDÁCTICO
// -------------------------------------------------------------

function createSumOfSquaresTrap(
  input: string,
  numRaw: string,
  denRaw: string,
  v: string,
  a2: number,
  negC: number
): AnalysisResult {
  const sqrtC = Math.sqrt(negC);
  const cVal = isInteger(sqrtC) ? Math.round(sqrtC) : Math.sqrt(negC);

  return createErrorResult(
    input,
    `El numerador ${toLatex(numRaw)} es una SUMA de cuadrados, NO una diferencia de cuadrados.`,
    `En los números reales, una suma de cuadrados a² + b² (como ${v}² + ${negC}) es un binomio irreducible; no se puede factorizar como (${v} + ${cVal})(${v} + ${cVal}) ni como (${v} + ${cVal})(${v} - ${cVal}). Por tanto, no se puede simplificar con (${toLatex(denRaw)}). Recuerda: (x + ${cVal})² = x² + ${2 * (typeof cVal === 'number' ? cVal : 1)}x + ${negC} (tiene un término central que aquí no existe).`
  );
}

function createMismatchResult(
  input: string,
  numRaw: string,
  denRaw: string,
  methodName: string,
  factoredNum: string,
  explanation: string
): AnalysisResult {
  return createErrorResult(
    input,
    `El numerador puede factorizarse mediante "${methodName}", pero no comparte factores comunes con el denominador.`,
    `${explanation} Por lo tanto, esta fracción ya se encuentra en su forma irreducible.`
  );
}

function createNoMatchDiagnostic(
  input: string,
  numRaw: string,
  denRaw: string,
  v: string,
  polyNum: { variable: string; coeffs: Map<number, number> } | null,
  polyDen: { variable: string; coeffs: Map<number, number> } | null
): AnalysisResult {
  // Analizar si el numerador tiene raíces y si coincide con el residuo
  let extraHelp = 'Verifica que la expresión corresponda a uno de los casos: Diferencia de cuadrados, Suma o diferencia de cubos, Trinomio cuadrado perfecto, Trinomio x² + bx + c, Trinomio ax² + bx + c, o Factor común por agrupación.';

  if (polyNum && polyDen) {
    const aDen = polyDen.coeffs.get(1) || 0;
    const cDen = polyDen.coeffs.get(0) || 0;

    if (aDen !== 0) {
      const root = -cDen / aDen;
      // Evaluar P(root)
      let remainder = 0;
      for (const [p, c] of polyNum.coeffs.entries()) {
        remainder += c * Math.pow(root, p);
      }

      if (Math.abs(remainder) > 1e-5) {
        extraHelp = `Por el Teorema del Residuo, al evaluar el numerador en ${v} = ${formatNumber(root)} (el valor que anula el denominador), el residuo es ${formatNumber(remainder)} ≠ 0. Esto demuestra que la división no es exacta y que (${toLatex(denRaw)}) no es un factor del numerador.`;
      }
    }
  }

  return createErrorResult(
    input,
    'No se reconoce como un cociente notable utilizando los métodos configurados.',
    extraHelp
  );
}

function createErrorResult(input: string, errorMsg: string, suggestion: string): AnalysisResult {
  const parsed = parseFractionInput(input);
  return {
    isQuotient: parsed.isValidStructure,
    isValid: false,
    originalInput: input,
    numeratorRaw: parsed.numeratorRaw,
    denominatorRaw: parsed.denominatorRaw,
    numeratorFormatted: toLatex(parsed.numeratorRaw),
    denominatorFormatted: toLatex(parsed.denominatorRaw),
    methodId: 'no_notable_o_no_factorizable',
    methodName: 'Expresión no simplificable por cocientes notables',
    methodDescription: 'No se detecta un patrón de factorización que permita simplificar este cociente exactamente.',
    generalFormula: '',
    factoredNumerator: '',
    commonFactor: '',
    canceledExpression: '',
    simplifiedResult: '',
    restrictions: [],
    restrictionsExplanation: '',
    steps: [],
    errorMessage: errorMsg,
    errorSuggestion: suggestion,
    canBeFactoredFurther: false,
  };
}

// Utilidades auxiliares
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function formatNumber(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-6) {
    return `${Math.round(n)}`;
  }
  return n.toFixed(2);
}
