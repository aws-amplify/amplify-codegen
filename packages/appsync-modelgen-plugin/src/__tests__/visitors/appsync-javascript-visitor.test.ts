import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { validateTs } from '@graphql-codegen/testing';
import { TYPESCRIPT_SCALAR_MAP } from '../../scalars';
import { directives, scalars } from '../../scalars/supported-directives';
import { AppSyncModelJavascriptVisitor } from '../../visitors/appsync-javascript-visitor';

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getVisitor = (
  schema: string,
  isDeclaration: boolean = false,
  isTimestampFieldsAdded: boolean = false,
  transformerVersion: number = 1,
): AppSyncModelJavascriptVisitor => {
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelJavascriptVisitor(
    builtSchema,
    { directives, target: 'javascript', scalars: TYPESCRIPT_SCALAR_MAP, isDeclaration, isTimestampFieldsAdded, transformerVersion },
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
      const declarationVisitor = getVisitor(schema, true);
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel, PersistentModelConstructor, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";

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
          identifier: ManagedIdentifier;
        }

        type BarMetaData = {
          identifier: ManagedIdentifier;
        }

        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string;
          readonly bar?: string;
          readonly foo?: Bar[];
          constructor(init: ModelInit<SimpleModel, SimpleModelMetaData>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel, SimpleModelMetaData>) => MutableModel<SimpleModel, SimpleModelMetaData> | void): SimpleModel;
        }

        export declare class Bar {
          readonly id: string;
          readonly simpleModelFooId?: string;
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
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(3, (declarationVisitor as any).nonModelMap['SimpleNonModelType'], true, false);
    });

    it('should generate Javascript declaration with model metadata types', () => {
      const declarationVisitor = getVisitor(schema, true, true);
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel, PersistentModelConstructor, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";

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
          identifier: ManagedIdentifier;
          readOnlyFields: 'createdAt' | 'updatedAt';
        }

        type BarMetaData = {
          identifier: ManagedIdentifier;
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
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(3, (declarationVisitor as any).nonModelMap['SimpleNonModelType'], true, false);
    });
  });

  it('should generate Javascript code when declaration is set to false', () => {
    const jsVisitor = getVisitor(schema, false);
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
      const declarationVisitor = getVisitor(schema, true);
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel, PersistentModelConstructor, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";

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
          identifier: ManagedIdentifier;
        }

        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string;
          readonly bar?: string;
          constructor(init: ModelInit<SimpleModel, SimpleModelMetaData>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel, SimpleModelMetaData>) => MutableModel<SimpleModel, SimpleModelMetaData> | void): SimpleModel;
        }"
      `);
      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateEnumDeclarationsSpy).toBeCalledTimes(1);
      expect(generateEnumDeclarationsSpy).toBeCalledWith((declarationVisitor as any).enumMap['SimpleEnum'], true);

      expect(generateModelDeclarationSpy).toBeCalledTimes(2);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['SimpleModel'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(2, (declarationVisitor as any).nonModelMap['SimpleNonModelType'], true, false);
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
      const declarationVisitor = getVisitor(schema, true);
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel, PersistentModelConstructor, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";

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
          identifier: ManagedIdentifier;
        }

        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string;
          readonly bar?: string;
          constructor(init: ModelInit<SimpleModel, SimpleModelMetaData>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel, SimpleModelMetaData>) => MutableModel<SimpleModel, SimpleModelMetaData> | void): SimpleModel;
        }"
      `);
      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateEnumDeclarationsSpy).toBeCalledTimes(1);
      expect(generateEnumDeclarationsSpy).toBeCalledWith((declarationVisitor as any).enumMap['SimpleEnum'], true);

      expect(generateModelDeclarationSpy).toBeCalledTimes(2);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['SimpleModel'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(2, (declarationVisitor as any).nonModelMap['SimpleNonModelType'], true, false);
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
      const declarationVisitor = getVisitor(schema, true);
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateEnumDeclarationsSpy = jest.spyOn(declarationVisitor as any, 'generateEnumDeclarations');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel, PersistentModelConstructor, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";

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
          identifier: ManagedIdentifier;
        }

        export declare class SimpleModel {
          readonly id: string;
          readonly name?: string;
          readonly bar?: string;
          constructor(init: ModelInit<SimpleModel, SimpleModelMetaData>);
          static copyOf(source: SimpleModel, mutator: (draft: MutableModel<SimpleModel, SimpleModelMetaData>) => MutableModel<SimpleModel, SimpleModelMetaData> | void): SimpleModel;
        }"
      `);
      expect(generateImportSpy).toBeCalledTimes(1);
      expect(generateImportSpy).toBeCalledWith();

      expect(generateEnumDeclarationsSpy).toBeCalledTimes(1);
      expect(generateEnumDeclarationsSpy).toBeCalledWith((declarationVisitor as any).enumMap['SimpleEnum'], true);

      expect(generateModelDeclarationSpy).toBeCalledTimes(2);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(1, (declarationVisitor as any).modelMap['SimpleModel'], true);
      expect(generateModelDeclarationSpy).toHaveBeenNthCalledWith(2, (declarationVisitor as any).nonModelMap['SimpleNonModelType'], true, false);
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
      const declarationVisitor = getVisitor(schema, true);
      const generateImportSpy = jest.spyOn(declarationVisitor as any, 'generateImports');
      const generateModelDeclarationSpy = jest.spyOn(declarationVisitor as any, 'generateModelDeclaration');
      const declarations = declarationVisitor.generate();
      validateTs(declarations);
      expect(declarations).toMatchInlineSnapshot(`
        "import { ModelInit, MutableModel, PersistentModelConstructor, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";





        type EmployeeMetaData = {
          identifier: ManagedIdentifier;
        }

        export declare class Employee {
          readonly id: string;
          readonly name: string;
          readonly address: string;
          readonly ssn?: string;
          constructor(init: ModelInit<Employee, EmployeeMetaData>);
          static copyOf(source: Employee, mutator: (draft: MutableModel<Employee, EmployeeMetaData>) => MutableModel<Employee, EmployeeMetaData> | void): Employee;
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
    const visitor = getVisitor(schemaV1, true, true);
    const declarations = visitor.generate();
    validateTs(declarations);
    expect(declarations).toMatchInlineSnapshot(`
      "import { ModelInit, MutableModel, PersistentModelConstructor, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";



      export declare class WorkItem6 {
        readonly id: string;
        constructor(init: ModelInit<WorkItem6>);
      }

      type WorkItem0MetaData = {
        identifier: ManagedIdentifier;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem1MetaData = {
        identifier: CustomIdentifier<'project' | 'workItemId'>;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem2MetaData = {
        identifier: CustomIdentifier<'project'>;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem3MetaData = {
        identifier: OptionallyManagedIdentifier;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem4MetaData = {
        identifier: ManagedIdentifier;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem5MetaData = {
        identifier: ManagedIdentifier;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      export declare class WorkItem0 {
        readonly id: string;
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem0, WorkItem0MetaData>);
        static copyOf(source: WorkItem0, mutator: (draft: MutableModel<WorkItem0, WorkItem0MetaData>) => MutableModel<WorkItem0, WorkItem0MetaData> | void): WorkItem0;
      }

      export declare class WorkItem1 {
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem1, WorkItem1MetaData>);
        static copyOf(source: WorkItem1, mutator: (draft: MutableModel<WorkItem1, WorkItem1MetaData>) => MutableModel<WorkItem1, WorkItem1MetaData> | void): WorkItem1;
      }

      export declare class WorkItem2 {
        readonly project: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem2, WorkItem2MetaData>);
        static copyOf(source: WorkItem2, mutator: (draft: MutableModel<WorkItem2, WorkItem2MetaData>) => MutableModel<WorkItem2, WorkItem2MetaData> | void): WorkItem2;
      }

      export declare class WorkItem3 {
        readonly id: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem3, WorkItem3MetaData>);
        static copyOf(source: WorkItem3, mutator: (draft: MutableModel<WorkItem3, WorkItem3MetaData>) => MutableModel<WorkItem3, WorkItem3MetaData> | void): WorkItem3;
      }

      export declare class WorkItem4 {
        readonly id: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem4, WorkItem4MetaData>);
        static copyOf(source: WorkItem4, mutator: (draft: MutableModel<WorkItem4, WorkItem4MetaData>) => MutableModel<WorkItem4, WorkItem4MetaData> | void): WorkItem4;
      }

      export declare class WorkItem5 {
        readonly id: string;
        readonly title?: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem5, WorkItem5MetaData>);
        static copyOf(source: WorkItem5, mutator: (draft: MutableModel<WorkItem5, WorkItem5MetaData>) => MutableModel<WorkItem5, WorkItem5MetaData> | void): WorkItem5;
      }"
    `);
  });

  it('should generate correct declaration with custom primary key support in V2 GraphQL schema', () => {
    const visitor = getVisitor(schemaV2, true, true, 2);
    const declarations = visitor.generate();
    validateTs(declarations);
    expect(declarations).toMatchInlineSnapshot(`
      "import { ModelInit, MutableModel, PersistentModelConstructor, ManagedIdentifier, OptionallyManagedIdentifier, CustomIdentifier } from \\"@aws-amplify/datastore\\";



      export declare class WorkItem6 {
        readonly id: string;
        constructor(init: ModelInit<WorkItem6>);
      }

      type WorkItem0MetaData = {
        identifier: ManagedIdentifier;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem1MetaData = {
        identifier: CustomIdentifier<'project' | 'workItemId'>;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem2MetaData = {
        identifier: CustomIdentifier<'project'>;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem3MetaData = {
        identifier: OptionallyManagedIdentifier;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem4MetaData = {
        identifier: ManagedIdentifier;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      type WorkItem5MetaData = {
        identifier: ManagedIdentifier;
        readOnlyFields: 'createdAt' | 'updatedAt';
      }

      export declare class WorkItem0 {
        readonly id: string;
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem0, WorkItem0MetaData>);
        static copyOf(source: WorkItem0, mutator: (draft: MutableModel<WorkItem0, WorkItem0MetaData>) => MutableModel<WorkItem0, WorkItem0MetaData> | void): WorkItem0;
      }

      export declare class WorkItem1 {
        readonly project: string;
        readonly workItemId: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem1, WorkItem1MetaData>);
        static copyOf(source: WorkItem1, mutator: (draft: MutableModel<WorkItem1, WorkItem1MetaData>) => MutableModel<WorkItem1, WorkItem1MetaData> | void): WorkItem1;
      }

      export declare class WorkItem2 {
        readonly project: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem2, WorkItem2MetaData>);
        static copyOf(source: WorkItem2, mutator: (draft: MutableModel<WorkItem2, WorkItem2MetaData>) => MutableModel<WorkItem2, WorkItem2MetaData> | void): WorkItem2;
      }

      export declare class WorkItem3 {
        readonly id: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem3, WorkItem3MetaData>);
        static copyOf(source: WorkItem3, mutator: (draft: MutableModel<WorkItem3, WorkItem3MetaData>) => MutableModel<WorkItem3, WorkItem3MetaData> | void): WorkItem3;
      }

      export declare class WorkItem4 {
        readonly id: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem4, WorkItem4MetaData>);
        static copyOf(source: WorkItem4, mutator: (draft: MutableModel<WorkItem4, WorkItem4MetaData>) => MutableModel<WorkItem4, WorkItem4MetaData> | void): WorkItem4;
      }

      export declare class WorkItem5 {
        readonly id: string;
        readonly title?: string;
        readonly createdAt?: string;
        readonly updatedAt?: string;
        constructor(init: ModelInit<WorkItem5, WorkItem5MetaData>);
        static copyOf(source: WorkItem5, mutator: (draft: MutableModel<WorkItem5, WorkItem5MetaData>) => MutableModel<WorkItem5, WorkItem5MetaData> | void): WorkItem5;
      }"
    `);
  });
});
