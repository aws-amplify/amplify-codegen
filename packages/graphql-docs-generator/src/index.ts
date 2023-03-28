const handlebars = require('handlebars/dist/handlebars');
const prettier = require("prettier/standalone");
const graphqlParser = require("prettier/parser-graphql");
const babelParser = require("prettier/parser-babylon");
const typescriptParser = require("prettier/parser-typescript");
const flowParser = require("prettier/parser-flow");
const DEFAULT_MAX_DEPTH = 3;

import generateAllOps, { GQLTemplateOp, GQLAllOperations, GQLTemplateFragment, lowerCaseFirstLetter } from './generator';
import { loadSchema } from './generator/utils/loading';
import { getLanguageTemplate, getTemplatePartials } from './generator/utils/templates';

export { loadSchema } from './generator/utils/loading';

const FILE_EXTENSION_MAP = {
  javascript: 'js',
  graphql: 'graphql',
  flow: 'js',
  typescript: 'ts',
  angular: 'graphql',
};

export function generate(
  schema: string,
  options: { language?: string; maxDepth?: number; isSDLSchema?: boolean },
): GeneratedOperations {
  const language = options.language || 'graphql';
  if (!Object.keys(FILE_EXTENSION_MAP).includes(language)) {
    throw new Error(`Language ${language} not supported`);
  }

  const maxDepth = options.maxDepth || DEFAULT_MAX_DEPTH;
  const useExternalFragmentForS3Object = options.language === 'graphql';
  const isSDLSchema = (options.isSDLSchema === undefined) ? true : options.isSDLSchema;
  const extendedSchema = loadSchema(schema, isSDLSchema);

  const gqlOperations: GQLAllOperations = generateAllOps(extendedSchema, maxDepth, {
    useExternalFragmentForS3Object,
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
  const templateStr = getLanguageTemplate(language);
  const template = handlebars.compile(templateStr, {
    noEscape: true,
    preventIndent: true,
  });
  const gql = template(doc);
  return format(gql, language);
}

function registerPartials() {
  const partials = getTemplatePartials();
  for (const [partialName, partialContent] of Object.entries(partials)) {
    handlebars.registerPartial(partialName, partialContent);
  }
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
  return prettier.format(str, { parser: parserMap[language], plugins: [graphqlParser, babelParser, typescriptParser, flowParser] });
}
