import { parse, GraphQLSchema } from 'graphql';
import { compileToIR, CompilerOptions } from '../../compiler';
import { loadSchema } from '../../loading';

export const starWarsSchema = loadSchema(require.resolve('../starwarsschema.json'));

export function compile(source: string, schema: GraphQLSchema = starWarsSchema, options: CompilerOptions = {}) {
  const document = parse(source);
  return compileToIR(schema, document, options);
}

it('sample test in core plugin', async () => {
  expect('generate').toEqual('generate');
});
