import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { validateTs } from '@graphql-codegen/testing';
import { DefaultDirectives } from '@aws-amplify/graphql-directives';
import { TYPESCRIPT_SCALAR_MAP } from '../../scalars';
import { scalars } from '../../scalars/supported-scalars';
import { AppSyncModelTypeScriptVisitor } from '../../visitors/appsync-typescript-visitor';

const directives = DefaultDirectives.map((directive) => directive.definition).join('\n');

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};
const getVisitor = (schema: string): AppSyncModelTypeScriptVisitor => {
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelTypeScriptVisitor(
    builtSchema,
    { directives, target: 'typescript', scalars: TYPESCRIPT_SCALAR_MAP, codegenVersion: '3.3.4' },
    {},
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('TypeScript visitor', () => {
  test('singular enum', () => {
    const schema = /* GraphQL */ `
      enum Frequency {
        YEARLY
        WEEKLY
      }

      type Recurrence {
        frequency: Frequency!
      }
    `;
    const visitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('list enum', () => {
    const schema = /* GraphQL */ `
      enum DayOfWeek {
        MONDAY
        TUESDAY
        WEDNESDAY
        THURSDAY
        FRIDAY
        SATURDAY
        SUNDAY
      }

      type Recurrence {
        daysOfWeek: [DayOfWeek!]!
      }
    `;
    const visitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });
});
