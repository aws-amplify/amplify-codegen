import { modelSchema } from './schemas';
import { generateModels, GeneratedOutput, ModelsTarget } from '@aws-amplify/graphql-generator';

const generateModelForTarget = async (target: ModelsTarget) => {
  const options = {
    schema: modelSchema,
    target,
    directives: '',
  };
  return await generateModels(options);
};

const testCases: { id: string; test: () => Promise<GeneratedOutput> }[] = [
  {
    id: 'generate-models-java',
    test: () => generateModelForTarget('java'),
  },
  {
    id: 'generate-models-swift',
    test: () => generateModelForTarget('swift'),
  },
  {
    id: 'generate-models-javascript',
    test: () => generateModelForTarget('javascript'),
  },
  {
    id: 'generate-models-typescript',
    test: () => generateModelForTarget('typescript'),
  },
  {
    id: 'generate-models-dart',
    test: () => generateModelForTarget('dart'),
  },
  {
    id: 'generate-models-introspection',
    test: () => generateModelForTarget('introspection'),
  },
];

export default testCases;
