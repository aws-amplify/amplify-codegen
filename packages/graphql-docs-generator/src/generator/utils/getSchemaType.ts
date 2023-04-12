import { SchemaType } from '../types';

/*
  Determines if the schema is GraphQL SDL or Introspection,
  which are the current supported formats.
*/
export const getSchemaType = (schema: string) => {
  const schemaType = SchemaType.SDL;
  try {
    const schemaData = JSON.parse(schema);

    if (schemaData.data || schemaData.__schema) {
      return SchemaType.INTROSPECTION;
    }
  }
  catch {
    return schemaType;
  }

  return schemaType;
}
