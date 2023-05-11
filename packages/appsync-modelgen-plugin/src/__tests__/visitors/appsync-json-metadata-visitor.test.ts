import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { TYPESCRIPT_SCALAR_MAP } from '../../scalars';
import { directives, scalars } from '../../scalars/supported-directives';
import {
  CodeGenConnectionType,
  CodeGenFieldConnectionBelongsTo,
  CodeGenFieldConnectionHasMany,
  CodeGenFieldConnectionHasOne,
} from '../../utils/process-connections';
import { AppSyncJSONVisitor, AssociationHasMany, JSONSchemaNonModel } from '../../visitors/appsync-json-metadata-visitor';
import { CodeGenEnum, CodeGenField, CodeGenModel } from '../../visitors/appsync-visitor';

const defaultJSONVisitorSettings = {
  isTimestampFieldsAdded: true,
  respectPrimaryKeyAttributesOnConnectionField: false,
  transformerVersion: 1,
};

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getVisitor = (
  schema: string,
  target: 'typescript' | 'javascript' | 'typeDeclaration' = 'javascript',
  settings: any = {},
): AppSyncJSONVisitor => {
  const visitorConfig = { ...defaultJSONVisitorSettings, ...settings };
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncJSONVisitor(
    builtSchema,
    { directives, target: 'metadata', scalars: TYPESCRIPT_SCALAR_MAP, metadataTarget: target, codegenVersion: '1.0.0', ...visitorConfig },
    {},
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('Metadata visitor', () => {
  const schema = /* GraphQL */ `
    type SimpleModel @model {
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
  let visitor: AppSyncJSONVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  describe('getType', () => {
    it('should return model type for Models', () => {
      expect((visitor as any).getType('SimpleModel')).toEqual({ model: 'SimpleModel' });
    });

    it('should return EnumType for Enum', () => {
      expect((visitor as any).getType('SimpleEnum')).toEqual({ enum: 'SimpleEnum' });
    });

    it('should return NonModel type for Non-model', () => {
      expect((visitor as any).getType('SimpleNonModelType')).toEqual({ nonModel: 'SimpleNonModelType' });
    });

    it('should throw error for unknown type', () => {
      expect(() => (visitor as any).getType('unknown')).toThrowError('Unknown type');
    });
  });

  describe('generateNonModelMetadata', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should generate nonModelMetadata', () => {
      const nonModelType = (visitor as any).getSelectedNonModels()['SimpleNonModelType'];
      const getFieldAssociationSpy = jest.spyOn(visitor as any, 'getFieldAssociation').mockReturnValueOnce(null);
      const getFieldNameSpy = jest.spyOn(visitor as any, 'getFieldName');
      // Second call return a mock association
      const namesAssociation: AssociationHasMany = {
        associatedWith: 'foo',
        connectionType: CodeGenConnectionType.HAS_MANY,
      };
      getFieldAssociationSpy.mockReturnValueOnce(namesAssociation);
      const getModelNameSpy = jest.spyOn(visitor as any, 'getModelName').mockReturnValueOnce('nonModel');

      const expectedValue: JSONSchemaNonModel = {
        name: 'nonModel',
        fields: {
          id: {
            name: 'id',
            isArray: false,
            type: 'ID',
            isRequired: true,
            attributes: [],
          },
          names: {
            name: 'names',
            isArray: true,
            type: 'String',
            isArrayNullable: true,
            isRequired: false,
            attributes: [],
            association: namesAssociation,
          },
        },
      };
      expect((visitor as any).generateNonModelMetadata(nonModelType)).toEqual(expectedValue);

      expect(getFieldAssociationSpy).toHaveBeenCalledTimes(2);
      expect(getFieldAssociationSpy).toHaveBeenNthCalledWith(1, nonModelType.fields[0]);
      expect(getFieldAssociationSpy).toHaveBeenNthCalledWith(2, nonModelType.fields[1]);

      expect(getModelNameSpy).toHaveBeenLastCalledWith(nonModelType);

      expect(getFieldNameSpy).toHaveBeenCalledTimes(2);
      expect(getFieldNameSpy).toHaveBeenNthCalledWith(1, nonModelType.fields[0]);
      expect(getFieldNameSpy).toHaveBeenNthCalledWith(2, nonModelType.fields[1]);
    });
  });

  describe('generateModelMetadata', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should generate model metadata', () => {
      const modelType = (visitor as any).getSelectedModels()['SimpleModel'];
      const nonModelMetadata: JSONSchemaNonModel = {
        name: 'SimpleModel',
        fields: {},
      };

      const getNonModelMetadataSpy = jest.spyOn(visitor as any, 'generateNonModelMetadata').mockReturnValueOnce(nonModelMetadata);
      const pluralizeSpy = jest.spyOn(visitor as any, 'pluralizeModelName').mockReturnValueOnce('SimpleModels');
      const generateModelAttributesSpy = jest.spyOn(visitor as any, 'generateModelAttributes').mockReturnValue([]);

      expect((visitor as any).generateModelMetadata(modelType)).toEqual({
        ...nonModelMetadata,
        syncable: true,
        pluralName: 'SimpleModels',
        attributes: [],
      });

      expect(getNonModelMetadataSpy).toHaveBeenCalledWith(modelType);
      expect(pluralizeSpy).toBeCalledWith(modelType);
      expect(generateModelAttributesSpy).toHaveBeenCalledWith(modelType);
    });
  });

  it('should generate model attributes', () => {
    const model: CodeGenModel = {
      directives: [
        {
          name: 'connection',
          arguments: {
            fields: ['f1', 'f2'],
            keyName: 'byName',
          },
        },
      ],
      name: 'testModel',
      fields: [],
      type: 'model',
    };
    expect((visitor as any).generateModelAttributes(model)).toEqual([
      {
        type: model.directives[0].name,
        properties: model.directives[0].arguments,
      },
    ]);
  });

  describe('getFieldAssociation', () => {
    let baseField: CodeGenField;
    beforeEach(() => {
      baseField = {
        directives: [],
        isNullable: true,
        isList: false,
        name: 'name',
        type: 'String',
      };
    });
    it('should return undefined if there is no connectionInfo', () => {
      expect((visitor as any).getFieldAssociation(baseField)).not.toBeDefined();
    });

    it('should include associatedWith when a field HAS_MANY or HAS_ONE connection', () => {
      const hasManyAssociation: CodeGenFieldConnectionHasMany = {
        kind: CodeGenConnectionType.HAS_MANY,
        connectedModel: {
          name: 'Connected',
          fields: [],
          directives: [],
          type: 'model',
        },
        associatedWith: {
          directives: [],
          isList: false,
          isNullable: false,
          name: 'associatedField',
          type: 'String',
        },
        associatedWithFields: [],
        isConnectingFieldAutoCreated: false,
      };
      const getFieldNameSpy = jest.spyOn(visitor as any, 'getFieldName');
      const fieldWithHasManyConnection = { ...baseField, connectionInfo: hasManyAssociation };
      expect((visitor as any).getFieldAssociation(fieldWithHasManyConnection)).toEqual({
        connectionType: CodeGenConnectionType.HAS_MANY,
        associatedWith: 'associatedField',
      });
      expect(getFieldNameSpy).toHaveBeenCalledWith(hasManyAssociation.associatedWith);

      const hasOneAssociation: CodeGenFieldConnectionHasOne = {
        ...hasManyAssociation,
        kind: CodeGenConnectionType.HAS_ONE,
        targetNames: [],
        targetName: 'targetField',
      };
      const fieldWithHasOneConnection = { ...baseField, connectionInfo: hasOneAssociation };
      expect((visitor as any).getFieldAssociation(fieldWithHasOneConnection)).toEqual({
        connectionType: CodeGenConnectionType.HAS_ONE,
        associatedWith: 'associatedField',
        targetName: 'targetField',
      });
      expect(getFieldNameSpy).toHaveBeenCalledWith(hasOneAssociation.associatedWith);
    });

    it('should include targetName when a field BELONGS_TO connection', () => {
      const belongsToAssociation: CodeGenFieldConnectionBelongsTo = {
        kind: CodeGenConnectionType.BELONGS_TO,
        connectedModel: {
          name: 'Connected',
          fields: [],
          directives: [],
          type: 'model',
        },
        targetName: 'connectedId',
        targetNames: [],
        isConnectingFieldAutoCreated: false,
      };
      const getFieldNameSpy = jest.spyOn(visitor as any, 'getFieldName');
      const fieldWithBelongsToConnection = { ...baseField, connectionInfo: belongsToAssociation };
      expect((visitor as any).getFieldAssociation(fieldWithBelongsToConnection)).toEqual({
        connectionType: CodeGenConnectionType.BELONGS_TO,
        targetName: 'connectedId',
      });
      expect(getFieldNameSpy).not.toHaveBeenCalled();
    });

    it('should generate enum meta data', () => {
      const enumObj: CodeGenEnum = {
        name: 'MyEnum',
        type: 'enum',
        values: {
          val1: 'val1',
          val2: 'val2',
        },
      };
      expect((visitor as any).generateEnumMetadata(enumObj)).toEqual({
        name: 'MyEnum',
        values: ['val1', 'val2'],
      });
    });

    describe('generateMetadata', () => {
      beforeEach(() => {
        jest.resetAllMocks();
      });

      it('should include models, nonModels, enums and version info', () => {
        const generateModelSpy = jest.spyOn(visitor as any, 'generateModelMetadata');
        const generateNonModelSpy = jest.spyOn(visitor as any, 'generateNonModelMetadata');
        const generateEnumSpy = jest.spyOn(visitor as any, 'generateEnumMetadata');
        const computeVersionSpy = jest.spyOn(visitor as any, 'computeVersion');

        const metadata = (visitor as any).generateMetadata();

        expect(metadata).toMatchInlineSnapshot(`
          Object {
            "codegenVersion": "3.4.4",
            "enums": Object {
              "SimpleEnum": Object {
                "name": "SimpleEnum",
                "values": Array [
                  "enumVal1",
                  "enumVal2",
                ],
              },
            },
            "models": Object {
              "SimpleModel": Object {
                "attributes": Array [
                  Object {
                    "properties": Object {},
                    "type": "model",
                  },
                ],
                "fields": Object {
                  "bar": Object {
                    "attributes": Array [],
                    "isArray": false,
                    "isRequired": false,
                    "name": "bar",
                    "type": "String",
                  },
                  "createdAt": Object {
                    "attributes": Array [],
                    "isArray": false,
                    "isReadOnly": true,
                    "isRequired": false,
                    "name": "createdAt",
                    "type": "AWSDateTime",
                  },
                  "id": Object {
                    "attributes": Array [],
                    "isArray": false,
                    "isRequired": true,
                    "name": "id",
                    "type": "ID",
                  },
                  "name": Object {
                    "attributes": Array [],
                    "isArray": false,
                    "isRequired": false,
                    "name": "name",
                    "type": "String",
                  },
                  "updatedAt": Object {
                    "attributes": Array [],
                    "isArray": false,
                    "isReadOnly": true,
                    "isRequired": false,
                    "name": "updatedAt",
                    "type": "AWSDateTime",
                  },
                },
                "name": "SimpleModel",
                "pluralName": "SimpleModels",
                "syncable": true,
              },
            },
            "nonModels": Object {
              "SimpleNonModelType": Object {
                "fields": Object {
                  "id": Object {
                    "attributes": Array [],
                    "isArray": false,
                    "isRequired": true,
                    "name": "id",
                    "type": "ID",
                  },
                  "names": Object {
                    "attributes": Array [],
                    "isArray": true,
                    "isArrayNullable": true,
                    "isRequired": false,
                    "name": "names",
                    "type": "String",
                  },
                },
                "name": "SimpleNonModelType",
              },
            },
            "version": "5eb36909e822fd40c657cc69b22c919a",
          }
        `);
        expect(generateModelSpy).toHaveBeenCalledTimes(1);
        // called twice because same function is used for model and non model types
        expect(generateNonModelSpy).toHaveBeenCalledTimes(2);
        expect(generateEnumSpy).toHaveBeenCalledTimes(1);
        expect(computeVersionSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('metadata snapshots', () => {
    it('should generate for Javascript', () => {
      const jsVisitor = getVisitor(schema, 'javascript');
      expect(jsVisitor.generate()).toMatchInlineSnapshot(`
        "export const schema = {
            \\"models\\": {
                \\"SimpleModel\\": {
                    \\"name\\": \\"SimpleModel\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"name\\": {
                            \\"name\\": \\"name\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"bar\\": {
                            \\"name\\": \\"bar\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"createdAt\\": {
                            \\"name\\": \\"createdAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        },
                        \\"updatedAt\\": {
                            \\"name\\": \\"updatedAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        }
                    },
                    \\"syncable\\": true,
                    \\"pluralName\\": \\"SimpleModels\\",
                    \\"attributes\\": [
                        {
                            \\"type\\": \\"model\\",
                            \\"properties\\": {}
                        }
                    ]
                }
            },
            \\"enums\\": {
                \\"SimpleEnum\\": {
                    \\"name\\": \\"SimpleEnum\\",
                    \\"values\\": [
                        \\"enumVal1\\",
                        \\"enumVal2\\"
                    ]
                }
            },
            \\"nonModels\\": {
                \\"SimpleNonModelType\\": {
                    \\"name\\": \\"SimpleNonModelType\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"names\\": {
                            \\"name\\": \\"names\\",
                            \\"isArray\\": true,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isArrayNullable\\": true
                        }
                    }
                }
            },
            \\"codegenVersion\\": \\"3.4.4\\",
            \\"version\\": \\"5eb36909e822fd40c657cc69b22c919a\\"
        };"
      `);
    });
    it('should generate for typescript', () => {
      const tsVisitor = getVisitor(schema, 'typescript');
      expect(tsVisitor.generate()).toMatchInlineSnapshot(`
        "import { Schema } from \\"@aws-amplify/datastore\\";

        export const schema: Schema = {
            \\"models\\": {
                \\"SimpleModel\\": {
                    \\"name\\": \\"SimpleModel\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"name\\": {
                            \\"name\\": \\"name\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"bar\\": {
                            \\"name\\": \\"bar\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"createdAt\\": {
                            \\"name\\": \\"createdAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        },
                        \\"updatedAt\\": {
                            \\"name\\": \\"updatedAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        }
                    },
                    \\"syncable\\": true,
                    \\"pluralName\\": \\"SimpleModels\\",
                    \\"attributes\\": [
                        {
                            \\"type\\": \\"model\\",
                            \\"properties\\": {}
                        }
                    ]
                }
            },
            \\"enums\\": {
                \\"SimpleEnum\\": {
                    \\"name\\": \\"SimpleEnum\\",
                    \\"values\\": [
                        \\"enumVal1\\",
                        \\"enumVal2\\"
                    ]
                }
            },
            \\"nonModels\\": {
                \\"SimpleNonModelType\\": {
                    \\"name\\": \\"SimpleNonModelType\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"names\\": {
                            \\"name\\": \\"names\\",
                            \\"isArray\\": true,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isArrayNullable\\": true
                        }
                    }
                }
            },
            \\"codegenVersion\\": \\"3.4.4\\",
            \\"version\\": \\"5eb36909e822fd40c657cc69b22c919a\\"
        };"
      `);
    });

    it('should generate for typeDeclaration', () => {
      const typeDeclaration = getVisitor(schema, 'typeDeclaration');
      expect(typeDeclaration.generate()).toMatchInlineSnapshot(`
        "import { Schema } from '@aws-amplify/datastore';

        export declare const schema: Schema;"
      `);
    });
  });
});

describe('Metadata visitor', () => {
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
  let visitor: AppSyncJSONVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  describe('metadata snapshots', () => {
    it('should generate for Javascript', () => {
      const jsVisitor = getVisitor(schema, 'javascript');
      expect(jsVisitor.generate()).toMatchInlineSnapshot(`
        "export const schema = {
            \\"models\\": {
                \\"SimpleModel\\": {
                    \\"name\\": \\"SimpleModel\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"name\\": {
                            \\"name\\": \\"name\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"bar\\": {
                            \\"name\\": \\"bar\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"createdAt\\": {
                            \\"name\\": \\"createdAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        },
                        \\"updatedAt\\": {
                            \\"name\\": \\"updatedAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        }
                    },
                    \\"syncable\\": true,
                    \\"pluralName\\": \\"SimpleModels\\",
                    \\"attributes\\": [
                        {
                            \\"type\\": \\"model\\",
                            \\"properties\\": {}
                        },
                        {
                            \\"type\\": \\"auth\\",
                            \\"properties\\": {
                                \\"rules\\": [
                                    {
                                        \\"provider\\": \\"userPools\\",
                                        \\"ownerField\\": \\"customOwnerField\\",
                                        \\"allow\\": \\"owner\\",
                                        \\"identityClaim\\": \\"cognito:username\\",
                                        \\"operations\\": [
                                            \\"create\\",
                                            \\"update\\",
                                            \\"delete\\",
                                            \\"read\\"
                                        ]
                                    },
                                    {
                                        \\"provider\\": \\"userPools\\",
                                        \\"ownerField\\": \\"customOwnerField2\\",
                                        \\"allow\\": \\"owner\\",
                                        \\"identityClaim\\": \\"cognito:username\\",
                                        \\"operations\\": [
                                            \\"create\\",
                                            \\"update\\",
                                            \\"delete\\",
                                            \\"read\\"
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            \\"enums\\": {
                \\"SimpleEnum\\": {
                    \\"name\\": \\"SimpleEnum\\",
                    \\"values\\": [
                        \\"enumVal1\\",
                        \\"enumVal2\\"
                    ]
                }
            },
            \\"nonModels\\": {
                \\"SimpleNonModelType\\": {
                    \\"name\\": \\"SimpleNonModelType\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"names\\": {
                            \\"name\\": \\"names\\",
                            \\"isArray\\": true,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isArrayNullable\\": true
                        }
                    }
                }
            },
            \\"codegenVersion\\": \\"3.4.4\\",
            \\"version\\": \\"5eb36909e822fd40c657cc69b22c919a\\"
        };"
      `);
    });
    it('should generate for typescript', () => {
      const tsVisitor = getVisitor(schema, 'typescript');
      expect(tsVisitor.generate()).toMatchInlineSnapshot(`
        "import { Schema } from \\"@aws-amplify/datastore\\";

        export const schema: Schema = {
            \\"models\\": {
                \\"SimpleModel\\": {
                    \\"name\\": \\"SimpleModel\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"name\\": {
                            \\"name\\": \\"name\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"bar\\": {
                            \\"name\\": \\"bar\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"createdAt\\": {
                            \\"name\\": \\"createdAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        },
                        \\"updatedAt\\": {
                            \\"name\\": \\"updatedAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        }
                    },
                    \\"syncable\\": true,
                    \\"pluralName\\": \\"SimpleModels\\",
                    \\"attributes\\": [
                        {
                            \\"type\\": \\"model\\",
                            \\"properties\\": {}
                        },
                        {
                            \\"type\\": \\"auth\\",
                            \\"properties\\": {
                                \\"rules\\": [
                                    {
                                        \\"provider\\": \\"userPools\\",
                                        \\"ownerField\\": \\"customOwnerField\\",
                                        \\"allow\\": \\"owner\\",
                                        \\"identityClaim\\": \\"cognito:username\\",
                                        \\"operations\\": [
                                            \\"create\\",
                                            \\"update\\",
                                            \\"delete\\",
                                            \\"read\\"
                                        ]
                                    },
                                    {
                                        \\"provider\\": \\"userPools\\",
                                        \\"ownerField\\": \\"customOwnerField2\\",
                                        \\"allow\\": \\"owner\\",
                                        \\"identityClaim\\": \\"cognito:username\\",
                                        \\"operations\\": [
                                            \\"create\\",
                                            \\"update\\",
                                            \\"delete\\",
                                            \\"read\\"
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            \\"enums\\": {
                \\"SimpleEnum\\": {
                    \\"name\\": \\"SimpleEnum\\",
                    \\"values\\": [
                        \\"enumVal1\\",
                        \\"enumVal2\\"
                    ]
                }
            },
            \\"nonModels\\": {
                \\"SimpleNonModelType\\": {
                    \\"name\\": \\"SimpleNonModelType\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"names\\": {
                            \\"name\\": \\"names\\",
                            \\"isArray\\": true,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isArrayNullable\\": true
                        }
                    }
                }
            },
            \\"codegenVersion\\": \\"3.4.4\\",
            \\"version\\": \\"5eb36909e822fd40c657cc69b22c919a\\"
        };"
      `);
    });
  });
});

describe('Metadata visitor for auth process in field level', () => {
  const schema = /* GraphQL */ `
    type Employee @model @auth(rules: [{ allow: owner }, { allow: groups, groups: ["Admins"] }]) {
      id: ID!
      name: String!
      address: String!
      ssn: String @auth(rules: [{ allow: owner }])
    }
  `;
  let visitor: AppSyncJSONVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  describe('metadata snapshots', () => {
    it('should generate for Javascript', () => {
      const jsVisitor = getVisitor(schema, 'javascript');
      expect(jsVisitor.generate()).toMatchInlineSnapshot(`
        "export const schema = {
            \\"models\\": {
                \\"Employee\\": {
                    \\"name\\": \\"Employee\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"name\\": {
                            \\"name\\": \\"name\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"address\\": {
                            \\"name\\": \\"address\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"ssn\\": {
                            \\"name\\": \\"ssn\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"createdAt\\": {
                            \\"name\\": \\"createdAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        },
                        \\"updatedAt\\": {
                            \\"name\\": \\"updatedAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        }
                    },
                    \\"syncable\\": true,
                    \\"pluralName\\": \\"Employees\\",
                    \\"attributes\\": [
                        {
                            \\"type\\": \\"model\\",
                            \\"properties\\": {}
                        },
                        {
                            \\"type\\": \\"auth\\",
                            \\"properties\\": {
                                \\"rules\\": [
                                    {
                                        \\"provider\\": \\"userPools\\",
                                        \\"ownerField\\": \\"owner\\",
                                        \\"allow\\": \\"owner\\",
                                        \\"identityClaim\\": \\"cognito:username\\",
                                        \\"operations\\": [
                                            \\"create\\",
                                            \\"update\\",
                                            \\"delete\\",
                                            \\"read\\"
                                        ]
                                    },
                                    {
                                        \\"groupClaim\\": \\"cognito:groups\\",
                                        \\"provider\\": \\"userPools\\",
                                        \\"allow\\": \\"groups\\",
                                        \\"groups\\": [
                                            \\"Admins\\"
                                        ],
                                        \\"operations\\": [
                                            \\"create\\",
                                            \\"update\\",
                                            \\"delete\\",
                                            \\"read\\"
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            \\"enums\\": {},
            \\"nonModels\\": {},
            \\"codegenVersion\\": \\"3.4.4\\",
            \\"version\\": \\"0fffb966ea9b8954eb89d00d74d474ac\\"
        };"
      `);
    });

    it('should generate for typescript', () => {
      const tsVisitor = getVisitor(schema, 'typescript');
      expect(tsVisitor.generate()).toMatchInlineSnapshot(`
        "import { Schema } from \\"@aws-amplify/datastore\\";

        export const schema: Schema = {
            \\"models\\": {
                \\"Employee\\": {
                    \\"name\\": \\"Employee\\",
                    \\"fields\\": {
                        \\"id\\": {
                            \\"name\\": \\"id\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"ID\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"name\\": {
                            \\"name\\": \\"name\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"address\\": {
                            \\"name\\": \\"address\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": true,
                            \\"attributes\\": []
                        },
                        \\"ssn\\": {
                            \\"name\\": \\"ssn\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"String\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": []
                        },
                        \\"createdAt\\": {
                            \\"name\\": \\"createdAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        },
                        \\"updatedAt\\": {
                            \\"name\\": \\"updatedAt\\",
                            \\"isArray\\": false,
                            \\"type\\": \\"AWSDateTime\\",
                            \\"isRequired\\": false,
                            \\"attributes\\": [],
                            \\"isReadOnly\\": true
                        }
                    },
                    \\"syncable\\": true,
                    \\"pluralName\\": \\"Employees\\",
                    \\"attributes\\": [
                        {
                            \\"type\\": \\"model\\",
                            \\"properties\\": {}
                        },
                        {
                            \\"type\\": \\"auth\\",
                            \\"properties\\": {
                                \\"rules\\": [
                                    {
                                        \\"provider\\": \\"userPools\\",
                                        \\"ownerField\\": \\"owner\\",
                                        \\"allow\\": \\"owner\\",
                                        \\"identityClaim\\": \\"cognito:username\\",
                                        \\"operations\\": [
                                            \\"create\\",
                                            \\"update\\",
                                            \\"delete\\",
                                            \\"read\\"
                                        ]
                                    },
                                    {
                                        \\"groupClaim\\": \\"cognito:groups\\",
                                        \\"provider\\": \\"userPools\\",
                                        \\"allow\\": \\"groups\\",
                                        \\"groups\\": [
                                            \\"Admins\\"
                                        ],
                                        \\"operations\\": [
                                            \\"create\\",
                                            \\"update\\",
                                            \\"delete\\",
                                            \\"read\\"
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            \\"enums\\": {},
            \\"nonModels\\": {},
            \\"codegenVersion\\": \\"3.4.4\\",
            \\"version\\": \\"0fffb966ea9b8954eb89d00d74d474ac\\"
        };"
      `);
    });
  });
});

describe('Metadata visitor has one relation', () => {
  const schema = /* GraphQL */ `
    type Project @model {
      id: ID!
      name: String
      teamID: ID!
      team: Team @connection(fields: ["teamID"])
    }
    type Team @model {
      id: ID!
      name: String!
    }
  `;
  let visitor: AppSyncJSONVisitor;
  beforeEach(() => {
    visitor = getVisitor(schema);
  });

  it('should generate for Javascript', () => {
    const jsVisitor = getVisitor(schema, 'javascript');
    expect(jsVisitor.generate()).toMatchInlineSnapshot(`
      "export const schema = {
          \\"models\\": {
              \\"Project\\": {
                  \\"name\\": \\"Project\\",
                  \\"fields\\": {
                      \\"id\\": {
                          \\"name\\": \\"id\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"ID\\",
                          \\"isRequired\\": true,
                          \\"attributes\\": []
                      },
                      \\"name\\": {
                          \\"name\\": \\"name\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"String\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": []
                      },
                      \\"teamID\\": {
                          \\"name\\": \\"teamID\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"ID\\",
                          \\"isRequired\\": true,
                          \\"attributes\\": []
                      },
                      \\"team\\": {
                          \\"name\\": \\"team\\",
                          \\"isArray\\": false,
                          \\"type\\": {
                              \\"model\\": \\"Team\\"
                          },
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"association\\": {
                              \\"connectionType\\": \\"HAS_ONE\\",
                              \\"associatedWith\\": \\"id\\",
                              \\"targetName\\": \\"teamID\\"
                          }
                      },
                      \\"createdAt\\": {
                          \\"name\\": \\"createdAt\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"AWSDateTime\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"isReadOnly\\": true
                      },
                      \\"updatedAt\\": {
                          \\"name\\": \\"updatedAt\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"AWSDateTime\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"isReadOnly\\": true
                      }
                  },
                  \\"syncable\\": true,
                  \\"pluralName\\": \\"Projects\\",
                  \\"attributes\\": [
                      {
                          \\"type\\": \\"model\\",
                          \\"properties\\": {}
                      }
                  ]
              },
              \\"Team\\": {
                  \\"name\\": \\"Team\\",
                  \\"fields\\": {
                      \\"id\\": {
                          \\"name\\": \\"id\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"ID\\",
                          \\"isRequired\\": true,
                          \\"attributes\\": []
                      },
                      \\"name\\": {
                          \\"name\\": \\"name\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"String\\",
                          \\"isRequired\\": true,
                          \\"attributes\\": []
                      },
                      \\"createdAt\\": {
                          \\"name\\": \\"createdAt\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"AWSDateTime\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"isReadOnly\\": true
                      },
                      \\"updatedAt\\": {
                          \\"name\\": \\"updatedAt\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"AWSDateTime\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"isReadOnly\\": true
                      }
                  },
                  \\"syncable\\": true,
                  \\"pluralName\\": \\"Teams\\",
                  \\"attributes\\": [
                      {
                          \\"type\\": \\"model\\",
                          \\"properties\\": {}
                      }
                  ]
              }
          },
          \\"enums\\": {},
          \\"nonModels\\": {},
          \\"codegenVersion\\": \\"3.4.4\\",
          \\"version\\": \\"27c53665371915d89e2b47bb22ec29af\\"
      };"
    `);
  });

  it('should generate for TypeScript', () => {
    const tsVisitor = getVisitor(schema, 'typescript');
    expect(tsVisitor.generate()).toMatchInlineSnapshot(`
      "import { Schema } from \\"@aws-amplify/datastore\\";

      export const schema: Schema = {
          \\"models\\": {
              \\"Project\\": {
                  \\"name\\": \\"Project\\",
                  \\"fields\\": {
                      \\"id\\": {
                          \\"name\\": \\"id\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"ID\\",
                          \\"isRequired\\": true,
                          \\"attributes\\": []
                      },
                      \\"name\\": {
                          \\"name\\": \\"name\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"String\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": []
                      },
                      \\"teamID\\": {
                          \\"name\\": \\"teamID\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"ID\\",
                          \\"isRequired\\": true,
                          \\"attributes\\": []
                      },
                      \\"team\\": {
                          \\"name\\": \\"team\\",
                          \\"isArray\\": false,
                          \\"type\\": {
                              \\"model\\": \\"Team\\"
                          },
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"association\\": {
                              \\"connectionType\\": \\"HAS_ONE\\",
                              \\"associatedWith\\": \\"id\\",
                              \\"targetName\\": \\"teamID\\"
                          }
                      },
                      \\"createdAt\\": {
                          \\"name\\": \\"createdAt\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"AWSDateTime\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"isReadOnly\\": true
                      },
                      \\"updatedAt\\": {
                          \\"name\\": \\"updatedAt\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"AWSDateTime\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"isReadOnly\\": true
                      }
                  },
                  \\"syncable\\": true,
                  \\"pluralName\\": \\"Projects\\",
                  \\"attributes\\": [
                      {
                          \\"type\\": \\"model\\",
                          \\"properties\\": {}
                      }
                  ]
              },
              \\"Team\\": {
                  \\"name\\": \\"Team\\",
                  \\"fields\\": {
                      \\"id\\": {
                          \\"name\\": \\"id\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"ID\\",
                          \\"isRequired\\": true,
                          \\"attributes\\": []
                      },
                      \\"name\\": {
                          \\"name\\": \\"name\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"String\\",
                          \\"isRequired\\": true,
                          \\"attributes\\": []
                      },
                      \\"createdAt\\": {
                          \\"name\\": \\"createdAt\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"AWSDateTime\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"isReadOnly\\": true
                      },
                      \\"updatedAt\\": {
                          \\"name\\": \\"updatedAt\\",
                          \\"isArray\\": false,
                          \\"type\\": \\"AWSDateTime\\",
                          \\"isRequired\\": false,
                          \\"attributes\\": [],
                          \\"isReadOnly\\": true
                      }
                  },
                  \\"syncable\\": true,
                  \\"pluralName\\": \\"Teams\\",
                  \\"attributes\\": [
                      {
                          \\"type\\": \\"model\\",
                          \\"properties\\": {}
                      }
                  ]
              }
          },
          \\"enums\\": {},
          \\"nonModels\\": {},
          \\"codegenVersion\\": \\"3.4.4\\",
          \\"version\\": \\"27c53665371915d89e2b47bb22ec29af\\"
      };"
    `);
  });
});

describe('Metadata visitor for custom PK support', () => {
  describe('relation metadata for hasOne/belongsTo when custom PK is enabled', () => {
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
    it('should generate correct metadata in js', () => {
      expect(
        getVisitor(schema, 'javascript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
    it('should generate correct metadata in ts', () => {
      expect(
        getVisitor(schema, 'typescript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
  });
  describe('HasMany without corresponding belongsTo', () => {
    it('generates for implicit pk', () => {
      const schema = /* GraphQL */ `
        type Project @model {
          name: String!
          teams: [Team] @hasMany
        }
        type Team @model {
          name: String!
        }
      `;
      expect(
        getVisitor(schema, 'javascript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
    it('generates for composite pk', () => {
      const schema = /* GraphQL */ `
        type Project @model {
          id: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
          teams: [Team] @hasMany
        }
        type Team @model {
          name: String!
        }
      `;
      expect(
        getVisitor(schema, 'javascript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
  });
  it('generates with belongsTo', () => {
    const schema = /* GraphQL */ `
      type Project @model {
        id: ID! @primaryKey(sortKeyFields: ["name"])
        name: String!
        teams: [Team] @hasMany
      }
      type Team @model {
        name: String!
        project: Project @belongsTo
      }
    `;
    expect(
      getVisitor(schema, 'javascript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
    ).toMatchSnapshot();
  });
  it('generates with explicit index', () => {
    const schema = /* GraphQL */ `
      type Post @model {
        id: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        comments: [Comment] @hasMany(indexName: "byCommentIds", fields: ["id", "title"])
      }
      type Comment @model {
        id: ID! @primaryKey(sortKeyFields: ["content"])
        content: String!
        thePostId: ID @index(name: "byCommentIds", sortKeyFields: ["thePostTitle"])
        thePostTitle: String
      }
    `;
    expect(
      getVisitor(schema, 'javascript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
    ).toMatchSnapshot();
  });
  describe('relation metadata for hasMany uni when custom PK is enabled', () => {
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
      type Post1 @model {
        postId: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        comments: [Comment1] @hasMany(indexName: "byPost", fields: ["postId", "title"])
      }
      type Comment1 @model {
        commentId: ID! @primaryKey(sortKeyFields: ["content"])
        content: String!
        postId: ID @index(name: "byPost", sortKeyFields: ["postTitle"])
        postTitle: String
      }
    `;
    it('should generate correct metadata in js', () => {
      expect(
        getVisitor(schema, 'javascript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
    it('should generate correct metadata in ts', () => {
      expect(
        getVisitor(schema, 'typescript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
  });
  describe('relation metadata for hasMany & belongsTo when custom PK is enabled', () => {
    const schema = /* GraphQL */ `
      type Post @model {
        customPostId: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        comments: [Comment] @hasMany
      }
      type Comment @model {
        customCommentId: ID! @primaryKey(sortKeyFields: ["content"])
        content: String!
        post: Post @belongsTo
      }
      type Post1 @model {
        postId: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        comments: [Comment1] @hasMany(indexName: "byPost", fields: ["postId", "title"])
      }
      type Comment1 @model {
        commentId: ID! @primaryKey(sortKeyFields: ["content"])
        content: String!
        post: Post1 @belongsTo(fields: ["postId", "postTitle"])
        postId: ID @index(name: "byPost", sortKeyFields: ["postTitle"])
        postTitle: String
      }
    `;
    it('should generate correct metadata in js', () => {
      expect(
        getVisitor(schema, 'javascript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
    it('should generate correct metadata in ts', () => {
      expect(
        getVisitor(schema, 'typescript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
  });
  describe('relation metadata for manyToMany when custom PK is enabled', () => {
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
    it('should generate correct metadata in js', () => {
      expect(
        getVisitor(schema, 'javascript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
    it('should generate correct metadata in ts', () => {
      expect(
        getVisitor(schema, 'typescript', { respectPrimaryKeyAttributesOnConnectionField: true, transformerVersion: 2 }).generate(),
      ).toMatchSnapshot();
    });
  });
});
