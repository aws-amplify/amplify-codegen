import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { validateJava } from '../utils/validate-java';
import { directives, scalars } from '../../scalars/supported-directives';
import { AppSyncModelJavaVisitor } from '../../visitors/appsync-java-visitor';
import { CodeGenGenerateEnum } from '../../visitors/appsync-visitor';
import { JAVA_SCALAR_MAP } from '../../scalars';

const defaultJavaVisitorSettings = {
  isTimestampFieldsAdded: true,
  handleListNullabilityTransparently: true,
  transformerVersion: 2,
  generate: CodeGenGenerateEnum.code,
  respectPrimaryKeyAttributesOnConnectionField: false,
  generateModelsForLazyLoadAndCustomSelectionSet: true
}
const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};


const getVisitor = (
    schema: string,
    selectedType?: string,
    settings: any = {}
) => {
  const visitorConfig = { ...defaultJavaVisitorSettings, ...settings };
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelJavaVisitor(
      builtSchema,
      {
        directives,
        target: 'java',
        scalars: JAVA_SCALAR_MAP,
        ...visitorConfig
      },
      { selectedType },
  );
  visit(ast, { leave: visitor });
  return visitor;
};

const getVisitorPipelinedTransformer = (
    schema: string,
    selectedType?: string,
    settings: any = {}
) => {
  return getVisitor(schema, selectedType, { ...settings, transformerVersion: 2 });
};

describe('AppSyncModelVisitor', () => {

  it('Should generate for HasOneParent HasOneChild models', () => {
    const schema = /* GraphQL */ `
      type HasOneParent @model {
        id: ID! @primaryKey
        child: HasOneChild @hasOne
      }
      
      type HasOneChild @model {
        id: ID! @primaryKey
        content: String
      }
    `;

    const visitor = getVisitor(schema);
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('Should generate for DefaultPKParent DefaultPKChild models', () => {
    const schema = /* GraphQL */ `
      type DefaultPKParent @model {
        id: ID! @primaryKey
        content: String
        children: [DefaultPKChild] @hasMany
      }
      
      type DefaultPKChild @model {
        id: ID! @primaryKey
        content: String
        parent: DefaultPKParent @belongsTo
      }
    `;

    const visitor = getVisitor(schema);
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('should generate for CompositePKParent and (CompositePK, Implicit, StrangeExplicit, ChildSansBelongsTo) Child models', () => {
    const schema = /* GraphQL */ `
      type CompositePKParent @model {
        customId: ID! @primaryKey(sortKeyFields:["content"])
        content: String!
        children: [CompositePKChild] @hasMany(indexName:"byParent", fields:["customId", "content"])
        implicitChildren: [ImplicitChild] @hasMany
        strangeChildren: [StrangeExplicitChild] @hasMany(indexName: "byCompositePKParentX", fields: ["customId", "content"])
        childrenSansBelongsTo: [ChildSansBelongsTo] @hasMany
      }
      
      type CompositePKChild @model {
        childId: ID! @primaryKey(sortKeyFields:["content"])
        content: String!
        parent: CompositePKParent @belongsTo(fields:["parentId", "parentTitle"])
        parentId: ID @index(name: "byParent", sortKeyFields:["parentTitle"])
        parentTitle: String
      }
      
      type ImplicitChild @model {
        childId: ID! @primaryKey(sortKeyFields:["content"])
        content: String!
        parent: CompositePKParent! @belongsTo
      }
      
      type StrangeExplicitChild @model {
        strangeId: ID! @primaryKey(sortKeyFields:["content"])
        content: String!
        parent: CompositePKParent! @belongsTo(fields:["strangeParentId", "strangeParentTitle"])
        strangeParentId: ID @index(name: "byCompositePKParentX", sortKeyFields:["strangeParentTitle"])
        strangeParentTitle: String # customized foreign key for parent sort key
      }
      
      type ChildSansBelongsTo @model {
        childId: ID! @primaryKey(sortKeyFields:["content"])
        content: String!
        compositePKParentChildrenSansBelongsToCustomId: ID! @index(name: "byParent", sortKeyFields: ["compositePKParentChildrenSansBelongsToContent"])
        compositePKParentChildrenSansBelongsToContent: String
      }
    `;

    const visitor = getVisitor(schema, 'status');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });
});

