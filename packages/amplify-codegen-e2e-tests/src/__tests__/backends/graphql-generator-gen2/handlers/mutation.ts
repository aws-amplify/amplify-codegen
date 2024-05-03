import type { Schema } from '../resource'

export const handler: Schema["echoMutation"]["functionHandler"] = async (event, context) => {
  return {
    id: 'todo1',
    content: `Echoing content: ${event.arguments.requiredContent}`,
    status: 'COMPLETED',
    createdAt: performance.now().toString(),
    updatedAt: performance.now().toString(),
  };
};