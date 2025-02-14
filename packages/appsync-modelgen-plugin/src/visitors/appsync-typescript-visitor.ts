import { indentMultiline } from '@graphql-codegen/visitor-plugin-common';
import { TypeScriptDeclarationBlock } from '../languages/typescript-declaration-block';
import {
  AppSyncModelVisitor,
  CodeGenEnum,
  CodeGenField,
  CodeGenInterface,
  CodeGenModel,
  CodeGenPrimaryKeyType,
  CodeGenUnion,
  ParsedAppSyncModelConfig,
  RawAppSyncModelConfig,
} from './appsync-visitor';

export interface RawAppSyncModelTypeScriptConfig extends RawAppSyncModelConfig {}
export interface ParsedAppSyncModelTypeScriptConfig extends ParsedAppSyncModelConfig {
  isDeclaration: boolean;
}

export class AppSyncModelTypeScriptVisitor<
  TRawConfig extends RawAppSyncModelTypeScriptConfig = RawAppSyncModelTypeScriptConfig,
  TPluginConfig extends ParsedAppSyncModelTypeScriptConfig = ParsedAppSyncModelTypeScriptConfig
> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
  protected SCALAR_TYPE_MAP: { [key: string]: string } = {
    String: 'string',
    Int: 'number',
    Float: 'number',
    Boolean: 'boolean',
    ID: 'string',
  };

  protected IMPORT_STATEMENTS = [
    'import { ModelInit, MutableModel, PersistentModelConstructor } from "@aws-amplify/datastore";',
    'import { initSchema } from "@aws-amplify/datastore";',
    '',
    'import { schema } from "./schema";',
  ];

  protected BASE_DATASTORE_IMPORT = new Set(['ModelInit', 'MutableModel']);
  protected TS_IGNORE_DATASTORE_IMPORT = new Set(['LazyLoading', 'LazyLoadingDisabled']);

  protected MODEL_META_FIELD_NAME = '__modelMeta__';

  generate(): string {
    // TODO: Remove us, leaving in to be explicit on why this flag is here.
    const shouldUseModelNameFieldInHasManyAndBelongsTo = false;
    // This flag is going to be used to tight-trigger on JS implementations only.
    const shouldImputeKeyForUniDirectionalHasMany = true;
    const shouldUseFieldsInAssociatedWithInHasOne = true;
    this.processDirectives(
      shouldUseModelNameFieldInHasManyAndBelongsTo,
      shouldImputeKeyForUniDirectionalHasMany,
      shouldUseFieldsInAssociatedWithInHasOne,
    );
    const imports = this.generateImports();
    const enumDeclarations = Object.values(this.enumMap)
      .map(enumObj => this.generateEnumDeclarations(enumObj))
      .join('\n\n');

    const modelDeclarations = Object.values(this.modelMap)
      .map(typeObj => this.generateModelDeclaration(typeObj))
      .join('\n\n');

    const nonModelDeclarations = Object.values(this.nonModelMap)
      .map(typeObj => this.generateModelDeclaration(typeObj, true, false))
      .join('\n\n');

    const unionDeclarations = Object.values(this.unionMap)
      .map(unionObj => this.generateUnionDeclaration(unionObj))
      .join('\n\n');

    const interfaceDeclarations = Object.values(this.interfaceMap)
      .map(interfaceObj => this.generateInterfaceDeclaration(interfaceObj))
      .join('\n\n');

    const modelInitialization = this.generateModelInitialization([...Object.values(this.modelMap), ...Object.values(this.nonModelMap)]);

    const modelExports = this.generateExports(Object.values(this.modelMap));

    return [imports, enumDeclarations, unionDeclarations, interfaceDeclarations, modelDeclarations, nonModelDeclarations, modelInitialization, modelExports].join('\n\n');
  }

  protected generateImports(): string {
    return this.IMPORT_STATEMENTS.join('\n');
  }

  protected generateEnumDeclarations(enumObj: CodeGenEnum, exportEnum: boolean = false): string {
    const enumDeclarations = new TypeScriptDeclarationBlock()
      .asKind('enum')
      .withName(this.getEnumName(enumObj))
      .withEnumValues(enumObj.values)
      .export(exportEnum);

    return enumDeclarations.string;
  }

  /**
   * Generate model meta data type. Old implementation before using custom primary key.
   * @param modelObj model object
   * @returns model meta data type string
   */
  protected generateModelMetaData(modelObj: CodeGenModel): string {
    const modelName = this.generateModelTypeDeclarationName(modelObj);
    const modelDeclarations = new TypeScriptDeclarationBlock()
      .asKind('type')
      .withName(`${modelName}MetaData`)
      .export(false);

    let readOnlyFieldNames: string[] = [];

    modelObj.fields.forEach((field: CodeGenField) => {
      if (field.isReadOnly) {
        readOnlyFieldNames.push(`'${field.name}'`);
      }
    });
    if (readOnlyFieldNames.length) {
      modelDeclarations.addProperty('readOnlyFields', readOnlyFieldNames.join(' | '));
      return modelDeclarations.string;
    }
    //If no read only fields return empty string
    return '';
  }

  /**
   * Generate model meta data type casting for __modelMeta__. New implementation after incorporating custome primary key.
   * @param modelObj model object
   * @returns model meta data type string
   */
  protected generateModelMetaDataType(modelObj: CodeGenModel): string {
    let readOnlyFieldNames: string[] = [];
    modelObj.fields.forEach((field: CodeGenField) => {
      if (field.isReadOnly) {
        readOnlyFieldNames.push(`'${field.name}'`);
      }
    });
    let modelMetaFields: string[] = [];
    //Custom primary key meta field
    modelMetaFields.push(`identifier: ${this.constructIdentifier(modelObj)};`);
    //Read only meta field
    if (readOnlyFieldNames.length) {
      modelMetaFields.push(`readOnlyFields: ${readOnlyFieldNames.join(' | ')};`);
    }
    const result = ['{', indentMultiline(modelMetaFields.join('\n')), '}'];
    return result.join('\n');
  }

  protected constructIdentifier(modelObj: CodeGenModel): string {
    const primaryKeyField = modelObj.fields.find(f => f.primaryKeyInfo)!;
    const { primaryKeyType, sortKeyFields } = primaryKeyField.primaryKeyInfo!;
    switch (primaryKeyType) {
      case CodeGenPrimaryKeyType.ManagedId:
        this.BASE_DATASTORE_IMPORT.add('ManagedIdentifier');
        return `ManagedIdentifier<${modelObj.name}, '${primaryKeyField.name}'>`;
      case CodeGenPrimaryKeyType.OptionallyManagedId:
        this.BASE_DATASTORE_IMPORT.add('OptionallyManagedIdentifier');
        return `OptionallyManagedIdentifier<${modelObj.name}, '${primaryKeyField.name}'>`;
      case CodeGenPrimaryKeyType.CustomId:
        const identifierFields: string[] = [primaryKeyField.name, ...sortKeyFields.map(f => f.name)].filter(f => f);
        const identifierFieldsStr =
          identifierFields.length === 1 ? `'${identifierFields[0]}'` : `[${identifierFields.map(fieldStr => `'${fieldStr}'`).join(', ')}]`;
        if (identifierFields.length > 1) {
          this.BASE_DATASTORE_IMPORT.add('CompositeIdentifier');
          return `CompositeIdentifier<${modelObj.name}, ${identifierFieldsStr}>`;
        }
        this.BASE_DATASTORE_IMPORT.add('CustomIdentifier');
        return `CustomIdentifier<${modelObj.name}, ${identifierFieldsStr}>`;
    }
  }

  /**
   *
   * @param modelObj CodeGenModel object
   * @param isDeclaration flag indicates if the class needs to be exported
   */
  protected generateModelDeclaration(modelObj: CodeGenModel, isDeclaration: boolean = true, isModelType: boolean = true): string {
    const modelName = this.generateModelTypeDeclarationName(modelObj);
    const eagerModelDeclaration = new TypeScriptDeclarationBlock().asKind('type').withName(`Eager${modelName}`);
    const lazyModelDeclaration = new TypeScriptDeclarationBlock().asKind('type').withName(`Lazy${modelName}`);

    let readOnlyFieldNames: string[] = [];
    let modelMetaDataFormatted: string | undefined;
    let modelMetaDataDeclaration: string = '';
    //Add new model meta field when custom primary key is enabled
    if (isModelType && this.isCustomPKEnabled()) {
      //Add new model meta import
      this.BASE_DATASTORE_IMPORT.add(this.MODEL_META_FIELD_NAME);
      const modelMetaDataType = this.generateModelMetaDataType(modelObj);
      eagerModelDeclaration.addProperty(`[${this.MODEL_META_FIELD_NAME}]`, modelMetaDataType, undefined, 'DEFAULT', {
        readonly: true,
        optional: false,
      });
      lazyModelDeclaration.addProperty(`[${this.MODEL_META_FIELD_NAME}]`, modelMetaDataType, undefined, 'DEFAULT', {
        readonly: true,
        optional: false,
      });
    }
    modelObj.fields.forEach((field: CodeGenField) => {
      const fieldName = this.getFieldName(field);
      eagerModelDeclaration.addProperty(fieldName, this.getNativeType(field), undefined, 'DEFAULT', {
        readonly: true,
        optional: field.isList ? field.isListNullable : field.isNullable,
      });
      lazyModelDeclaration.addProperty(fieldName, this.getNativeType(field, { lazy: true }), undefined, 'DEFAULT', {
        readonly: true,
        optional: !this.isModelType(field) && (field.isList ? field.isListNullable : field.isNullable),
      });
      if (field.isReadOnly) {
        readOnlyFieldNames.push(`'${field.name}'`);
      }
    });
    //Use old model meta when custom primary key is disabled
    if (isModelType && !this.isCustomPKEnabled()) {
      modelMetaDataFormatted = `, ${modelName}MetaData`;
      modelMetaDataDeclaration = readOnlyFieldNames.length > 0 ? modelMetaDataFormatted : '';
    }
    const conditionalType = `export declare type ${modelName} = LazyLoading extends LazyLoadingDisabled ? Eager${modelName} : Lazy${modelName}`;

    const modelVariableBase = `export declare const ${modelName}: (new (init: ModelInit<${modelName}${modelMetaDataDeclaration}>) => ${modelName})`;
    const modelVariable =
      modelVariableBase +
      (Object.values(this.modelMap).includes(modelObj)
        ? ` & {\n  copyOf(source: ${modelName}, mutator: (draft: MutableModel<${modelName}${modelMetaDataDeclaration}>) => MutableModel<${modelName}${modelMetaDataDeclaration}> | void): ${modelName};\n}`
        : '');

    return [eagerModelDeclaration.string, lazyModelDeclaration.string, conditionalType, modelVariable].join('\n\n');
  }

  protected generateInterfaceDeclaration(interfaceObj: CodeGenInterface): string {
    const declaration = new TypeScriptDeclarationBlock()
      .asKind('interface')
      .withName(interfaceObj.name)
      .export(true);

    interfaceObj.fields.forEach(field => {
      declaration.addProperty(field.name, this.getNativeType(field), undefined, 'DEFAULT', {
        readonly: true,
        optional: field.isList ? field.isListNullable : field.isNullable,
      });
    });

    return declaration.string;
  }

  protected generateUnionDeclaration(unionObj: CodeGenUnion): string {
    return `export declare type ${unionObj.name} = ${unionObj.typeNames.join(' | ')};`;
  }

  /**
   * Generate model Declaration using classCreator
   * @param model
   */
  protected generateModelInitialization(models: CodeGenModel[], includeTypeInfo: boolean = true): string {
    if (models.length === 0) {
      return '';
    }
    const modelClasses = models
      .map(model => [this.generateModelImportName(model), this.generateModelImportAlias(model)])
      .map(([importName, aliasName]) => {
        return importName === aliasName ? importName : `${importName}: ${aliasName}`;
      });

    const initializationResult = ['const', '{', modelClasses.join(', '), '}', '=', 'initSchema(schema)'];
    if (includeTypeInfo) {
      const typeInfo = models
        .map(model => {
          return [this.generateModelImportName(model), this.generateModelTypeDeclarationName(model)];
        })
        .map(([importName, modelDeclarationName]) => `${importName}: PersistentModelConstructor<${modelDeclarationName}>;`);
      const typeInfoStr = ['{', indentMultiline(typeInfo.join('\n')), '}'].join('\n');
      initializationResult.push('as', typeInfoStr);
    }
    return `${initializationResult.join(' ')};`;
  }

  protected generateExports(types: (CodeGenModel | CodeGenEnum | CodeGenInterface | CodeGenUnion)[]): string {
    const exportStr = types
      .map(type => {
        if (type.type === 'model') {
          const modelClassName = this.generateModelImportAlias(type);
          const exportClassName = this.getModelName(type);
          return modelClassName !== exportClassName ? `${modelClassName} as ${exportClassName}` : modelClassName;
        }
        return type.name;
      })
      .join(',\n');
    return ['export {', indentMultiline(exportStr), '};'].join('\n');
  }

  /**
   * Generate the type declaration class name of Model
   * @param model CodeGenModel
   */
  protected generateModelTypeDeclarationName(model: CodeGenModel): string {
    return `${this.getModelName(model)}Model`;
  }

  /**
   * Generate alias for the model used when importing it from initSchema
   * @param model
   */
  protected generateModelImportAlias(model: CodeGenModel): string {
    return this.getModelName(model);
  }

  /**
   * Generate the import name for model from initSchema
   * @param model Model object
   *
   */
  protected generateModelImportName(model: CodeGenModel): string {
    return this.getModelName(model);
  }

  /**
   * Generate the class name for export
   * @param model
   */
  protected generateModelExportName(model: CodeGenModel): string {
    return this.getModelName(model);
  }

  protected getListType(typeStr: string, field: CodeGenField): string {
    let type: string = typeStr;
    if (field.isNullable) {
      type = `(${type} | null)`;
    }
    return `${type}[]`;
  }

  protected getNativeType(field: CodeGenField, options?: { lazy: boolean }): string {
    const typeName = field.type;
    const isNullable = field.isList ? field.isListNullable : field.isNullable;
    const nullableTypeUnion = isNullable ? ' | null' : '';
    if (this.isModelType(field)) {
      const modelType = this.modelMap[typeName];
      const typeNameStr = this.generateModelTypeDeclarationName(modelType);

      if (options?.lazy) {
        if (field.isList) {
          this.TS_IGNORE_DATASTORE_IMPORT.add('AsyncCollection');
        } else {
          this.TS_IGNORE_DATASTORE_IMPORT.add('AsyncItem');
        }
        return `${field.isList ? 'AsyncCollection' : 'AsyncItem'}<${typeNameStr}${!field.isList && isNullable ? ' | undefined' : ''}>`;
      }

      return (field.isList ? this.getListType(typeNameStr, field) : typeNameStr) + nullableTypeUnion;
    }

    let nativeType = super.getNativeType(field);

    if (this.isEnumType(field)) {
      const baseEnumType = `keyof typeof ${this.getEnumName(this.enumMap[typeName])}`;
      const enumType = field.isList ? `Array<${baseEnumType}>` : baseEnumType;
      nativeType = `${nativeType} | ${enumType}`;
    }

    nativeType = nativeType + nullableTypeUnion;

    return nativeType;
  }
}
