import { GraphQLEnumType, GraphQLInputObjectType } from 'graphql';

import { CompilerOptions } from '../compiler';

import { createTypeAnnotationFromGraphQLTypeFunction } from './helpers';

import * as t from '@babel/types';

const commentLine = (value: string): t.CommentLine => ({
  type: 'CommentLine',
  value,
});

export type ObjectProperty = {
  name: string;
  description?: string | null | undefined;
  annotation: t.FlowType;
};

export interface FlowCompilerOptions extends CompilerOptions {
  useFlowExactObjects: boolean;
}

export class FlowGenerator {
  options: FlowCompilerOptions;
  typeAnnotationFromGraphQLType: Function;

  constructor(compilerOptions: FlowCompilerOptions) {
    this.options = compilerOptions;

    this.typeAnnotationFromGraphQLType = createTypeAnnotationFromGraphQLTypeFunction(compilerOptions);
  }

  public enumerationDeclaration(type: GraphQLEnumType) {
    const { name, description } = type;
    const unionValues = type.getValues().map(({ value }) =>
      t.stringLiteralTypeAnnotation(value)
    );

    const typeAlias = t.exportNamedDeclaration(t.typeAlias(t.identifier(name), undefined, t.unionTypeAnnotation(unionValues)), []);

    if (description) {
      typeAlias.leadingComments = [commentLine(` ${description}`)];
    }

    return typeAlias;
  }

  public inputObjectDeclaration(inputObjectType: GraphQLInputObjectType) {
    const { name, description } = inputObjectType;

    const fieldMap = inputObjectType.getFields();
    const fields: ObjectProperty[] = Object.keys(inputObjectType.getFields()).map((fieldName: string) => {
      const field = fieldMap[fieldName];
      return {
        name: fieldName,
        annotation: this.typeAnnotationFromGraphQLType(field.type),
      };
    });

    const typeAlias = this.typeAliasObject(name, fields);

    if (description) {
      typeAlias.leadingComments = [commentLine(` ${description}`)];
    }

    return typeAlias;
  }

  public objectTypeAnnotation(fields: ObjectProperty[], isInputObject: boolean = false) {
    const objectTypeAnnotation = t.objectTypeAnnotation(
      fields.map(({ name, description, annotation }) => {
        const objectTypeProperty = t.objectTypeProperty(
          t.identifier(
            // Nullable fields on input objects do not have to be defined
            // as well, so allow these fields to be "undefined"
            isInputObject && annotation.type === 'NullableTypeAnnotation' ? name + '?' : name
          ),
          annotation
        );

        if (description) {
          objectTypeProperty.trailingComments = [commentLine(` ${description}`)];
        }

        return objectTypeProperty;
      })
    );

    if (this.options.useFlowExactObjects) {
      objectTypeAnnotation.exact = true;
    }

    return objectTypeAnnotation;
  }

  public typeAliasObject(name: string, fields: ObjectProperty[]) {
    return t.typeAlias(t.identifier(name), undefined, this.objectTypeAnnotation(fields));
  }

  public typeAliasObjectUnion(name: string, members: ObjectProperty[][]) {
    return t.typeAlias(
      t.identifier(name),
      undefined,
      t.unionTypeAnnotation(
        members.map(member => {
          return this.objectTypeAnnotation(member);
        })
      )
    );
  }

  public typeAliasGenericUnion(name: string, members: t.FlowType[]) {
    return t.typeAlias(t.identifier(name), undefined, t.unionTypeAnnotation(members));
  }

  public exportDeclaration(declaration: t.Declaration) {
    return t.exportNamedDeclaration(declaration, []);
  }

  public scopeName(scope: string[]): string {
    return scope.join('_');
  }

  public annotationFromName(name: string): t.GenericTypeAnnotation {
    return t.genericTypeAnnotation(t.identifier(name));
  }

  public annotationFromScopeStack(scope: string[]): t.GenericTypeAnnotation {
    return this.annotationFromName(this.scopeName(scope));
  }
}
