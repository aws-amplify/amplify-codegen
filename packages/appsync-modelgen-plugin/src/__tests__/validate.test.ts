const validateModelIntrospectionSchema = require('../validate-cjs');
import { ModelIntrospectionSchema } from '../interfaces/introspection'

describe('Standalone validation function', () => {
  const validSchema: ModelIntrospectionSchema = {
    version: 1, 
    models: {},
    nonModels: {},
    enums: {},
  }
  it('should pass on the valid schema', () => {
    const result = validateModelIntrospectionSchema(validSchema);
    expect(result).toBe(true);
  });
  describe('should fail on the invalid schema', () => {
    it('invalid version', () => {
      const schema = {
        ...validSchema,
        version: 100, 
      };
      const result = validateModelIntrospectionSchema(schema);
      expect(result).toBe(false);
    });
    it('invalid fields', () => {
      const schema = {
        ...validSchema,
        invalidField: {}
      };
      const result = validateModelIntrospectionSchema(schema);
      expect(result).toBe(false);
    });
    it('missing required fields', () => {
      const schema = {
        ...validSchema,
      };
      delete (schema as any).models;
      const result = validateModelIntrospectionSchema(schema);
      expect(result).toBe(false);
    });
  });
});