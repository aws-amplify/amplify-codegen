import * as yargs from 'yargs';
import { logError } from './logger';
import { generate } from './index';
import { buildSchema } from 'graphql';

// / Make sure unhandled errors in async code are propagated correctly
process.on('unhandledRejection', error => {
  throw error;
});

process.on('uncaughtException', handleError);

function handleError(error: Error) {
  logError(error);
  process.exit(1);
}

export function run(argv: Array<String>): void {
  // tslint:disable
  yargs
    .command(
      '$0',
      'Generate graphql operations for the provided introspection schema',
      {
        schema: {
          demand: true,
          describe: 'GraphQL introspection or SDL schema',
          normalize: true,
        },
        language: {
          demand: true,
          default: 'graphql',
          normalize: true,
          choices: ['graphql', 'javascript', 'flow', 'typescript'],
        },
        maxDepth: {
          demand: true,
          default: 2,
          normalize: true,
          type: 'number',
        },
        retainCaseStyle: {
          default: true,
          type: 'boolean'
        },
        isSDLSchema: {
          default: true,
          type: 'boolean'
        }
      },
      async argv => {
        generate(argv.schema, { language: argv.language, maxDepth: argv.maxDepth, isSDLSchema: argv.isSDLSchema });
      }
    )
    .help()
    .version()
    .strict().argv;
}
