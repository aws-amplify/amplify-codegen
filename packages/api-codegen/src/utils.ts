import { Language, Platform, Target, FileExtension } from './type';

export const targetToFileExtensionMap: { [key in Target]: FileExtension } = {
  javascript: 'js',
  graphql: 'graphql',
  flow: 'js',
  typescript: 'ts',
  angular: 'graphql',
};

export const platformToLanguageMap: { [key in Platform]: Language } = {
  android: 'java',
  ios: 'swift',
  flutter: 'dart',
  javascript: 'javascript',
  introspection: 'introspection',
};
