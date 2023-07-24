import { GraphQLSchema, DocumentNode } from 'graphql';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as rimraf from 'rimraf';

import { loadSchema, loadAndMergeQueryDocuments, parseSchema, parseAndMergeQueryDocuments } from './loading';
import { validateQueryDocument } from './validation';
import { compileToIR } from './compiler';
import { compileToLegacyIR } from './compiler/legacyIR';
import serializeToJSON from './serializeToJSON';
import { BasicGeneratedFile } from './utilities/CodeGenerator';
import { generateSource as generateSwiftSource } from './swift';
import { generateSource as generateTypescriptSource } from './typescript';
import { generateSource as generateFlowSource } from './flow';
import { generateSource as generateFlowModernSource } from './flow-modern';
import { generateSource as generateScalaSource } from './scala';
import { generateSource as generateAngularSource } from './angular';
import { hasS3Fields } from './utilities/complextypes';

type TargetType = 'json' | 'swift' | 'ts' | 'typescript' | 'flow' | 'scala' | 'flow-modern' | 'angular';

export default function generate(
  inputPaths: string[],
  schemaPath: string,
  outputPath: string,
  only: string,
  target: TargetType,
  tagName: string,
  options: any,
): void {
  const schema = loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths, tagName);

  validateQueryDocument(schema, document);
  const multipleFiles = fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory();

  const output = generateForTarget(schema, document, only, target, multipleFiles, options);

  if (outputPath) {
    fs.outputFileSync(outputPath, output);
  } else {
    console.log(output);
  }
}

export function generateTypes(
  schema: string,
  introspection: boolean,
  authDirective: string,
  queryDocuments: string[],
  only: string,
  target: TargetType,
  multipleFiles: boolean,
  options: any,
) {
  const graphqlSchema = parseSchema(schema, introspection, authDirective);
  const document = parseAndMergeQueryDocuments(queryDocuments);
  validateQueryDocument(graphqlSchema, document);
  return generateForTarget(graphqlSchema, document, only, target, multipleFiles, options);
}

export function generateForTarget(
  schema: GraphQLSchema,
  document: DocumentNode,
  only: string,
  target: TargetType,
  multipleFiles: boolean,
  options: any,
) {
  if (target === 'swift') {
    return generateTypesSwift(schema, document, only, multipleFiles, options);
  } else if (target === 'flow-modern') {
    return generateTypesFlowModern(schema, document, options);
  }

  const context = compileToLegacyIR(schema, document, options);

  switch (target) {
    case 'json':
      return serializeToJSON(context);
    case 'ts':
    case 'typescript':
      return generateTypescriptSource(context);
    case 'flow':
      return generateFlowSource(context);
    case 'scala':
      return generateScalaSource(context, options);
    case 'angular':
      return generateAngularSource(context);
    default:
      throw new Error(`${target} is not supported.`);
  }
}

function generateTypesSwift(schema: GraphQLSchema, document: DocumentNode, only: string, multipleFiles: boolean, options: any): string {
  options.addTypename = true;
  const context = compileToIR(schema, document, options);
  // Complex object suppport
  if (options.complexObjectSupport === 'auto') {
    options.addS3Wrapper = context.typesUsed.some(typesUsed => hasS3Fields(typesUsed));
  } else if (options.complexObjectSupport === 'yes') {
    options.addS3Wrapper = true;
  } else {
    options.addS3Wrapper = false;
  }

  const generator = generateSwiftSource(context, !multipleFiles, only);

  if (!multipleFiles) {
    return generator.generatedFiles;
  }
  return generator.output;
}

function generateTypesFlowModern(schema: GraphQLSchema, document: DocumentNode, options: any) {
  const context = compileToIR(schema, document, options);
  const generatedFiles = generateFlowModernSource(context);

  // Group by output directory
  const filesByOutputDirectory: {
    [outputDirectory: string]: {
      [fileName: string]: BasicGeneratedFile;
    };
  } = {};

  Object.keys(generatedFiles).forEach((filePath: string) => {
    const outputDirectory = path.dirname(filePath);
    if (!filesByOutputDirectory[outputDirectory]) {
      filesByOutputDirectory[outputDirectory] = {
        [path.basename(filePath)]: generatedFiles[filePath],
      };
    } else {
      filesByOutputDirectory[outputDirectory][path.basename(filePath)] = generatedFiles[filePath];
    }
  });

  Object.keys(filesByOutputDirectory).forEach(outputDirectory => {
    writeGeneratedFiles(filesByOutputDirectory[outputDirectory], outputDirectory);
  });
}

function writeGeneratedFiles(generatedFiles: { [fileName: string]: BasicGeneratedFile }, outputDirectory: string) {
  // Clear all generated stuff to make sure there isn't anything
  // unnecessary lying around.
  rimraf.sync(outputDirectory);
  // Remake the output directory
  fs.mkdirSync(outputDirectory);

  for (const [fileName, generatedFile] of Object.entries(generatedFiles)) {
    fs.writeFileSync(path.join(outputDirectory, fileName), generatedFile.output);
  }
}
