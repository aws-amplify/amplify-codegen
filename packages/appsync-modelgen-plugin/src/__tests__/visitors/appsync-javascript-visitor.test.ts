import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { validateTs } from '@graphql-codegen/testing';
import { TYPESCRIPT_SCALAR_MAP } from '../../scalars';
import { directives, scalars } from '../../scalars/supported-directives';
import { AppSyncModelJavascriptVisitor } from '../../visitors/appsync-javascript-visitor';

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};
export type JavaScriptVisitorConfig = {
  isDeclaration?: boolean;
  isTimestampFieldsAdded?: boolean;
  respectPrimaryKeyAttributesOnConnectionField?: boolean;
  transformerVersion?: number;
};
const defaultJavaScriptVisitorConfig: JavaScriptVisitorConfig = {
  isDeclaration: false,
  isTimestampFieldsAdded: false,
  respectPrimaryKeyAttributesOnConnectionField: false,
  transformerVersion: 1,
};
const getVisitor = (schema: string, settings: JavaScriptVisitorConfig = {}): AppSyncModelJavascriptVisitor => {
  const config = { ...defaultJavaScriptVisitorConfig, ...settings };
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelJavascriptVisitor(
    builtSchema,
    { directives, target: 'javascript', scalars: TYPESCRIPT_SCALAR_MAP, ...config },
    {},
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('Javascript visitor', () => {
  const schema = /* GraphQL */ `
    type SimpleModel @model {
      id: ID!
      name: String
      bar: String
      foo: [Bar!] @connection
    }
    enum SimpleEnum {
      enumVal1
      enumVal2
    }

    type SimpleNonModelType {
      id: ID!
      names: [String]
    }

    type Bar @model {
      id: ID!
    }
  `;
  let visitor: AppSyncModelJavascriptVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  describe('enums', () => {
    it('should generate enum object', () => {
      const enumObj = (visitor as any).enumMap['SimpleEnum'];
      const enums: string = (visitor as any).generateEnumObject(enumObj);
      validateTs(enums);
      expect(enums).toMatchInlineSnapshot(`
        "const SimpleEnum = {
          \\"ENUM_VAL1\\": \\"enumVal1\\",
          \\"ENUM_VAL2\\": \\"enumVal2\\"
        };"
      `);
    });

    it('should export enum when exportEnum is set to true', () => {
      const enumObj = (visitor as any).enumMap['SimpleEnum'];
      const enums = (visitor as any).generateEnumObject(enumObj, true);
      validateTs(enums);
      expect(enums).toMatchInlineSnapshot(`
        "export const SimpleEnum = {
          \\"ENUM_VAL1\\": \\"enumVal1\\",
          \\"ENUM_VAL2\\": \\"enumVal2\\"
        };"
      `);
    });

    it('should generate import statements', () => {
      const imports = (visitor as any).generateImportsJavaScriptImplementation();
      validateTs(imports);
      expect(imports).toMatchInlineSnapshot(`
        "// @ts-check
        import { initSchema } from '@aws-amplify/datastore';
        import { schema } from './schema';"
      `);
    });
  });

  describe('generate', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should generate Javascript declaration', () => {
      const declarationVisitor = getVisitor(schema, { isDeclaration: true });
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel } from \\"@aws-amplify/datastore\\";
        // @ts-ignore
        import { LazyLoading, LazyLoadingDisabled, AsyncCollection } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        type EagerSimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        type LazySimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        export declare type SimpleNonModelType = LazyLoading extends LazyLoadingDisabled ? EagerSimpleNonModelType : LazySimpleNonModelType

        export declare const SimpleNonModelType: (new (init: ModelInit<SimpleNonModelType>) => SimpleNonModelType)





        type EagerSimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          readonly foo?: Bar[] | null;
        }

        type LazySimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          readonly foo: AsyncCollection<Bar>;
        }

        export declare type SimpleModel = LazyLoading extends LazyLoadingDisabled ? EagerSimpleModel : LazySimpleModel

        export declare const SimpleModel: (new (init: ModelInit<SimpleModel>) => SimpleModel) & {
          copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel>) => MutableModel<SimpleModel> | void): SimpleModel;
        }

        type EagerBar = {
          readonly id: string;
          readonly simpleModelFooId?: string | null;
        }

        type LazyBar = {
          readonly id: string;
          readonly simpleModelFooId?: string | null;
        }

        export declare type Bar = LazyLoading extends LazyLoadingDisabled ? EagerBar : LazyBar

        export declare const Bar: (new (init: ModelInit<Bar>) => Bar) & {
          copyOf(source: Bar, mutator: (draft: MutableModel<Bar>) => MutableModel<Bar> | void): Bar;
        }"
      `);
      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateEnumDeclarationsSpy).toBeCalledTimes(1);
      expect(generateEnumDeclarationsSpy).toBeCalledWith((declarationVisitor as any).enumMap['SimpleEnum'], true);

      expect(generateModelDeclarationSpy).toBeCalledTimes(3);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['SimpleModel'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(2, (declarationVisitor as any).modelMap['Bar'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(
        3,
        (declarationVisitor as any).nonModelMap['SimpleNonModelType'],
        true,
        false,
      );
    });

    it('should generate Javascript declaration with model metadata types', () => {
      const declarationVisitor = getVisitor(schema, { isDeclaration: true, isTimestampFieldsAdded: true });
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel } from \\"@aws-amplify/datastore\\";
        // @ts-ignore
        import { LazyLoading, LazyLoadingDisabled, AsyncCollection } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        type EagerSimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        type LazySimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        export declare type SimpleNonModelType = LazyLoading extends LazyLoadingDisabled ? EagerSimpleNonModelType : LazySimpleNonModelType

        export declare const SimpleNonModelType: (new (init: ModelInit<SimpleNonModelType>) => SimpleNonModelType)

        type SimpleModelMetaData = {
          readOnlyFields: 'createdAt' | 'updatedAt';
        }

        type BarMetaData = {
          readOnlyFields: 'createdAt' | 'updatedAt';
        }

        type EagerSimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          readonly foo?: Bar[] | null;
          readonly createdAt?: string | null;
          readonly updatedAt?: string | null;
        }

        type LazySimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          readonly foo: AsyncCollection<Bar>;
          readonly createdAt?: string | null;
          readonly updatedAt?: string | null;
        }

        export declare type SimpleModel = LazyLoading extends LazyLoadingDisabled ? EagerSimpleModel : LazySimpleModel

        export declare const SimpleModel: (new (init: ModelInit<SimpleModel, SimpleModelMetaData>) => SimpleModel) & {
          copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel, SimpleModelMetaData>) => MutableModel<SimpleModel, SimpleModelMetaData> | void): SimpleModel;
        }

        type EagerBar = {
          readonly id: string;
          readonly createdAt?: string | null;
          readonly updatedAt?: string | null;
          readonly simpleModelFooId?: string | null;
        }

        type LazyBar = {
          readonly id: string;
          readonly createdAt?: string | null;
          readonly updatedAt?: string | null;
          readonly simpleModelFooId?: string | null;
        }

        export declare type Bar = LazyLoading extends LazyLoadingDisabled ? EagerBar : LazyBar

        export declare const Bar: (new (init: ModelInit<Bar, BarMetaData>) => Bar) & {
          copyOf(source: Bar, mutator: (draft: MutableModel<Bar, BarMetaData>) => MutableModel<Bar, BarMetaData> | void): Bar;
        }"
      `);
      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateEnumDeclarationsSpy).toBeCalledTimes(1);
      expect(generateEnumDeclarationsSpy).toBeCalledWith((declarationVisitor as any).enumMap['SimpleEnum'], true);

      expect(generateModelDeclarationSpy).toBeCalledTimes(3);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['SimpleModel'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(2, (declarationVisitor as any).modelMap['Bar'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(
        3,
        (declarationVisitor as any).nonModelMap['SimpleNonModelType'],
        true,
        false,
      );
    });
  });

  it('should generate Javascript code when declaration is set to false', () => {
    const jsVisitor = getVisitor(schema);
    const generateImportsJavaScriptImplementationSpy = jest.spyOn(jsVisitor as any, 'generateImportsJavaScriptImplementation');
    const generateEnumObjectSpy = jest.spyOn(jsVisitor as any, 'generateEnumObject');
    const generateModelInitializationSpy = jest.spyOn(jsVisitor as any, 'generateModelInitialization');
    const codeBlock = jsVisitor.generate();
    validateTs(codeBlock);
    expect(codeBlock).toMatchInlineSnapshot(`
      "// @ts-check
      import { initSchema } from '@aws-amplify/datastore';
      import { schema } from './schema';

      const SimpleEnum = {
        \\"ENUM_VAL1\\": \\"enumVal1\\",
        \\"ENUM_VAL2\\": \\"enumVal2\\"
      };

      const { SimpleModel, Bar, SimpleNonModelType } = initSchema(schema);

      export {
        SimpleModel,
        Bar,
        SimpleEnum,
        SimpleNonModelType
      };"
    `);
    expect(generateEnumObjectSpy).toHaveBeenCalledWith((jsVisitor as any).enumMap['SimpleEnum']);

    expect(generateImportsJavaScriptImplementationSpy).toHaveBeenCalledTimes(1);
    expect(generateImportsJavaScriptImplementationSpy).toHaveBeenCalledWith();

    expect(generateModelInitializationSpy).toHaveBeenCalledTimes(1);
    expect(generateModelInitializationSpy).toHaveBeenCalledWith(
      [
        (jsVisitor as any).modelMap['SimpleModel'],
        (jsVisitor as any).modelMap['Bar'],
        (jsVisitor as any).nonModelMap['SimpleNonModelType'],
      ],
      false,
    );
  });
});

describe('Javascript visitor with default owner auth', () => {
  const schema = /* GraphQL */ `
    type SimpleModel @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      name: String
      bar: String
    }
    enum SimpleEnum {
      enumVal1
      enumVal2
    }

    type SimpleNonModelType {
      id: ID!
      names: [String]
    }
  `;
  let visitor: AppSyncModelJavascriptVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  describe('generate', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should not add default owner field to Javascript declaration', () => {
      const declarationVisitor = getVisitor(schema, { isDeclaration: true });
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        type EagerSimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        type LazySimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        export declare type SimpleNonModelType = LazyLoading extends LazyLoadingDisabled ? EagerSimpleNonModelType : LazySimpleNonModelType

        export declare const SimpleNonModelType: (new (init: ModelInit<SimpleNonModelType>) => SimpleNonModelType)

        type EagerSimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
        }

        type LazySimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
        }

        export declare type SimpleModel = LazyLoading extends LazyLoadingDisabled ? EagerSimpleModel : LazySimpleModel

        export declare const SimpleModel: (new (init: ModelInit<SimpleModel>) => SimpleModel) & {
          copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel>) => MutableModel<SimpleModel> | void): SimpleModel;
        }"
      `);
      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateEnumDeclarationsSpy).toBeCalledTimes(1);
      expect(generateEnumDeclarationsSpy).toBeCalledWith((declarationVisitor as any).enumMap['SimpleEnum'], true);

      expect(generateModelDeclarationSpy).toBeCalledTimes(2);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['SimpleModel'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(
        2,
        (declarationVisitor as any).nonModelMap['SimpleNonModelType'],
        true,
        false,
      );
    });
  });
});

describe('Javascript visitor with custom owner field auth', () => {
  const schema = /* GraphQL */ `
    type SimpleModel @model @auth(rules: [{ allow: owner, ownerField: "customOwnerField", operations: [create, update, delete, read] }]) {
      id: ID!
      name: String
      bar: String
    }
    enum SimpleEnum {
      enumVal1
      enumVal2
    }

    type SimpleNonModelType {
      id: ID!
      names: [String]
    }
  `;
  let visitor: AppSyncModelJavascriptVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  describe('generate', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should not add custom owner field to Javascript declaration', () => {
      const declarationVisitor = getVisitor(schema, { isDeclaration: true });
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        type EagerSimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        type LazySimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        export declare type SimpleNonModelType = LazyLoading extends LazyLoadingDisabled ? EagerSimpleNonModelType : LazySimpleNonModelType

        export declare const SimpleNonModelType: (new (init: ModelInit<SimpleNonModelType>) => SimpleNonModelType)

        type EagerSimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
        }

        type LazySimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
        }

        export declare type SimpleModel = LazyLoading extends LazyLoadingDisabled ? EagerSimpleModel : LazySimpleModel

        export declare const SimpleModel: (new (init: ModelInit<SimpleModel>) => SimpleModel) & {
          copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel>) => MutableModel<SimpleModel> | void): SimpleModel;
        }"
      `);
      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateEnumDeclarationsSpy).toBeCalledTimes(1);
      expect(generateEnumDeclarationsSpy).toBeCalledWith((declarationVisitor as any).enumMap['SimpleEnum'], true);

      expect(generateModelDeclarationSpy).toBeCalledTimes(2);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['SimpleModel'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(
        2,
        (declarationVisitor as any).nonModelMap['SimpleNonModelType'],
        true,
        false,
      );
    });
  });
});

describe('Javascript visitor with multiple owner field auth', () => {
  const schema = /* GraphQL */ `
    type SimpleModel
      @model
      @auth(rules: [{ allow: owner, ownerField: "customOwnerField" }, { allow: owner, ownerField: "customOwnerField2" }]) {
      id: ID!
      name: String
      bar: String
    }
    enum SimpleEnum {
      enumVal1
      enumVal2
    }

    type SimpleNonModelType {
      id: ID!
      names: [String]
    }
  `;
  let visitor: AppSyncModelJavascriptVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  describe('generate', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should not add custom both owner fields to Javascript declaration', () => {
      const declarationVisitor = getVisitor(schema, { isDeclaration: true });
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        type EagerSimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        type LazySimpleNonModelType = {
          readonly id: string;
          readonly names?: (string | null)[] | null;
        }

        export declare type SimpleNonModelType = LazyLoading extends LazyLoadingDisabled ? EagerSimpleNonModelType : LazySimpleNonModelType

        export declare const SimpleNonModelType: (new (init: ModelInit<SimpleNonModelType>) => SimpleNonModelType)

        type EagerSimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
        }

        type LazySimpleModel = {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
        }

        export declare type SimpleModel = LazyLoading extends LazyLoadingDisabled ? EagerSimpleModel : LazySimpleModel

        export declare const SimpleModel: (new (init: ModelInit<SimpleModel>) => SimpleModel) & {
          copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel>) => MutableModel<SimpleModel> | void): SimpleModel;
        }"
      `);
      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateEnumDeclarationsSpy).toBeCalledTimes(1);
      expect(generateEnumDeclarationsSpy).toBeCalledWith((declarationVisitor as any).enumMap['SimpleEnum'], true);

      expect(generateModelDeclarationSpy).toBeCalledTimes(2);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['SimpleModel'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(
        2,
        (declarationVisitor as any).nonModelMap['SimpleNonModelType'],
        true,
        false,
      );
    });
  });
});

describe('Javascript visitor with auth directives in field level', () => {
  const schema = /* GraphQL */ `
    type Employee @model @auth(rules: [{ allow: owner }, { allow: groups, groups: ["Admins"] }]) {
      id: ID!
      name: String!
      address: String!
      ssn: String @auth(rules: [{ allow: owner }])
    }
  `;

  let visitor: AppSyncModelJavascriptVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  describe('generate', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should not add custom owner fields to Javascript declaration', () => {
      const declarationVisitor = getVisitor(schema, { isDeclaration: true });
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel } from \\"@aws-amplify/datastore\\";

        type EagerEmployee = {
          readonly id: string;
          readonly name: string;
          readonly address: string;
          readonly ssn?: string | null;
        }

        type LazyEmployee = {
          readonly id: string;
          readonly name: string;
          readonly address: string;
          readonly ssn?: string | null;
        }

        export declare type Employee = LazyLoading extends LazyLoadingDisabled ? EagerEmployee : LazyEmployee

        export declare const Employee: (new (init: ModelInit<Employee>) => Employee) & {
          copyOf(source: Employee, mutator: (draft: MutableModel<Employee>) => MutableModel<Employee> | void): Employee;
        }"
      `);

      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateModelDeclarationSpy).toBeCalledTimes(1);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['Employee'], true);
    });
  });
});

describe('Javascript visitor with custom primary key', () => {
  const schemaV2 = /* GraphQL */ `
    type WorkItem0 @model {
      project: ID! @index(name: "byProject", sortKeyFields: ["workItemId"])
      workItemId: ID!
    }

    type WorkItem1 @model {
      project: ID! @primaryKey(sortKeyFields: ["workItemId"])
      workItemId: ID!
    }

    type WorkItem2 @model {
      project: ID! @primaryKey
    }

    type WorkItem3 @model {
      id: ID! @primaryKey
    }

    type WorkItem4 @model {
      id: ID!
    }

    type WorkItem5 @model {
      title: String
    }

    type WorkItem6 {
      id: ID!
    }
  `;

  it('should generate correct declaration with custom primary key support in V2 GraphQL schema', () => {
    const visitor = getVisitor(schemaV2, {
      isDeclaration: true,
      isTimestampFieldsAdded: true,
      respectPrimaryKeyAttributesOnConnectionField: true,
      transformerVersion: 2,
    });
    const declarations = visitor.generate();
    validateTs(declarations);
    expect(declarations).toMatchInlineSnapshot(`
      "import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier, CompositeIdentifier, CustomIdentifier, OptionallyManagedIdentifier } from \\"@aws-amplify/datastore\\";



      type EagerWorkItem6 = {
        readonly id: string;
      }

      type LazyWorkItem6 = {
        readonly id: string;
      }

      export declare type WorkItem6 = LazyLoading extends LazyLoadingDisabled ? EagerWorkItem6 : LazyWorkItem6

      export declare const WorkItem6: (new (init: ModelInit<WorkItem6>) => WorkItem6)

      type EagerWorkItem0 = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem0, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyWorkItem0 = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem0, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type WorkItem0 = LazyLoading extends LazyLoadingDisabled ? EagerWorkItem0 : LazyWorkItem0

      export declare const WorkItem0: (new (init: ModelInit<WorkItem0>) => WorkItem0) & {
        copyOf(source: WorkItem0, mutator: (draft: MutableModel<WorkItem0>) => MutableModel<WorkItem0> | void): WorkItem0;
      }

      type EagerWorkItem1 = {
        readonly [__modelMeta__]: {
          identifier: CompositeIdentifier<WorkItem1, ['project', 'workItemId']>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyWorkItem1 = {
        readonly [__modelMeta__]: {
          identifier: CompositeIdentifier<WorkItem1, ['project', 'workItemId']>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type WorkItem1 = LazyLoading extends LazyLoadingDisabled ? EagerWorkItem1 : LazyWorkItem1

      export declare const WorkItem1: (new (init: ModelInit<WorkItem1>) => WorkItem1) & {
        copyOf(source: WorkItem1, mutator: (draft: MutableModel<WorkItem1>) => MutableModel<WorkItem1> | void): WorkItem1;
      }

      type EagerWorkItem2 = {
        readonly [__modelMeta__]: {
          identifier: CustomIdentifier<WorkItem2, 'project'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly project: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyWorkItem2 = {
        readonly [__modelMeta__]: {
          identifier: CustomIdentifier<WorkItem2, 'project'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly project: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type WorkItem2 = LazyLoading extends LazyLoadingDisabled ? EagerWorkItem2 : LazyWorkItem2

      export declare const WorkItem2: (new (init: ModelInit<WorkItem2>) => WorkItem2) & {
        copyOf(source: WorkItem2, mutator: (draft: MutableModel<WorkItem2>) => MutableModel<WorkItem2> | void): WorkItem2;
      }

      type EagerWorkItem3 = {
        readonly [__modelMeta__]: {
          identifier: OptionallyManagedIdentifier<WorkItem3, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyWorkItem3 = {
        readonly [__modelMeta__]: {
          identifier: OptionallyManagedIdentifier<WorkItem3, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type WorkItem3 = LazyLoading extends LazyLoadingDisabled ? EagerWorkItem3 : LazyWorkItem3

      export declare const WorkItem3: (new (init: ModelInit<WorkItem3>) => WorkItem3) & {
        copyOf(source: WorkItem3, mutator: (draft: MutableModel<WorkItem3>) => MutableModel<WorkItem3> | void): WorkItem3;
      }

      type EagerWorkItem4 = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem4, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyWorkItem4 = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem4, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type WorkItem4 = LazyLoading extends LazyLoadingDisabled ? EagerWorkItem4 : LazyWorkItem4

      export declare const WorkItem4: (new (init: ModelInit<WorkItem4>) => WorkItem4) & {
        copyOf(source: WorkItem4, mutator: (draft: MutableModel<WorkItem4>) => MutableModel<WorkItem4> | void): WorkItem4;
      }

      type EagerWorkItem5 = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem5, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly title?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyWorkItem5 = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem5, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly title?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type WorkItem5 = LazyLoading extends LazyLoadingDisabled ? EagerWorkItem5 : LazyWorkItem5

      export declare const WorkItem5: (new (init: ModelInit<WorkItem5>) => WorkItem5) & {
        copyOf(source: WorkItem5, mutator: (draft: MutableModel<WorkItem5>) => MutableModel<WorkItem5> | void): WorkItem5;
      }"
    `);
  });
});

describe('New model meta field test', () => {
  const schemaV2 = /* GraphQL */ `
    type ModelDefault @model {
      id: ID!
      name: String!
      description: String
    }
    type ModelDefaultExplicitTimestamps @model {
      id: ID!
      name: String!
      description: String
      createdAt: AWSDateTime
      updatedAt: AWSDateTime
    }
    type ModelExplicitId @model {
      id: ID! @primaryKey
      name: String!
      description: String
    }
    type ModelExplicitIdWithSk @model {
      id: ID! @primaryKey(sortKeyFields: ["name"])
      name: String!
      description: String
    }
    type ModelCustomPk @model {
      myId: ID! @primaryKey
      id: ID!
      name: String!
      description: String
    }
    type ModelCustomPkSk @model {
      tenant: String! @primaryKey(sortKeyFields: ["dob"])
      dob: String!
      name: String!
      description: String
    }
  `;
  it('should generate correct model meta field in V2 GraphQL schema', () => {
    const visitor = getVisitor(schemaV2, {
      isDeclaration: true,
      isTimestampFieldsAdded: true,
      respectPrimaryKeyAttributesOnConnectionField: true,
      transformerVersion: 2,
    });
    const declarations = visitor.generate();
    validateTs(declarations);
    expect(declarations).toMatchInlineSnapshot(`
      "import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier, OptionallyManagedIdentifier, CompositeIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";





      type EagerModelDefault = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<ModelDefault, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyModelDefault = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<ModelDefault, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type ModelDefault = LazyLoading extends LazyLoadingDisabled ? EagerModelDefault : LazyModelDefault

      export declare const ModelDefault: (new (init: ModelInit<ModelDefault>) => ModelDefault) & {
        copyOf(source: ModelDefault, mutator: (draft: MutableModel<ModelDefault>) => MutableModel<ModelDefault> | void): ModelDefault;
      }

      type EagerModelDefaultExplicitTimestamps = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<ModelDefaultExplicitTimestamps, 'id'>;
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyModelDefaultExplicitTimestamps = {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<ModelDefaultExplicitTimestamps, 'id'>;
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type ModelDefaultExplicitTimestamps = LazyLoading extends LazyLoadingDisabled ? EagerModelDefaultExplicitTimestamps : LazyModelDefaultExplicitTimestamps

      export declare const ModelDefaultExplicitTimestamps: (new (init: ModelInit<ModelDefaultExplicitTimestamps>) => ModelDefaultExplicitTimestamps) & {
        copyOf(source: ModelDefaultExplicitTimestamps, mutator: (draft: MutableModel<ModelDefaultExplicitTimestamps>) => MutableModel<ModelDefaultExplicitTimestamps> | void): ModelDefaultExplicitTimestamps;
      }

      type EagerModelExplicitId = {
        readonly [__modelMeta__]: {
          identifier: OptionallyManagedIdentifier<ModelExplicitId, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyModelExplicitId = {
        readonly [__modelMeta__]: {
          identifier: OptionallyManagedIdentifier<ModelExplicitId, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type ModelExplicitId = LazyLoading extends LazyLoadingDisabled ? EagerModelExplicitId : LazyModelExplicitId

      export declare const ModelExplicitId: (new (init: ModelInit<ModelExplicitId>) => ModelExplicitId) & {
        copyOf(source: ModelExplicitId, mutator: (draft: MutableModel<ModelExplicitId>) => MutableModel<ModelExplicitId> | void): ModelExplicitId;
      }

      type EagerModelExplicitIdWithSk = {
        readonly [__modelMeta__]: {
          identifier: CompositeIdentifier<ModelExplicitIdWithSk, ['id', 'name']>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyModelExplicitIdWithSk = {
        readonly [__modelMeta__]: {
          identifier: CompositeIdentifier<ModelExplicitIdWithSk, ['id', 'name']>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type ModelExplicitIdWithSk = LazyLoading extends LazyLoadingDisabled ? EagerModelExplicitIdWithSk : LazyModelExplicitIdWithSk

      export declare const ModelExplicitIdWithSk: (new (init: ModelInit<ModelExplicitIdWithSk>) => ModelExplicitIdWithSk) & {
        copyOf(source: ModelExplicitIdWithSk, mutator: (draft: MutableModel<ModelExplicitIdWithSk>) => MutableModel<ModelExplicitIdWithSk> | void): ModelExplicitIdWithSk;
      }

      type EagerModelCustomPk = {
        readonly [__modelMeta__]: {
          identifier: CustomIdentifier<ModelCustomPk, 'myId'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly myId: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyModelCustomPk = {
        readonly [__modelMeta__]: {
          identifier: CustomIdentifier<ModelCustomPk, 'myId'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly myId: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type ModelCustomPk = LazyLoading extends LazyLoadingDisabled ? EagerModelCustomPk : LazyModelCustomPk

      export declare const ModelCustomPk: (new (init: ModelInit<ModelCustomPk>) => ModelCustomPk) & {
        copyOf(source: ModelCustomPk, mutator: (draft: MutableModel<ModelCustomPk>) => MutableModel<ModelCustomPk> | void): ModelCustomPk;
      }

      type EagerModelCustomPkSk = {
        readonly [__modelMeta__]: {
          identifier: CompositeIdentifier<ModelCustomPkSk, ['tenant', 'dob']>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly tenant: string;
        readonly dob: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      type LazyModelCustomPkSk = {
        readonly [__modelMeta__]: {
          identifier: CompositeIdentifier<ModelCustomPkSk, ['tenant', 'dob']>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly tenant: string;
        readonly dob: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
      }

      export declare type ModelCustomPkSk = LazyLoading extends LazyLoadingDisabled ? EagerModelCustomPkSk : LazyModelCustomPkSk

      export declare const ModelCustomPkSk: (new (init: ModelInit<ModelCustomPkSk>) => ModelCustomPkSk) & {
        copyOf(source: ModelCustomPkSk, mutator: (draft: MutableModel<ModelCustomPkSk>) => MutableModel<ModelCustomPkSk> | void): ModelCustomPkSk;
      }"
    `);
  });
});

describe('Javascript visitor with connected models of custom pk', () => {
  describe('hasOne/belongsTo relation', () => {
    const schema = /* GraphQL */ `
      type Project @model {
        id: ID! @primaryKey(sortKeyFields: ["name"])
        name: String!
        team: Team @hasOne
      }
      type Team @model {
        id: ID! @primaryKey(sortKeyFields: ["name"])
        name: String!
        project: Project @belongsTo
      }
    `;
    it('should generate correct declaration when custom pk support is enabled', () => {
      const visitor = getVisitor(schema, {
        isDeclaration: true,
        isTimestampFieldsAdded: true,
        respectPrimaryKeyAttributesOnConnectionField: true,
        transformerVersion: 2,
      });
      const declarations = visitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchSnapshot();
    });
  });
  describe('hasMany/belongsTo relation', () => {
    it('should generate correct declaration for hasMany uni-connection model when custom pk support is enabled', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          id: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          comments: [Comment] @hasMany
        }
        type Comment @model {
          id: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
        }
      `;
      const visitor = getVisitor(schema, {
        isDeclaration: true,
        isTimestampFieldsAdded: true,
        respectPrimaryKeyAttributesOnConnectionField: true,
        transformerVersion: 2,
      });
      const declarations = visitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchSnapshot();
    });
    it('should generate correct declaration for hasMany bi-connection model when custom pk support is enabled', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          customPostId: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          comments: [Comment] @hasMany
        }
        type Comment @model {
          customPostId: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
          post: Post @belongsTo
        }
      `;
      const visitor = getVisitor(schema, {
        isDeclaration: true,
        isTimestampFieldsAdded: true,
        respectPrimaryKeyAttributesOnConnectionField: true,
        transformerVersion: 2,
      });
      const declarations = visitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchSnapshot();
    });
  });
  describe('manyToMany relation', () => {
    it('should generate correct declaration for manyToMany model when custom pk is enabled', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          customPostId: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          content: String
          tags: [Tag] @manyToMany(relationName: "PostTags")
        }
        type Tag @model {
          customTagId: ID! @primaryKey(sortKeyFields: ["label"])
          label: String!
          posts: [Post] @manyToMany(relationName: "PostTags")
        }
      `;
      const visitor = getVisitor(schema, {
        isDeclaration: true,
        isTimestampFieldsAdded: true,
        respectPrimaryKeyAttributesOnConnectionField: true,
        transformerVersion: 2,
      });
      const declarations = visitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchSnapshot();
    });
  });
});
