import { buildClientSchema, Source, parse, GraphQLSchema, buildASTSchema } from 'graphql';

export function loadSchema(schema: string, isSDLSchema: boolean): GraphQLSchema {
  if (isSDLSchema) {
    return loadSDLSchema(schema);
  }
  return loadIntrospectionSchema(schema);
}

function loadIntrospectionSchema(schema: string): GraphQLSchema {
  const schemaData = require(schema);

  if (!schemaData.data && !schemaData.__schema) {
    throw new Error('GraphQL schema file should contain a valid GraphQL introspection query result');
  }
  return buildClientSchema(schemaData.data ? schemaData.data : schemaData);
}

function loadSDLSchema(schema: string): GraphQLSchema {
  const extendedSchema = [schema, AWS_APPSYNC_SDL].join("\n");
  const graphQLDocument = parse(new Source(extendedSchema));
  return buildASTSchema(graphQLDocument);
}

const AWS_APPSYNC_SDL = `
scalar AWSDate
scalar AWSTime
scalar AWSDateTime
scalar AWSTimestamp
scalar AWSEmail
scalar AWSJSON
scalar AWSURL
scalar AWSPhone
scalar AWSIPAddress
scalar BigInt
scalar Double

directive @aws_subscribe(mutations: [String!]!) on FIELD_DEFINITION

# Allows transformer libraries to deprecate directive arguments.
directive @deprecated(reason: String) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION | ENUM | ENUM_VALUE

directive @aws_auth(cognito_groups: [String!]!) on FIELD_DEFINITION
directive @aws_api_key on FIELD_DEFINITION | OBJECT
directive @aws_iam on FIELD_DEFINITION | OBJECT
directive @aws_lambda on FIELD_DEFINITION | OBJECT
directive @aws_oidc on FIELD_DEFINITION | OBJECT
directive @aws_cognito_user_pools(cognito_groups: [String!]) on FIELD_DEFINITION | OBJECT
`;
