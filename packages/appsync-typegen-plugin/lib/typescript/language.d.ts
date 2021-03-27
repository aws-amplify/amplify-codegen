import { LegacyInlineFragment } from '../compiler/legacyIR';
import { CodeGenerator } from '../utilities/CodeGenerator';
import { GraphQLType } from 'graphql';
import Maybe from 'graphql/tsutils/Maybe';
export interface Property {
  fieldName?: string;
  fieldType?: GraphQLType;
  propertyName?: string;
  type?: GraphQLType;
  description?: Maybe<string>;
  typeName?: string;
  isComposite?: boolean;
  isNullable?: boolean;
  fields?: any[];
  inlineFragments?: LegacyInlineFragment[];
  fragmentSpreads?: any;
  isOptional?: boolean;
  isArray?: boolean;
  isArrayElementNullable?: boolean | null;
}
export declare function interfaceDeclaration(
  generator: CodeGenerator,
  {
    interfaceName,
    noBrackets,
  }: {
    interfaceName: string;
    noBrackets?: boolean;
  },
  closure: () => void,
): void;
export declare function propertyDeclaration(
  generator: CodeGenerator,
  { fieldName, type, propertyName, typeName, description, isOptional, isArray, isNullable, isArrayElementNullable }: Property,
  closure?: () => void,
): void;
export declare function pickedPropertySetsDeclaration(
  generator: CodeGenerator,
  property: Property,
  propertySets: Property[][],
  standalone?: boolean,
): void;
export declare function methodDeclaration(
  generator: CodeGenerator,
  {
    methodName,
    returnType,
    async,
    args,
  }: {
    methodName: string;
    returnType: string;
    async: boolean;
    args: Array<string>;
  },
  closure: () => void,
): void;
//# sourceMappingURL=language.d.ts.map
