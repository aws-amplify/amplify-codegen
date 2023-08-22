import { StatementsTarget, FileExtension } from '../typescript';

export const statementsTargetToFileExtensionMap: { [key in StatementsTarget]: FileExtension } = {
  javascript: 'js',
  graphql: 'graphql',
  flow: 'js',
  typescript: 'ts',
  angular: 'graphql',
};
