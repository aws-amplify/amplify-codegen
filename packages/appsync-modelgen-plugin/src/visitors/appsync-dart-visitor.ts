import {
  AppSyncModelVisitor,
  ParsedAppSyncModelConfig,
  RawAppSyncModelConfig,
  CodeGenModel,
  CodeGenField,
  CodeGenGenerateEnum,
} from './appsync-visitor';
import { DartDeclarationBlock } from '../languages/dart-declaration-block';
import { CodeGenConnectionType } from '../utils/process-connections';
import { indent, indentMultiline, NormalizedScalarsMap } from '@graphql-codegen/visitor-plugin-common';
import { AuthDirective, AuthStrategy } from '../utils/process-auth';
import { printWarning } from '../utils/warn';
import {
  LOADER_CLASS_NAME,
  BASE_IMPORT_PACKAGES,
  COLLECTION_PACKAGE,
  DART_RESERVED_KEYWORDS,
  typeToEnumMap,
  IGNORE_FOR_FILE,
} from '../configs/dart-config';
import dartStyle from 'dart-style';
import { generateLicense } from '../utils/generateLicense';
import { lowerCaseFirst } from 'lower-case-first';
import { GraphQLSchema } from 'graphql';
import { DART_SCALAR_MAP } from '../scalars';

const FORCE_CAST_EXCEPTION = `throw new DataStoreException(
  DataStoreExceptionMessages.codeGenRequiredFieldForceCastExceptionMessage,
  recoverySuggestion:
    DataStoreExceptionMessages.codeGenRequiredFieldForceCastRecoverySuggestion,
  underlyingException: e.toString()
);`

export interface RawAppSyncModelDartConfig extends RawAppSyncModelConfig {
  /**
   * @name directives
   * @type boolean
   * @descriptions optional boolean, if true emits the provider value of @auth directives
   */
  emitAuthProvider?: boolean;

  /**
   * @name directives
   * @type boolean
   * @description optional, defines if dart model files are generated with null safety feature.
   */
  enableDartNullSafety?: boolean;
  /**
   * @name directives
   * @type boolean
   * @description optional, defines if dart model files are generated with custom type feature.
   */
   enableDartNonModelGeneration?: boolean;
}

export interface ParsedAppSyncModelDartConfig extends ParsedAppSyncModelConfig {
  emitAuthProvider?: boolean;
  enableDartNullSafety: boolean;
  enableDartNonModelGeneration: boolean;
}
export class AppSyncModelDartVisitor<
  TRawConfig extends RawAppSyncModelDartConfig = RawAppSyncModelDartConfig,
  TPluginConfig extends ParsedAppSyncModelDartConfig = ParsedAppSyncModelDartConfig
> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
  constructor(
    schema: GraphQLSchema,
    rawConfig: TRawConfig,
    additionalConfig: Partial<TPluginConfig>,
    defaultScalars: NormalizedScalarsMap = DART_SCALAR_MAP,
  ) {
    super(schema, rawConfig, additionalConfig, defaultScalars);
    this._parsedConfig.emitAuthProvider = rawConfig.emitAuthProvider || false;
    this._parsedConfig.enableDartNullSafety = rawConfig.enableDartNullSafety || false;
    this._parsedConfig.enableDartNonModelGeneration = rawConfig.enableDartNonModelGeneration || false;
  }

  generate(): string {
    this.processDirectives();
    this.validateReservedKeywords();
    if (this._parsedConfig.generate === CodeGenGenerateEnum.loader) {
      return this.generateClassLoader();
    } else if (this.selectedTypeIsEnum()) {
      return this.generateEnums();
    } else if (this.selectedTypeIsNonModel()) {
      return this.generateNonModelClasses();
    }
    return this.generateModelClasses();
  }

  protected validateReservedKeywords(): void {
    Object.entries({ ...this.models, ...this.nonModels }).forEach(([name, obj]) => {
      if (DART_RESERVED_KEYWORDS.includes(name)) {
        throw new Error(`Type name '${name}' is a reserved word in dart. Please use a non-reserved name instead.`);
      }
      obj.fields.forEach(field => {
        const fieldName = this.getFieldName(field);
        if (DART_RESERVED_KEYWORDS.includes(fieldName)) {
          throw new Error(
            `Field name '${fieldName}' in type '${name}' is a reserved word in dart. Please use a non-reserved name instead.`,
          );
        }
      });
    });
    Object.entries(this.enums).forEach(([name, enumVal]) => {
      if (DART_RESERVED_KEYWORDS.includes(name)) {
        throw new Error(`Enum name '${name}' is a reserved word in dart. Please use a non-reserved name instead.`);
      }
      Object.values(enumVal.values).forEach(val => {
        if (DART_RESERVED_KEYWORDS.includes(val)) {
          throw new Error(`Enum value '${val}' in enum '${name}' is a reserved word in dart. Please use a non-reserved name instead.`);
        }
      });
    });
  }

  protected generateClassLoader(): string {
    const result: string[] = [];
    const modelNames: string[] = Object.keys(this.modelMap).sort();
    const nonModelNames: string[] = Object.keys(this.nonModelMap).sort();
    const exportClasses: string[] = [...modelNames, ...Object.keys(this.enumMap), ...Object.keys(this.nonModelMap)].sort();
    //License
    const license = generateLicense();
    result.push(license);
    //Ignore for file
    result.push(IGNORE_FOR_FILE);
    //Packages for import
    const packageImports: string[] = ['package:amplify_datastore_plugin_interface/amplify_datastore_plugin_interface', ...modelNames, ...nonModelNames];
    //Packages for export
    const packageExports: string[] = [...exportClasses];
    //Block body
    const classDeclarationBlock = new DartDeclarationBlock()
      .asKind('class')
      .withName(LOADER_CLASS_NAME)
      .implements([`${LOADER_CLASS_NAME}Interface`])
      .addClassMember('version', 'String', `"${this.computeVersion()}"`, undefined, ['override'])
      .addClassMember('modelSchemas', 'List<ModelSchema>', `[${modelNames.map(m => `${m}.schema`).join(', ')}]`, undefined, ['override'])
      .addClassMember('_instance', LOADER_CLASS_NAME, `${LOADER_CLASS_NAME}()`, { static: true, final: true })
      .addClassMethod('get instance', LOADER_CLASS_NAME, [], ' => _instance;', { isBlock: false, isGetter: true, static: true });
    if (this.config.enableDartNonModelGeneration) {
      classDeclarationBlock.addClassMember('customTypeSchemas', 'List<ModelSchema>', `[${nonModelNames.map(nm => `${nm}.schema`).join(', ')}]`, undefined, ['override'])
    }
      //getModelTypeByModelName
    if (modelNames.length) {
      const getModelTypeImplStr = [
        'switch(modelName) {',
        ...modelNames.map(modelName => [indent(`case "${modelName}":`), indent(`return ${modelName}.classType;`, 2)].join('\n')),
        indent('default:'),
        indent('throw Exception("Failed to find model in model provider for model name: " + modelName);', 2),
        '}',
      ].join('\n');
      classDeclarationBlock.addClassMethod(
        'getModelTypeByModelName',
        'ModelType',
        [{ type: 'String', name: 'modelName' }],
        getModelTypeImplStr,
      );
    }

    result.push(packageImports.map(p => `import '${p}.dart';`).join('\n'));
    result.push(packageExports.map(p => `export '${p}.dart';`).join('\n'));
    result.push(classDeclarationBlock.string);
    return this.formatDartCode(result.join('\n\n'));
  }

  protected generateEnums(): string {
    const result: string[] = [];
    //License
    const license = generateLicense();
    result.push(license);
    //Ignore for file
    result.push(IGNORE_FOR_FILE);
    //Enum
    Object.entries(this.getSelectedEnums()).forEach(([name, enumVal]) => {
      const body = Object.values(enumVal.values).join(',\n');
      result.push([`enum ${name} {`, indentMultiline(body), '}'].join('\n'));
    });
    return this.formatDartCode(result.join('\n\n'));
  }

  /**
   * Generate classes with model directives
   */
  protected generateModelClasses(): string {
    const result: string[] = [];
    //License
    const license = generateLicense();
    result.push(license);
    //Ignore for file
    result.push(IGNORE_FOR_FILE);
    //Imports
    const packageImports = this.generatePackageHeader();
    result.push(packageImports);
    //Model
    Object.entries(this.getSelectedModels()).forEach(([name, model]) => {
      const modelDeclaration = this.generateModelClass(model);
      const modelType = this.generateModelType(model);

      result.push(modelDeclaration);
      result.push(modelType);
    });
    return this.formatDartCode(result.join('\n\n'));
  }

  protected generateNonModelClasses(): string {
    const result: string[] = [];
    //License
    const license = generateLicense();
    result.push(license);
    //Ignore for file
    result.push(IGNORE_FOR_FILE);
    //Imports
    const packageImports = this.generatePackageHeader();
    result.push(packageImports);
    //Model
    Object.entries(this.getSelectedNonModels()).forEach(([name, model]) => {
      const modelDeclaration = this.generateNonModelClass(model);

      result.push(modelDeclaration);
    });
    return this.formatDartCode(result.join('\n\n'));
  }

  protected generatePackageHeader(): string {
    let usingCollection = false;
    let usingOtherClass = false;
    Object.entries({...this.getSelectedModels(), ...this.getSelectedNonModels()}).forEach(([name, model]) => {
      model.fields.forEach(f => {
        if (f.isList) {
          usingCollection = true;
        }
        if (this.isModelType(f) || this.isEnumType(f) || this.isNonModelType(f)) {
          usingOtherClass = true;
        }
      });
    });
    return (
      [...BASE_IMPORT_PACKAGES, usingCollection ? COLLECTION_PACKAGE : '', usingOtherClass ? `${LOADER_CLASS_NAME}.dart` : '']
        .filter(f => f)
        .sort()
        .map(pckg => `import '${pckg}';`)
        .join('\n') + '\n'
    );
  }

  protected generateModelClass(model: CodeGenModel): string {
    //class wrapper
    const classDeclarationBlock = new DartDeclarationBlock()
      .asKind('class')
      .withName(this.getModelName(model))
      .extends(['Model'])
      .withComment(`This is an auto generated class representing the ${model.name} type in your schema.`)
      .annotate(['immutable']);
    //model type field
    classDeclarationBlock.addClassMember('classType', '', `const _${this.getModelName(model)}ModelType()`, { static: true, const: true });
    //model fields
    model.fields.forEach(field => {
      this.generateModelField(field, '', classDeclarationBlock);
    });
    //getInstanceType
    classDeclarationBlock.addClassMethod('getInstanceType', '', [], ' => classType;', { isBlock: false }, ['override']);
    //getters
    this.generateGetters(model, classDeclarationBlock);
    //constructor
    this.generateConstructor(model, classDeclarationBlock);
    //equals
    this.generateEqualsMethodAndOperator(model, classDeclarationBlock);
    //hashCode
    this.generateHashCodeMethod(model, classDeclarationBlock);
    //toString
    this.generateToStringMethod(model, classDeclarationBlock);
    //copyWith
    this.generateCopyWithMethod(model, classDeclarationBlock);
    //de/serialization method
    this.generateSerializationMethod(model, classDeclarationBlock);
    //generate model schema
    this.generateModelSchema(model, classDeclarationBlock);
    return classDeclarationBlock.string;
  }

  protected generateNonModelClass(model: CodeGenModel): string {
    const includeIdGetter = false;
    //class wrapper
    const classDeclarationBlock = new DartDeclarationBlock()
      .asKind('class')
      .withName(this.getModelName(model))
      .withComment(`This is an auto generated class representing the ${model.name} type in your schema.`)
      .annotate(['immutable']);
    //model fields
    model.fields.forEach(field => {
      this.generateModelField(field, '', classDeclarationBlock);
    });
    //getters
    this.generateGetters(model, classDeclarationBlock, includeIdGetter);
    //constructor
    this.generateConstructor(model, classDeclarationBlock);
    //equals
    this.generateEqualsMethodAndOperator(model, classDeclarationBlock);
    //hashCode
    this.generateHashCodeMethod(model, classDeclarationBlock);
    //toString
    this.generateToStringMethod(model, classDeclarationBlock);
    //copyWith
    this.generateCopyWithMethod(model, classDeclarationBlock);
    //de/serialization method
    this.generateSerializationMethod(model, classDeclarationBlock);
    //generate non-model schema
    this.generateNonModelSchema(model, classDeclarationBlock);
    return classDeclarationBlock.string;
  }

  protected generateModelType(model: CodeGenModel): string {
    const modelName = this.getModelName(model);
    const classDeclarationBlock = new DartDeclarationBlock()
      .asKind('class')
      .withName(`_${modelName}ModelType`)
      .extends([`ModelType<${modelName}>`]);
    classDeclarationBlock.addClassMethod(`_${modelName}ModelType`, '', [], ';', { const: true, isBlock: false });
    classDeclarationBlock.addClassMethod(
      'fromJson',
      modelName,
      [{ name: 'jsonData', type: 'Map<String, dynamic>' }],
      `return ${modelName}.fromJson(jsonData);`,
      undefined,
      ['override'],
    );
    return classDeclarationBlock.string;
  }

  /**
   * Generate code for fields inside models
   * @param field
   * @param value
   * @param classDeclarationBlock
   */
  protected generateModelField(field: CodeGenField, value: string, classDeclarationBlock: DartDeclarationBlock): void {
    const fieldType = this.getNativeType(field);
    const fieldName = this.getFieldName(field);
    if (this.isNullSafety() && fieldName !== 'id') {
      classDeclarationBlock.addClassMember(`_${fieldName}`, `${fieldType}?`, value, { final: true });
    } else {
      classDeclarationBlock.addClassMember(fieldName, fieldType, value, { final: true });
    }
  }

  protected generateGetters(model: CodeGenModel, declarationBlock: DartDeclarationBlock, includeIdGetter: boolean = true): void {
    if (includeIdGetter) {
      //getId
      declarationBlock.addClassMethod('getId', 'String', [], 'return id;', {}, ['override']);
    }
    //other getters
    if (this.isNullSafety()) {
      model.fields.forEach(field => {
        const fieldName = this.getFieldName(field);
        const fieldType = this.getNativeType(field);
        const returnType = this.isFieldRequired(field) ? fieldType : `${fieldType}?`;
        const getterImpl = this.isFieldRequired(field)
          ? [
              `try {`,
              indent(`return _${fieldName}!;`),
              '} catch(e) {',
              indent(
                FORCE_CAST_EXCEPTION
              ),
              '}',
            ].join('\n')
          : `return _${fieldName};`;
        if (fieldName !== 'id') {
          declarationBlock.addClassMethod(`get ${fieldName}`, returnType, undefined, getterImpl, { isGetter: true, isBlock: true });
        }
      });
    }
  }

  protected generateConstructor(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    //Model._internal
    const args = this.isNullSafety()
      ? `{${model.fields
          .map(f => `${this.isFieldRequired(f) ? 'required ' : ''}${this.getFieldName(f) === 'id' ? 'this.' : ''}${this.getFieldName(f)}`)
          .join(', ')}}`
      : `{${model.fields.map(f => `${this.isFieldRequired(f) ? '@required ' : ''}this.${this.getFieldName(f)}`).join(', ')}}`;
    const internalFields = model.fields.filter(f => this.getFieldName(f) !== 'id');
    const internalImpl = this.isNullSafety()
      ? internalFields.length
        ? `: ${internalFields.map(f => `_${this.getFieldName(f)} = ${this.getFieldName(f)}`).join(', ')};`
        : ';'
      : ';';
    declarationBlock.addClassMethod(`${this.getModelName(model)}._internal`, '', [{ name: args }], internalImpl, {
      const: true,
      isBlock: false,
    });
    //factory Model
    const writableFields: CodeGenField[] = this.getWritableFields(model);
    const returnParamStr = writableFields
      .map(field => {
        const fieldName = this.getFieldName(field);
        if (fieldName === 'id') {
          return 'id: id == null ? UUID.getUUID() : id';
        } else if (field.isList) {
          return `${fieldName}: ${fieldName} != null ? ${this.getNativeType(field)}.unmodifiable(${fieldName}) : ${fieldName}`;
        } else {
          return `${fieldName}: ${fieldName}`;
        }
      })
      .join(',\n');
    const factoryImpl = [`return ${this.getModelName(model)}._internal(`, indentMultiline(`${returnParamStr});`)].join('\n');
    const factoryParam = this.isNullSafety()
      ? `{${writableFields
          .map(f => {
            if (this.getFieldName(f) === 'id' || !this.isFieldRequired(f)) {
              return `${this.getNativeType(f)}? ${this.getFieldName(f)}`;
            }
            return `required ${this.getNativeType(f)} ${this.getFieldName(f)}`;
          })
          .join(', ')}}`
      : `{${writableFields
          .map(
            f =>
              `${this.getFieldName(f) !== 'id' && this.isFieldRequired(f) ? '@required ' : ''}${this.getNativeType(f)} ${this.getFieldName(
                f,
              )}`,
          )
          .join(', ')}}`;
    declarationBlock.addClassMethod(this.getModelName(model), 'factory', [{ name: factoryParam }], factoryImpl);
  }

  protected generateEqualsMethodAndOperator(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    //equals
    declarationBlock.addClassMethod('equals', 'bool', [{ name: 'other', type: 'Object' }], 'return this == other;');
    //operator ==
    const equalImpl = [
      'if (identical(other, this)) return true;',
      `return other is ${this.getModelName(model)} &&`,
      indentMultiline(
        `${this.getWritableFields(model)
          .map(f => {
            const fieldName = `${this.isNullSafety() && f.name !== 'id' ? '_' : ''}${this.getFieldName(f)}`;
            return f.isList ? `DeepCollectionEquality().equals(${fieldName}, other.${fieldName})` : `${fieldName} == other.${fieldName}`;
          })
          .join(' &&\n')};`,
      ),
    ].join('\n');
    declarationBlock.addClassMethod('operator ==', 'bool', [{ name: 'other', type: 'Object' }], equalImpl, undefined, ['override']);
  }

  protected generateHashCodeMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    //hashcode
    declarationBlock.addClassMethod(`get hashCode`, `int`, undefined, ' => toString().hashCode;', { isGetter: true, isBlock: false }, [
      'override',
    ]);
  }

  protected generateToStringMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    //toString
    const fields = this.getNonConnectedField(model);
    declarationBlock.addClassMethod(
      'toString',
      'String',
      [],
      [
        'var buffer = new StringBuffer();',
        '',
        `buffer.write("${this.getModelName(model)} {");`,
        ...fields.map((field, index) => {
          const fieldDelimiter = ', ';
          const varName = this.getFieldName(field);
          const fieldName = `${this.isNullSafety() && field.name !== 'id' ? '_' : ''}${this.getFieldName(field)}`;
          let toStringVal = '';
          if (this.isEnumType(field)) {
            if (field.isList) {
              toStringVal = this.isNullSafety()
                ? `(${fieldName} != null ? ${fieldName}!.map((e) => enumToString(e)).toString() : "null")`
                : `${fieldName}?.map((e) => enumToString(e)).toString()`;
            } else {
              toStringVal = `(${fieldName} != null ? enumToString(${fieldName})${this.isNullSafety() ? '!' : ''} : "null")`;
            }
          } else {
            const fieldNativeType = this.getNativeType(field);
            switch (fieldNativeType) {
              case 'String':
                toStringVal = `"$${fieldName}"`;
                break;
              case this.scalars['AWSDate']:
              case this.scalars['AWSTime']:
              case this.scalars['AWSDateTime']:
                toStringVal = `(${fieldName} != null ? ${fieldName}${this.isNullSafety() ? '!' : ''}.format() : "null")`;
                break;
              default:
                toStringVal = `(${fieldName} != null ? ${fieldName}${this.isNullSafety() ? '!' : ''}.toString() : "null")`;
            }
          }
          if (index !== fields.length - 1) {
            return `buffer.write("${varName}=" + ${toStringVal} + "${fieldDelimiter}");`;
          }
          return `buffer.write("${varName}=" + ${toStringVal});`;
        }),
        `buffer.write("}");`,
        '',
        'return buffer.toString();',
      ].join('\n'),
      undefined,
      ['override'],
    );
  }

  protected generateCopyWithMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    //copyWith
    const copyParam = `{${this.getWritableFields(model)
      .map(f => `${this.getNativeType(f)}${this.isNullSafety() ? '?' : ''} ${this.getFieldName(f)}`)
      .join(', ')}}`;
    declarationBlock.addClassMethod(
      'copyWith',
      this.getModelName(model),
      [{ name: copyParam }],
      [
        `return ${this.getModelName(model)}${this.config.isTimestampFieldsAdded ? '._internal' : ''}(`,
        indentMultiline(
          `${this.getWritableFields(model)
            .map(field => {
              const fieldName = this.getFieldName(field);
              return `${fieldName}: ${fieldName} ?? this.${fieldName}`;
            })
            .join(',\n')});`,
        ),
      ].join('\n'),
    );
  }

  protected generateSerializationMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    //serialization: Model.fromJson
    const serializationImpl = `\n: ${indentMultiline(
      model.fields
        .map(field => {
          const varName = this.getFieldName(field);
          const fieldName = `${this.isNullSafety() && field.name !== 'id' ? '_' : ''}${this.getFieldName(field)}`;
          //model type
          if (this.isModelType(field)) {
            if (field.isList) {
              return [
                `${fieldName} = json['${varName}'] is List`,
                indent(`? (json['${varName}'] as List)`),
                this.isNullSafety() ? indent(`.where((e) => e?['serializedData'] != null)`, 2) : undefined,
                indent(
                  `.map((e) => ${this.getNativeType({ ...field, isList: false })}.fromJson(new Map<String, dynamic>.from(e${
                    this.isNullSafety() ? `['serializedData']` : ''
                  })))`,
                  2,
                ),
                indent(`.toList()`, 2),
                indent(`: null`),
              ]
                .filter(e => e !== undefined)
                .join('\n');
            }
            return [
              `${fieldName} = json['${varName}']${this.isNullSafety() ? `?['serializedData']` : ''} != null`,
              indent(
                `? ${this.getNativeType(field)}.fromJson(new Map<String, dynamic>.from(json['${varName}']${
                  this.isNullSafety() ? `['serializedData']` : ''
                }))`,
              ),
              indent(`: null`),
            ].join('\n');
          }
          //enum type
          if (this.isEnumType(field)) {
            if (field.isList) {
              return [
                `${fieldName} = json['${varName}'] is List`,
                indent(`? (json['${varName}'] as List)`),
                indent(`.map((e) => enumFromString<${field.type}>(e, ${field.type}.values)${this.isNullSafety() ? '!' : ''})`, 2),
                indent(`.toList()`, 2),
                indent(`: null`),
              ].join('\n');
            }
            return `${fieldName} = enumFromString<${field.type}>(json['${varName}'], ${field.type}.values)`;
          }
          // embedded, embeddedCollection of non-model
          if (this.isNonModelType(field)) {
            // list of non-model i.e. embeddedCollection
            if (field.isList) {
              return [
                `${fieldName} = json['${varName}'] is List`,
                indent(`? (json['${varName}'] as List)`),
                this.isNullSafety() ? indent(`.where((e) => e != null)`, 2) : undefined,
                indent(
                  `.map((e) => ${this.getNativeType({ ...field, isList: false })}.fromJson(new Map<String, dynamic>.from(${this.isNonModelType(field) ? 'e[\'serializedData\']' : 'e'})))`,
                  2,
                ),
                indent(`.toList()`, 2),
                indent(`: null`),
              ].filter((e) => e !== undefined).join('\n');
            }
            // single non-model i.e. embedded
            return [
              `${fieldName} = json['${varName}']${this.isNullSafety() ? `?['serializedData']`:''} != null`,
              indent(
                `? ${this.getNativeType(field)}.fromJson(new Map<String, dynamic>.from(json['${varName}']${
                  this.isNullSafety() ? `['serializedData']` : ''
                }))`,
              ),
              indent(`: null`),
            ].join('\n');
          }
          //regular type
          const fieldNativeType = this.getNativeType({ ...field, isList: false });
          switch (fieldNativeType) {
            case this.scalars['AWSDate']:
            case this.scalars['AWSTime']:
            case this.scalars['AWSDateTime']:
              return field.isList
                ? `${fieldName} = (json['${varName}'] as ${this.getNullSafetyTypeStr(
                    'List',
                  )})?.map((e) => ${fieldNativeType}.fromString(e)).toList()`
                : `${fieldName} = json['${varName}'] != null ? ${fieldNativeType}.fromString(json['${varName}']) : null`;
            case this.scalars['AWSTimestamp']:
              return field.isList
                ? `${fieldName} = (json['${varName}'] as ${this.getNullSafetyTypeStr(
                    'List',
                  )})?.map((e) => ${fieldNativeType}.fromSeconds(e)).toList()`
                : `${fieldName} = json['${varName}'] != null ? ${fieldNativeType}.fromSeconds(json['${varName}']) : null`;
            case this.scalars['Int']:
              return field.isList
                ? `${fieldName} = (json['${varName}'] as ${this.getNullSafetyTypeStr('List')})?.map((e) => (e as num).toInt()).toList()`
                : `${fieldName} = (json['${varName}'] as ${this.getNullSafetyTypeStr('num')})?.toInt()`;
            case this.scalars['Float']:
              return field.isList
                ? `${fieldName} = (json['${varName}'] as ${this.getNullSafetyTypeStr('List')})?.map((e) => (e as num).toDouble()).toList()`
                : `${fieldName} = (json['${varName}'] as ${this.getNullSafetyTypeStr('num')})?.toDouble()`;
            default:
              return field.isList
                ? `${fieldName} = json['${varName}']?.cast<${this.getNativeType({ ...field, isList: false })}>()`
                : `${fieldName} = json['${varName}']`;
          }
        })
        .join(',\n'),
    ).trim()};`;
    declarationBlock.addClassMethod(
      `${this.getModelName(model)}.fromJson`,
      ``,
      [{ name: 'json', type: 'Map<String, dynamic>' }],
      indentMultiline(serializationImpl),
      { isBlock: false },
    );
    //deserialization: toJson
    const toJsonFields = model.fields
      .map(field => {
        const varName = this.getFieldName(field);
        const fieldName = `${this.isNullSafety() && field.name !== 'id' ? '_' : ''}${this.getFieldName(field)}`;
        if (this.isModelType(field) || this.isNonModelType(field)) {
          if (field.isList) {
            const modelName = this.getNativeType({ ...field, isList: false });
            return `'${varName}': ${fieldName}?.map((${modelName}? e) => e?.toJson()).toList()`;
          }
          return `'${varName}': ${fieldName}?.toJson()`;
        }
        if (this.isEnumType(field)) {
          if (field.isList) {
            return `'${varName}': ${fieldName}?.map((e) => enumToString(e)).toList()`;
          }
          return `'${varName}': enumToString(${fieldName})`;
        }
        const fieldNativeType = this.getNativeType({ ...field, isList: false });
        switch (fieldNativeType) {
          case this.scalars['AWSDate']:
          case this.scalars['AWSTime']:
          case this.scalars['AWSDateTime']:
            return field.isList ? `'${varName}': ${fieldName}?.map((e) => e.format()).toList()` : `'${varName}': ${fieldName}?.format()`;
          case this.scalars['AWSTimestamp']:
            return field.isList
              ? `'${varName}': ${fieldName}?.map((e) => e.toSeconds()).toList()`
              : `'${varName}': ${fieldName}?.toSeconds()`;
          default:
            return `'${varName}': ${fieldName}`;
        }
      })
      .join(', ');
    const deserializationImpl = [' => {', indentMultiline(toJsonFields), '};'].join('\n');
    declarationBlock.addClassMethod('toJson', 'Map<String, dynamic>', [], deserializationImpl, { isBlock: false });
  }

  protected generateModelSchema(model: CodeGenModel, classDeclarationBlock: DartDeclarationBlock): void {
    const schemaDeclarationBlock = new DartDeclarationBlock();
    //QueryField
    this.getWritableFields(model).forEach(field => {
      this.generateQueryField(model, field, schemaDeclarationBlock);
    });
    //schema
    this.generateSchemaField(model, schemaDeclarationBlock);
    classDeclarationBlock.addBlock(schemaDeclarationBlock);
  }

  protected generateNonModelSchema(model: CodeGenModel, classDeclarationBlock: DartDeclarationBlock): void {
    const isNonModel = true;
    const schemaDeclarationBlock = new DartDeclarationBlock();
    //schema
    this.generateSchemaField(model, schemaDeclarationBlock, isNonModel);
    classDeclarationBlock.addBlock(schemaDeclarationBlock);
  }

  protected generateQueryField(model: CodeGenModel, field: CodeGenField, declarationBlock: DartDeclarationBlock): void {
    const fieldName = this.getFieldName(field);
    const queryFieldName = this.getQueryFieldName(field);
    let value = `QueryField(fieldName: "${fieldName}")`;
    if (this.isModelType(field)) {
      const modelName = this.getNativeType({ ...field, isList: false });
      value = [
        'QueryField(',
        indent(`fieldName: "${fieldName}",`),
        indent(`fieldType: ModelFieldType(ModelFieldTypeEnum.model, ofModelName: (${modelName}).toString()))`),
      ].join('\n');
    } else if (fieldName === 'id') {
      value = `QueryField(fieldName: "${lowerCaseFirst(model.name)}.id")`;
    }
    declarationBlock.addClassMember(queryFieldName, 'QueryField', value, { static: true, final: true });
  }

  protected getQueryFieldName(field: CodeGenField): string {
    return this.getFieldName(field).toUpperCase();
  }

  protected generateSchemaField(model: CodeGenModel, declarationBlock: DartDeclarationBlock, isNonModel: boolean = false): void {
    const schema = [
      'Model.defineSchema(define: (ModelSchemaDefinition modelSchemaDefinition) {',
      indentMultiline(
        [
          `modelSchemaDefinition.name = "${this.getModelName(model)}";\nmodelSchemaDefinition.pluralName = "${this.pluralizeModelName(
            model,
          )}";`,
          this.generateAuthRules(model),
          isNonModel ? this.generateNonModelAddFields(model) : this.generateAddFields(model),
        ]
          .filter(f => f)
          .join('\n\n'),
      ),
      '})',
    ].join('\n');
    declarationBlock.addClassMember('schema', '', schema, { static: true, var: true });
  }

  protected generateAuthRules(model: CodeGenModel): string {
    const authDirectives: AuthDirective[] = model.directives.filter(d => d.name === 'auth') as AuthDirective[];
    if (authDirectives.length) {
      const rules: string[] = [];
      authDirectives.forEach(directive => {
        directive.arguments?.rules.forEach(rule => {
          const authRule: string[] = [];
          const authStrategy = `authStrategy: AuthStrategy.${rule.allow.toUpperCase()}`;
          switch (rule.allow) {
            case AuthStrategy.owner:
              authRule.push(authStrategy);
              authRule.push(`ownerField: "${rule.ownerField}"`);
              authRule.push(`identityClaim: "${rule.identityClaim}"`);
              break;
            case AuthStrategy.private:
            case AuthStrategy.public:
              authRule.push(authStrategy);
              break;
            case AuthStrategy.groups:
              authRule.push(authStrategy);
              authRule.push(`groupClaim: "${rule.groupClaim}"`);
              if (rule.groups) {
                authRule.push(`groups: [ ${rule.groups?.map(group => `"${group}"`).join(', ')} ]`);
              } else {
                authRule.push(`groupsField: "${rule.groupField}"`);
              }
              break;
            default:
              printWarning(`Model has auth with authStrategy ${rule.allow} of which is not yet supported`);
              return '';
          }
          if (this.config.emitAuthProvider && rule.provider) {
            authRule.push(`provider: AuthRuleProvider.${rule.provider.toUpperCase()}`);
          }
          authRule.push(
            ['operations: [', indentMultiline(rule.operations.map(op => `ModelOperation.${op.toUpperCase()}`).join(',\n')), ']'].join('\n'),
          );
          rules.push(`AuthRule(\n${indentMultiline(authRule.join(',\n'))})`);
        });
      });
      if (rules.length) {
        return ['modelSchemaDefinition.authRules = [', indentMultiline(rules.join(',\n')), '];'].join('\n');
      }
    }
    return '';
  }

  protected generateAddFields(model: CodeGenModel): string {
    if (model.fields.length) {
      const fieldsToAdd: string[] = [];
      model.fields.forEach(field => {
        const fieldName = this.getFieldName(field);
        const modelName = this.getModelName(model);
        const queryFieldName = this.getQueryFieldName(field);
        let fieldParam: string = '';
        //field id
        if (fieldName === 'id') {
          fieldsToAdd.push('ModelFieldDefinition.id()');
        }
        //field with @connection
        else if (field.connectionInfo) {
          const connectedModelName = this.getNativeType({ ...field, isList: false });
          switch (field.connectionInfo.kind) {
            case CodeGenConnectionType.HAS_ONE:
              fieldParam = [
                `key: ${modelName}.${queryFieldName}`,
                `isRequired: ${!field.isNullable}`,
                `ofModelName: (${connectedModelName}).toString()`,
                `associatedKey: ${connectedModelName}.${this.getQueryFieldName(field.connectionInfo.associatedWith)}`,
              ].join(',\n');
              fieldsToAdd.push(['ModelFieldDefinition.hasOne(', indentMultiline(fieldParam), ')'].join('\n'));
              break;
            case CodeGenConnectionType.HAS_MANY:
              fieldParam = [
                `key: ${modelName}.${queryFieldName}`,
                `isRequired: ${!field.isNullable}`,
                `ofModelName: (${connectedModelName}).toString()`,
                `associatedKey: ${connectedModelName}.${this.getQueryFieldName(field.connectionInfo.associatedWith)}`,
              ].join(',\n');
              fieldsToAdd.push(['ModelFieldDefinition.hasMany(', indentMultiline(fieldParam), ')'].join('\n'));
              break;
            case CodeGenConnectionType.BELONGS_TO:
              fieldParam = [
                `key: ${modelName}.${queryFieldName}`,
                `isRequired: ${!field.isNullable}`,
                `targetName: "${field.connectionInfo.targetName}"`,
                `ofModelName: (${connectedModelName}).toString()`,
              ].join(',\n');
              fieldsToAdd.push(['ModelFieldDefinition.belongsTo(', indentMultiline(fieldParam), ')'].join('\n'));
              break;
          }
        }
        //field with regular types
        else {
          const ofType = this.getOfType(field);
          let ofTypeStr: string;

          if (field.isList) {
            if (ofType === '.embedded') {
              ofTypeStr = `ofType: ModelFieldType(ModelFieldTypeEnum.embeddedCollection, ofCustomTypeName: '${field.type}')`;
            } else {
              ofTypeStr = `ofType: ModelFieldType(ModelFieldTypeEnum.collection, ofModelName: describeEnum(ModelFieldTypeEnum${ofType}))`;
            }
          } else if (ofType === '.embedded') {
            ofTypeStr = `ofType: ModelFieldType(ModelFieldTypeEnum${ofType}, ofCustomTypeName: '${field.type}')`;
          } else {
            ofTypeStr = `ofType: ModelFieldType(ModelFieldTypeEnum${ofType})`;
          }

          fieldParam = [
            ...(ofType === '.embedded' || field.isReadOnly ? [`fieldName: '${fieldName}'`] : [`key: ${modelName}.${queryFieldName}`]),
            `isRequired: ${this.isFieldRequired(field)}`,
            field.isList ? 'isArray: true' : '',
            field.isReadOnly ? 'isReadOnly: true' : '',
            ofTypeStr,
          ]
            .filter(f => f)
            .join(',\n');

          fieldsToAdd.push(
            [`ModelFieldDefinition.${ofType === '.embedded' ? 'embedded' : (field.isReadOnly ? 'nonQueryField' : 'field')}(`, indentMultiline(fieldParam), ')'].join('\n'),
          );        }
      });
      return fieldsToAdd.map(field => `modelSchemaDefinition.addField(${field});`).join('\n\n');
    }
    return '';
  }

  protected generateNonModelAddFields(model: CodeGenModel): string {
    if (!model.fields.length) {
      return '';
    }

    const fieldsToAdd: string[] = [];
    model.fields.forEach(field => {
      const fieldName = this.getFieldName(field);
      const ofType = this.getOfType(field);
      let ofTypeStr: string;

      if (field.isList) {
        if (ofType === '.embedded') {
          ofTypeStr = `ofType: ModelFieldType(ModelFieldTypeEnum.embeddedCollection, ofCustomTypeName: '${field.type}')`;
        } else {
          ofTypeStr = `ofType: ModelFieldType(ModelFieldTypeEnum.collection, ofModelName: describeEnum(ModelFieldTypeEnum${ofType}))`;
        }
      } else if (ofType === '.embedded') {
        ofTypeStr = `ofType: ModelFieldType(ModelFieldTypeEnum${ofType}, ofCustomTypeName: '${field.type}')`;
      } else {
        ofTypeStr = `ofType: ModelFieldType(ModelFieldTypeEnum${ofType})`;
      }

      const fieldParam = [
        `fieldName: '${fieldName}'`,
        `isRequired: ${this.isFieldRequired(field)}`,
        field.isList ? 'isArray: true' : '',
        ofTypeStr,
      ].filter(f => f).join(',\n')

      fieldsToAdd.push([`ModelFieldDefinition.${ofType === '.embedded' ? 'embedded' : 'customTypeField'}(`, indentMultiline(fieldParam), ')'].join('\n'));
    });

    return fieldsToAdd.map(field => `modelSchemaDefinition.addField(${field});`).join('\n\n');
  }

  protected getOfType(field: CodeGenField): string {
    if (this.isEnumType(field)) {
      return '.enumeration';
    }

    if (this.isNonModelType(field)) {
      return '.embedded';
    }

    if (field.type in typeToEnumMap) {
      return typeToEnumMap[field.type];
    }

    return '.string';
  }

  /**
   * Get the list of fields that can be are writeable. These fields should exclude the following
   * fields that are connected and are either HAS_ONE or HAS_MANY
   * @param model
   */
  protected getNonConnectedField(model: CodeGenModel): CodeGenField[] {
    return model.fields.filter(f => {
      if (!f.connectionInfo) {
        return true;
      }
      if (f.connectionInfo.kind == CodeGenConnectionType.BELONGS_TO) {
        return true;
      }
    });
  }

  /**
   * Format the code following Dart style guidelines
   * @param dartCode
   */
  protected formatDartCode(dartCode: string): string {
    if (this.isNullSafety()) {
      return dartCode;
    }
    const result = dartStyle.formatCode(dartCode);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.code || '';
  }

  protected isFieldRequired(field: CodeGenField): boolean {
    return !((field.isNullable && !field.isList) || field.isListNullable);
  }

  protected isNullSafety(): boolean {
    return this._parsedConfig.enableDartNullSafety;
  }

  protected getNullSafetyTypeStr(type: string): string {
    return this.isNullSafety() ? `${type}?` : type;
  }

  protected getWritableFields(model: CodeGenModel): CodeGenField[] {
    return model.fields.filter(f => !f.isReadOnly);
  }
}
