import { GraphQLSchema, DocumentNode, Source } from 'graphql';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as rimraf from 'rimraf';

import { loadSchema, loadAndMergeQueryDocuments, parseSchema, parseAndMergeQueryDocuments } from './loading';
import { validateQueryDocument } from './validation';
import { compileToIR } from './compiler';
import { compileToLegacyIR } from './compiler/legacyIR';
import serializeToJSON from './serializeToJSON';
import { BasicGeneratedFile, BasicGeneratedFileMap, isBasicGeneratedFileMap } from './utilities/CodeGenerator';
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
    if (target === 'flow-modern') {
      // Group by output directory
      const filesByOutputDirectory: {
        [outputDirectory: string]: BasicGeneratedFileMap;
      } = {};

      // if target is flow-modern output must be BasicGeneratedFileMap
      Object.entries(output as BasicGeneratedFileMap).forEach(([filePath, file]) => {
        const outputDirectory = path.dirname(filePath);
        if (!filesByOutputDirectory[outputDirectory]) {
          filesByOutputDirectory[outputDirectory] = {
            [path.basename(filePath)]: file,
          };
        } else {
          filesByOutputDirectory[outputDirectory][path.basename(filePath)] = file;
        }
      });

      Object.keys(filesByOutputDirectory).forEach(outputDirectory => {
        writeGeneratedFiles(filesByOutputDirectory[outputDirectory], outputDirectory);
      });
    } else if (isBasicGeneratedFileMap(output)) {
      writeGeneratedFiles(output, outputPath);
    } else {
      fs.outputFileSync(outputPath, output);
    }
  } else {
    console.log(output);
  }
}

export function generateTypesFromString(
  schema: string,
  introspection: boolean,
  queryDocuments: string[],
  only: string,
  target: TargetType,
  multipleFiles: boolean,
  options: any,
): string | BasicGeneratedFileMap {
  const graphqlSchema = parseSchema(schema, introspection);
  const document = parseAndMergeQueryDocuments(queryDocuments.map(document => new Source(document)));
  validateQueryDocument(graphqlSchema, document);
  return generateForTarget(graphqlSchema, document, only, target, multipleFiles, options);
}

export function generateTypes(
  schema: string,
  introspection: boolean,
  queryDocuments: string[],
  only: string,
  target: TargetType,
  multipleFiles: boolean,
  options: any,
): { [filepath: string]: string } {
  const output = generateTypesFromString(schema, introspection, queryDocuments, only, target, multipleFiles, options);

  if (isBasicGeneratedFileMap(output)) {
    return Object.entries(output)
      .map(([filepath, file]) => [filepath, file.output])
      .reduce((acc, [filepath, fileOutput]) => ({ ...acc, [filepath]: fileOutput }), {});
  }

  return { '': output };
}

export function generateForTarget(
  schema: GraphQLSchema,
  document: DocumentNode,
  only: string,
  target: TargetType,
  multipleFiles: boolean,
  options: any,
): string | BasicGeneratedFileMap {
  if (target === 'swift') {
    return generateTypesSwift(schema, document, only, multipleFiles, options);
  }
  if (target === 'flow-modern') {
    return generateTypesFlowModern(schema, document, options);
  }

  const context = compileToLegacyIR(schema, document, options);

  // string
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

function generateTypesSwift(
  schema: GraphQLSchema,
  document: DocumentNode,
  only: string,
  multipleFiles: boolean,
  options: any,
): string | BasicGeneratedFileMap {
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

  const generator = generateSwiftSource(context, multipleFiles, only);

  if (multipleFiles) {
    return generator.generatedFiles;
  }
  return generator.output;
}

function generateTypesFlowModern(schema: GraphQLSchema, document: DocumentNode, options: any): BasicGeneratedFileMap {
  const context = compileToIR(schema, document, options);
  const generatedFiles = generateFlowModernSource(context);

  return generatedFiles;
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
