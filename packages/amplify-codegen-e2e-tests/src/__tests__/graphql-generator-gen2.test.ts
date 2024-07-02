import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import {
  GraphqlCodegenConfig,
  IntrospectionCodegenConfig,
  ModelgenConfig,
  deleteSandbox,
  generateForms,
  generateOutputs,
  initGen2Project,
  sandboxDeploy,
  testGraphqlClientCodegen,
} from '../gen2-codegen-tests-base/';

describe('GraphQL generator for Gen2 e2e tests', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeAll(async () => {
    projFolderName = 'graphqlGeneratorGen2';
    projRoot = await createNewProjectDir(projFolderName);
    const template = path.resolve(path.join(__dirname, 'backends', 'graphql-generator-gen2'));
    await initGen2Project(projRoot, template);
    await sandboxDeploy(projRoot);
  });

  afterAll(async () => {
    await deleteSandbox(projRoot);
    deleteProjectDir(projRoot);
  });

  it('should not throw error when generating outputs', async () => {
    await expect(generateOutputs(projRoot)).resolves.not.toThrow();
  });

  it('should not throw error when generating forms', async () => {
    await expect(generateForms(projRoot)).resolves.not.toThrow();
  });
  describe('Graphql client codegen', () => {
    // introspection
    const introspectionCodegenConfigs: IntrospectionCodegenConfig[] = [{ outDir: 'codegen', format: 'introspection' }];
    introspectionCodegenConfigs.forEach((config) => {
      it(`should not throw error when generating GraphQL client code in format ${config.format}`, async () => {
        await testGraphqlClientCodegen(projRoot, config);
      });
    });
    // modelgen
    const modelTargets = ['java', 'swift', 'javascript', 'typescript', 'dart'];
    const modelgenConfigs: ModelgenConfig[] = modelTargets.map((target) => {
      return { outDir: 'codegen', format: 'modelgen', modelTarget: target };
    });
    modelgenConfigs.forEach((config) => {
      it(`should not throw error when generating GraphQL client code in format ${config.format} with target ${config.modelTarget}`, async () => {
        await testGraphqlClientCodegen(projRoot, config);
      });
    });
    // graphql codegen
    const statementTargets = ['javascript', 'graphql', 'flow', 'typescript', 'angular'];
    const typeTargets = ['json', 'swift', 'typescript', 'flow', 'scala', 'flow-modern', 'angular'];
    const typeTargetConfigs = typeTargets.map((tt) => {
      return { outDir: 'codegen', format: 'graphql-codegen', typeTarget: tt };
    });
    const graphqlCodegenConfigs: GraphqlCodegenConfig[] = statementTargets
      .map((st) => {
        return typeTargetConfigs.map((config) => {
          return { ...config, statementTarget: st } as GraphqlCodegenConfig;
        });
      })
      .flat();
    graphqlCodegenConfigs.forEach((config) => {
      // TODO: skip these tests as it will fail due to the duplicate graphql module. Will enable them once the issue is resolved
      it.skip(`should not throw error when generating GraphQL client code in format ${config.format} with type ${config.typeTarget} and statement ${config.statementTarget}`, async () => {
        await testGraphqlClientCodegen(projRoot, config);
      });
    });
  });
});
