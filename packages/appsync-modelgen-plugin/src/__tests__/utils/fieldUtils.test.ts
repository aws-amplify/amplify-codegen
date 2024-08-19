import { toCamelCase } from '../../utils/fieldUtils';

describe('Field util function tests', () => {
  describe('toCamelCase test', () => {
    it('should construct the string array to a camel case phrase', () => {
      const words: string[] = ['AMPlify', 'data', 'build', 'time'];
      expect(toCamelCase(words)).toBe('aMPlifyDataBuildTime');
    });
  });
});
