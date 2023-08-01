import { addApiWithoutSchema, createNewProjectDir, generateModelIntrospection, initJSProjectWithProfile, updateApiSchema } from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteAmplifyProject } from '../codegen-tests-base';
import { isNotEmptyDir } from "../utils";
import { join } from 'path';

const schema = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Model Introspection Codegen test', () => {
    let projectRoot: string;
    const apiName = 'modelintrospection';

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('modelIntrospection');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`should generate files at desired location and not delete src files`, async () => {
      // init project and add API category
      await initJSProjectWithProfile(projectRoot);
      await addApiWithoutSchema(projectRoot, { apiName });
      await updateApiSchema(projectRoot, apiName, schema);
      const outputDir = 'output';
      //generate introspection schema
      await expect(generateModelIntrospection(projectRoot, { outputDir })).resolves.not.toThrow();
      // Model introspection is generated at correct location
      expect(isNotEmptyDir(join(projectRoot, outputDir))).toBe(true);
    });

    it('should throw error when the output directory is not defined in the command', async () => {
      // init project and add API category
      await initJSProjectWithProfile(projectRoot);
      await addApiWithoutSchema(projectRoot, { apiName });
      await updateApiSchema(projectRoot, apiName, schema);
      //generate introspection schema
      await generateModelIntrospection(projectRoot, { errMessage: 'Expected --output-dir flag to be set'});
    });

    it('should throw error if the GraphQL schema is invalid', async () => {
      const invalidSchema = 'modelgen/model_gen_schema_with_errors.graphql';
      // init project and add API category
      await initJSProjectWithProfile(projectRoot);
      await addApiWithoutSchema(projectRoot, { apiName });
      await updateApiSchema(projectRoot, apiName, invalidSchema);
      const outputDir = 'output';
      //generate introspection schema
      await generateModelIntrospection(projectRoot,{ outputDir, errMessage: 'Unknown type'});
    });

    it(`should handle a schema with connected PK`, async () => {
      const schemaName = 'modelgen/schema_with_connected_pk.graphql';

      // init project and add API category
      await initJSProjectWithProfile(projectRoot);
      await addApiWithoutSchema(projectRoot, { apiName });
      await updateApiSchema(projectRoot, apiName, schemaName);

      const outputDir = 'output';
      //generate introspection schema
      await expect(generateModelIntrospection(projectRoot, { outputDir })).resolves.not.toThrow();
      // Model introspection is generated at correct location
      expect(isNotEmptyDir(join(projectRoot, outputDir))).toBe(true);
    });
});

