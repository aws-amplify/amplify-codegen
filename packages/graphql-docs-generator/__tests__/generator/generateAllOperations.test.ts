import { generateQueries, generateMutations, generateSubscriptions, capitalizeFirstLetter, lowerCaseFirstLetter } from '../../src/generator/generateAllOperations';

import generateOperation from '../../src/generator/generateOperation';
import { GQLDocsGenOptions } from '../../src/generator/types';

jest.mock('../../src/generator/generateOperation');
const mockOperationResult = {
  args: ['MOCK_ARG'],
  body: 'MOCK_BODY',
};
generateOperation.mockReturnValue(mockOperationResult);

const mockFields = {
  f1: 'f1',
};
const getFields = jest.fn();
getFields.mockReturnValue(mockFields);

const operations = {
  getFields,
};
const maxDepth = 10;

const mockSchema = 'MOCK_SCHEMA';
describe('generateAllOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const generateOptions: GQLDocsGenOptions = { useExternalFragmentForS3Object: true };
  it('generateQueries - should call generateOperation', () => {
    expect(generateQueries(operations, mockSchema, maxDepth, generateOptions)).toEqual([
      {
        type: 'query',
        name: 'F1',
        fieldName: 'f1',
        ...mockOperationResult,
      },
    ]);
    expect(generateOperation).toHaveBeenCalledWith(mockFields.f1, mockSchema, maxDepth, generateOptions);
    expect(getFields).toHaveBeenCalled();
    expect(generateOperation).toHaveBeenCalledTimes(1);
    expect(getFields).toHaveBeenCalledTimes(1);
  });

  it('generateMutation - should call generateOperation', () => {
    expect(generateMutations(operations, mockSchema, maxDepth, generateOptions)).toEqual([
      {
        type: 'mutation',
        name: 'F1',
        fieldName: 'f1',
        ...mockOperationResult,
      },
    ]);
    expect(generateOperation).toHaveBeenCalledWith(mockFields.f1, mockSchema, maxDepth, generateOptions);
    expect(getFields).toHaveBeenCalled();
    expect(generateOperation).toHaveBeenCalledTimes(1);
    expect(getFields).toHaveBeenCalledTimes(1);
  });

  it('generateSubscription - should call generateOperation', () => {
    expect(generateSubscriptions(operations, mockSchema, maxDepth, generateOptions)).toEqual([
      {
        type: 'subscription',
        name: 'F1',
        fieldName: 'f1',
        ...mockOperationResult,
      },
    ]);
    expect(generateOperation).toHaveBeenCalledTimes(1);
    expect(getFields).toHaveBeenCalledTimes(1);
    expect(generateOperation).toHaveBeenCalledWith(mockFields.f1, mockSchema, maxDepth, generateOptions);
  });
});

describe('test capitalizeFirstLetter', () =>{
  it('test capitalize first letter with empty string', () => {
    expect(capitalizeFirstLetter('')).toEqual('');
  });

  it('test capitalize first letter with lowercase string', () => {
    expect(capitalizeFirstLetter('lowercase')).toEqual('Lowercase');
  });

  it('test capitalize first letter with UPPERCASE string', () => {
    expect(capitalizeFirstLetter('UPPERCASE')).toEqual('UPPERCASE');
  });

  it('test capitalize first letter with snake_case string', () => {
    expect(capitalizeFirstLetter('snake_case')).toEqual('Snake_case');
  });

  it('test capitalize first letter with UPPER_SNAKE_CASE string', () => {
    expect(capitalizeFirstLetter('UPPER_SNAKE_CASE')).toEqual('UPPER_SNAKE_CASE');
  });

  it('test capitalize first letter with camelCase string', () => {
    expect(capitalizeFirstLetter('camelCase')).toEqual('CamelCase');
  });

  it('test capitalize first letter with PascalCase string', () => {
    expect(capitalizeFirstLetter('PascalCase')).toEqual('PascalCase');
  });
});

describe('test lowerCaseFirstLetter', () =>{
  it('test lower casing first letter with empty string', () => {
    expect(lowerCaseFirstLetter('')).toEqual('');
  });

  it('test lower casing first letter with lowercase string', () => {
    expect(lowerCaseFirstLetter('lowercase')).toEqual('lowercase');
  });

  it('test lower casing first letter with UPPERCASE string', () => {
    expect(lowerCaseFirstLetter('UPPERCASE')).toEqual('uPPERCASE');
  });

  it('test lower casing first letter with snake_case string', () => {
    expect(lowerCaseFirstLetter('snake_case')).toEqual('snake_case');
  });

  it('test lower casing first letter with UPPER_SNAKE_CASE string', () => {
    expect(lowerCaseFirstLetter('UPPER_SNAKE_CASE')).toEqual('uPPER_SNAKE_CASE');
  });

  it('test lower casing first letter with camelCase string', () => {
    expect(lowerCaseFirstLetter('camelCase')).toEqual('camelCase');
  });

  it('test lower casing first letter with PascalCase string', () => {
    expect(lowerCaseFirstLetter('PascalCase')).toEqual('pascalCase');
  });
});
