import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as prettier from 'prettier';
const DEFAULT_MAX_DEPTH = 3;

import generateAllOps, { GQLTemplateOp, GQLAllOperations, GQLTemplateFragment, lowerCaseFirstLetter } from './generator';
import { loadSchema } from './generator/utils/loading';
export { loadSchema } from './generator/utils/loading';

const TEMPLATE_DIR = path.resolve(path.join(__dirname, '../templates'));
const FILE_EXTENSION_MAP = {
  javascript: 'js',
  graphql: 'graphql',
  flow: 'js',
  typescript: 'ts',
  angular: 'graphql',
};

export function generate(
  schema: string,
  options: { language?: string; maxDepth?: number; isSDLSchema?: boolean; typenameIntrospection: boolean },
): GeneratedOperations {
  const language = options.language || 'graphql';
  if (!Object.keys(FILE_EXTENSION_MAP).includes(language)) {
    throw new Error(`Language ${language} not supported`);
  }

  const maxDepth = options.maxDepth || DEFAULT_MAX_DEPTH;
  const useExternalFragmentForS3Object = options.language === 'graphql';
  const { typenameIntrospection = true } = options;
  const isSDLSchema = (options.isSDLSchema === undefined) ? true : options.isSDLSchema;
  const extendedSchema = loadSchema(schema, isSDLSchema);

  const gqlOperations: GQLAllOperations = generateAllOps(extendedSchema, maxDepth, {
    useExternalFragmentForS3Object,
    typenameIntrospection,
  });
  registerPartials();
  registerHelpers();

  const allOperations = {
    queries: '',
    mutations: '',
    subscriptions: '',
    fragments: ''
  };

  ['queries', 'mutations', 'subscriptions'].forEach(op => {
    const ops = gqlOperations[op];
    if (ops.length) {
      const gql = render({ operations: gqlOperations[op], fragments: [] }, language);
      allOperations[op] = gql;
    }
  });

  if (gqlOperations.fragments.length) {
    const gql = render({ operations: [], fragments: gqlOperations.fragments }, language);
    allOperations['fragments'] = gql;
  }

  return allOperations;
}

type GeneratedOperations = {
  queries: string;
  mutations: string;
  subscriptions: string;
  fragments: string;
}

function render(doc: { operations: Array<GQLTemplateOp>; fragments?: GQLTemplateFragment[] }, language: string = 'graphql') {
  const templateFiles = {
    javascript: 'javascript.hbs',
    graphql: 'graphql.hbs',
    typescript: 'typescript.hbs',
    flow: 'flow.hbs',
    angular: 'graphql.hbs',
  };

  const templatePath = path.join(TEMPLATE_DIR, templateFiles[language]);
  const templateStr = fs.readFileSync(templatePath, 'utf8');

  const template = handlebars.compile(templateStr, {
    noEscape: true,
    preventIndent: true,
  });
  const gql = template(doc);
  return format(gql, language);
}

function registerPartials() {
  const partials = fs.readdirSync(TEMPLATE_DIR);
  partials.forEach(partial => {
    if (!partial.startsWith('_') || !partial.endsWith('.hbs')) {
      return;
    }
    const partialPath = path.join(TEMPLATE_DIR, partial);
    const partialName = path.basename(partial).split('.')[0];
    const partialContent = fs.readFileSync(partialPath, 'utf8');
    handlebars.registerPartial(partialName.substring(1), partialContent);
  });
}

function registerHelpers() {
  handlebars.registerHelper('format', function(options: any) {
    const result = options.fn(this);
    return format(result);
  });

  const formatNameHelper = lowerCaseFirstLetter;
  handlebars.registerHelper('formatName', formatNameHelper);
}

function format(str: string, language: string = 'graphql'): string {
  const parserMap = {
    javascript: 'babel',
    graphql: 'graphql',
    typescript: 'typescript',
    flow: 'flow',
    angular: 'graphql',
  };
  return prettier.format(str, { parser: parserMap[language] });
}
