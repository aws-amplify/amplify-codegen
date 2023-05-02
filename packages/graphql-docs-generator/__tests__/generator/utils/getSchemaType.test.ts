import { getSchemaType } from '../../../src/generator/utils/getSchemaType';
import { SchemaType } from '../../../src/generator/types';
import { resolve, join } from 'path';
import * as fs from 'fs';

describe('Get Appropriate GraphQL Schema Type', () => {
  it('detects the GraphQL introspection schema type', () => {
    const schemaPath = resolve(__dirname, join('..', '..', '..', 'fixtures', 'schema.json'));
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(getSchemaType(schema)).toEqual(SchemaType.INTROSPECTION);
  });

  it('detects the GraphQL SDL schema type', () => {
    const schemaPath = resolve(__dirname, join('..', '..', '..', 'fixtures', 'schema.graphql'));
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(getSchemaType(schema)).toEqual(SchemaType.SDL);
  });

  it('defaults to return the GraphQL SDL schema type', () => {
    const schema = `{"data": {"invalid_key": "invalid_value"}`;

    expect(getSchemaType(schema)).toEqual(SchemaType.SDL);
  });
});
