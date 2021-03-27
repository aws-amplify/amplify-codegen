import { LegacyCompilerContext, LegacyInlineFragment, LegacyFragment, LegacyField, LegacyOperation } from '../compiler/legacyIR';
import { GraphQLType } from 'graphql';
import { CodeGenerator } from '../utilities/CodeGenerator';
import { Property } from './language';
import Maybe from 'graphql/tsutils/Maybe';
export declare function generateSource(context: LegacyCompilerContext): string;
export declare function typeDeclarationForGraphQLType(generator: CodeGenerator, type: GraphQLType): void;
export declare function interfaceNameFromOperation({
  operationName,
  operationType,
}: {
  operationName: string;
  operationType: string;
}): string;
export declare function interfaceVariablesDeclarationForOperation(
  generator: CodeGenerator,
  { operationName, operationType, variables }: LegacyOperation,
): void;
export declare function updateTypeNameField(rootField: LegacyField): LegacyField;
export declare function interfaceDeclarationForOperation(
  generator: CodeGenerator,
  { operationName, operationType, fields }: LegacyOperation,
): void;
export declare function interfaceDeclarationForFragment(generator: CodeGenerator, fragment: LegacyFragment): void;
export declare function propertiesFromFields(
  context: LegacyCompilerContext,
  fields: {
    name?: string;
    type: GraphQLType;
    responseName?: string;
    description?: Maybe<string>;
    fragmentSpreads?: any;
    inlineFragments?: LegacyInlineFragment[];
    fieldName?: string;
  }[],
): Property[];
export declare function propertyFromField(
  context: LegacyCompilerContext,
  field: {
    name?: string;
    type: GraphQLType;
    fields?: any[];
    responseName?: string;
    description?: Maybe<string>;
    fragmentSpreads?: any;
    inlineFragments?: LegacyInlineFragment[];
    fieldName?: string;
  },
): Property;
export declare function pickedPropertyDeclarations(generator: CodeGenerator, properties: Property[], isOptional?: boolean): void;
//# sourceMappingURL=codeGeneration.d.ts.map
