const handlebars = require('handlebars/dist/handlebars');
import generateAllOps, { GQLTemplateOp, GQLAllOperations, GQLTemplateFragment, lowerCaseFirstLetter } from './generator';
import { buildSchema } from './generator/utils/loading';
import { getTemplatePartials, getOperationPartial, getExternalFragmentPartial } from './generator/utils/templates';
export { buildSchema } from './generator/utils/loading';

export function generateGraphQLDocuments(
  schema: string,
  options: { maxDepth?: number; useExternalFragmentForS3Object?: boolean; typenameIntrospection?: boolean },
): GeneratedOperations {
  const opts = {
    maxDepth: 2,
    useExternalFragmentForS3Object: true,
    typenameIntrospection: true,
    ...options,
  };

  const extendedSchema = buildSchema(schema);

  const gqlOperations: GQLAllOperations = generateAllOps(extendedSchema, opts.maxDepth, {
    useExternalFragmentForS3Object: opts.useExternalFragmentForS3Object,
    typenameIntrospection: opts.typenameIntrospection,
  });
  registerPartials();
  registerHelpers();

  const allOperations = {
    queries: new Map<string, string>(),
    mutations: new Map<string, string>(),
    subscriptions: new Map<string, string>(),
    fragments: new Map<string, string>(),
  };

  ['queries', 'mutations', 'subscriptions'].forEach(op => {
    const ops = gqlOperations[op];
    if (ops.length) {
      const renderedOperations = renderOperations(gqlOperations[op]);
      allOperations[op] = renderedOperations;
    }
  });

  if (gqlOperations.fragments.length) {
    const renderedFragments = renderFragments(gqlOperations.fragments, opts.useExternalFragmentForS3Object);
    allOperations['fragments'] = renderedFragments;
  }

  return allOperations;
}

export type GeneratedOperations = {
  queries: Map<string, string>;
  mutations: Map<string, string>;
  subscriptions: Map<string, string>;
  fragments: Map<string, string>;
};

function renderOperations(operations: Array<GQLTemplateOp>): Map<string, string> {
  const renderedOperations = new Map<string, string>();
  if (operations?.length) {
    operations.forEach(op => {
      const name = op.fieldName || op.name;
      const gql = renderOperation(op);
      renderedOperations.set(name, gql);
    });
  }

  return renderedOperations;
}

function renderOperation(operation: GQLTemplateOp): string {
  const templateStr = getOperationPartial();
  const template = handlebars.compile(templateStr, {
    noEscape: true,
    preventIndent: true,
  });
  return template(operation);
}

function renderFragments(fragments: Array<GQLTemplateFragment>, useExternalFragmentForS3Object: boolean): Map<string, string> {
  const renderedFragments = new Map<string, string>();
  if (fragments?.length) {
    fragments.forEach(fragment => {
      const name = fragment.name;
      const gql = renderFragment(fragment, useExternalFragmentForS3Object);
      renderedFragments.set(name, gql);
    });
  }

  return renderedFragments;
}

function renderFragment(fragment: GQLTemplateFragment, useExternalFragmentForS3Object: boolean): string {
  if (!useExternalFragmentForS3Object) {
    return;
  }

  const templateStr = getExternalFragmentPartial();
  const template = handlebars.compile(templateStr, {
    noEscape: true,
    preventIndent: true,
  });
  return template(fragment);
}

function registerPartials() {
  const partials = getTemplatePartials();
  for (const [partialName, partialContent] of Object.entries(partials)) {
    handlebars.registerPartial(partialName, partialContent);
  }
}

function registerHelpers() {
  const formatNameHelper = lowerCaseFirstLetter;
  handlebars.registerHelper('formatName', formatNameHelper);
}
