/**
 * Interpretador de expressões de gramática FECHADA.
 *
 * Existe porque o ADR-0006 proíbe `eval` e `new Function` para avaliar as condições
 * das faixas de resultado (`ruleset.config.action.bands[].when`) e os campos `derived`
 * da ficha. Essas expressões vêm do banco de dados e são editáveis pelo autor do
 * sistema — tratá-las como código executável seria uma porta aberta.
 *
 * A gramática aceita SOMENTE:
 *   - números literais            42, 3.5
 *   - `true` / `false`
 *   - variáveis do contexto       roll, skill
 *   - funções da allowlist        ceil, floor, round, abs, min, max
 *   - aritmética                  + - * / %  e menos unário
 *   - comparação                  < <= > >= == !=
 *   - lógicos                     && || !
 *   - parênteses
 *
 * Qualquer outra coisa — acesso a propriedade, chamada de método, indexação,
 * atribuição, identificador desconhecido — é erro de sintaxe, não comportamento
 * indefinido.
 */

export class ExpressionError extends Error {
  override readonly name = 'ExpressionError';
}

export type Scope = Record<string, number | boolean | null | undefined>;

type TokenType = 'num' | 'ident' | 'op' | 'paren' | 'comma' | 'eof';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const FUNCTIONS: Record<string, { arity: number | 'variadic'; fn: (...a: number[]) => number }> = {
  ceil: { arity: 1, fn: Math.ceil },
  floor: { arity: 1, fn: Math.floor },
  round: { arity: 1, fn: Math.round },
  abs: { arity: 1, fn: Math.abs },
  min: { arity: 'variadic', fn: Math.min },
  max: { arity: 'variadic', fn: Math.max },
};

/** Operadores de dois caracteres precisam ser testados antes dos de um. */
const OPS_2 = ['<=', '>=', '==', '!=', '&&', '||'];
const OPS_1 = ['<', '>', '+', '-', '*', '/', '%', '!'];

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i]!;

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    if (ch >= '0' && ch <= '9') {
      let j = i;
      while (j < src.length && src[j]! >= '0' && src[j]! <= '9') j++;
      if (src[j] === '.') {
        j++;
        while (j < src.length && src[j]! >= '0' && src[j]! <= '9') j++;
      }
      tokens.push({ type: 'num', value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j]!)) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch, pos: i });
      i++;
      continue;
    }

    const two = src.slice(i, i + 2);
    if (OPS_2.includes(two)) {
      tokens.push({ type: 'op', value: two, pos: i });
      i += 2;
      continue;
    }

    // `=` sozinho é atribuição: rejeitado de propósito.
    if (OPS_1.includes(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i });
      i++;
      continue;
    }

    throw new ExpressionError(`Caractere inesperado ${JSON.stringify(ch)} na posição ${i}`);
  }

  tokens.push({ type: 'eof', value: '', pos: src.length });
  return tokens;
}

/**
 * Parser recursivo descendente. Precedência, da mais fraca para a mais forte:
 *   ||  →  &&  →  == !=  →  < <= > >=  →  + -  →  * / %  →  unário  →  primário
 */
class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly scope: Scope,
  ) {}

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private next(): Token {
    return this.tokens[this.pos++]!;
  }

  private eatOp(...values: string[]): string | null {
    const t = this.peek();
    if (t.type === 'op' && values.includes(t.value)) {
      this.pos++;
      return t.value;
    }
    return null;
  }

  parse(): number | boolean {
    const value = this.parseOr();
    const t = this.peek();
    if (t.type !== 'eof') {
      throw new ExpressionError(`Token inesperado ${JSON.stringify(t.value)} na posição ${t.pos}`);
    }
    return value;
  }

  private parseOr(): number | boolean {
    let left = this.parseAnd();
    while (this.eatOp('||')) {
      const right = this.parseAnd();
      left = truthy(left) || truthy(right);
    }
    return left;
  }

  private parseAnd(): number | boolean {
    let left = this.parseEquality();
    while (this.eatOp('&&')) {
      const right = this.parseEquality();
      left = truthy(left) && truthy(right);
    }
    return left;
  }

  private parseEquality(): number | boolean {
    let left = this.parseRelational();
    for (;;) {
      const op = this.eatOp('==', '!=');
      if (!op) return left;
      const right = this.parseRelational();
      left = op === '==' ? left === right : left !== right;
    }
  }

  private parseRelational(): number | boolean {
    let left = this.parseAdditive();
    for (;;) {
      const op = this.eatOp('<', '<=', '>', '>=');
      if (!op) return left;
      const a = num(left);
      const b = num(this.parseAdditive());
      left = op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b;
    }
  }

  private parseAdditive(): number | boolean {
    let left = this.parseMultiplicative();
    for (;;) {
      const op = this.eatOp('+', '-');
      if (!op) return left;
      const a = num(left);
      const b = num(this.parseMultiplicative());
      left = op === '+' ? a + b : a - b;
    }
  }

  private parseMultiplicative(): number | boolean {
    let left = this.parseUnary();
    for (;;) {
      const op = this.eatOp('*', '/', '%');
      if (!op) return left;
      const a = num(left);
      const b = num(this.parseUnary());
      if ((op === '/' || op === '%') && b === 0) {
        throw new ExpressionError('Divisão por zero');
      }
      left = op === '*' ? a * b : op === '/' ? a / b : a % b;
    }
  }

  private parseUnary(): number | boolean {
    if (this.eatOp('-')) return -num(this.parseUnary());
    if (this.eatOp('!')) return !truthy(this.parseUnary());
    if (this.eatOp('+')) return num(this.parseUnary());
    return this.parsePrimary();
  }

  private parsePrimary(): number | boolean {
    const t = this.next();

    if (t.type === 'num') return Number(t.value);

    if (t.type === 'paren' && t.value === '(') {
      const value = this.parseOr();
      const close = this.next();
      if (close.type !== 'paren' || close.value !== ')') {
        throw new ExpressionError(`Esperado ")" na posição ${close.pos}`);
      }
      return value;
    }

    if (t.type === 'ident') {
      if (t.value === 'true') return true;
      if (t.value === 'false') return false;

      // chamada de função
      const ahead = this.peek();
      if (ahead.type === 'paren' && ahead.value === '(') {
        const spec = FUNCTIONS[t.value];
        if (!spec) throw new ExpressionError(`Função desconhecida ${JSON.stringify(t.value)}`);
        this.pos++; // consome "("
        const args: number[] = [];
        if (!(this.peek().type === 'paren' && this.peek().value === ')')) {
          for (;;) {
            args.push(num(this.parseOr()));
            if (this.peek().type === 'comma') {
              this.pos++;
              continue;
            }
            break;
          }
        }
        const close = this.next();
        if (close.type !== 'paren' || close.value !== ')') {
          throw new ExpressionError(`Esperado ")" na posição ${close.pos}`);
        }
        if (spec.arity !== 'variadic' && args.length !== spec.arity) {
          throw new ExpressionError(
            `${t.value}() espera ${spec.arity} argumento(s), recebeu ${args.length}`,
          );
        }
        if (spec.arity === 'variadic' && args.length === 0) {
          throw new ExpressionError(`${t.value}() espera ao menos 1 argumento`);
        }
        return spec.fn(...args);
      }

      // Variável do contexto.
      // `Object.hasOwn` e não `in`: o operador `in` percorre a cadeia de protótipos,
      // então `constructor`, `__proto__`, `toString` etc. passariam como variáveis
      // válidas e vazariam objetos do runtime para dentro da expressão.
      if (!Object.hasOwn(this.scope, t.value)) {
        throw new ExpressionError(`Variável desconhecida ${JSON.stringify(t.value)}`);
      }
      const v = this.scope[t.value];
      if (v === null || v === undefined) {
        throw new ExpressionError(`Variável ${JSON.stringify(t.value)} não tem valor`);
      }
      // Cinto e suspensório: o escopo é tipado, mas ele vem de JSONB do banco.
      if (typeof v !== 'number' && typeof v !== 'boolean') {
        throw new ExpressionError(`Variável ${JSON.stringify(t.value)} não é número nem booleano`);
      }
      return v;
    }

    throw new ExpressionError(`Token inesperado ${JSON.stringify(t.value)} na posição ${t.pos}`);
  }
}

function num(v: number | boolean): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ExpressionError('Resultado numérico inválido');
    return v;
  }
  throw new ExpressionError('Esperado um número, recebeu booleano');
}

function truthy(v: number | boolean): boolean {
  return typeof v === 'boolean' ? v : v !== 0;
}

/** Avalia uma expressão e devolve número ou booleano. Lança `ExpressionError`. */
export function evaluate(source: string, scope: Scope = {}): number | boolean {
  if (source.length > 500) {
    throw new ExpressionError('Expressão longa demais');
  }
  return new Parser(tokenize(source), scope).parse();
}

/** Avalia e coage para booleano. Usado nas condições das faixas de resultado. */
export function evaluateCondition(source: string, scope: Scope = {}): boolean {
  return truthy(evaluate(source, scope));
}
