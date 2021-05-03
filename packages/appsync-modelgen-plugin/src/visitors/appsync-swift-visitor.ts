import { indent, indentMultiline, NormalizedScalarsMap } from '@graphql-codegen/visitor-plugin-common';
import { camelCase } from 'change-case';
import { GraphQLSchema } from 'graphql';
import { lowerCaseFirst } from 'lower-case-first';
import { schemaTypeMap } from '../configs/swift-config';
import { SwiftDeclarationBlock, escapeKeywords, ListType } from '../languages/swift-declaration-block';
import { CodeGenConnectionType } from '../utils/process-connections';
import {
  AppSyncModelVisitor,
  CodeGenField,
  CodeGenGenerateEnum,
  CodeGenModel,
  RawAppSyncModelConfig,
  ParsedAppSyncModelConfig,
} from './appsync-visitor';
import { AuthDirective, AuthStrategy } from '../utils/process-auth';
import { printWarning } from '../utils/warn';
import { SWIFT_SCALAR_MAP } from '../scalars';

export interface RawAppSyncModelSwiftConfig extends RawAppSyncModelConfig {
  /**
   * @name directives
   * @type boolean
   * @descriptions optional boolean, if true emits the provider value of @auth directives
   */
   emitAuthProvider?: boolean;

   /**
   * @name directives
   * @type boolean
   * @description optional, defines if custom indexes defined by @key directive should be generated.
   */
  generateIndexRules?: boolean;
}

export interface ParsedAppSyncModelSwiftConfig extends ParsedAppSyncModelConfig {
  emitAuthProvider?: boolean;
  generateIndexRules?: boolean;
}

export class AppSyncSwiftVisitor<
  TRawConfig extends RawAppSyncModelSwiftConfig = RawAppSyncModelSwiftConfig,
  TPluginConfig extends ParsedAppSyncModelSwiftConfig = ParsedAppSyncModelSwiftConfig
> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
  protected modelExtensionImports: string[] = ['import Amplify', 'import Foundation'];
  protected imports: string[] = ['import Amplify', 'import Foundation'];

  constructor(
    schema: GraphQLSchema,
    rawConfig: TRawConfig,
    additionalConfig: Partial<TPluginConfig>,
    defaultScalars: NormalizedScalarsMap = SWIFT_SCALAR_MAP,
  ) {
    super(schema, rawConfig, additionalConfig, defaultScalars);
    this._parsedConfig.emitAuthProvider = rawConfig.emitAuthProvider || false;
    this._parsedConfig.generateIndexRules = rawConfig.generateIndexRules || false;
  }

  generate(): string {
    this.processDirectives();
    const code = [`// swiftlint:disable all`];
    if (this._parsedConfig.generate === CodeGenGenerateEnum.metadata) {
      code.push(this.generateSchema());
    } else if (this._parsedConfig.generate === CodeGenGenerateEnum.loader) {
      code.push(this.generateClassLoader());
    } else if (this.selectedTypeIsEnum()) {
      code.push(this.generateEnums());
    } else if (this.selectedTypeIsNonModel()) {
      code.push(this.generateNonModelType());
    } else {
      code.push(this.generateStruct());
    }
    return code.join('\n');
  }
  generateStruct(): string {
    let result: string[] = [...this.imports, ''];
    Object.entries(this.getSelectedModels()).forEach(([name, obj]) => {
      const structBlock: SwiftDeclarationBlock = new SwiftDeclarationBlock()
        .withName(this.getModelName(obj))
        .access('public')
        .withProtocols(['Model']);
      Object.entries(obj.fields).forEach(([fieldName, field]) => {
        const fieldType = this.getNativeType(field);
        const isVariable = field.name !== 'id';
        const listType: ListType = field.connectionInfo ? ListType.LIST : ListType.ARRAY;
        structBlock.addProperty(this.getFieldName(field), fieldType, undefined, 'public', {
          optional: !this.isFieldRequired(field),
          isList: field.isList,
          variable: isVariable,
          isEnum: this.isEnumType(field),
          listType: field.isList ? listType : undefined,
          isListNullable: field.isListNullable
        });
      });
      const initParams: CodeGenField[] = this.getWritableFields(obj);
      const initImpl: string = `self.init(${indentMultiline(
        obj.fields
          .map(field => {
            const fieldName = escapeKeywords(this.getFieldName(field));
            return field.isReadOnly ? `${fieldName}: nil` : `${fieldName}: ${fieldName}`;
          })
          .join(',\n'),
      ).trim()})`;
      if (this.config.isTimestampFieldsAdded) {
        //public constructor
        structBlock.addClassMethod(
          'init',
          null,
          initImpl,
          initParams.map(field => {
            const listType: ListType = field.connectionInfo ? ListType.LIST : ListType.ARRAY;
            return {
              name: this.getFieldName(field),
              type: this.getNativeType(field),
              value: field.name === 'id' ? 'UUID().uuidString' : undefined,
              flags: {
                optional: field.isNullable,
                isList: field.isList,
                isEnum: this.isEnumType(field),
                listType: field.isList ? listType : undefined,
              },
            };
          }),
          'public',
          {},
        );
        //internal constructor
        structBlock.addClassMethod(
          'init',
          null,
          this.getInitBody(obj.fields),
          obj.fields.map(field => {
            const listType: ListType = field.connectionInfo ? ListType.LIST : ListType.ARRAY;
            return {
              name: this.getFieldName(field),
              type: this.getNativeType(field),
              value: field.name === 'id' ? 'UUID().uuidString' : undefined,
              flags: {
                optional: field.isNullable,
                isList: field.isList,
                isEnum: this.isEnumType(field),
                listType: field.isList ? listType : undefined,
              },
            };
          }),
          'internal',
          {},
        );
      } else {
        //old constructor
        structBlock.addClassMethod(
          'init',
          null,
          this.getInitBody(obj.fields),
          obj.fields.map(field => {
            const listType: ListType = field.connectionInfo ? ListType.LIST : ListType.ARRAY;
            return {
              name: this.getFieldName(field),
              type: this.getNativeType(field),
              value: field.name === 'id' ? 'UUID().uuidString' : undefined,
              flags: {
                optional: field.isNullable,
                isList: field.isList,
                isEnum: this.isEnumType(field),
                listType: field.isList ? listType : undefined,
              },
            };
          }),
          'public',
          {},
        );
      }
      result.push(structBlock.string);
    });
    return result.join('\n');
  }
  generateEnums(): string {
    const result: string[] = [...this.imports, ''];
    Object.entries(this.getSelectedEnums()).forEach(([name, enumValue]) => {
      const enumDeclaration = new SwiftDeclarationBlock()
        .asKind('enum')
        .access('public')
        .withProtocols(['String', 'EnumPersistable'])
        .withName(this.getEnumName(enumValue));

      Object.entries(enumValue.values).forEach(([name, value]) => {
        enumDeclaration.addEnumValue(name, value);
      });

      result.push(enumDeclaration.string);
    });
    return result.join('\n');
  }
  generateNonModelType(): string {
    let result: string[] = [...this.imports, ''];
    Object.entries(this.getSelectedNonModels()).forEach(([name, obj]) => {
      const structBlock: SwiftDeclarationBlock = new SwiftDeclarationBlock()
        .withName(this.getModelName(obj))
        .access('public')
        .withProtocols(['Embeddable']);
      Object.values(obj.fields).forEach(field => {
        const fieldType = this.getNativeType(field);
        structBlock.addProperty(this.getFieldName(field), fieldType, undefined, 'DEFAULT', {
          optional: !this.isFieldRequired(field),
          isList: field.isList,
          variable: true,
          isEnum: this.isEnumType(field),
          listType: field.isList ? ListType.ARRAY : undefined,
          isListNullable: field.isListNullable
        });
      });
      result.push(structBlock.string);
    });
    return result.join('\n');
  }

  generateSchema(): string {
    let result: string[] = [...this.modelExtensionImports, ''];

    Object.values(this.getSelectedModels())
      .filter(m => m.type === 'model')
      .forEach(model => {
        const schemaDeclarations = new SwiftDeclarationBlock().asKind('extension').withName(this.getModelName(model));

        this.generateCodingKeys(this.getModelName(model), model, schemaDeclarations),
          this.generateModelSchema(this.getModelName(model), model, schemaDeclarations);

        result.push(schemaDeclarations.string);
      });

    Object.values(this.getSelectedNonModels()).forEach(model => {
      const schemaDeclarations = new SwiftDeclarationBlock().asKind('extension').withName(this.getNonModelName(model));

      this.generateCodingKeys(this.getNonModelName(model), model, schemaDeclarations),
        this.generateModelSchema(this.getNonModelName(model), model, schemaDeclarations);

      result.push(schemaDeclarations.string);
    });
    return result.join('\n');
  }

  generateCodingKeys(name: string, model: CodeGenModel, extensionDeclaration: SwiftDeclarationBlock): void {
    const codingKeyEnum: SwiftDeclarationBlock = new SwiftDeclarationBlock()
      .asKind('enum')
      .access('public')
      .withName('CodingKeys')
      .withProtocols(['String', 'ModelKey'])
      .withComment('MARK: - CodingKeys');

    // AddEnums.name
    model.fields.forEach(field => codingKeyEnum.addEnumValue(this.getFieldName(field), field.name));
    extensionDeclaration.appendBlock(codingKeyEnum.string);

    // expose keys
    extensionDeclaration.addProperty('keys', '', 'CodingKeys.self', 'public', {
      static: true,
      variable: false,
    });
  }

  generateModelSchema(name: string, model: CodeGenModel, extensionDeclaration: SwiftDeclarationBlock): void {
    const keysName = lowerCaseFirst(model.name);
    const fields = model.fields.map(field => this.generateFieldSchema(field, keysName));
    const authRules = this.generateAuthRules(model);
    const keyDirectives = this.config.generateIndexRules ? this.generateKeyRules(model) : [];
    const closure = [
      '{ model in',
      `let ${keysName} = ${this.getModelName(model)}.keys`,
      '',
      ...(authRules.length ? [`model.authRules = ${authRules}`, ''] : []),
      `model.pluralName = "${this.pluralizeModelName(model)}"`,
      '',
      ...(keyDirectives.length ? ['model.attributes(', indentMultiline(keyDirectives.join(',\n')), ')', ''] : []),
      'model.fields(',
      indentMultiline(fields.join(',\n')),
      ')',
      '}',
    ].join('\n');
    extensionDeclaration.addProperty(
      'schema',
      '',
      `defineSchema ${indentMultiline(closure).trim()}`,
      'public',
      { static: true, variable: false },
      ' MARK: - ModelSchema',
    );
  }

  protected generateClassLoader(): string {
    const structList = Object.values(this.modelMap).map(typeObj => `${this.getModelName(typeObj)}.self`);

    const result: string[] = [...this.modelExtensionImports, ''];

    const classDeclaration = new SwiftDeclarationBlock()
      .access('public')
      .withName('AmplifyModels')
      .asKind('class')
      .withProtocols(['AmplifyModelRegistration'])
      .final()
      .withComment('Contains the set of classes that conforms to the `Model` protocol.');

    classDeclaration.addProperty('version', 'String', `"${this.computeVersion()}"`, 'public', {});
    const body = structList.map(modelClass => `ModelRegistry.register(modelType: ${modelClass})`).join('\n');
    classDeclaration.addClassMethod(
      'registerModels',
      null,
      body,
      [{ type: 'ModelRegistry.Type', name: 'registry', flags: {}, value: undefined }],
      'public',
      {},
    );
    result.push(classDeclaration.string);

    return result.join('\n');
  }

  private getInitBody(fields: CodeGenField[]): string {
    let result = fields.map(field => {
      const fieldName = escapeKeywords(this.getFieldName(field));
      return indent(`self.${fieldName} = ${fieldName}`);
    });

    return result.join('\n');
  }
  protected getListType(typeStr: string, field: CodeGenField): string {
    return `${typeStr}`;
  }

  private generateFieldSchema(field: CodeGenField, modelKeysName: string): string {
    if (field.type === 'ID' && field.name === 'id') {
      return `.id()`;
    }
    let ofType;
    let isReadOnly: string = '';
    const isEnumType = this.isEnumType(field);
    const isModelType = this.isModelType(field);
    const isNonModelType = this.isNonModelType(field);
    const name = `${modelKeysName}.${this.getFieldName(field)}`;
    const typeName = this.getSwiftModelTypeName(field);
    const { connectionInfo } = field;
    let isOptionalField = field.isList ? field.isListNullable : field.isNullable
    if (field.connectionInfo && field.connectionInfo.kind === CodeGenConnectionType.HAS_MANY) {
      isOptionalField = true;
    }
    const isRequired = !isOptionalField ? '.required' : '.optional';
    // connected field
    if (connectionInfo) {
      if (connectionInfo.kind === CodeGenConnectionType.HAS_MANY) {
        return `.hasMany(${name}, is: ${isRequired}, ofType: ${typeName}, associatedWith: ${this.getModelName(
          connectionInfo.connectedModel,
        )}.keys.${this.getFieldName(connectionInfo.associatedWith)})`;
      }
      if (connectionInfo.kind === CodeGenConnectionType.HAS_ONE) {
        return `.hasOne(${name}, is: ${isRequired}, ofType: ${typeName}, associatedWith: ${this.getModelName(
          connectionInfo.connectedModel,
        )}.keys.${this.getFieldName(connectionInfo.associatedWith)}, targetName: "${connectionInfo.targetName}")`;
      }
      if (connectionInfo.kind === CodeGenConnectionType.BELONGS_TO) {
        return `.belongsTo(${name}, is: ${isRequired}, ofType: ${typeName}, targetName: "${connectionInfo.targetName}")`;
      }
    }

    if (field.isList) {
      if (isModelType) {
        ofType = `.collection(of: ${this.getSwiftModelTypeName(field)})`;
      } else {
        ofType = `.embeddedCollection(of: ${this.getSwiftModelTypeName(field)})`;
      }
    } else {
      if (isEnumType) {
        ofType = `.enum(type: ${typeName})`;
      } else if (isModelType) {
        ofType = `.model(${typeName})`;
      } else if (isNonModelType) {
        ofType = `.embedded(type: ${typeName})`;
      } else {
        ofType = typeName;
      }
    }

    //read-only fields
    if (field.isReadOnly) {
      isReadOnly = 'isReadOnly: true';
    }

    const args = [`${name}`, `is: ${isRequired}`, isReadOnly, `ofType: ${ofType}`].filter(arg => arg).join(', ');
    return `.field(${args})`;
  }

  private getSwiftModelTypeName(field: CodeGenField) {
    if (this.isEnumType(field)) {
      return `${this.getEnumName(field.type)}.self`;
    }
    if (this.isModelType(field)) {
      return `${this.getModelName(this.modelMap[field.type])}.self`;
    }
    if (this.isNonModelType(field)) {
      return `${this.getNonModelName(this.nonModelMap[field.type])}.self`;
    }
    if (field.type in schemaTypeMap) {
      if (field.isList) {
        return `${this.getNativeType(field)}.self`;
      }
      return schemaTypeMap[field.type];
    }
    // TODO: investigate if returning string is acceptable or should throw an exception
    return '.string';
  }

  protected getEnumValue(value: string): string {
    return camelCase(value);
  }

  /**
   * checks if a field is required or optional field
   * There is a special case for fields which have hasMany connection
   * Swift needs to unwrap the object and when its possible that a hasMany field may not
   * be in the graphql selection set which means its null/undefined. To handle this
   * the struct needs the field to be optional even when the field is required in GraphQL schema
   * @param field field
   */
  protected isFieldRequired(field: CodeGenField): boolean {
    if (field.connectionInfo && field.connectionInfo.kind === CodeGenConnectionType.HAS_MANY) {
      return false;
    }
    return !field.isNullable;
  }

  protected generateKeyRules(model: CodeGenModel): string[] {
    const keyDirectives = model.directives
      .filter((directive) => directive.name === 'key')
      .map((directive) => {
        const name = directive.arguments.name ? `"${directive.arguments.name}"` : 'nil';
        const fields: string = directive.arguments.fields.map((field: string) => `"${field}"`).join(', ');
        return `.index(fields: [${fields}], name: ${name})`;
      });

      return keyDirectives
  }

  protected generateAuthRules(model: CodeGenModel): string {
    const authDirectives: AuthDirective[] = (model.directives.filter(d => d.name === 'auth') as any) as AuthDirective[];
    const rules: string[] = [];
    authDirectives.forEach(directive => {
      directive.arguments?.rules.forEach(rule => {
        const authRule = [];
        switch (rule.allow) {
          case AuthStrategy.owner:
            authRule.push('allow: .owner');
            authRule.push(`ownerField: "${rule.ownerField}"`);
            authRule.push(`identityClaim: "${rule.identityClaim}"`);
            break;
          case AuthStrategy.private:
            authRule.push('allow: .private');
            break;
          case AuthStrategy.public:
              authRule.push('allow: .public');
              break;
          case AuthStrategy.groups:
            authRule.push('allow: .groups');
            authRule.push(`groupClaim: "${rule.groupClaim}"`);
            if (rule.groups) {
              authRule.push(`groups: [${rule.groups?.map(group => `"${group}"`).join(', ')}]`);
            } else {
              authRule.push(`groupsField: "${rule.groupField}"`);
            }
            break;
          default:
            printWarning(`Model ${model.name} has auth with authStrategy ${rule.allow} of which is not yet supported in DataStore.`);
            return;
        }
        if (rule.provider != null && this.config.emitAuthProvider) {
          authRule.push(`provider: .${rule.provider}`);
        }
        authRule.push(`operations: [${rule.operations?.map(op => `.${op}`).join(', ')}]`);
        rules.push(`rule(${authRule.join(', ')})`);
      });
    });
    if (rules.length) {
      return ['[', `${indentMultiline(rules.join(',\n'))}`, ']'].join('\n');
    }
    return '';
  }

  protected getWritableFields(model: CodeGenModel): CodeGenField[] {
    return model.fields.filter(f => !f.isReadOnly);
  }
}
