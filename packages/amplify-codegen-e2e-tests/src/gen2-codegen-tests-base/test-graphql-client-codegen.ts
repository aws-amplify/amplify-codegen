import path from 'path';
import { isNotEmptyDir } from "../utils";
import { ClientCodegenConfig, generateGraphqlClientCode } from "./commands";
import { existsSync } from 'fs-extra';
import { deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';

export const testGraphqlClientCodegen = async (projectRoot: string, config: ClientCodegenConfig) => {
  const outputPath = path.join(projectRoot, config.outDir)
  if (existsSync(outputPath)) {
    deleteProjectDir(outputPath);
  }
  await expect(generateGraphqlClientCode(projectRoot, config)).resolves.not.toThrow();

  expect(isNotEmptyDir(outputPath)).toBe(true);
};
