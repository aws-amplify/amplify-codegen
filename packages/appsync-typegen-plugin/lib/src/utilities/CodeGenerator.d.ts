export interface BasicGeneratedFile {
  output: string;
}
export declare class GeneratedFile<Scope = any> implements BasicGeneratedFile {
  scopeStack: Scope[];
  indentWidth: number;
  indentLevel: number;
  startOfIndentLevel: boolean;
  output: string;
  pushScope(scope: Scope): void;
  popScope(): Scope | undefined;
  get scope(): Scope;
  print(string?: string): void;
  printNewline(): void;
  printNewlineIfNeeded(): void;
  printOnNewline(string?: string): void;
  printIndent(): void;
  withIndent(closure: Function): void;
  withinBlock(closure: Function, open?: string, close?: string): void;
}
export declare class CodeGenerator<Context = any, Scope = any> {
  context: Context;
  generatedFiles: {
    [fileName: string]: GeneratedFile<Scope>;
  };
  currentFile: GeneratedFile<Scope>;
  constructor(context: Context);
  withinFile(fileName: string, closure: Function): void;
  get output(): string;
  pushScope(scope: Scope): void;
  popScope(): void;
  get scope(): Scope;
  print(string?: string): void;
  printNewline(): void;
  printNewlineIfNeeded(): void;
  printOnNewline(string?: string): void;
  printIndent(): void;
  withIndent(closure: Function): void;
  withinBlock(closure: Function, open?: string, close?: string): void;
}
//# sourceMappingURL=CodeGenerator.d.ts.map
