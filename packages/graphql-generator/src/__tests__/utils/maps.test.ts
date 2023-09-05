import { statementsTargetToFileExtensionMap } from '../../utils';

describe('maps', () => {
  test('statementsTargetToFileExtensionMap', () => {
    expect(statementsTargetToFileExtensionMap).toMatchSnapshot();
  });
});
