import './polyfills';

export { default as generate, generateFromString } from './generate';
export type { Target } from './types';
export { getOutputFileName } from './utilities/getOutputFileName';
export { extractDocumentFromJavascript } from './loading';
