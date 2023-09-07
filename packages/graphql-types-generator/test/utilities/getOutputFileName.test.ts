const { join } = require('path');
import { getOutputFileName } from '../../src/utilities/getOutputFileName';

describe('getOutputFileName', () => {
  it('should return the file name with by adding extension based on the language target', () => {
    expect(getOutputFileName('Foo', 'typescript')).toEqual('Foo.ts');
  });

  it('should not add extension if the file extension is already present', () => {
    expect(getOutputFileName('Foo.swift', 'swift')).toEqual('Foo.swift');
  });

  it('should add .service.ts extension when the target is angular', () => {
    expect(getOutputFileName('Foo', 'angular')).toEqual('Foo.service.ts');
  });

  it('should return api.service.ts when input name is missing and target is angular', () => {
    expect(getOutputFileName(null, 'angular')).toEqual(join('src', 'app', 'api.service.ts'));
  });

  it('should not add any extension if the code generation target is unknown', () => {
    // eslint-disable-next-line
    // @ts-ignore
    expect(getOutputFileName('Foo', 'bar')).toEqual('Foo');
  });
});
