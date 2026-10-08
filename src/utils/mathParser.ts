/**
 * Normaliza y divide una expresión algebraica en numerador y denominador.
 */

export interface ParsedFraction {
  raw: string;
  numeratorRaw: string;
  denominatorRaw: string;
  isValidStructure: boolean;
  error?: string;
}

/**
 * Normaliza caracteres especiales (² -> ^2, ³ -> ^3, signos, espacios).
 */
export function normalizeExpression(expr: string): string {
  let cleaned = expr.trim();
  // Sustituir superíndices comunes
  cleaned = cleaned.replace(/²/g, '^2');
  cleaned = cleaned.replace(/³/g, '^3');
  cleaned = cleaned.replace(/⁴/g, '^4');
  cleaned = cleaned.replace(/⁵/g, '^5');
  cleaned = cleaned.replace(/⁶/g, '^6');
  cleaned = cleaned.replace(/⁷/g, '^7');
  cleaned = cleaned.replace(/⁸/g, '^8');
  cleaned = cleaned.replace(/⁹/g, '^9');
  cleaned = cleaned.replace(/⁰/g, '^0');
  cleaned = cleaned.replace(/ⁿ/g, '^n');
  cleaned = cleaned.replace(/ᵐ/g, '^m');

  // Quitar espacios repetidos
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Normalizar multiplicaciones implícitas como 2x -> 2*x para análisis interno si es necesario,
  // pero conservar legibilidad.
  return cleaned;
}

/**
 * Extrae numerador y denominador desde formatos:
 * - (num) / (den)
 * - num / den
 * - \frac{num}{den}
 * - (num)/(den)
 */
export function parseFractionInput(input: string): ParsedFraction {
  const normalized = normalizeExpression(input);

  if (!normalized) {
    return {
      raw: input,
      numeratorRaw: '',
      denominatorRaw: '',
      isValidStructure: false,
      error: 'La expresión está vacía. Escribe una expresión como (x² - 9)/(x - 3).',
    };
  }

  // Detectar formato LaTeX \frac{num}{den}
  const fracMatch = normalized.match(/\\frac\{([^}]+)\}\{([^}]+)\}/);
  if (fracMatch) {
    return {
      raw: normalized,
      numeratorRaw: fracMatch[1].trim(),
      denominatorRaw: fracMatch[2].trim(),
      isValidStructure: true,
    };
  }

  // Si contiene '/'
  if (normalized.includes('/')) {
    // Buscar la barra divisora principal fuera de paréntesis internos si es posible
    // Ej: (x^2 - 9) / (x - 3)
    let slashIndex = -1;
    let depth = 0;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === '/' && depth === 0) {
        slashIndex = i;
        break;
      }
    }

    // Si la barra estaba dentro de un paréntesis global que englobaba todo, o si no se encontró en nivel 0
    if (slashIndex === -1) {
      // Buscar primera '/' que separe dos partes con paréntesis: (A)/(B)
      const parenSlashMatch = normalized.match(/^\s*\((.+?)\)\s*\/\s*\((.+?)\)\s*$/);
      if (parenSlashMatch) {
        return {
          raw: normalized,
          numeratorRaw: parenSlashMatch[1].trim(),
          denominatorRaw: parenSlashMatch[2].trim(),
          isValidStructure: true,
        };
      }

      // Si no, tomar la primera barra '/'
      slashIndex = normalized.indexOf('/');
    }

    let num = normalized.slice(0, slashIndex).trim();
    let den = normalized.slice(slashIndex + 1).trim();

    // Limpiar paréntesis exteriores si están envueltos
    if (num.startsWith('(') && num.endsWith(')')) {
      num = num.slice(1, -1).trim();
    }
    if (den.startsWith('(') && den.endsWith(')')) {
      den = den.slice(1, -1).trim();
    }

    if (!num || !den) {
      return {
        raw: normalized,
        numeratorRaw: num,
        denominatorRaw: den,
        isValidStructure: false,
        error: 'El cociente debe tener tanto numerador como denominador bien definidos.',
      };
    }

    return {
      raw: normalized,
      numeratorRaw: num,
      denominatorRaw: den,
      isValidStructure: true,
    };
  }

  return {
    raw: normalized,
    numeratorRaw: normalized,
    denominatorRaw: '',
    isValidStructure: false,
    error: 'No se detectó un cociente (falta la barra de división "/"). Ejemplo: (x² - 9)/(x - 3)',
  };
}

/**
 * Convierte un polinomio simple o expresión a LaTeX legible.
 */
export function toLatex(expr: string): string {
  if (!expr) return '';
  let str = expr.trim();
  // Limpiar paréntesis exteriores si engloban todo
  if (str.startsWith('(') && str.endsWith(')')) {
    const inner = str.slice(1, -1);
    let balanced = true;
    let d = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '(') d++;
      else if (inner[i] === ')') d--;
      if (d < 0) {
        balanced = false;
        break;
      }
    }
    if (balanced && d === 0) {
      str = inner;
    }
  }

  // Formato de potencias x^2 -> x^{2}
  str = str.replace(/\^([0-9a-zA-Z]+)/g, '^{$1}');
  // Espaciar signos + y -
  str = str.replace(/\s*\+\s*/g, ' + ');
  str = str.replace(/\s*-\s*/g, ' - ');
  return str;
}
