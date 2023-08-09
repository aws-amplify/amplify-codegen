import { generateTypes, GenerateTypesOptions, TargetType } from '..';

describe('generateTypes', () => {
  describe('targets', () => {
    const targets: TargetType[] = ['json', 'swift', 'ts', 'typescript', 'flow', 'scala', 'flow-modern', 'angular'];
    targets.forEach(target => {
      test(`basic ${target}`, async () => {
        const options: GenerateTypesOptions = {
          schema: `
            type Query {
              hello: String!
            }
            
            schema {
              query: Query
            }
          `,
          queries: ['query foo { hello }'],
          only: '',
          target: target,
          appSyncApi: '',
          generatedFileName: '',
          multipleFiles: true,
          introspection: false,
        };

        const types = await generateTypes(options);
        expect(types).toMatchSnapshot();
      });
    });
  });
});
