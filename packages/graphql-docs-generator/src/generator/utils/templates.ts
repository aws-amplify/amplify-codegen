export const getTemplatePartials = ():{[key: string]: string;} => {
  return {
    renderArgDeclaration: argDeclarationPartial,
    renderCallArgs: callArgsPartial,
    renderExternalFragment: externalFragmentPartial,
    renderFields: fieldsPartial,
    renderFragment: fragmentsPartial,
    renderOp: operationPartial
  }
};

export const getOperationPartial = (): string => {
  return operationPartial;
};

export const getExternalFragmentPartial = (): string => {
  return externalFragmentPartial;
};

const argDeclarationPartial = `
{{#if args.length}}
  (
    {{#each args as |arg index|}}
      \${{ arg.name }}:{{#if isList}}[{{/if}}{{arg.type}}{{#if arg.isRequired}}!{{/if}}{{#if isList}}]{{#if isListRequired}}!{{/if}}{{/if}}{{#if arg.defaultValue}}={{arg.defaultValue}}{{/if}}{{#unless @last}},{{/unless}}
    {{/each}}
  )
{{/if}}
`;

const callArgsPartial = `
{{#if args.length}}
  (
    {{#each args}}
      {{name}}:{{value}}{{#if isRequired}}!{{/if}}{{#if defaultValue }}={{defaultValue}}{{/if}}{{#unless @last}},{{/unless}}
    {{/each}}
  )
{{/if}}
`;

const externalFragmentPartial = `
fragment {{name}} on {{ on}} {
  {{> renderFields fields=this.fields }}
}
`;

const fieldsPartial = `
{{#each fields as |field index|}}
  {{#if field.hasBody }}
      {{field.name}} {
        {{> renderFields fields=field.fields}}
        {{> renderFragment fragments=field.fragments}}
      }
  {{else}}
    {{field.name}}
  {{/if}}
{{/each}}
`;

const fragmentsPartial = `
{{#each fragments }}
  {{#if this.fields.length}}
    {{#if this.external }}
      ...{{this.name}}
    {{else}}
    ...on {{this.on}} {
      {{> renderFields fields=this.fields }}
    }
    {{/if}}
  {{/if}}
{{/each}}
`;

const operationPartial = `
{{type}} {{name}} {{>renderArgDeclaration args=args}}{
  {{body.name}}{{> renderCallArgs args=body.args}} 
  {{#if body.hasBody}} {
    {{> renderFields fields=body.fields}}
    {{> renderFragment fragments=body.fragments}}
  }
  {{/if}}
}
`;
