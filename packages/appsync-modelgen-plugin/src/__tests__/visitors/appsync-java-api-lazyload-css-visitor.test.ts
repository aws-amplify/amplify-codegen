import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { DefaultDirectives } from '@aws-amplify/graphql-directives';
import { validateJava } from '../utils/validate-java';
import { scalars } from '../../scalars/supported-scalars';
import { AppSyncModelJavaVisitor } from '../../visitors/appsync-java-visitor';
import { CodeGenGenerateEnum } from '../../visitors/appsync-visitor';
import { JAVA_SCALAR_MAP } from '../../scalars';

const defaultJavaVisitorSettings = {
  isTimestampFieldsAdded: true,
  handleListNullabilityTransparently: true,
  transformerVersion: 2,
  generate: CodeGenGenerateEnum.code,
  respectPrimaryKeyAttributesOnConnectionField: false,
  generateModelsForLazyLoadAndCustomSelectionSet: true,
};

const directives = DefaultDirectives.map((directive) => directive.definition).join('\n');

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getVisitor = (schema: string, selectedType?: string, settings: any = {}) => {
  const visitorConfig = { ...defaultJavaVisitorSettings, ...settings };
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelJavaVisitor(
    builtSchema,
    {
      directives,
      target: 'java',
      scalars: JAVA_SCALAR_MAP,
      ...visitorConfig,
    },
    { selectedType },
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('AppSyncModelVisitor', () => {
  const schemaHasOneParentChild = /* GraphQL */ `
    type HasOneParent @model {
      id: ID! @primaryKey
      child: HasOneChild @hasOne
    }

    type HasOneChild @model {
      id: ID! @primaryKey
      content: String
    }
  `;

  const schemaDefaultPKParentChild = /* GraphQL */ `
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

  const schemaCompositePK = /* GraphQL */ `
    type CompositePKParent @model {
      customId: ID! @primaryKey(sortKeyFields: ["content"])
      content: String!
      children: [CompositePKChild] @hasMany(indexName: "byParent", fields: ["customId", "content"])
      implicitChildren: [ImplicitChild] @hasMany
      strangeChildren: [StrangeExplicitChild] @hasMany(indexName: "byCompositePKParentX", fields: ["customId", "content"])
      childrenSansBelongsTo: [ChildSansBelongsTo] @hasMany
    }

    type CompositePKChild @model {
      childId: ID! @primaryKey(sortKeyFields: ["content"])
      content: String!
      parent: CompositePKParent @belongsTo(fields: ["parentId", "parentTitle"])
      parentId: ID @index(name: "byParent", sortKeyFields: ["parentTitle"])
      parentTitle: String
    }

    type ImplicitChild @model {
      childId: ID! @primaryKey(sortKeyFields: ["content"])
      content: String!
      parent: CompositePKParent! @belongsTo
    }

    type StrangeExplicitChild @model {
      strangeId: ID! @primaryKey(sortKeyFields: ["content"])
      content: String!
      parent: CompositePKParent! @belongsTo(fields: ["strangeParentId", "strangeParentTitle"])
      strangeParentId: ID @index(name: "byCompositePKParentX", sortKeyFields: ["strangeParentTitle"])
      strangeParentTitle: String # customized foreign key for parent sort key
    }

    type ChildSansBelongsTo @model {
      childId: ID! @primaryKey(sortKeyFields: ["content"])
      content: String!
      compositePKParentChildrenSansBelongsToCustomId: ID!
        @index(name: "byParent", sortKeyFields: ["compositePKParentChildrenSansBelongsToContent"])
      compositePKParentChildrenSansBelongsToContent: String
    }
  `;

  const schemaParentHasOneHasManyChild = /* GraphQL */ `
    type Parent @model {
      id: ID! @primaryKey
      child: HasOneChild @hasOne
      children: [HasManyChild] @hasMany
    }

    type HasOneChild @model {
      id: ID! @primaryKey
      content: String
    }

    type HasManyChild @model {
      id: ID! @primaryKey
      content: String
      parent: Parent @belongsTo
    }
  `;

  const schemaProjectTeam = /* GraphQL */ `
    type Project @model {
      projectId: ID! @primaryKey(sortKeyFields: ["name"])
      name: String!
      team: Team @hasOne
    }
    type Team @model {
      teamId: ID! @primaryKey(sortKeyFields: ["name"])
      name: String!
      project: Project @belongsTo
    }
  `;

  const schemaBlogPostComment = /* GraphQL */ `
    type Blog @model {
      blogId: String! @primaryKey
      name: String!
      posts: [Post!]! @hasMany
    }

    type Post @model {
      postId: ID! @primaryKey(sortKeyFields: ["title"])
      title: String!
      blog: Blog! @belongsTo
      comments: [Comment]! @hasMany
    }

    type Comment @model {
      commentId: ID! @primaryKey(sortKeyFields: ["content"])
      content: String!
      post: Post! @belongsTo
    }
  `;

  describe('DataStore Enabled', () => {
    it('Should generate for HasOneParent HasOneChild models', () => {
      const visitor = getVisitor(schemaHasOneParentChild, undefined, { isDataStoreEnabled: true });
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('Should generate for DefaultPKParent DefaultPKChild models', () => {
      const visitor = getVisitor(schemaDefaultPKParentChild, undefined, { isDataStoreEnabled: true });
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate for CompositePKParent and (CompositePK, Implicit, StrangeExplicit, ChildSansBelongsTo) Child models', () => {
      const visitor = getVisitor(schemaCompositePK, undefined, { isDataStoreEnabled: true });
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('should generate for Parent, HasOneChild, HasManyChild models', () => {
      const visitor = getVisitor(schemaParentHasOneHasManyChild, undefined, { isDataStoreEnabled: true });
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('should generate for Project and Team models', () => {
      const visitor = getVisitor(schemaProjectTeam, undefined, { isDataStoreEnabled: true });
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('should generate for Blog, Post, and Comment models', () => {
      const visitor = getVisitor(schemaBlogPostComment, undefined, { isDataStoreEnabled: true });
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('API only', () => {
    it('Should generate for HasOneParent HasOneChild models', () => {
      const visitor = getVisitor(schemaHasOneParentChild);
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('Should generate for DefaultPKParent DefaultPKChild models', () => {
      const visitor = getVisitor(schemaDefaultPKParentChild);
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate for CompositePKParent and (CompositePK, Implicit, StrangeExplicit, ChildSansBelongsTo) Child models', () => {
      const visitor = getVisitor(schemaCompositePK);
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate for Parent, HasOneChild, HasManyChild models', () => {
      const visitor = getVisitor(schemaParentHasOneHasManyChild);
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('should generate for Project and Team models', () => {
      const visitor = getVisitor(schemaProjectTeam);
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('should generate for Blog, Post, and Comment models', () => {
      const visitor = getVisitor(schemaBlogPostComment);
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
  });
});
