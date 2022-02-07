import { indentMultiline } from '@graphql-codegen/visitor-plugin-common';
import { TypeScriptDeclarationBlock } from '../languages/typescript-declaration-block';
import {
  AppSyncModelVisitor,
  CodeGenEnum,
  CodeGenField,
  CodeGenModel,
  CodeGenPrimaryKeyType,
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

  protected BASE_DATASTORE_IMPORT = new Set(['ModelInit', 'MutableModel', 'PersistentModelConstructor', '__modelMeta__']);

  protected MODEL_META_FIELD_NAME = '__modelMeta__';

  generate(): string {
    // TODO: Remove us, leaving in to be explicit on why this flag is here.
    const shouldUseModelNameFieldInHasManyAndBelongsTo = false;
    this.processDirectives(shouldUseModelNameFieldInHasManyAndBelongsTo);
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

    const modelInitialization = this.generateModelInitialization([...Object.values(this.modelMap), ...Object.values(this.nonModelMap)]);

    const modelExports = this.generateExports(Object.values(this.modelMap));

    return [imports, enumDeclarations, modelDeclarations, nonModelDeclarations, modelInitialization, modelExports].join('\n\n');
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

  protected generateModelMetaData(modelObj: CodeGenModel): string {
    const modelName = this.generateModelTypeDeclarationName(modelObj);
    const modelDeclarations = new TypeScriptDeclarationBlock()
      .asKind('type')
      .withName(`${modelName}MetaData`)
      .export(false);

    modelDeclarations.addProperty('identifier', this.constructIdentifier(modelObj));

    const isTimestampFeatureFlagEnabled = this.config.isTimestampFieldsAdded;
    let readOnlyFieldNames: string[] = [];

    modelObj.fields.forEach((field: CodeGenField) => {
      if (isTimestampFeatureFlagEnabled && field.isReadOnly) {
        readOnlyFieldNames.push(`'${field.name}'`);
      }
    });
    if (readOnlyFieldNames.length) {
      modelDeclarations.addProperty('readOnlyFields', readOnlyFieldNames.join(' | '));
    }

    return modelDeclarations.string;
  }

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
    const result = [
      '{',
      indentMultiline(modelMetaFields.join('\n')),
      '}'
    ];
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
        this.BASE_DATASTORE_IMPORT.add('CustomIdentifier');
        const identifierFields: string[] = [primaryKeyField.name, ...sortKeyFields].filter(f => f);
        const identifierFieldsStr = identifierFields.length === 1 ? `'${identifierFields[0]}'` : `[${identifierFields.map(fieldStr => `'${fieldStr}'`).join(', ')}]`
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
    const modelDeclarations = new TypeScriptDeclarationBlock()
      .asKind('class')
      .withFlag({ isDeclaration })
      .withName(modelName)
      .export(true);

    //Add model meta field
    if (isModelType) {
      modelDeclarations.addProperty(`[${this.MODEL_META_FIELD_NAME}]`, this.generateModelMetaDataType(modelObj), undefined, 'DEFAULT', {
        readonly: true,
        optional: false
      })
    }
    modelObj.fields.forEach((field: CodeGenField) => {
      modelDeclarations.addProperty(this.getFieldName(field), this.getNativeType(field), undefined, 'DEFAULT', {
        readonly: true,
        optional: field.isList ? field.isListNullable : field.isNullable,
      });
    });

    // Constructor
    modelDeclarations.addClassMethod(
      'constructor',
      null,
      null,
      [
        {
          name: 'init',
          type: `ModelInit<${modelName}>`,
        },
      ],
      'DEFAULT',
      {},
    );

    // copyOf method
    if (Object.values(this.modelMap).includes(modelObj)) {
      modelDeclarations.addClassMethod(
        'copyOf',
        modelName,
        null,
        [
          {
            name: 'source',
            type: modelName,
          },
          {
            name: 'mutator',
            type: `(draft: MutableModel<${modelName}>) => MutableModel<${modelName}> | void`,
          },
        ],
        'DEFAULT',
        { static: true },
      );
    }
    return modelDeclarations.string;
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

  protected generateExports(modelsOrEnum: (CodeGenModel | CodeGenEnum)[]): string {
    const exportStr = modelsOrEnum
      .map(model => {
        if (model.type === 'model') {
          const modelClassName = this.generateModelImportAlias(model);
          const exportClassName = this.getModelName(model);
          return modelClassName !== exportClassName ? `${modelClassName} as ${exportClassName}` : modelClassName;
        }
        return model.name;
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

  protected getNativeType(field: CodeGenField): string {
    const typeName = field.type;
    const isNullable = field.isList ? field.isListNullable : field.isNullable;
    const nullableTypeUnion = isNullable ? ' | null' : '';
    if (this.isModelType(field)) {
      const modelType = this.modelMap[typeName];
      const typeNameStr = this.generateModelTypeDeclarationName(modelType);
      return (field.isList ? this.getListType(typeNameStr, field) : typeNameStr) + nullableTypeUnion;
    }

    let nativeType = super.getNativeType(field);

    if (this.isEnumType(field)) {
      nativeType = `${nativeType} | keyof typeof ${this.getEnumName(this.enumMap[typeName])}`;
    }

    nativeType = nativeType + nullableTypeUnion;

    return nativeType;
  }
}
