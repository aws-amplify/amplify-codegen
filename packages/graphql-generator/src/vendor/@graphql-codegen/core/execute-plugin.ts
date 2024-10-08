/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Profiler } from '@graphql-codegen/plugin-helpers';
import { SyncTypes as Types } from '@aws-amplify/appsync-modelgen-plugin';
import { DocumentNode, GraphQLSchema, buildASTSchema } from 'graphql';
import { createNoopProfiler } from '../../../profiler'
export interface ExecutePluginOptions {
  name: string;
  config: Types.PluginConfig;
  parentConfig: Types.PluginConfig;
  schema: DocumentNode;
  schemaAst?: GraphQLSchema;
  documents: Types.DocumentFile[];
  outputFilename: string;
  allPlugins: Types.ConfiguredPlugin[];
  skipDocumentsValidation?: Types.SkipDocumentsValidationOptions;
  pluginContext?: { [key: string]: any };
  profiler?: Profiler;
}

export function executePlugin(options: ExecutePluginOptions, plugin: Types.CodegenPlugin): Types.PluginOutput {
  if (!plugin || !plugin.plugin || typeof plugin.plugin !== 'function') {
    throw new Error(
      `Invalid Custom Plugin "${options.name}" \n
        Plugin ${options.name} does not export a valid JS object with "plugin" function.

        Make sure your custom plugin is written in the following form:

        module.exports = {
          plugin: (schema, documents, config) => {
            return 'my-custom-plugin-content';
          },
        };
        `
    );
  }

  const outputSchema: GraphQLSchema = options.schemaAst || buildASTSchema(options.schema, options.config as any);
  const documents = options.documents || [];
  const pluginContext = options.pluginContext || {};
  const profiler = createNoopProfiler();

  if (plugin.validate && typeof plugin.validate === 'function') {
    try {
      // FIXME: Sync validate signature with plugin signature
      profiler.run(
        () =>
          plugin.validate!(
            outputSchema,
            documents,
            options.config,
            options.outputFilename,
            options.allPlugins,
            pluginContext
          ),
        `Plugin ${options.name} validate`
      );
    } catch (e) {
      throw new Error(
        // @ts-ignore
        `Plugin "${options.name}" validation failed: \n ${e.message}`
      );
    }
  }

  return profiler.run(
    () => plugin.plugin(
          outputSchema,
          documents,
          typeof options.config === 'object' ? { ...options.config } : options.config,
          {
            outputFile: options.outputFilename,
            allPlugins: options.allPlugins,
            pluginContext,
          }
        ),
    `Plugin ${options.name} execution`
  );
}
