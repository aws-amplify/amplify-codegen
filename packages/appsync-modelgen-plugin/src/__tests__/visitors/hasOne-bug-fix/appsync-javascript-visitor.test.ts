import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { directives, scalars } from '../../../scalars/supported-directives';
import { TYPESCRIPT_SCALAR_MAP } from '../../../scalars';
import { AppSyncModelJavascriptVisitor } from '../../../visitors/appsync-javascript-visitor';
import { CodeGenGenerateEnum } from '../../../visitors/appsync-visitor';

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getGQLv2Visitor = (
  schema: string,
  selectedType?: string,
  isDeclaration: boolean = false,
  generate: CodeGenGenerateEnum = CodeGenGenerateEnum.code,
  isTimestampFieldsAdded: boolean = false,
): AppSyncModelJavascriptVisitor => {
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelJavascriptVisitor(
    builtSchema,
    { directives, target: 'javascript', scalars: TYPESCRIPT_SCALAR_MAP, isDeclaration, isTimestampFieldsAdded, transformerVersion: 2 },
    { selectedType, generate },
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('AppSyncSwiftVisitor - hasOne Bug Regression Tests', () => {
  it('v2 should support a schema as part of hasOne/hasMany relationships', () => {
    const schema = /* GraphQL */ `
        type ModelTwo @model @auth(rules: [{ allow: public }]) {
        id: ID!
        ModelOnes: [ModelOne] @hasMany(indexName: "byModelTwo", fields: ["id"])
        }
        #

        type ModelOne @model @auth(rules: [{ allow: public }]) {
        id: ID!
        ModelTwo: ModelTwo @hasOne
        modeltwoID: ID @index(name: "byModelTwo")
        }
  `;
    expect(getGQLv2Visitor(schema, 'ModelOne').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'ModelOne', true).generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'ModelTwo').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'ModelTwo', true).generate()).toMatchSnapshot();
  });
});
