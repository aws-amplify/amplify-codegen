import * as path from 'path';
import type { Target } from '../types';

export function getOutputFileName(inputFileName: string, target: Target): string {

  inputFileName = inputFileName || (target === 'angular' ? 'api' : 'API');
  if (supportedTarget(target)) {
    const fileExtension = extensionMap[target];
    const ext = path.extname(inputFileName);
    const baseName = inputFileName.substr(0, inputFileName.length - ext.length);
    const filename = inputFileName.includes(fileExtension) ? inputFileName : `${baseName}.${fileExtension}`;
    return ['API', 'api'].includes(inputFileName) ? path.join(folderMap[target], filename) : filename;
  }
  return inputFileName;
}

const extensionMap: { 'typescript': string, 'flow': string, 'angular': string, 'swift': string } = {
  typescript: 'ts',
  flow: 'js',
  angular: 'service.ts',
  swift: 'swift',
};

const folderMap: { 'typescript': string, 'flow': string, 'angular': string, 'swift': string } = {
  typescript: 'src',
  flow: 'src',
  angular: 'src/app',
  swift: '',
};

function supportedTarget(target: Target): target is 'typescript' | 'flow' | 'angular' | 'swift' {
  return Object.keys(extensionMap).includes(target)
}
