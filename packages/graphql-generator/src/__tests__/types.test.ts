import mockFs from 'mock-fs';
import * as fs from 'fs';
import * as path from 'path';
import { generateTypes, GenerateTypesOptions, TypesTarget } from '..';
import { readSchema } from './utils';

describe('generateTypes', () => {
  afterEach(() => {
    mockFs.restore();
  });

  const queries = `
    query GetBlog($id: ID!) {
      getBlog(id: $id) {
        id
        name
        posts {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        __typename
      }
    }
  `;
  const sdlSchema = readSchema('blog-sdl.graphql');
  const awsAppSyncDirective = path.resolve(path.join(__dirname, '../../../graphql-types-generator/awsAppSyncDirectives.graphql'));

  describe('targets', () => {
    afterEach(() => {
      mockFs.restore();
    });

    const targets: TypesTarget[] = ['json', 'swift', 'typescript', 'flow', 'scala', 'flow-modern', 'angular'];
    const introspectionSchema = readSchema('blog-introspection.json');
    targets.forEach(target => {
      test(`basic sdl ${target}`, async () => {
        const outputPath = 'src/types';
        const prettierModule = path.resolve(path.join(__dirname, '../../../../node_modules/prettier'));
        const mockedFiles = {
          [awsAppSyncDirective]: mockFs.load(awsAppSyncDirective, { lazy: true }),
          [prettierModule]: mockFs.load(prettierModule, { lazy: true, recursive: true }),
          [path.dirname(outputPath)]: {},
        };
        mockFs(mockedFiles);
        expect(fs.readdirSync(path.dirname(outputPath)).length).toEqual(0);
        await generateTypes({ schema: sdlSchema, queries, target, outputPath, multipleSwiftFiles: false });

        // flow-modern does not use output path
        if (target === 'flow-modern') {
          const flowModernFiles = fs.readdirSync('__generated__');
          flowModernFiles.forEach(filepath => {
            expect(fs.readFileSync(path.join('__generated__', filepath), 'utf8')).toMatchSnapshot();
          });
        } else {
          expect(fs.readFileSync(outputPath, 'utf8')).toMatchSnapshot();
        }
      });

      test(`basic introspection ${target}`, async () => {
        const outputPath = 'src/types';
        const mockedFiles = {
          [path.dirname(outputPath)]: {},
        };
        mockFs(mockedFiles);
        expect(fs.readdirSync(path.dirname(outputPath)).length).toEqual(0);
        await generateTypes({ schema: introspectionSchema, target, queries, introspection: true, outputPath });
        // I think this behavior is incorrect
        if (target === 'swift') {
          expect(fs.readdirSync(outputPath)).toMatchSnapshot();
        } else if (target === 'flow-modern') {
          const flowModernFiles = fs.readdirSync('__generated__');
          flowModernFiles.forEach(filepath => {
            expect(fs.readFileSync(path.join('__generated__', filepath), 'utf8')).toMatchSnapshot();
          });
        } else {
          expect(fs.readFileSync(outputPath, 'utf8')).toMatchSnapshot();
        }
      });
    });
  });

  test('multipleSwiftFiles', async () => {
    const outputPath = 'src/types';
    const mockedFiles = {
      [awsAppSyncDirective]: mockFs.load(awsAppSyncDirective),
      [outputPath]: {},
    };
    const options: GenerateTypesOptions = {
      schema: sdlSchema,
      queries,
      target: 'swift',
      multipleSwiftFiles: true,
      outputPath,
    };

    mockFs(mockedFiles);
    expect(fs.readdirSync(outputPath).length).toEqual(0);
    await generateTypes(options);
    expect(fs.readdirSync(outputPath)).toMatchSnapshot();
  });
});
