import * as readline from 'readline/promises';

export async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await rl.question(question + ':\n> ');
  rl.close();
  return answer;
}

interface BaseAskOptions {
  question: string;
  invalidMessage?: string | ((value: string) => string);
  ignoreCase?: boolean;
}

interface AskOptionsWithRecord<K extends string> extends BaseAskOptions {
  validValues: Record<K, string[]>;
}
interface AskOptionsWithArray<V extends ReadonlyArray<string>> extends BaseAskOptions {
  validValues: V;
}
interface AskOptionsWithFunction extends BaseAskOptions {
  validValues: (value: string) => boolean;
}

export function askUntilValid(options: AskOptionsWithFunction): Promise<string>;
export function askUntilValid<T extends string>(options: AskOptionsWithRecord<T>): Promise<T>;
export function askUntilValid<V extends string, A extends V[]>(options: AskOptionsWithArray<A>): Promise<A[number]>;
export function askUntilValid<T extends string, V extends string, A extends V[]>(options: AskOptionsWithRecord<T> | AskOptionsWithArray<A> | AskOptionsWithFunction): Promise<string | T | V> {
  const validValues = options.validValues;
  const _ask = async function* (): AsyncGenerator<string | undefined> {
    while (true) {
      const answer = await ask(options.question);
      
      if (
        typeof validValues === 'function'
          ? validValues(answer)
          : Array.isArray(validValues)
            ? validValues.includes(options.ignoreCase ? answer.toLowerCase() as any : answer)
            : Object.values(validValues).flat().includes(answer)
      ) {
        const isObject = typeof validValues !== 'function' && !Array.isArray(validValues);
        const result = isObject ? Object.keys(validValues).find(key => validValues[key as keyof typeof validValues].includes(answer)) : answer;
        yield result;
      } else {
        console.log(
          typeof options.invalidMessage === 'function'
            ? options.invalidMessage(answer)
            : options.invalidMessage ?? 'Invalid answer, please try again\n'
        );
        yield;
      }
    }
  }

  return new Promise(async (resolve) => {
    for await (const answer of _ask()) {
      if (answer === undefined) continue;
      return resolve(answer);
    }
  });
}
