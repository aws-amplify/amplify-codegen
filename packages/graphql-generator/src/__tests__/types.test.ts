import { generateTypes, GenerateTypesOptions } from '..';

describe('generateTypes', () => {
  test.skip('basic test', () => {
    const options: GenerateTypesOptions = {
      schema: '',
      authDirective: '',
      queries: [''],
      only: '',
      target: 'typescript',
      appSyncApi: '',
      generatedFileName: '',
      multipleFiles: true,
      introspection: false,
    };

    const types = generateTypes(options);
    console.log(types);
    expect(types).toMatchSnapshot();
  });
});
