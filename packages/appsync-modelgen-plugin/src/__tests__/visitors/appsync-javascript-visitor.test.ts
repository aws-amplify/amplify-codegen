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
  useCustomPrimaryKey?: boolean;
  transformerVersion?: number;
};
const defaultJavaScriptVisitorConfig: JavaScriptVisitorConfig = {
  isDeclaration: false,
  isTimestampFieldsAdded: false,
  useCustomPrimaryKey: false,
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
        "import { ModelInit, MutableModel, PersistentModelConstructor } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        export declare class SimpleNonModelType {
          readonly id: string;
          readonly names?: (string | null)[] | null;
          constructor(init: ModelInit<SimpleNonModelType>);
        }





        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          readonly foo?: Bar[] | null;
          constructor(init: ModelInit<SimpleModel>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel>) => MutableModel<SimpleModel> | void): SimpleModel;
        }

        export declare class Bar {
          readonly id: string;
          readonly simpleModelFooId?: string | null;
          constructor(init: ModelInit<Bar>);
          static copyOf(source: Bar, mutator: (draft: MutableModel<Bar>) => MutableModel<Bar> | void): Bar;
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
        "import { ModelInit, MutableModel, PersistentModelConstructor } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        export declare class SimpleNonModelType {
          readonly id: string;
          readonly names?: (string | null)[] | null;
          constructor(init: ModelInit<SimpleNonModelType>);
        }

        type SimpleModelMetaData = {
          readOnlyFields: 'createdAt' | 'updatedAt';
        }

        type BarMetaData = {
          readOnlyFields: 'createdAt' | 'updatedAt';
        }

        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          readonly foo?: Bar[] | null;
          readonly createdAt?: string | null;
          readonly updatedAt?: string | null;
          constructor(init: ModelInit<SimpleModel, SimpleModelMetaData>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel, SimpleModelMetaData>) => MutableModel<SimpleModel, SimpleModelMetaData> | void): SimpleModel;
        }

        export declare class Bar {
          readonly id: string;
          readonly createdAt?: string | null;
          readonly updatedAt?: string | null;
          readonly simpleModelFooId?: string | null;
          constructor(init: ModelInit<Bar, BarMetaData>);
          static copyOf(source: Bar, mutator: (draft: MutableModel<Bar, BarMetaData>) => MutableModel<Bar, BarMetaData> | void): Bar;
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
        "import { ModelInit, MutableModel, PersistentModelConstructor } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        export declare class SimpleNonModelType {
          readonly id: string;
          readonly names?: (string | null)[] | null;
          constructor(init: ModelInit<SimpleNonModelType>);
        }

        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          constructor(init: ModelInit<SimpleModel>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel>) => MutableModel<SimpleModel> | void): SimpleModel;
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
        "import { ModelInit, MutableModel, PersistentModelConstructor } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        export declare class SimpleNonModelType {
          readonly id: string;
          readonly names?: (string | null)[] | null;
          constructor(init: ModelInit<SimpleNonModelType>);
        }

        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          constructor(init: ModelInit<SimpleModel>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel>) => MutableModel<SimpleModel> | void): SimpleModel;
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
        "import { ModelInit, MutableModel, PersistentModelConstructor } from \\"@aws-amplify/datastore\\";

        export enum SimpleEnum {
          ENUM_VAL1 = \\"enumVal1\\",
          ENUM_VAL2 = \\"enumVal2\\"
        }

        export declare class SimpleNonModelType {
          readonly id: string;
          readonly names?: (string | null)[] | null;
          constructor(init: ModelInit<SimpleNonModelType>);
        }

        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string | null;
          readonly bar?: string | null;
          constructor(init: ModelInit<SimpleModel>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel>) => MutableModel<SimpleModel> | void): SimpleModel;
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
        "import { ModelInit, MutableModel, PersistentModelConstructor } from \\"@aws-amplify/datastore\\";

        export declare class Employee {
          readonly id: string;
          readonly name: string;
          readonly address: string;
          readonly ssn?: string | null;
          constructor(init: ModelInit<Employee>);
          static copyOf(source: Employee, mutator: (draft: MutableModel<Employee>) => MutableModel<Employee> | void): Employee;
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
  const schemaV1 = /* GraphQL */ `
    type WorkItem0 @model @key(name: "byProject", fields: ["project", "workItemId"]) {
      project: ID!
      workItemId: ID!
    }

    type WorkItem1 @model @key(fields: ["project", "workItemId"]) {
      project: ID!
      workItemId: ID!
    }

    type WorkItem2 @model @key(fields: ["project"]) {
      project: ID!
    }

    type WorkItem3 @model @key(fields: ["id"]) {
      id: ID!
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

  it('should generate correct declaration with custom primary key support in V1 GraphQL schema', () => {
    const visitor = getVisitor(schemaV1, { isDeclaration: true, isTimestampFieldsAdded: true, useCustomPrimaryKey: true });
    const declarations = visitor.generate();
    validateTs(declarations);
    expect(declarations).toMatchInlineSnapshot(`
      "import { ModelInit, MutableModel, PersistentModelConstructor, __modelMeta__, ManagedIdentifier, CompositeIdentifier, CustomIdentifier, OptionallyManagedIdentifier } from \\"@aws-amplify/datastore\\";



      export declare class WorkItem6 {
        readonly id: string;
        constructor(init: ModelInit<WorkItem6>);
      }

      export declare class WorkItem0 {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem0, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem0>);
        static copyOf(source: WorkItem0, mutator: (draft: MutableModel<WorkItem0>) => MutableModel<WorkItem0> | void): WorkItem0;
      }

      export declare class WorkItem1 {
        readonly [__modelMeta__]: {
          identifier: CompositeIdentifier<WorkItem1, ['project', 'workItemId']>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem1>);
        static copyOf(source: WorkItem1, mutator: (draft: MutableModel<WorkItem1>) => MutableModel<WorkItem1> | void): WorkItem1;
      }

      export declare class WorkItem2 {
        readonly [__modelMeta__]: {
          identifier: CustomIdentifier<WorkItem2, 'project'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly project: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem2>);
        static copyOf(source: WorkItem2, mutator: (draft: MutableModel<WorkItem2>) => MutableModel<WorkItem2> | void): WorkItem2;
      }

      export declare class WorkItem3 {
        readonly [__modelMeta__]: {
          identifier: OptionallyManagedIdentifier<WorkItem3, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem3>);
        static copyOf(source: WorkItem3, mutator: (draft: MutableModel<WorkItem3>) => MutableModel<WorkItem3> | void): WorkItem3;
      }

      export declare class WorkItem4 {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem4, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem4>);
        static copyOf(source: WorkItem4, mutator: (draft: MutableModel<WorkItem4>) => MutableModel<WorkItem4> | void): WorkItem4;
      }

      export declare class WorkItem5 {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem5, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly title?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem5>);
        static copyOf(source: WorkItem5, mutator: (draft: MutableModel<WorkItem5>) => MutableModel<WorkItem5> | void): WorkItem5;
      }"
    `);
  });

  it('should generate correct declaration with custom primary key support in V2 GraphQL schema', () => {
    const visitor = getVisitor(schemaV2, {
      isDeclaration: true,
      isTimestampFieldsAdded: true,
      useCustomPrimaryKey: true,
      transformerVersion: 2,
    });
    const declarations = visitor.generate();
    validateTs(declarations);
    expect(declarations).toMatchInlineSnapshot(`
      "import { ModelInit, MutableModel, PersistentModelConstructor, __modelMeta__, ManagedIdentifier, CompositeIdentifier, CustomIdentifier, OptionallyManagedIdentifier } from \\"@aws-amplify/datastore\\";



      export declare class WorkItem6 {
        readonly id: string;
        constructor(init: ModelInit<WorkItem6>);
      }

      export declare class WorkItem0 {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem0, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem0>);
        static copyOf(source: WorkItem0, mutator: (draft: MutableModel<WorkItem0>) => MutableModel<WorkItem0> | void): WorkItem0;
      }

      export declare class WorkItem1 {
        readonly [__modelMeta__]: {
          identifier: CompositeIdentifier<WorkItem1, ['project', 'workItemId']>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem1>);
        static copyOf(source: WorkItem1, mutator: (draft: MutableModel<WorkItem1>) => MutableModel<WorkItem1> | void): WorkItem1;
      }

      export declare class WorkItem2 {
        readonly [__modelMeta__]: {
          identifier: CustomIdentifier<WorkItem2, 'project'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly project: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem2>);
        static copyOf(source: WorkItem2, mutator: (draft: MutableModel<WorkItem2>) => MutableModel<WorkItem2> | void): WorkItem2;
      }

      export declare class WorkItem3 {
        readonly [__modelMeta__]: {
          identifier: OptionallyManagedIdentifier<WorkItem3, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem3>);
        static copyOf(source: WorkItem3, mutator: (draft: MutableModel<WorkItem3>) => MutableModel<WorkItem3> | void): WorkItem3;
      }

      export declare class WorkItem4 {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem4, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem4>);
        static copyOf(source: WorkItem4, mutator: (draft: MutableModel<WorkItem4>) => MutableModel<WorkItem4> | void): WorkItem4;
      }

      export declare class WorkItem5 {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<WorkItem5, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly title?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<WorkItem5>);
        static copyOf(source: WorkItem5, mutator: (draft: MutableModel<WorkItem5>) => MutableModel<WorkItem5> | void): WorkItem5;
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
      useCustomPrimaryKey: true,
      transformerVersion: 2,
    });
    const declarations = visitor.generate();
    validateTs(declarations);
    expect(declarations).toMatchInlineSnapshot(`
      "import { ModelInit, MutableModel, PersistentModelConstructor, __modelMeta__, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier, CompositeIdentifier } from \\"@aws-amplify/datastore\\";





      export declare class ModelDefault {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<ModelDefault, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<ModelDefault>);
        static copyOf(source: ModelDefault, mutator: (draft: MutableModel<ModelDefault>) => MutableModel<ModelDefault> | void): ModelDefault;
      }

      export declare class ModelDefaultExplicitTimestamps {
        readonly [__modelMeta__]: {
          identifier: ManagedIdentifier<ModelDefaultExplicitTimestamps, 'id'>;
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<ModelDefaultExplicitTimestamps>);
        static copyOf(source: ModelDefaultExplicitTimestamps, mutator: (draft: MutableModel<ModelDefaultExplicitTimestamps>) => MutableModel<ModelDefaultExplicitTimestamps> | void): ModelDefaultExplicitTimestamps;
      }

      export declare class ModelExplicitId {
        readonly [__modelMeta__]: {
          identifier: OptionallyManagedIdentifier<ModelExplicitId, 'id'>;
          readOnlyFields: 'createdAt' | 'updatedAt';
        };
        readonly id: string;
        readonly name: string;
        readonly description?: string | null;
        readonly createdAt?: string | null;
        readonly updatedAt?: string | null;
        constructor(init: ModelInit<ModelExplicitId>);
        static copyOf(source: ModelExplicitId, mutator: (draft: MutableModel<ModelExplicitId>) => MutableModel<ModelExplicitId> | void): ModelExplicitId;
      }

      export declare class ModelCustomPk {
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
        constructor(init: ModelInit<ModelCustomPk>);
        static copyOf(source: ModelCustomPk, mutator: (draft: MutableModel<ModelCustomPk>) => MutableModel<ModelCustomPk> | void): ModelCustomPk;
      }

      export declare class ModelCustomPkSk {
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
        constructor(init: ModelInit<ModelCustomPkSk>);
        static copyOf(source: ModelCustomPkSk, mutator: (draft: MutableModel<ModelCustomPkSk>) => MutableModel<ModelCustomPkSk> | void): ModelCustomPkSk;
      }"
    `);
  });
});
