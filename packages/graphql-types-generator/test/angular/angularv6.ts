import { CodeGenerator } from '../../src/utilities/CodeGenerator';
import { compileToLegacyIR } from '../../src/compiler/legacyIR';
import { parse } from 'graphql';
import { generateSource } from '../../src/angular';
import { loadSchema } from '../../src/loading';

const starWarsSchema = loadSchema(require.resolve('../fixtures/starwars/schema.json'));
const subscriptionSchema = loadSchema(require.resolve('../fixtures/misc/subscriptionSchema.json'));
const subscriptionSchemaWithParameters = require.resolve('../fixtures/misc/subscriptionSchemaWithParameters.graphql')

describe('Angular code generation', () => {
  let generator;
  let compileFromSource;
  let addFragment;

  const setup = (schema) => {
    const context = {
      schema: schema,
      operations: {},
      fragments: {},
      typesUsed: {},
    };

    generator = new CodeGenerator(context);

    compileFromSource = source => {
      const document = parse(source);
      const context = compileToLegacyIR(schema, document, {
        mergeInFieldsFromFragmentSpreads: true,
        addTypename: true,
      });
      generator.context = context;
      return context;
    };

    addFragment = fragment => {
      generator.context.fragments[fragment.fragmentName] = fragment;
    };

    return { generator, compileFromSource, addFragment };
  }

  const generateAngularV6API = (context) => generateSource(context, { isAngularV6: true })

  test(`should generate simple query operations`, function() {
    const { compileFromSource } = setup(starWarsSchema);
    const context = compileFromSource(`
      query HeroName {
        hero {
          name
        }
      }
    `);

    const source = generateAngularV6API(context);
    expect(source).toMatchSnapshot();
  });

  test(`should generate simple query operations including input variables`, function() {
    const { compileFromSource } = setup(starWarsSchema);
    const context = compileFromSource(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
        }
      }
    `);

    const source = generateAngularV6API(context);
    expect(source).toMatchSnapshot();
  });

  test(`should generate subscriptions`, function() {
    const { compileFromSource } = setup(subscriptionSchema);
    const context = compileFromSource(`
    subscription OnCreateRestaurant {
      onCreateRestaurant {
        id
        name
        description
        city
      }
    }
    `);

    const source = generateAngularV6API(context);
    expect(source).toMatchSnapshot();
  });

  test('should generate subscriptions with parameters', () => {
    const { compileFromSource } = setup(loadSchema(subscriptionSchemaWithParameters));
    const context = compileFromSource(`
    subscription OnCreateRestaurant($owner: String!) {
      onCreateRestaurant(owner: $owner) {
        id
        name
        description
        city
        owner
        createdAt
        updatedAt
      }
    }
    `);
    const source = generateAngularV6API(context);
    expect(source).toMatchSnapshot();
  })
})