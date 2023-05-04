import * as yargs from 'yargs';
import { logError } from './logger';
import { generateGraphQLDocuments } from './index';

// Make sure unhandled errors in async code are propagated correctly
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
        maxDepth: {
          demand: true,
          default: 2,
          normalize: true,
          type: 'number',
        },
        typenameIntrospection: {
          default: true,
          type: 'boolean',
        },
      },
      async argv => {
        generateGraphQLDocuments(argv.schema, { maxDepth: argv.maxDepth, typenameIntrospection: argv.typenameIntrospection });
      }
    )
    .help()
    .version()
    .strict().argv;
}
