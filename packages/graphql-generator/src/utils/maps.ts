import { Language, ModelsTarget, StatementsTarget, FileExtension } from '../type';

export const statementsTargetToFileExtensionMap: { [key in StatementsTarget]: FileExtension } = {
  javascript: 'js',
  graphql: 'graphql',
  flow: 'js',
  typescript: 'ts',
  angular: 'graphql',
};

export const modelsTargetToLanguageMap: { [key in ModelsTarget]: Language } = {
  android: 'java',
  ios: 'swift',
  flutter: 'dart',
  javascript: 'javascript',
  introspection: 'introspection',
};
