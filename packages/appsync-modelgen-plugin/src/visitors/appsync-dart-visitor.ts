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
  AMPLIFY_CORE_PREFIX,
  DART_AMPLIFY_CORE_TYPES,
  LOADER_CLASS_NAME,
  FLUTTER_AMPLIFY_CORE_IMPORT,
  COLLECTION_PACKAGE,
  DART_RESERVED_KEYWORDS,
  typeToEnumMap,
  IGNORE_FOR_FILE,
  CUSTOM_LINTS_MESSAGE,
  MODEL_FILED_VALUE_CLASS,
} from '../configs/dart-config';
import { generateLicense } from '../utils/generateLicense';
import { GraphQLSchema } from 'graphql';
import { DART_SCALAR_MAP } from '../scalars';

export interface RawAppSyncModelDartConfig extends RawAppSyncModelConfig {}

export interface ParsedAppSyncModelDartConfig extends ParsedAppSyncModelConfig {}
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
  }

  generate(): string {
    // TODO: Remove us, leaving in to be explicit on why this flag is here.
    const shouldUseModelNameFieldInHasManyAndBelongsTo = true;
    // This flag is going to be used to tight-trigger on JS implementations only.
    const shouldImputeKeyForUniDirectionalHasMany = false;
    this.processDirectives(shouldUseModelNameFieldInHasManyAndBelongsTo, shouldImputeKeyForUniDirectionalHasMany);

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
    //Custom lints warning
    result.push(CUSTOM_LINTS_MESSAGE);
    //Ignore for file
    result.push(IGNORE_FOR_FILE);
    //Packages for import
    const flutterDatastorePackage = FLUTTER_AMPLIFY_CORE_IMPORT;
    const packageImports: string[] = [...modelNames, ...nonModelNames];
    //Packages for export
    const packageExports: string[] = [...exportClasses];
    //Block body
    const classDeclarationBlock = new DartDeclarationBlock()
      .asKind('class')
      .withName(LOADER_CLASS_NAME)
      .implements([`${DART_AMPLIFY_CORE_TYPES.ModelProviderInterface}`])
      .addClassMember('version', 'String', `"${this.computeVersion()}"`, undefined, ['override'])
      .addClassMember(
        'modelSchemas',
        `List<${DART_AMPLIFY_CORE_TYPES.ModelSchema}>`,
        `[${modelNames.map(m => `${m}.schema`).join(', ')}]`,
        undefined,
        ['override'],
      )
      .addClassMember(
        'customTypeSchemas',
        `List<${DART_AMPLIFY_CORE_TYPES.ModelSchema}>`,
        `[${nonModelNames.map(nm => `${nm}.schema`).join(', ')}]`,
        undefined,
        ['override'],
      )
      .addClassMember('_instance', LOADER_CLASS_NAME, `${LOADER_CLASS_NAME}()`, { static: true, final: true })
      .addClassMethod('get instance', LOADER_CLASS_NAME, [], ' => _instance;', { isBlock: false, isGetter: true, static: true });

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
        `${DART_AMPLIFY_CORE_TYPES.ModelType}`,
        [{ type: 'String', name: 'modelName' }],
        getModelTypeImplStr,
      );
    }

    const processedPackageImports = packageImports.map(p => `import '${p}.dart';`);
    processedPackageImports.unshift(`import '${flutterDatastorePackage}.dart' as ${AMPLIFY_CORE_PREFIX};`);

    result.push(processedPackageImports.join('\n'));
    result.push(packageExports.map(p => `export '${p}.dart';`).join('\n'));
    result.push(classDeclarationBlock.string);
    result.push(MODEL_FILED_VALUE_CLASS);
    return result.join('\n\n');
  }

  protected generateEnums(): string {
    const result: string[] = [];
    //License
    const license = generateLicense();
    result.push(license);
    //Custom lints warning
    result.push(CUSTOM_LINTS_MESSAGE);
    //Ignore for file
    result.push(IGNORE_FOR_FILE);
    //Enum
    Object.entries(this.getSelectedEnums()).forEach(([name, enumVal]) => {
      const body = Object.values(enumVal.values).join(',\n');
      result.push([`enum ${name} {`, indentMultiline(body), '}'].join('\n'));
    });
    return result.join('\n\n');
  }

  /**
   * Generate classes with model directives
   */
  protected generateModelClasses(): string {
    const result: string[] = [];
    //License
    const license = generateLicense();
    result.push(license);
    //Custom lints warning
    result.push(CUSTOM_LINTS_MESSAGE);
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

      if (this.isCustomPKEnabled()) {
        const modelIdentifier = this.generateModelIdentifierClass(model);
        result.push(modelIdentifier);
      }
    });
    return result.join('\n\n');
  }

  protected generateNonModelClasses(): string {
    const result: string[] = [];
    //License
    const license = generateLicense();
    result.push(license);
    //Custom lints warning
    result.push(CUSTOM_LINTS_MESSAGE);
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
    return result.join('\n\n');
  }

  protected generatePackageHeader(): string {
    let usingCollection = false;
    Object.entries({ ...this.getSelectedModels(), ...this.getSelectedNonModels() }).forEach(([name, model]) => {
      model.fields.forEach(f => {
        if (f.isList) {
          usingCollection = true;
        }
      });
    });
    const flutterDatastorePackage = FLUTTER_AMPLIFY_CORE_IMPORT;
    const packagesImports = [usingCollection ? COLLECTION_PACKAGE : '', `${LOADER_CLASS_NAME}.dart`]
      .filter(f => f)
      .map(pckg => `import '${pckg}';`);
    packagesImports.push(`import '${flutterDatastorePackage}.dart' as ${AMPLIFY_CORE_PREFIX};`);
    return packagesImports.sort().join('\n') + '\n';
  }

  protected generateModelClass(model: CodeGenModel): string {
    //class wrapper
    const classDeclarationBlock = new DartDeclarationBlock()
      .asKind('class')
      .withName(this.getModelName(model))
      .extends([`${DART_AMPLIFY_CORE_TYPES.Model}`])
      .withComment(`This is an auto generated class representing the ${model.name} type in your schema.`);
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
    //copyWithModelFieldValues
    this.generateCopyWithModelFieldValuesMethod(model, classDeclarationBlock);
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
      .withComment(`This is an auto generated class representing the ${model.name} type in your schema.`);
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
    //copyWithModelFieldValuesMethod
    this.generateCopyWithModelFieldValuesMethod(model, classDeclarationBlock);
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
      .extends([`${DART_AMPLIFY_CORE_TYPES.ModelType}<${modelName}>`]);
    classDeclarationBlock.addClassMethod(`_${modelName}ModelType`, '', [], ';', { const: true, isBlock: false });
    classDeclarationBlock.addClassMethod(
      'fromJson',
      modelName,
      [{ name: 'jsonData', type: 'Map<String, dynamic>' }],
      `return ${modelName}.fromJson(jsonData);`,
      undefined,
      ['override'],
    );
    classDeclarationBlock.addClassMethod('modelName', 'String', [], `return '${modelName}';`, undefined, ['override']);
    return classDeclarationBlock.string;
  }

  protected generateModelIdentifierClass(model: CodeGenModel): string {
    const identifierFields = this.getModelIdentifierFields(model);
    const modelName = this.getModelName(model);

    const classDeclarationBlock = new DartDeclarationBlock()
      .asKind('class')
      .withName(`${modelName}ModelIdentifier`)
      .implements([`${DART_AMPLIFY_CORE_TYPES.ModelIdentifier}<${modelName}>`])
      .withComment(['This is an auto generated class representing the model identifier', `of [${modelName}] in your schema.`].join('\n'));

    identifierFields.forEach(field => {
      classDeclarationBlock.addClassMember(field.name, this.getNativeType(field), '', { final: true });
    });

    const constructorArgs = `{\n${indentMultiline(identifierFields.map(field => `required this.${field.name}`).join(',\n'))}}`;

    classDeclarationBlock.addClassMethod(
      `${modelName}ModelIdentifier`,
      '',
      [{ name: constructorArgs }],
      ';',
      { const: true, isBlock: false },
      undefined,
      [
        `Create an instance of ${modelName}ModelIdentifier using [${identifierFields[0].name}] the primary key.`,
        identifierFields.length > 1
          ? `And ${identifierFields
              .slice(1)
              .map(field => `[${field.name}]`)
              .join(', ')} the sort key${identifierFields.length == 2 ? '' : 's'}.`
          : undefined,
      ]
        .filter(comment => comment)
        .join('\n'),
    );

    classDeclarationBlock.addClassMethod(
      'serializeAsMap',
      'Map<String, dynamic>',
      [],
      [' => (<String, dynamic>{', indentMultiline(identifierFields.map(field => `'${field.name}': ${field.name}`).join(',\n')), '});'].join(
        '\n',
      ),
      { isBlock: false },
      ['override'],
    );

    classDeclarationBlock.addClassMethod(
      'serializeAsList',
      'List<Map<String, dynamic>>',
      [],
      [
        ' => serializeAsMap()',
        indent('.entries'),
        indent('.map((entry) => (<String, dynamic>{ entry.key: entry.value }))'),
        indent('.toList();'),
      ].join('\n'),
      { isBlock: false },
      ['override'],
    );

    classDeclarationBlock.addClassMethod(
      'serializeAsString',
      'String',
      undefined,
      " => serializeAsMap().values.join('#');",
      {
        isBlock: false,
      },
      ['override'],
    );

    classDeclarationBlock.addClassMethod(
      'toString',
      'String',
      undefined,
      ` => '${modelName}ModelIdentifier(${identifierFields.map(field => `${field.name}: $${field.name}`).join(', ')})';`,
      { isBlock: false },
      ['override'],
    );

    const equalOperatorImpl = [
      'if (identical(this, other)) {',
      indent('return true;'),
      '}\n',
      `return other is ${modelName}ModelIdentifier &&`,
      indentMultiline(`${identifierFields.map(field => `${field.name} == other.${field.name}`).join(' &&\n')};`),
    ].join('\n');

    classDeclarationBlock.addClassMethod('operator ==', 'bool', [{ name: 'Object other' }], equalOperatorImpl, undefined, ['override']);

    classDeclarationBlock.addClassMethod(
      'get hashCode',
      'int',
      undefined,
      ` =>\n${indentMultiline(identifierFields.map(field => `${field.name}.hashCode`).join(' ^\n'))};`,
      { isBlock: false, isGetter: true },
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
    if (fieldName !== 'id') {
      classDeclarationBlock.addClassMember(`_${fieldName}`, `${fieldType}?`, value, { final: true });
    } else {
      classDeclarationBlock.addClassMember(fieldName, fieldType, value, { final: true });
    }
  }

  protected generateGetters(model: CodeGenModel, declarationBlock: DartDeclarationBlock, includeIdGetter: boolean = true): void {
    if (includeIdGetter) {
      if (this.isCustomPKEnabled()) {
        const identifierFields = this.getModelIdentifierFields(model);
        const isCustomPK = identifierFields[0].name !== 'id';
        const getIdImpl = isCustomPK ? ' => modelIdentifier.serializeAsString();' : ' => id;';
        //getId
        declarationBlock.addClassMethod('getId', 'String', [], getIdImpl, { isBlock: false }, [
          "Deprecated('[getId] is being deprecated in favor of custom primary key feature. Use getter [modelIdentifier] to get model identifier.')",
          'override',
        ]);
      } else {
        declarationBlock.addClassMethod('getId', 'String', [], 'return id;', {}, ['override']);
      }
    }
    //other getters
    let forceCastException = `throw ${DART_AMPLIFY_CORE_TYPES.AmplifyCodeGenModelException}(
      ${DART_AMPLIFY_CORE_TYPES.AmplifyExceptionMessages}.codeGenRequiredFieldForceCastExceptionMessage,
      recoverySuggestion:
        ${DART_AMPLIFY_CORE_TYPES.AmplifyExceptionMessages}.codeGenRequiredFieldForceCastRecoverySuggestion,
      underlyingException: e.toString()
      );`;

    if (includeIdGetter && this.isCustomPKEnabled()) {
      this.generateModelIdentifierGetter(model, declarationBlock, forceCastException);
    }

    model.fields.forEach(field => {
      const fieldName = this.getFieldName(field);
      const fieldType = this.getNativeType(field);
      const returnType = this.isFieldRequired(field) ? fieldType : `${fieldType}?`;

      const getterImpl = this.isFieldRequired(field)
        ? [`try {`, indent(`return _${fieldName}!;`), '} catch(e) {', indent(forceCastException), '}'].join('\n')
        : `return _${fieldName};`;
      if (fieldName !== 'id') {
        declarationBlock.addClassMethod(`get ${fieldName}`, returnType, undefined, getterImpl, { isGetter: true, isBlock: true });
      }
    });
  }

  protected generateModelIdentifierGetter(model: CodeGenModel, declarationBlock: DartDeclarationBlock, forceCastException: string): void {
    const identifierFields = this.getModelIdentifierFields(model);
    const modelName = this.getModelName(model);
    const isSingleManagedIDField = identifierFields.length === 1 && identifierFields[0].name === 'id';

    const getterImpl = [
      isSingleManagedIDField ? undefined : 'try {',
      indent(`return ${modelName}ModelIdentifier(`),
      indentMultiline(
        identifierFields
          .map(field => {
            const isManagedIdField = field.name === 'id';
            return indent(`${field.name}: ${isManagedIdField ? '' : '_'}${field.name}${isManagedIdField ? '' : '!'}`);
          })
          .join(',\n'),
      ),
      indent(');'),
      isSingleManagedIDField ? undefined : '} catch(e) {',
      isSingleManagedIDField ? undefined : indent(forceCastException),
      isSingleManagedIDField ? undefined : '}',
    ]
      .filter(line => line)
      .join('\n');

    declarationBlock.addClassMethod(`get modelIdentifier`, `${modelName}ModelIdentifier`, undefined, getterImpl, {
      isGetter: true,
      isBlock: true,
    });
  }

  protected generateConstructor(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    //Model._internal
    const args = `{${model.fields
      .map(f => `${this.isFieldRequired(f) ? 'required ' : ''}${this.getFieldName(f) === 'id' ? 'this.' : ''}${this.getFieldName(f)}`)
      .join(', ')}}`;
    const internalFields = model.fields.filter(f => this.getFieldName(f) !== 'id');
    const internalImpl = internalFields.length
      ? `: ${internalFields.map(f => `_${this.getFieldName(f)} = ${this.getFieldName(f)}`).join(', ')};`
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
          return `id: id == null ? ${DART_AMPLIFY_CORE_TYPES.UUID}.getUUID() : id`;
        } else if (field.isList) {
          return `${fieldName}: ${fieldName} != null ? ${this.getNativeType(field)}.unmodifiable(${fieldName}) : ${fieldName}`;
        } else {
          return `${fieldName}: ${fieldName}`;
        }
      })
      .join(',\n');
    const factoryImpl = [`return ${this.getModelName(model)}._internal(`, indentMultiline(`${returnParamStr});`)].join('\n');
    const factoryParam = `{${writableFields
      .map(f => {
        if (this.getFieldName(f) === 'id' || !this.isFieldRequired(f)) {
          return `${this.getNativeType(f)}? ${this.getFieldName(f)}`;
        }
        return `required ${this.getNativeType(f)} ${this.getFieldName(f)}`;
      })
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
            const fieldName = `${f.name !== 'id' ? '_' : ''}${this.getFieldName(f)}`;
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
          const fieldName = `${field.name !== 'id' ? '_' : ''}${this.getFieldName(field)}`;
          let toStringVal = '';
          if (this.isEnumType(field)) {
            if (field.isList) {
              toStringVal = `(${fieldName} != null ? ${fieldName}!.map((e) => ${DART_AMPLIFY_CORE_TYPES.enumToString}(e)).toString() : "null")`;
            } else {
              toStringVal = `(${fieldName} != null ? ${DART_AMPLIFY_CORE_TYPES.enumToString}(${fieldName})! : "null")`;
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
                toStringVal = `(${fieldName} != null ? ${fieldName}!.format() : "null")`;
                break;
              default:
                toStringVal = `(${fieldName} != null ? ${fieldName}!.toString() : "null")`;
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
    const writableFields = this.getWritableFields(model, this.isCustomPKEnabled());
    const copyParam = `{${writableFields.map(f => `${this.getNativeType(f)}? ${this.getFieldName(f)}`).join(', ')}}`;
    declarationBlock.addClassMethod(
      'copyWith',
      this.getModelName(model),
      writableFields.length ? [{ name: copyParam }] : undefined,
      [
        `return ${this.getModelName(model)}${this.config.isTimestampFieldsAdded ? '._internal' : ''}(`,
        indentMultiline(
          `${this.getWritableFields(model)
            .map(field => {
              const fieldName = this.getFieldName(field);
              return `${fieldName}: ${
                writableFields.findIndex(field => field.name === fieldName) > -1 ? `${fieldName} ?? this.` : ''
              }${fieldName}`;
            })
            .join(',\n')});`,
        ),
      ].join('\n'),
    );
  }

  protected generateCopyWithModelFieldValuesMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    // copyWithModelFieldValues
    const writableFields = this.getWritableFields(model, this.isCustomPKEnabled());
    const copyParameters = writableFields.map(
      field => `ModelFieldValue<${this.getNativeType(field)}${field.isNullable ? '?' : ''}>? ${this.getFieldName(field)}`,
    );
    const copyParameterStr = `{\n${indentMultiline(copyParameters.join(',\n'))}\n}`;
    declarationBlock.addClassMethod(
      'copyWithModelFieldValues',
      this.getModelName(model),
      writableFields.length ? [{ name: copyParameterStr }] : undefined,
      [
        `return ${this.getModelName(model)}${this.config.isTimestampFieldsAdded ? '._internal' : ''}(`,
        indentMultiline(
          `${this.getWritableFields(model, false)
            .map(field => {
              const fieldName = this.getFieldName(field);
              return `${fieldName}: ${
                writableFields.findIndex(field => field.name === fieldName) > -1
                  ? `${fieldName} == null ? this.${fieldName} : ${fieldName}.value`
                  : `${fieldName}`
              }`;
            })
            .join(',\n')}`,
        ),
        ');',
      ].join('\n'),
    );
  }

  protected generateSerializationMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void {
    //serialization: Model.fromJson
    const serializationImpl = `\n: ${indentMultiline(
      model.fields
        .map(field => {
          const varName = this.getFieldName(field);
          const fieldName = `${field.name !== 'id' ? '_' : ''}${this.getFieldName(field)}`;
          //model type
          if (this.isModelType(field)) {
            if (field.isList) {
              return [
                `${fieldName} = json['${varName}'] is List`,
                indent(`? (json['${varName}'] as List)`),
                indent(`.where((e) => e?['serializedData'] != null)`, 2),
                indent(
                  `.map((e) => ${this.getNativeType({
                    ...field,
                    isList: false,
                  })}.fromJson(new Map<String, dynamic>.from(e['serializedData'])))`,
                  2,
                ),
                indent(`.toList()`, 2),
                indent(`: null`),
              ]
                .filter(e => e !== undefined)
                .join('\n');
            }
            return [
              `${fieldName} = json['${varName}']?['serializedData'] != null`,
              indent(`? ${this.getNativeType(field)}.fromJson(new Map<String, dynamic>.from(json['${varName}']['serializedData']))`),
              indent(`: null`),
            ].join('\n');
          }
          //enum type
          if (this.isEnumType(field)) {
            if (field.isList) {
              return [
                `${fieldName} = json['${varName}'] is List`,
                indent(`? (json['${varName}'] as List)`),
                indent(`.map((e) => ${DART_AMPLIFY_CORE_TYPES.enumFromString}<${field.type}>(e, ${field.type}.values)!)`, 2),
                indent(`.toList()`, 2),
                indent(`: null`),
              ].join('\n');
            }
            return `${fieldName} = ${DART_AMPLIFY_CORE_TYPES.enumFromString}<${field.type}>(json['${varName}'], ${field.type}.values)`;
          }
          // embedded, embeddedCollection of non-model
          if (this.isNonModelType(field)) {
            // list of non-model i.e. embeddedCollection
            if (field.isList) {
              return [
                `${fieldName} = json['${varName}'] is List`,
                indent(`? (json['${varName}'] as List)`),
                indent(`.where((e) => e != null)`, 2),
                indent(
                  `.map((e) => ${this.getNativeType({ ...field, isList: false })}.fromJson(new Map<String, dynamic>.from(${
                    this.isNonModelType(field) ? "e['serializedData']" : 'e'
                  })))`,
                  2,
                ),
                indent(`.toList()`, 2),
                indent(`: null`),
              ]
                .filter(e => e !== undefined)
                .join('\n');
            }
            // single non-model i.e. embedded
            return [
              `${fieldName} = json['${varName}']?['serializedData'] != null`,
              indent(`? ${this.getNativeType(field)}.fromJson(new Map<String, dynamic>.from(json['${varName}']['serializedData']))`),
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
                ? `${fieldName} = (json['${varName}'] as ${this.getNullableTypeStr(
                    'List',
                  )})?.map((e) => ${fieldNativeType}.fromString(e)).toList()`
                : `${fieldName} = json['${varName}'] != null ? ${fieldNativeType}.fromString(json['${varName}']) : null`;
            case this.scalars['AWSTimestamp']:
              return field.isList
                ? `${fieldName} = (json['${varName}'] as ${this.getNullableTypeStr(
                    'List',
                  )})?.map((e) => ${fieldNativeType}.fromSeconds(e)).toList()`
                : `${fieldName} = json['${varName}'] != null ? ${fieldNativeType}.fromSeconds(json['${varName}']) : null`;
            case this.scalars['Int']:
              return field.isList
                ? `${fieldName} = (json['${varName}'] as ${this.getNullableTypeStr('List')})?.map((e) => (e as num).toInt()).toList()`
                : `${fieldName} = (json['${varName}'] as ${this.getNullableTypeStr('num')})?.toInt()`;
            case this.scalars['Float']:
              return field.isList
                ? `${fieldName} = (json['${varName}'] as ${this.getNullableTypeStr('List')})?.map((e) => (e as num).toDouble()).toList()`
                : `${fieldName} = (json['${varName}'] as ${this.getNullableTypeStr('num')})?.toDouble()`;
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
        const fieldName = `${field.name !== 'id' ? '_' : ''}${this.getFieldName(field)}`;
        if (this.isModelType(field) || this.isNonModelType(field)) {
          if (field.isList) {
            const modelName = this.getNativeType({ ...field, isList: false });
            return `'${varName}': ${fieldName}?.map((${modelName}? e) => e?.toJson()).toList()`;
          }
          return `'${varName}': ${fieldName}?.toJson()`;
        }
        if (this.isEnumType(field)) {
          if (field.isList) {
            return `'${varName}': ${fieldName}?.map((e) => ${DART_AMPLIFY_CORE_TYPES.enumToString}(e)).toList()`;
          }
          return `'${varName}': ${DART_AMPLIFY_CORE_TYPES.enumToString}(${fieldName})`;
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

    const toMapFields = model.fields
      .map(field => {
        const varName = this.getFieldName(field);
        const fieldName = `${field.name !== 'id' ? '_' : ''}${this.getFieldName(field)}`;
        return `'${varName}': ${fieldName}`;
      })
      .join(',\n');
    const toMapImpl = [' => {', indentMultiline(toMapFields), '};'].join('\n');
    declarationBlock.addClassMethod('toMap', 'Map<String, Object?>', [], toMapImpl, { isBlock: false });
  }

  protected generateModelSchema(model: CodeGenModel, classDeclarationBlock: DartDeclarationBlock): void {
    const modelName = model.name;
    const schemaDeclarationBlock = new DartDeclarationBlock();

    if (this.isCustomPKEnabled()) {
      // QueryField that allows creating query predicate with custom PK
      schemaDeclarationBlock.addClassMember(
        'MODEL_IDENTIFIER',
        `${DART_AMPLIFY_CORE_TYPES.QueryModelIdentifier}<${modelName}ModelIdentifier>`,
        `${DART_AMPLIFY_CORE_TYPES.QueryModelIdentifier}<${modelName}ModelIdentifier>()`,
        { static: true, final: true },
      );
    }

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
    let value = `${DART_AMPLIFY_CORE_TYPES.QueryField}(fieldName: "${fieldName}")`;
    if (this.isModelType(field)) {
      const modelName = this.getNativeType({ ...field, isList: false });
      value = [
        `${DART_AMPLIFY_CORE_TYPES.QueryField}(`,
        indent(`fieldName: "${fieldName}",`),
        indent(
          `fieldType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}.model, ofModelName: '${modelName}'))`,
        ),
      ].join('\n');
    }
    declarationBlock.addClassMember(queryFieldName, `${DART_AMPLIFY_CORE_TYPES.QueryField}`, value, {
      static: true,
      final: true,
      inferType: true,
    });
  }

  protected getQueryFieldName(field: CodeGenField): string {
    return this.getFieldName(field).toUpperCase();
  }

  protected generateSchemaField(model: CodeGenModel, declarationBlock: DartDeclarationBlock, isNonModel: boolean = false): void {
    const schema = [
      `${DART_AMPLIFY_CORE_TYPES.Model}.defineSchema(define: (${DART_AMPLIFY_CORE_TYPES.ModelSchemaDefinition} modelSchemaDefinition) {`,
      indentMultiline(
        [
          `modelSchemaDefinition.name = "${this.getModelName(model)}";\nmodelSchemaDefinition.pluralName = "${this.pluralizeModelName(
            model,
          )}";`,
          this.generateAuthRules(model),
          this.generateIndexes(model),
          isNonModel ? this.generateNonModelAddFields(model) : this.generateAddFields(model),
        ]
          .filter(f => f)
          .join('\n\n'),
      ),
      '})',
    ].join('\n');
    declarationBlock.addClassMember('schema', '', schema, { static: true, var: true, inferType: true });
  }

  protected generateAuthRules(model: CodeGenModel): string {
    const authDirectives: AuthDirective[] = model.directives.filter(d => d.name === 'auth') as AuthDirective[];
    if (authDirectives.length) {
      const rules: string[] = [];
      authDirectives.forEach(directive => {
        directive.arguments?.rules.forEach(rule => {
          const authRule: string[] = [];
          const authStrategy = `authStrategy: ${DART_AMPLIFY_CORE_TYPES.AuthStrategy}.${rule.allow.toUpperCase()}`;
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
          if (rule.provider) {
            authRule.push(`provider: ${DART_AMPLIFY_CORE_TYPES.AuthRuleProvider}.${rule.provider.toUpperCase()}`);
          }
          authRule.push(
            [
              'operations: const [',
              indentMultiline(rule.operations.map(op => `${DART_AMPLIFY_CORE_TYPES.ModelOperation}.${op.toUpperCase()}`).join(',\n')),
              ']',
            ].join('\n'),
          );
          rules.push(`${DART_AMPLIFY_CORE_TYPES.AuthRule}(\n${indentMultiline(authRule.join(',\n'))})`);
        });
      });
      if (rules.length) {
        return ['modelSchemaDefinition.authRules = [', indentMultiline(rules.join(',\n')), '];'].join('\n');
      }
    }
    return '';
  }

  protected generateIndexes(model: CodeGenModel): string {
    const indexes = model.directives
      .filter(directive => directive.name === 'key')
      .map(directive => {
        const name = directive.arguments.name ? `"${directive.arguments.name}"` : 'null';
        const fields: string = directive.arguments.fields.map((field: string) => `"${field}"`).join(', ');
        return `${DART_AMPLIFY_CORE_TYPES.ModelIndex}(fields: const [${fields}], name: ${name})`;
      });

    if (indexes.length) {
      return ['modelSchemaDefinition.indexes = [', indentMultiline(indexes.join(',\n')), '];'].join('\n');
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
          fieldsToAdd.push(`${DART_AMPLIFY_CORE_TYPES.ModelFieldDefinition}.id()`);
        }
        //field with @connection
        else if (field.connectionInfo) {
          const connectedModelName = this.getNativeType({ ...field, isList: false });
          switch (field.connectionInfo.kind) {
            case CodeGenConnectionType.HAS_ONE: {
              let associatedString = `associatedKey: ${connectedModelName}.${this.getQueryFieldName(field.connectionInfo.associatedWith)}`;
              if (field.connectionInfo.isUsingReferences) {
                const associatedFieldsString = field.connectionInfo.associatedWithFields.map(field => `${connectedModelName}.${this.getQueryFieldName(field)}`).join(', ')
                associatedString = `associatedKeys: [${associatedFieldsString}]`
              }
              fieldParam = [
                `key: ${modelName}.${queryFieldName}`,
                `isRequired: ${!field.isNullable}`,
                `ofModelName: '${connectedModelName}'`,
                associatedString,
              ].join(',\n');
              fieldsToAdd.push([`${DART_AMPLIFY_CORE_TYPES.ModelFieldDefinition}.hasOne(`, indentMultiline(fieldParam), ')'].join('\n'));
              break;
            }
            case CodeGenConnectionType.HAS_MANY: {
              let associatedString = `associatedKey: ${connectedModelName}.${this.getQueryFieldName(field.connectionInfo.associatedWith)}`;
              if (field.connectionInfo.isUsingReferences) {
                const associatedFieldsString = field.connectionInfo.associatedWithFields.map(field => `${connectedModelName}.${this.getQueryFieldName(field)}`).join(', ')
                associatedString = `associatedKeys: [${associatedFieldsString}]`
              }
              fieldParam = [
                `key: ${modelName}.${queryFieldName}`,
                `isRequired: ${!field.isNullable}`,
                `ofModelName: '${connectedModelName}'`,
                associatedString,
              ].join(',\n');
              fieldsToAdd.push([`${DART_AMPLIFY_CORE_TYPES.ModelFieldDefinition}.hasMany(`, indentMultiline(fieldParam), ')'].join('\n'));
              break;
            }
            case CodeGenConnectionType.BELONGS_TO:
              fieldParam = [
                `key: ${modelName}.${queryFieldName}`,
                `isRequired: ${!field.isNullable}`,
                this.isCustomPKEnabled()
                  ? `targetNames: [${field.connectionInfo.targetNames.map(target => `'${target}'`).join(', ')}]`
                  : `targetName: '${field.connectionInfo.targetName}'`,
                `ofModelName: '${connectedModelName}'`,
              ].join(',\n');
              fieldsToAdd.push([`${DART_AMPLIFY_CORE_TYPES.ModelFieldDefinition}.belongsTo(`, indentMultiline(fieldParam), ')'].join('\n'));
              break;
          }
        }
        //field with regular types
        else {
          const ofType = this.getOfType(field);
          let ofTypeStr: string;

          if (field.isList) {
            if (ofType === '.embedded') {
              ofTypeStr = `ofType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}.embeddedCollection, ofCustomTypeName: '${field.type}')`;
            } else {
              ofTypeStr = `ofType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}.collection, ofModelName: ${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}${ofType}.name)`;
            }
          } else if (ofType === '.embedded') {
            ofTypeStr = `ofType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}${ofType}, ofCustomTypeName: '${field.type}')`;
          } else {
            ofTypeStr = `ofType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}${ofType})`;
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
            [
              `${DART_AMPLIFY_CORE_TYPES.ModelFieldDefinition}.${
                ofType === '.embedded' ? 'embedded' : field.isReadOnly ? 'nonQueryField' : 'field'
              }(`,
              indentMultiline(fieldParam),
              ')',
            ].join('\n'),
          );
        }
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
          ofTypeStr = `ofType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}.embeddedCollection, ofCustomTypeName: '${field.type}')`;
        } else {
          ofTypeStr = `ofType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}.collection, ofModelName: ${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}${ofType}.name)`;
        }
      } else if (ofType === '.embedded') {
        ofTypeStr = `ofType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}${ofType}, ofCustomTypeName: '${field.type}')`;
      } else {
        ofTypeStr = `ofType: ${DART_AMPLIFY_CORE_TYPES.ModelFieldType}(${DART_AMPLIFY_CORE_TYPES.ModelFieldTypeEnum}${ofType})`;
      }

      const fieldParam = [
        `fieldName: '${fieldName}'`,
        `isRequired: ${this.isFieldRequired(field)}`,
        field.isList ? 'isArray: true' : '',
        ofTypeStr,
      ]
        .filter(f => f)
        .join(',\n');

      fieldsToAdd.push(
        [
          `${DART_AMPLIFY_CORE_TYPES.ModelFieldDefinition}.${ofType === '.embedded' ? 'embedded' : 'customTypeField'}(`,
          indentMultiline(fieldParam),
          ')',
        ].join('\n'),
      );
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

  protected getModelIdentifierFields(model: CodeGenModel): CodeGenField[] {
    if (this.selectedTypeIsNonModel()) {
      return [];
    }
    if (!this.config.respectPrimaryKeyAttributesOnConnectionField) {
      return [model.fields.find(f => f.name === 'id')!];
    }
    const primaryKeyField = this.getModelPrimaryKeyField(model);
    const { sortKeyFields } = primaryKeyField.primaryKeyInfo!;
    return [primaryKeyField, ...sortKeyFields];
  }

  protected isFieldRequired(field: CodeGenField): boolean {
    if (this.isHasManyConnectionField(field)) {
      return false;
    }
    return !((field.isNullable && !field.isList) || field.isListNullable);
  }

  protected isHasManyConnectionField(field: CodeGenField): boolean {
    if (field.connectionInfo && field.connectionInfo.kind === CodeGenConnectionType.HAS_MANY) {
      return true;
    }
    return false;
  }

  protected getNullableTypeStr(type: string): string {
    return `${type}?`;
  }

  protected getWritableFields(model: CodeGenModel, excludeIdentifierFields: boolean = false): CodeGenField[] {
    const identifierFields = this.getModelIdentifierFields(model);
    return model.fields.filter(f => {
      if (!excludeIdentifierFields && !f.isReadOnly) {
        return true;
      }

      return !f.isReadOnly && identifierFields.findIndex(field => field.name == f.name) == -1;
    });
  }
}
