import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Model type
  Todo: a
    .model({
      content: a.string(),
      status: a.ref('Status'),
    })
    .authorization((allow) => [allow.guest()]),
  // Enum Type
  Status: a.enum([
    'PROGRESS',
    'COMPLETED',
  ]),
  // Non model type
  EchoResponse: a.customType({
    content: a.string(),
    executionDuration: a.float()
  }),
  // Custom query and mutation
  echoQuery: a
    .query()
    .arguments({
      content: a.string(),
      status: a.enum(['PROGRESS', 'COMPLETED']),
    })
    .returns(a.ref('EchoResponse'))
    .authorization(allow => [allow.authenticated()]),
  echoMutation: a
    .mutation()
    .arguments({
      requiredContent: a.string().required()
    })
    .returns(a.ref('Todo').required())
    .authorization(allow => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'iam',
  },
});
