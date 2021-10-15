import {
  BaseVisitor,
  buildScalars,
  DEFAULT_SCALARS,
  NormalizedScalarsMap,
  ParsedConfig,
  RawConfig,
} from '@graphql-codegen/visitor-plugin-common';
import { constantCase, pascalCase } from 'change-case';
import { plural } from 'pluralize';
import crypto from 'crypto';
import {
  DefinitionNode,
  DirectiveNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  GraphQLNamedType,
  GraphQLSchema,
  Kind,
  ObjectTypeDefinitionNode,
  parse,
  valueFromASTUntyped,
} from 'graphql';
import { addFieldToModel, removeFieldFromModel } from '../utils/fieldUtils';
import { getTypeInfo } from '../utils/get-type-info';
import { CodeGenConnectionType, CodeGenFieldConnection, processConnections } from '../utils/process-connections';
import { sortFields } from '../utils/sort';
import { printWarning } from '../utils/warn';
import { processAuthDirective } from '../utils/process-auth';
import { processConnectionsV2 } from '../utils/process-connections-v2';

export enum CodeGenGenerateEnum {
  metadata = 'metadata',
  code = 'code',
  loader = 'loader',
}
export interface RawAppSyncModelConfig extends RawConfig {
  /**
   * @name target
   * @type string
   * @description required, the language target for generated code
   *
   * @example
   * ```yml
   * generates:
   * Models:
   * config:
   *    target: 'swift'
   *  plugins:
   *    - amplify-codegen-appsync-model-plugin
   * ```
   * target: 'swift'| 'javascript'| 'typescript' | 'java' | 'metadata' | 'dart'
   */
  target: string;

  /**
   * @name modelName
   * @type string
   * @description optional, name of the model to which the code needs to be generated. Used
   * when target is set to swift, java and dart
   * @default undefined, this will generate code for all the models
   *
   * generates:
   * Models:
   * config:
   *    target: 'swift'
   *    model: Todo
   *  plugins:
   *    - amplify-codegen-appsync-model-plugin
   * ```
   */
  selectedType?: string;

  /**
   * @name generate
   * @type string
   * @description optional, informs what needs to be generated.
   * type - Generate class or struct
   * metadata - Generate metadata used by swift and JS/TS
   * loader - Class/Struct loader used by swift or Java
   * @default code, this will generate non meta data code
   *
   * generates:
   * Models:
   * config:
   *    target: 'swift'
   *    model: Todo
   *    generate: 'metadata'
   *  plugins:
   *    - amplify-codegen-appsync-model-plugin
   * ```
   */
  generate?: CodeGenGenerateEnum;
  /**
   * @name directives
   * @type string
   * @descriptions optional string which includes directive definition and types used by directives. The types defined in here won't make it to output
   */
  directives?: string;
  /**
   * @name isTimestampFieldsAdded
   * @type boolean
   * @descriptions optional boolean which adds the read-only timestamp fields or not
   */
  isTimestampFieldsAdded?: boolean;
  /**
   * @name handleListNullabilityTransparently
   * @type boolean
   * @descriptions optional boolean which generates the list types to respect the nullability as defined in the schema
   */
   handleListNullabilityTransparently?: boolean;
  /**
   * @name usePipelinedTransformer
   * @type boolean
   * @descriptions optional boolean which determines whether to use the new pipelined GraphQL transformer
   */
  usePipelinedTransformer?: boolean;
}

// Todo: need to figure out how to share config
export interface ParsedAppSyncModelConfig extends ParsedConfig {
  selectedType?: string;
  generate?: CodeGenGenerateEnum;
  target?: string;
  isTimestampFieldsAdded?: boolean;
  handleListNullabilityTransparently?: boolean;
  usePipelinedTransformer?: boolean;
}
export type CodeGenArgumentsMap = Record<string, any>;

export type CodeGenDirective = {
  name: string;
  arguments: CodeGenArgumentsMap;
};

export type CodeGenFieldDirective = CodeGenDirective & {
  fieldName: string;
}

export type CodeGenDirectives = CodeGenDirective[];
export type CodeGenField = TypeInfo & {
  name: string;
  directives: CodeGenDirectives;
  connectionInfo?: CodeGenFieldConnection;
  isReadOnly?: boolean;
};
export type TypeInfo = {
  type: string;
  isList: boolean;
  isNullable: boolean;
  isListNullable?: boolean;
  baseType?: GraphQLNamedType | null;
};
export type CodeGenModel = {
  name: string;
  type: 'model';
  directives: CodeGenDirectives;
  fields: CodeGenField[];
};

export type CodeGenEnum = {
  name: string;
  type: 'enum';
  values: CodeGenEnumValueMap;
};
export type CodeGenModelMap = {
  [modelName: string]: CodeGenModel;
};

export type CodeGenEnumValueMap = { [enumConvertedName: string]: string };

export type CodeGenEnumMap = Record<string, CodeGenEnum>;

// Used to simplify processing of manyToMany into composing directives hasMany and belongsTo
type ManyToManyContext = {
  model: CodeGenModel;
  field: CodeGenField;
  directive: CodeGenDirective;
};

const DEFAULT_CREATED_TIME = 'createdAt';
const DEFAULT_UPDATED_TIME = 'updatedAt';

export class AppSyncModelVisitor<
  TRawConfig extends RawAppSyncModelConfig = RawAppSyncModelConfig,
  TPluginConfig extends ParsedAppSyncModelConfig = ParsedAppSyncModelConfig
> extends BaseVisitor<TRawConfig, TPluginConfig> {
  protected READ_ONLY_FIELDS = ['id'];
  protected SCALAR_TYPE_MAP: Record<string, string> = {};
  protected modelMap: CodeGenModelMap = {};
  protected nonModelMap: CodeGenModelMap = {};
  protected enumMap: CodeGenEnumMap = {};
  protected typesToSkip: string[] = [];
  constructor(
    protected _schema: GraphQLSchema,
    rawConfig: TRawConfig,
    additionalConfig: Partial<TPluginConfig>,
    defaultScalars: NormalizedScalarsMap = DEFAULT_SCALARS,
  ) {
    super(rawConfig, {
      ...additionalConfig,
      scalars: buildScalars(_schema, rawConfig.scalars || '', defaultScalars),
      target: rawConfig.target,
      isTimestampFieldsAdded: rawConfig.isTimestampFieldsAdded,
      handleListNullabilityTransparently: rawConfig.handleListNullabilityTransparently,
      usePipelinedTransformer: rawConfig.usePipelinedTransformer,
    });

    const typesUsedInDirectives: string[] = [];
    if (rawConfig.directives) {
      const directiveSchema = parse(rawConfig.directives);
      directiveSchema.definitions.forEach((definition: DefinitionNode) => {
        if (definition.kind === Kind.ENUM_TYPE_DEFINITION || definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
          typesUsedInDirectives.push(definition.name.value);
        }
      });
    }

    this.typesToSkip = [this._schema.getQueryType(), this._schema.getMutationType(), this._schema.getSubscriptionType()]
      .filter(t => t)
      .map(t => (t && t.name) || '');
    this.typesToSkip.push(...typesUsedInDirectives);
  }

  ObjectTypeDefinition(node: ObjectTypeDefinitionNode, index?: string | number, parent?: any) {
    if (this.typesToSkip.includes(node.name.value)) {
      // Skip Query, mutation and subscription type
      return;
    }
    const directives = this.getDirectives(node.directives);
    const fields = (node.fields as unknown) as CodeGenField[];
    const modelDirective = directives.find(directive => directive.name === 'model');
    if (modelDirective) {
      // Todo: Add validation for each directives
      // @model would add the id: ID! if missing or throw error if there is an id of different type
      // @key check if fields listed in directives are present in the Object
      //
      const model: CodeGenModel = {
        name: node.name.value,
        type: 'model',
        directives,
        fields,
      };
      this.ensureIdField(model);
      this.addTimestampFields(model, modelDirective);
      this.sortFields(model);
      this.modelMap[node.name.value] = model;
    } else {
      const nonModel: CodeGenModel = {
        name: node.name.value,
        type: 'model',
        directives,
        fields,
      };
      this.nonModelMap[node.name.value] = nonModel;
    }
  }

  FieldDefinition(node: FieldDefinitionNode): CodeGenField {
    const directive = this.getDirectives(node.directives);
    return {
      name: node.name.value,
      directives: directive,
      ...getTypeInfo(node.type, this._schema),
    };
  }

  EnumTypeDefinition(node: EnumTypeDefinitionNode): void {
    if (this.typesToSkip.includes(node.name.value)) {
      // Skip Query, mutation and subscription type and additional
      return;
    }
    const enumName = this.getEnumName(node.name.value);
    const values = node.values
      ? node.values.reduce((acc, val) => {
          acc[this.getEnumValue(val.name.value)] = val.name.value;
          return acc;
        }, {} as any)
      : {};
    this.enumMap[node.name.value] = {
      name: enumName,
      type: 'enum',
      values,
    };
  }
  processDirectives() {
    if (this.config.usePipelinedTransformer) {
      this.processConnectionDirectivesV2()
    }
    else {
      this.processConnectionDirective();
    }
    this.processAuthDirectives();
  }
  generate(): string {
    this.processDirectives();
    return '';
  }

  private getDirectives(directives: readonly DirectiveNode[] | undefined): CodeGenDirectives {
    if (directives) {
      return directives.map(d => ({
        name: d.name.value,
        arguments: this.getDirectiveArguments(d),
      }));
    }
    return [];
  }

  private getDirectiveArguments(directive: DirectiveNode): CodeGenArgumentsMap {
    const directiveArguments: CodeGenArgumentsMap = {};
    if (directive.arguments) {
      directive.arguments.reduce((acc, arg) => {
        directiveArguments[arg.name.value] = valueFromASTUntyped(arg.value);
        return directiveArguments;
      }, directiveArguments);
    }
    return directiveArguments;
  }

  /**
   * Returns an object that contains all the models that need codegen to be run
   *
   */
  protected getSelectedModels(): CodeGenModelMap {
    if (this._parsedConfig.selectedType) {
      const selectedModel = this.modelMap[this._parsedConfig.selectedType];
      return selectedModel ? { [this._parsedConfig.selectedType]: selectedModel } : {};
    }
    return this.modelMap;
  }

  protected getSelectedNonModels(): CodeGenModelMap {
    if (this._parsedConfig.selectedType) {
      const selectedModel = this.nonModelMap[this._parsedConfig.selectedType];
      return selectedModel ? { [this._parsedConfig.selectedType]: selectedModel } : {};
    }
    return this.nonModelMap;
  }

  protected getSelectedEnums(): CodeGenEnumMap {
    if (this._parsedConfig.selectedType) {
      const selectedModel = this.enumMap[this._parsedConfig.selectedType];
      return selectedModel ? { [this._parsedConfig.selectedType]: selectedModel } : {};
    }
    return this.enumMap;
  }
  protected selectedTypeIsEnum() {
    if (this._parsedConfig && this._parsedConfig.selectedType) {
      if (this._parsedConfig.selectedType in this.enumMap) {
        return true;
      }
    }
    return false;
  }

  protected selectedTypeIsNonModel() {
    if (this._parsedConfig && this._parsedConfig.selectedType) {
      if (this._parsedConfig.selectedType in this.nonModelMap) {
        return true;
      }
    }
    return false;
  }

  /**
   * returns the Java type or class name
   * @param field
   */
  protected getNativeType(field: CodeGenField): string {
    const typeName = field.type;
    let typeNameStr: string = '';
    if (typeName in this.scalars) {
      typeNameStr = this.scalars[typeName];
    } else if (this.isModelType(field)) {
      typeNameStr = this.getModelName(this.modelMap[typeName]);
    } else if (this.isEnumType(field)) {
      typeNameStr = this.getEnumName(this.enumMap[typeName]);
    } else if (this.isNonModelType(field)) {
      typeNameStr = this.getNonModelName(this.nonModelMap[typeName]);
    } else {
      throw new Error(`Unknown type ${typeName} for field ${field.name}. Did you forget to add the @model directive`);
    }

    return field.isList ? this.getListType(typeNameStr, field) : typeNameStr;
  }

  protected getListType(typeStr: string, field: CodeGenField): string {
    return `List<${typeStr}>`;
  }

  protected getFieldName(field: CodeGenField): string {
    return field.name;
  }

  protected getEnumName(enumField: CodeGenEnum | string): string {
    if (typeof enumField === 'string') {
      return pascalCase(enumField);
    }
    return pascalCase(enumField.name);
  }

  protected getModelName(model: CodeGenModel) {
    return model.name;
  }

  protected getNonModelName(model: CodeGenModel) {
    return model.name;
  }

  protected getEnumValue(value: string): string {
    return constantCase(value);
  }

  protected isEnumType(field: CodeGenField): boolean {
    const typeName = field.type;
    return typeName in this.enumMap;
  }

  protected isModelType(field: CodeGenField): boolean {
    const typeName = field.type;
    return typeName in this.modelMap;
  }

  protected isNonModelType(field: CodeGenField): boolean {
    const typeName = field.type;
    return typeName in this.nonModelMap;
  }

  protected computeVersion(): string {
    // Sort types
    const typeArr: any[] = [];
    Object.values({ ...this.modelMap, ...this.nonModelMap }).forEach((obj: CodeGenModel) => {
      // include only key directive as we don't care about others for versioning
      const directives = this.config.usePipelinedTransformer ? obj.directives.filter(dir => dir.name === 'primaryKey' || dir.name === 'index') : obj.directives.filter(dir => dir.name === 'key');
      const fields = obj.fields
        .map((field: CodeGenField) => {
          // include only connection field and type
          const fieldDirectives = this.config.usePipelinedTransformer ? field.directives.filter(field => field.name === 'hasOne' || field.name === 'belongsTo' || field.name === 'hasMany' || field.name === 'manyToMany') : field.directives.filter(field => field.name === 'connection');
          return {
            name: field.name,
            directives: fieldDirectives,
            type: field.type,
            isNullable: field.isNullable,
            isList: field.isList,
            isListNullable: field.isListNullable,
          };
        })
        .sort((a, b) => sortFields(a, b));
      typeArr.push({
        name: obj.name,
        directives,
        fields,
      });
    });
    typeArr.sort(sortFields);
    return crypto
      .createHash('MD5')
      .update(JSON.stringify(typeArr))
      .digest()
      .toString('hex');
  }

  /**
   * Sort the fields to ensure id is always the first field
   * @param model
   */
  protected sortFields(model: CodeGenModel) {
    // sort has different behavior in node 10 and 11. Using reduce instead
    model.fields = model.fields.reduce((acc, field) => {
      if (field.name === 'id') {
        acc.unshift(field);
      } else {
        acc.push(field);
      }
      return acc;
    }, [] as CodeGenField[]);
  }

  protected ensureIdField(model: CodeGenModel) {
    const idField = model.fields.find(field => field.name === 'id');
    if (idField) {
      if (idField.type !== 'ID') {
        throw new Error(`id field on ${model.name} should be of type ID`);
      }
      // Make id field required
      idField.isNullable = false;
    } else {
      model.fields.splice(0, 0, {
        name: 'id',
        type: 'ID',
        isNullable: false,
        isList: false,
        directives: [],
      });
    }
  }

  protected processConnectionDirective(): void {
    Object.values(this.modelMap).forEach(model => {
      model.fields.forEach(field => {
        const connectionInfo = processConnections(field, model, this.modelMap);
        if (connectionInfo) {
          if (connectionInfo.kind === CodeGenConnectionType.HAS_MANY || connectionInfo.kind === CodeGenConnectionType.HAS_ONE) {
            // Need to update the other side of the connection even if there is no connection directive
            addFieldToModel(connectionInfo.connectedModel, connectionInfo.associatedWith);
          } else if (connectionInfo.targetName !== 'id') {
            // Need to remove the field that is targetName
            removeFieldFromModel(model, connectionInfo.targetName);
          }
          field.connectionInfo = connectionInfo;
        }
      });

      // Should remove the fields that are of Model type and are not connected to ensure there are no phantom input fields
      const modelTypes = Object.values(this.modelMap).map(model => model.name);
      model.fields = model.fields.filter(field => {
        const fieldType = field.type;
        const connectionInfo = field.connectionInfo;
        if (modelTypes.includes(fieldType) && connectionInfo === undefined) {
          printWarning(
            `Model ${model.name} has field ${field.name} of type ${field.type} but its not connected. Add a @connection directive if want to connect them.`,
          );
          return false;
        }
        return true;
      });
    });
  }

  protected generateIntermediateModel(firstModel: CodeGenModel, secondModel: CodeGenModel, firstField: CodeGenField, secondField: CodeGenField, relationName: string) {
    const firstModelKeyFieldName = `${firstModel.name.toLowerCase()}ID`;
    const secondModelKeyFieldName = `${secondModel.name.toLowerCase()}ID`;
    let intermediateModel: CodeGenModel = {
      name: relationName,
      type: 'model',
      directives: [{ name: 'model', arguments: {} }],
      fields: [
        {
          type: 'ID',
          isNullable: false,
          isList: false,
          name: 'id',
          directives: []
        },
        {
          type: 'ID',
          isNullable: false,
          isList: false,
          name: firstModelKeyFieldName,
          directives: [{ name: 'index', arguments: { name: 'by' + firstModel.name, sortKeyFields: [secondModelKeyFieldName] } }]
        },
        {
          type: 'ID',
          isNullable: false,
          isList: false,
          name: secondModelKeyFieldName,
          directives: [{ name: 'index', arguments: { name: 'by' + secondModel.name, sortKeyFields: [firstModelKeyFieldName] } }]
        },
        {
          type: firstModel.name,
          isNullable: false,
          isList: false,
          name: firstModel.name.toLowerCase(),
          directives: [{ name: 'belongsTo', arguments: { fields: [firstModelKeyFieldName] } }]
        },
        {
          type: secondModel.name,
          isNullable: false,
          isList: false,
          name: secondModel.name.toLowerCase(),
          directives: [{ name: 'belongsTo', arguments: { fields: [secondModelKeyFieldName] } }]
        }
      ]
    }

    return intermediateModel;
  }

  protected determinePrimaryKeyFieldname(model: CodeGenModel): string {
    let primaryKeyFieldName = 'id';
    model.fields.forEach(field => {
      field.directives.forEach(dir => {
        if (dir.name === 'primaryKey') {
          primaryKeyFieldName = field.name;
        }
      });
    });
    return primaryKeyFieldName;
  }

  protected convertManyToManyDirectives(contexts: ManyToManyContext[]): void {
    // Responsible for stripping the manyToMany directives off provided models and replacing them with hasMany, after intermediate models are added
    contexts.forEach(context => {
      let directiveIndex = context.field.directives.indexOf(context.directive, 0);
      if (directiveIndex > -1) {
        context.field.directives.splice(directiveIndex, 1);
        context.field.type = context.directive.arguments.relationName;
        context.field.directives.push({
          name: 'hasMany',
          arguments: { indexName: `by${context.model.name}`, fields: [this.determinePrimaryKeyFieldname(context.model)] }
        });
      }
      else {
        throw new Error("manyToMany directive not found on manyToMany field...");
      }
    });
  }

  protected processManyToManyDirectives(): void {
    // Data pattern: key is the name of the model, value is the field that has a manyToMany directive on it
    let manyDirectiveMap: Map<string, Array<ManyToManyContext>> = new Map<string, Array<ManyToManyContext>>();
    Object.values(this.modelMap).forEach(model => {
      model.fields.forEach(field => {
        field.directives.forEach(dir => {
          if(dir.name === 'manyToMany') {
            let relationName = dir.arguments.relationName;
            let existingRelation = manyDirectiveMap.get(relationName);
            if (existingRelation) {
              existingRelation.push({ model: model, field: field, directive: dir });
            }
            else {
              manyDirectiveMap.set(relationName, [{ model: model, field: field, directive: dir }]);
            }
          }
        });
      });
    });

    // Validate that each manyToMany directive has a single matching directive, pairs only
    manyDirectiveMap.forEach((value: ManyToManyContext[], key: string) => {
      if (value.length != 2) {
        throw new Error(`Error for relation: '${value[0].directive.arguments.relationName}', there should be two matching manyToMany directives and found: ${value.length}`);
      }
      let intermediateModel = this.generateIntermediateModel(value[0].model, value[1].model, value[0].field, value[1].field, value[0].directive.arguments.relationName);
      const modelDirective = intermediateModel.directives.find(directive => directive.name === 'model');
      if(modelDirective) {
        this.ensureIdField(intermediateModel);
        this.addTimestampFields(intermediateModel, modelDirective);
        this.sortFields(intermediateModel);
      }

      this.modelMap[intermediateModel.name] = intermediateModel;
      this.convertManyToManyDirectives(value);
    });
  }

  protected processConnectionDirectivesV2(): void {
    this.processManyToManyDirectives();

    Object.values(this.modelMap).forEach(model => {
      model.fields.forEach(field => {
        const connectionInfo = processConnectionsV2(field, model, this.modelMap);
        if (connectionInfo) {
          if (connectionInfo.kind === CodeGenConnectionType.HAS_MANY || connectionInfo.kind === CodeGenConnectionType.HAS_ONE) {
            // Need to update the other side of the connection even if there is no connection directive
            addFieldToModel(connectionInfo.connectedModel, connectionInfo.associatedWith);
          } else if (connectionInfo.targetName !== 'id') {
            // Need to remove the field that is targetName
            removeFieldFromModel(model, connectionInfo.targetName);
          }
          field.connectionInfo = connectionInfo;
        }
      });

      // Should remove the fields that are of Model type and are not connected to ensure there are no phantom input fields
      const modelTypes = Object.values(this.modelMap).map(model => model.name);
      model.fields = model.fields.filter(field => {
        const fieldType = field.type;
        const connectionInfo = field.connectionInfo;
        if (modelTypes.includes(fieldType) && connectionInfo === undefined) {
          printWarning(
            `Model ${model.name} has field ${field.name} of type ${field.type} but its not connected. Add a @connection directive if want to connect them.`,
          );
          return false;
        }
        return true;
      });
    });
  }

  protected processAuthDirectives(): void {
    //model @auth process
    Object.values(this.modelMap).forEach(model => {
      const filteredDirectives = model.directives.filter(d => d.name !== 'auth');
      const authDirectives = processAuthDirective(model.directives);
      model.directives = [...filteredDirectives, ...authDirectives];

      //field @auth process
      model.fields.forEach(field => {
        const nonAuthDirectives = field.directives.filter(d => d.name != 'auth');
        const authDirectives = processAuthDirective(field.directives);
        field.directives = [...nonAuthDirectives, ...authDirectives];
      });
    });
  }

  protected pluralizeModelName(model: CodeGenModel): string {
    return plural(model.name);
  }

  /**
   * Add timestamp fields createdAt, updatedAt(or equivalent fields) to model fields
   * @param model
   */
  protected addTimestampFields(model: CodeGenModel, directive: CodeGenDirective): void {
    if (!this.config.isTimestampFieldsAdded) {
      return;
    }
    if (directive.name !== 'model') {
      return;
    }
    const timestamps = directive.arguments.timestamps;
    const createdAtField: CodeGenField = {
      name: timestamps?.createdAt || DEFAULT_CREATED_TIME,
      directives: [],
      type: 'AWSDateTime',
      isList: false,
      isNullable: true,
      isReadOnly: true,
    };
    const updatedAtField: CodeGenField = {
      name: timestamps?.updatedAt || DEFAULT_UPDATED_TIME,
      directives: [],
      type: 'AWSDateTime',
      isList: false,
      isNullable: true,
      isReadOnly: true,
    };
    //If the field is defined explicitly, the default value will not override
    addFieldToModel(model, createdAtField);
    addFieldToModel(model, updatedAtField);
  }

  /**
   * Check if the given field is nullable or required
   * @param field
   */
   protected isRequiredField(field: CodeGenField): boolean | undefined {
    return !(this.config.handleListNullabilityTransparently ? (field.isList ? field.isListNullable : field.isNullable) : field.isNullable);
   }

  get models() {
    return this.modelMap;
  }

  get enums() {
    return this.enumMap;
  }
  get nonModels() {
    return this.nonModelMap;
  }
}
