import { statementsTargetToFileExtensionMap, modelsTargetToLanguageMap } from '../../utils';

describe('maps', () => {
  test('statementsTargetToFileExtensionMap', () => {
    expect(statementsTargetToFileExtensionMap).toMatchSnapshot();
  });

  test('modelsTargetToLanguageMap', () => {
    expect(modelsTargetToLanguageMap).toMatchSnapshot();
  });
});
