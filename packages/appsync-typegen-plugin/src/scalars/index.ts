import { NormalizedScalarsMap } from '@graphql-codegen/visitor-plugin-common';

export const TYPESCRIPT_SCALAR_MAP: NormalizedScalarsMap = {
  ID: 'string',
  String: 'string',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
  AWSDate: 'string',
  AWSDateTime: 'string',
  AWSTime: 'string',
  AWSTimestamp: 'number',
  AWSEmail: 'string',
  AWSJSON: 'string',
  AWSURL: 'string',
  AWSPhone: 'string',
  AWSIPAddress: 'string',
};
