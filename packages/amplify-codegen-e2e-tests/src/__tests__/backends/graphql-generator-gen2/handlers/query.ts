import type { Schema } from '../resource';

export const handler: Schema['echoQuery']['functionHandler'] = async (event, context) => {
  const start = performance.now();
  return {
    content: `Echoing content: ${event.arguments.content}`,
    executionDuration: performance.now() - start,
  };
};
