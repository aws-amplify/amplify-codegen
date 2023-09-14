import { indent, indentMultiline, transformComment } from '@graphql-codegen/visitor-plugin-common';
import { camelCase, constantCase, pascalCase } from 'change-case';
import dedent from 'ts-dedent';
import {
  MODEL_CLASS_IMPORT_PACKAGES,
  GENERATED_PACKAGE_NAME,
  LOADER_CLASS_NAME,
  LOADER_IMPORT_PACKAGES,
  CONNECTION_RELATIONSHIP_IMPORTS,
  NON_MODEL_CLASS_IMPORT_PACKAGES,
  MODEL_AUTH_CLASS_IMPORT_PACKAGES,
  CUSTOM_PRIMARY_KEY_IMPORT_PACKAGE,
} from '../configs/java-config';
import { JAVA_TYPE_IMPORT_MAP } from '../scalars';
import { JavaDeclarationBlock } from '../languages/java-declaration-block';
import {
  AppSyncModelVisitor,
  CodeGenField,
  CodeGenModel,
  CodeGenPrimaryKeyType,
  ParsedAppSyncModelConfig,
  RawAppSyncModelConfig,
} from './appsync-visitor';
import { CodeGenConnectionType } from '../utils/process-connections';
import { AuthDirective, AuthStrategy } from '../utils/process-auth';
import { printWarning } from '../utils/warn';
import { validateFieldName } from '../utils/validate-field-name';

export class AppSyncModelJavaVisitor<
  TRawConfig extends RawAppSyncModelConfig = RawAppSyncModelConfig,
  TPluginConfig extends ParsedAppSyncModelConfig = ParsedAppSyncModelConfig
> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
  protected additionalPackages: Set<string> = new Set();
  protected usingAuth: boolean = false;

  generate(): string {
    // TODO: Remove us, leaving in to be explicit on why this flag is here.
    const shouldUseModelNameFieldInHasManyAndBelongsTo = true;
    // This flag is going to be used to tight-trigger on JS implementations only.
    const shouldImputeKeyForUniDirectionalHasMany = false;
    this.processDirectives(shouldUseModelNameFieldInHasManyAndBelongsTo, shouldImputeKeyForUniDirectionalHasMany);

    if (this._parsedConfig.generate === 'loader') {
      return this.generateClassLoader();
    }
    validateFieldName({ ...this.getSelectedModels(), ...this.getSelectedNonModels() });
    if (this.selectedTypeIsEnum()) {
      return this.generateEnums();
    } else if (this.selectedTypeIsNonModel()) {
      return this.generateNonModelClasses();
    }
    return this.generateModelClasses();
  }

  generateClassLoader(): string {
    const AMPLIFY_MODEL_VERSION = 'AMPLIFY_MODEL_VERSION';
    const result: string[] = [this.generatePackageName(), '', this.generateImportStatements(LOADER_IMPORT_PACKAGES)];
    result.push(
      transformComment(dedent` Contains the set of model classes that implement {@link Model}
    interface.`),
    );

    const loaderClassDeclaration = new JavaDeclarationBlock()
      .withName(LOADER_CLASS_NAME)
      .access('public')
      .final()
      .asKind('class')
      .implements(['ModelProvider']);

    // Schema version
    // private static final String AMPLIFY_MODELS_VERSION = "hash-code";
    loaderClassDeclaration.addClassMember(AMPLIFY_MODEL_VERSION, 'String', `"${this.computeVersion()}"`, [], 'private', {
      final: true,
      static: true,
    });

    // singleton instance
    // private static AmplifyCliGeneratedModelProvider amplifyCliGeneratedModelStoreInstance;
    loaderClassDeclaration.addClassMember('amplifyGeneratedModelInstance', LOADER_CLASS_NAME, '', [], 'private', { static: true });

    // private constructor for singleton
    loaderClassDeclaration.addClassMethod(LOADER_CLASS_NAME, null, '', [], [], 'private');

    // getInstance
    const getInstanceBody = dedent`
    if (amplifyGeneratedModelInstance == null) {
      amplifyGeneratedModelInstance = new ${LOADER_CLASS_NAME}();
    }
    return amplifyGeneratedModelInstance;`;
    loaderClassDeclaration.addClassMethod('getInstance', LOADER_CLASS_NAME, getInstanceBody, [], [], 'public', {
      static: true,
      synchronized: true,
    });

    // models method
    const modelsMethodDocString = dedent`
    Get a set of the model classes.

    @return a set of the model classes.`;

    const classList = Object.values(this.modelMap)
      .map(model => `${this.getModelName(model)}.class`)
      .join(', ');
    const modelsMethodImplementation = `final Set<Class<? extends Model>> modifiableSet = new HashSet<>(
      Arrays.<Class<? extends Model>>asList(${classList})
    );

    return Immutable.of(modifiableSet);
    `;
    loaderClassDeclaration.addClassMethod(
      'models',
      'Set<Class<? extends Model>>',
      modelsMethodImplementation,
      [],
      [],
      'public',
      {},
      ['Override'],
      undefined,
      modelsMethodDocString,
    );

    // version method
    const versionMethodDocString = dedent`
    Get the version of the models.

    @return the version string of the models.
    `;
    loaderClassDeclaration.addClassMethod(
      'version',
      'String',
      `return ${AMPLIFY_MODEL_VERSION};`,
      [],
      [],
      'public',
      {},
      ['Override'],
      undefined,
      versionMethodDocString,
    );

    result.push(loaderClassDeclaration.string);
    return result.join('\n');
  }
  generateEnums(): string {
    const result: string[] = [this.generatePackageName()];
    Object.entries(this.getSelectedEnums()).forEach(([name, enumValue]) => {
      const enumDeclaration = new JavaDeclarationBlock()
        .asKind('enum')
        .access('public')
        .withName(this.getEnumName(enumValue))
        .annotate(['SuppressWarnings("all")'])
        .withComment('Auto generated enum from GraphQL schema.');
      const body = Object.values(enumValue.values);
      enumDeclaration.withBlock(indentMultiline(body.join(',\n')));
      result.push(enumDeclaration.string);
    });
    return result.join('\n');
  }

  generateModelClasses(): string {
    const result: string[] = [];
    Object.entries(this.getSelectedModels()).forEach(([name, model]) => {
      const modelDeclaration = this.generateModelClass(model);
      result.push(...[modelDeclaration]);
    });
    const packageDeclaration = this.generatePackageHeader();
    return [packageDeclaration, ...result].join('\n');
  }

  generateNonModelClasses(): string {
    const result: string[] = [];
    Object.entries(this.getSelectedNonModels()).forEach(([name, type]) => {
      const nonModelDeclaration = this.generateNonModelClass(type);
      result.push(...[nonModelDeclaration]);
    });
    const packageDeclaration = this.generatePackageHeader(false);
    return [packageDeclaration, ...result].join('\n');
  }

  generatePackageName(): string {
    return `package ${GENERATED_PACKAGE_NAME};`;
  }
  generateModelClass(model: CodeGenModel): string {
    const classDeclarationBlock = new JavaDeclarationBlock()
      .asKind('class')
      .access('public')
      .withName(this.getModelName(model))
      .implements(['Model'])
      .withComment(`This is an auto generated class representing the ${model.name} type in your schema.`)
      .final();

    const annotations = this.generateModelAnnotations(model);
    classDeclarationBlock.annotate(annotations);

    const queryFields = this.getWritableFields(model);
    queryFields.forEach(field => this.generateQueryFields(model, field, classDeclarationBlock));
    const nonConnectedFields = this.getNonConnectedField(model);
    model.fields.forEach(field => {
      const value = nonConnectedFields.includes(field) ? '' : 'null';
      this.generateModelField(field, value, classDeclarationBlock);
    });
    let isCompositeKey: boolean = false;
    let isIdAsModelPrimaryKey: boolean = true;
    if (this.config.respectPrimaryKeyAttributesOnConnectionField) {
      const primaryKeyField = this.getModelPrimaryKeyField(model);
      const { primaryKeyType, sortKeyFields } = primaryKeyField.primaryKeyInfo!;
      isCompositeKey = primaryKeyType === CodeGenPrimaryKeyType.CustomId && sortKeyFields.length > 0;
      isIdAsModelPrimaryKey = primaryKeyType !== CodeGenPrimaryKeyType.CustomId;
    }

    if (this.isCustomPKEnabled() && isCompositeKey) {
      // Generate primary key class for composite key
      this.generateIdentifierClassField(model, classDeclarationBlock);
    }
    // step interface declarations
    this.generateStepBuilderInterfaces(model, isIdAsModelPrimaryKey).forEach((builderInterface: JavaDeclarationBlock) => {
      classDeclarationBlock.nestedClass(builderInterface);
    });

    // builder
    this.generateBuilderClass(model, classDeclarationBlock, isIdAsModelPrimaryKey);

    // copyOfBuilder for used for updating existing instance
    this.generateCopyOfBuilderClass(model, classDeclarationBlock, isIdAsModelPrimaryKey);

    if (this.isCustomPKEnabled()) {
      // Generate ModelIdentifier factory for all Model types
      this.generateModelIdentifierClass(model, classDeclarationBlock);

      // resolveIdentifier
      this.generateResolveIdentifier(model, classDeclarationBlock, isCompositeKey);
    }

    // getters
    this.generateGetters(model, classDeclarationBlock);

    // constructor
    this.generateConstructor(model, classDeclarationBlock);

    // equals
    this.generateEqualsMethod(model, classDeclarationBlock);

    // hash code
    this.generateHashCodeMethod(model, classDeclarationBlock);

    // toString
    this.generateToStringMethod(model, classDeclarationBlock);

    // builder
    this.generateBuilderMethod(model, classDeclarationBlock, isIdAsModelPrimaryKey);

    // justId method
    if (isIdAsModelPrimaryKey) {
      this.generateJustIdMethod(model, classDeclarationBlock);
    }

    // copyBuilder method
    this.generateCopyOfBuilderMethod(model, classDeclarationBlock);

    return classDeclarationBlock.string;
  }

  generateNonModelClass(nonModel: CodeGenModel): string {
    const classDeclarationBlock = new JavaDeclarationBlock()
      .asKind('class')
      .access('public')
      .withName(this.getModelName(nonModel))
      .withComment(`This is an auto generated class representing the ${nonModel.name} type in your schema.`)
      .final();

    const nonConnectedFields = this.getNonConnectedField(nonModel);
    nonModel.fields.forEach(field => {
      const value = nonConnectedFields.includes(field) ? '' : 'null';
      this.generateNonModelField(field, value, classDeclarationBlock);
    });

    // step interface declarations
    this.generateStepBuilderInterfaces(nonModel, false).forEach((builderInterface: JavaDeclarationBlock) => {
      classDeclarationBlock.nestedClass(builderInterface);
    });

    // builder
    this.generateBuilderClass(nonModel, classDeclarationBlock, false);

    // copyOfBuilder for used for updating existing instance
    this.generateCopyOfBuilderClass(nonModel, classDeclarationBlock, false);
    // getters
    this.generateGetters(nonModel, classDeclarationBlock);

    // constructor
    this.generateConstructor(nonModel, classDeclarationBlock);

    // equals
    this.generateEqualsMethod(nonModel, classDeclarationBlock);
    // hash code
    this.generateHashCodeMethod(nonModel, classDeclarationBlock);

    // builder
    this.generateBuilderMethod(nonModel, classDeclarationBlock, false);

    // copyBuilder method
    this.generateCopyOfBuilderMethod(nonModel, classDeclarationBlock);

    return classDeclarationBlock.string;
  }

  protected generatePackageHeader(isModel: boolean = true): string {
    let baseImports;
    if (isModel) {
      if (this.usingAuth) {
        baseImports = MODEL_AUTH_CLASS_IMPORT_PACKAGES;
      } else {
        baseImports = MODEL_CLASS_IMPORT_PACKAGES;
      }
    } else {
      baseImports = NON_MODEL_CLASS_IMPORT_PACKAGES;
    }
    const imports = this.generateImportStatements([...Array.from(this.additionalPackages), '', ...baseImports]);
    return [this.generatePackageName(), '', imports].join('\n');
  }

  /**
   * generate import statements.
   * @param packages
   *
   * @returns string
   */
  protected generateImportStatements(packages: string[]): string {
    return packages.map(pkg => (pkg ? `import ${pkg};` : '')).join('\n');
  }
  /**
   * Add query field used for construction of conditions by SyncEngine
   */
  protected generateQueryFields(model: CodeGenModel, field: CodeGenField, classDeclarationBlock: JavaDeclarationBlock): void {
    const queryFieldName = constantCase(field.name);
    // belongsTo field is computed field. the value needed to query the field is in targetName
    const fieldName =
      field.connectionInfo && field.connectionInfo.kind === CodeGenConnectionType.BELONGS_TO
        ? field.connectionInfo.targetName
        : this.getFieldName(field);
    classDeclarationBlock.addClassMember(
      queryFieldName,
      'QueryField',
      `field("${this.getModelName(model)}", "${fieldName}")`,
      [],
      'public',
      {
        final: true,
        static: true,
      },
    );
  }
  /**
   * Add fields as members of the model class
   * @param field
   * @param classDeclarationBlock
   */
  protected generateModelField(field: CodeGenField, value: string, classDeclarationBlock: JavaDeclarationBlock): void {
    const annotations = this.generateFieldAnnotations(field);
    const fieldType = this.getNativeType(field);
    const fieldName = this.getFieldName(field);
    classDeclarationBlock.addClassMember(fieldName, fieldType, value, annotations, 'private', {
      final: !field.isReadOnly,
    });
  }
  /**
   * Add non field members of the non model class
   */
  protected generateNonModelField(field: CodeGenField, value: string, classDeclarationBlock: JavaDeclarationBlock): void {
    const fieldType = this.getNativeType(field);
    const fieldName = this.getFieldName(field);
    classDeclarationBlock.addClassMember(fieldName, fieldType, value, [], 'private', {
      final: true,
    });
  }

  /**
   * Generate primary key field for composite key
   * @param model
   * @param classDeclaration
   */
  protected generateIdentifierClassField(model: CodeGenModel, classDeclaration: JavaDeclarationBlock): void {
    classDeclaration.addClassMember(
      this.getModelIdentifierClassFieldName(model),
      this.getModelIdentifierClassName(model),
      '',
      undefined,
      'private',
    );
  }
  /**
   * Generate step builder interfaces for each non-null field in the model
   *
   */
  protected generateStepBuilderInterfaces(model: CodeGenModel, isIdAsModelPrimaryKey: boolean = true): JavaDeclarationBlock[] {
    const nonNullableFields = this.getWritableFields(model).filter(field => this.isRequiredField(field));
    const nullableFields = this.getWritableFields(model).filter(field => !this.isRequiredField(field));
    const requiredInterfaces = nonNullableFields.filter(
      (field: CodeGenField) => !(isIdAsModelPrimaryKey && this.READ_ONLY_FIELDS.includes(field.name)),
    );
    const types = this.getTypesUsedByModel(model);

    const interfaces = requiredInterfaces.map((field, idx) => {
      const isLastField = requiredInterfaces.length - 1 === idx ? true : false;
      const returnType = isLastField ? 'Build' : requiredInterfaces[idx + 1].name;
      const interfaceName = this.getStepInterfaceName(field.name, types);
      const methodName = this.getStepFunctionName(field);
      const argumentType = this.getNativeType(field);
      const argumentName = this.getStepFunctionArgumentName(field);
      const interfaceDeclaration = new JavaDeclarationBlock()
        .asKind('interface')
        .withName(interfaceName)
        .access('public');
      interfaceDeclaration.withBlock(
        indent(`${this.getStepInterfaceName(returnType, types)} ${methodName}(${argumentType} ${argumentName});`),
      );
      return interfaceDeclaration;
    });

    // Builder
    const builder = new JavaDeclarationBlock()
      .asKind('interface')
      .withName(this.getStepInterfaceName('Build', types))
      .access('public');
    const builderBody = [];
    // build method
    builderBody.push(`${this.getModelName(model)} build();`);

    if (isIdAsModelPrimaryKey) {
      // id method. Special case as this can throw exception
      builderBody.push(`${this.getStepInterfaceName('Build', types)} id(String id);`);
    }

    nullableFields.forEach(field => {
      const fieldName = this.getStepFunctionArgumentName(field);
      const methodName = this.getStepFunctionName(field);
      builderBody.push(`${this.getStepInterfaceName('Build', types)} ${methodName}(${this.getNativeType(field)} ${fieldName});`);
    });

    builder.withBlock(indentMultiline(builderBody.join('\n')));
    return [...interfaces, builder];
  }

  /**
   * Generate the Builder class
   * @param model
   * @returns JavaDeclarationBlock
   */
  protected generateBuilderClass(model: CodeGenModel, classDeclaration: JavaDeclarationBlock, isIdAsModelPrimaryKey: boolean = true): void {
    const nonNullableFields = this.getWritableFields(model).filter(field => this.isRequiredField(field));
    const nullableFields = this.getWritableFields(model).filter(field => !this.isRequiredField(field));
    const stepFields = nonNullableFields.filter(
      (field: CodeGenField) => !(isIdAsModelPrimaryKey && this.READ_ONLY_FIELDS.includes(field.name)),
    );
    const types = this.getTypesUsedByModel(model);
    const stepInterfaces = stepFields.map((field: CodeGenField) => this.getStepInterfaceName(field.name, types));

    const builderClassDeclaration = new JavaDeclarationBlock()
      .access('public')
      .static()
      .asKind('class')
      .withName('Builder')
      .implements([...stepInterfaces, this.getStepInterfaceName('Build', types)]);

    // Add private instance fields
    [...nonNullableFields, ...nullableFields].forEach((field: CodeGenField) => {
      const fieldName = this.getFieldName(field);
      builderClassDeclaration.addClassMember(fieldName, this.getNativeType(field), '', undefined, 'private');
    });

    // methods
    // build();
    const buildImplementation = isIdAsModelPrimaryKey
      ? [`String id = this.id != null ? this.id : UUID.randomUUID().toString();`, '']
      : [''];
    const buildParams = this.getWritableFields(model)
      .map(field => this.getFieldName(field))
      .join(',\n');
    buildImplementation.push(`return new ${this.getModelName(model)}(\n${indentMultiline(buildParams)});`);
    builderClassDeclaration.addClassMethod(
      'build',
      this.getModelName(model),
      indentMultiline(buildImplementation.join('\n')),
      undefined,
      [],
      'public',
      {},
      ['Override'],
    );

    // non-nullable fields
    stepFields.forEach((field: CodeGenField, idx: number, fields) => {
      const isLastStep = idx === fields.length - 1;
      const fieldName = this.getFieldName(field);
      const methodName = this.getStepFunctionName(field);
      const returnType = isLastStep ? this.getStepInterfaceName('Build', types) : this.getStepInterfaceName(fields[idx + 1].name, types);
      const argumentType = this.getNativeType(field);
      const argumentName = this.getStepFunctionArgumentName(field);
      const body = [`Objects.requireNonNull(${argumentName});`, `this.${fieldName} = ${argumentName};`, `return this;`].join('\n');
      builderClassDeclaration.addClassMethod(
        methodName,
        returnType,
        indentMultiline(body),
        [{ name: argumentName, type: argumentType }],
        [],
        'public',
        {},
        ['Override'],
      );
    });

    // nullable fields
    nullableFields.forEach((field: CodeGenField) => {
      const fieldName = this.getFieldName(field);
      const methodName = this.getStepFunctionName(field);
      const returnType = this.getStepInterfaceName('Build', types);
      const argumentType = this.getNativeType(field);
      const argumentName = this.getStepFunctionArgumentName(field);
      const body = [`this.${fieldName} = ${argumentName};`, `return this;`].join('\n');
      builderClassDeclaration.addClassMethod(
        methodName,
        returnType,
        indentMultiline(body),
        [{ name: argumentName, type: argumentType }],
        [],
        'public',
        {},
        ['Override'],
      );
    });

    if (isIdAsModelPrimaryKey) {
      // Add id builder
      const idBuildStepBody = dedent`this.id = id;
    return this;`;

      const idComment = dedent`
    @param id id
    @return Current Builder instance, for fluent method chaining`;

      builderClassDeclaration.addClassMethod(
        'id',
        this.getStepInterfaceName('Build', types),
        indentMultiline(idBuildStepBody),
        [{ name: 'id', type: 'String' }],
        [],
        'public',
        {},
        [],
        [],
        idComment,
      );
    }
    classDeclaration.nestedClass(builderClassDeclaration);
  }

  /**
   * * Generate a CopyOfBuilder class that will be used to create copy of the current model.
   * This is needed to mutate the object as all the generated models are immuteable and can
   * be update only by creating a new instance using copyOfBuilder
   * @param model
   * @param classDeclaration
   */
  protected generateCopyOfBuilderClass(
    model: CodeGenModel,
    classDeclaration: JavaDeclarationBlock,
    isIdAsModelPrimaryKey: boolean = true,
  ): void {
    const builderName = 'CopyOfBuilder';
    const copyOfBuilderClassDeclaration = new JavaDeclarationBlock()
      .access('public')
      .final()
      .asKind('class')
      .withName(builderName)
      .extends(['Builder']);

    const nonNullableFields = this.getWritableFields(model)
      .filter(field => this.isRequiredField(field))
      .filter(f => (isIdAsModelPrimaryKey ? f.name !== 'id' : true));
    const nullableFields = this.getWritableFields(model).filter(field => !this.isRequiredField(field));

    // constructor
    const constructorArguments = this.getWritableFields(model).map(field => ({
      name: this.getStepFunctionArgumentName(field),
      type: this.getNativeType(field),
    }));
    const stepBuilderInvocation = [...nonNullableFields, ...nullableFields].map(field => {
      const methodName = this.getStepFunctionName(field);
      const argumentName = this.getStepFunctionArgumentName(field);
      return `.${methodName}(${argumentName})`;
    });
    const invocations =
      stepBuilderInvocation.length === 0 ? '' : ['super', indentMultiline(stepBuilderInvocation.join('\n')).trim(), ';'].join('');
    const body = [...(isIdAsModelPrimaryKey ? ['super.id(id);'] : []), invocations].join('\n');
    copyOfBuilderClassDeclaration.addClassMethod(builderName, null, body, constructorArguments, [], 'private');

    // Non-nullable field setters need to be added to NewClass as this is not a step builder
    [...nonNullableFields, ...nullableFields].forEach(field => {
      const methodName = this.getStepFunctionName(field);
      const argumentName = this.getStepFunctionArgumentName(field);
      const argumentType = this.getNativeType(field);
      const implementation = `return (${builderName}) super.${methodName}(${argumentName});`;
      copyOfBuilderClassDeclaration.addClassMethod(
        methodName,
        builderName,
        implementation,
        [
          {
            name: argumentName,
            type: argumentType,
          },
        ],
        [],
        'public',
        {},
        ['Override'],
      );
    });
    classDeclaration.nestedClass(copyOfBuilderClassDeclaration);
  }

  /**
   * Generate model primary key class for models with custom primary key only.
   * @param model
   * @param classDeclaration
   */
  protected generateModelIdentifierClass(model: CodeGenModel, classDeclaration: JavaDeclarationBlock): void {
    const primaryKeyField = this.getModelPrimaryKeyField(model);
    const { sortKeyFields } = primaryKeyField.primaryKeyInfo!;
    // Generate primary key class for composite key
    this.additionalPackages.add(CUSTOM_PRIMARY_KEY_IMPORT_PACKAGE);
    const modelPrimaryKeyClassName = this.getModelIdentifierClassName(model);
    const primaryKeyClassDeclaration = new JavaDeclarationBlock()
      .access('public')
      .static()
      .asKind('class')
      .withName(modelPrimaryKeyClassName)
      .extends([`ModelIdentifier<${this.getModelName(model)}>`]);
    // serial version field
    primaryKeyClassDeclaration.addClassMember('serialVersionUID', 'long', '1L', [], 'private', { static: true, final: true });
    // constructor
    const primaryKeyComponentFields: CodeGenField[] = [primaryKeyField, ...sortKeyFields];
    const constructorParams = primaryKeyComponentFields.map(field => ({ name: this.getFieldName(field), type: this.getNativeType(field) }));
    const constructorImpl = `super(${primaryKeyComponentFields.map(field => this.getFieldName(field)).join(', ')});`;
    primaryKeyClassDeclaration.addClassMethod(modelPrimaryKeyClassName, null, constructorImpl, constructorParams, [], 'public');
    classDeclaration.nestedClass(primaryKeyClassDeclaration);
  }

  /**
   * adds a copyOfBuilder method to the Model class. This method is used to create a copy of the model to mutate it
   */
  protected generateCopyOfBuilderMethod(model: CodeGenModel, classDeclaration: JavaDeclarationBlock): void {
    const args = indentMultiline(
      this.getWritableFields(model)
        .map(field => this.getFieldName(field))
        .join(',\n'),
    ).trim();
    const methodBody = `return new CopyOfBuilder(${args});`;
    classDeclaration.addClassMethod('copyOfBuilder', 'CopyOfBuilder', methodBody, [], [], 'public');
  }
  /**
   * Generate resolve identifier method for model to retrieve pk
   * @param model
   * @param declarationsBlock
   */
  protected generateResolveIdentifier(model: CodeGenModel, declarationsBlock: JavaDeclarationBlock, isCompositeKey: boolean): void {
    const primaryKeyField = this.getModelPrimaryKeyField(model);
    const { sortKeyFields } = primaryKeyField.primaryKeyInfo!;
    const modelIdentifierClassFieldName = this.getModelIdentifierClassFieldName(model);
    const returnType = isCompositeKey ? this.getModelIdentifierClassName(model) : this.getNativeType(primaryKeyField);
    const body = isCompositeKey
      ? [
          `if (${modelIdentifierClassFieldName} == null) {`,
          indent(
            `this.${modelIdentifierClassFieldName} = new ${this.getModelIdentifierClassName(model)}(${[primaryKeyField, ...sortKeyFields]
              .map(f => this.getFieldName(f))
              .join(', ')});`,
          ),
          '}',
          `return ${modelIdentifierClassFieldName};`,
        ].join('\n')
      : `return ${this.getFieldName(primaryKeyField)};`;
    declarationsBlock.addClassMethod(
      'resolveIdentifier',
      returnType,
      body,
      [],
      [],
      'public',
      {},
      ['Deprecated'],
      [],
      '@deprecated This API is internal to Amplify and should not be used.',
    );
  }

  /**
   * Get model primary key class name
   * @param model codegen model
   * @returns model primary key class name
   */
  protected getModelIdentifierClassName(model: CodeGenModel): string {
    return `${this.getModelName(model)}Identifier`;
  }

  protected getModelIdentifierClassFieldName(model: CodeGenModel): string {
    const className = this.getModelIdentifierClassName(model);
    return className.charAt(0).toLowerCase() + className.slice(1);
  }

  /**
   * Generate getters for all the fields declared in the model. All the getter methods are added
   * to the declaration block passed
   * @param model
   * @param declarationsBlock
   */
  protected generateGetters(model: CodeGenModel, declarationsBlock: JavaDeclarationBlock): void {
    model.fields.forEach((field: CodeGenField) => {
      const fieldName = this.getFieldName(field);
      const returnType = this.getNativeType(field);
      const methodName = this.getFieldGetterName(field);
      const body = indent(`return ${fieldName};`);
      declarationsBlock.addClassMethod(methodName, returnType, body, undefined, undefined, 'public');
    });
  }

  /**
   * Generate Java field getter name
   * @param field codegen field
   */
  protected getFieldGetterName(field: CodeGenField): string {
    return `get${pascalCase(field.name)}`;
  }

  /**
   * generates the method name used in step builder
   * @param field
   */
  protected getStepFunctionName(field: CodeGenField): string {
    return camelCase(field.name);
  }

  /**
   * generates Step function argument
   * @param field
   */
  protected getStepFunctionArgumentName(field: CodeGenField): string {
    return camelCase(field.name);
  }

  /**
   * Generate constructor for the class
   * @param model CodeGenModel
   * @param declarationsBlock Class Declaration block to which constructor will be added
   */
  protected generateConstructor(model: CodeGenModel, declarationsBlock: JavaDeclarationBlock): void {
    const name = this.getModelName(model);
    const body = this.getWritableFields(model)
      .map((field: CodeGenField) => {
        const fieldName = this.getFieldName(field);
        return `this.${fieldName} = ${fieldName};`;
      })
      .join('\n');

    const constructorArguments = this.getWritableFields(model).map(field => ({
      name: this.getFieldName(field),
      type: this.getNativeType(field),
    }));
    declarationsBlock.addClassMethod(name, null, body, constructorArguments, undefined, 'private');
  }

  protected getNativeType(field: CodeGenField): string {
    const nativeType = super.getNativeType(field);
    if (Object.keys(JAVA_TYPE_IMPORT_MAP).includes(nativeType)) {
      this.additionalPackages.add(JAVA_TYPE_IMPORT_MAP[nativeType]);
    }
    return nativeType;
  }

  /**
   * Generate code for equals method
   * @param model
   * @param declarationBlock
   */
  protected generateEqualsMethod(model: CodeGenModel, declarationBlock: JavaDeclarationBlock): void {
    const paramName = 'obj';
    const className = this.getModelName(model);
    const instanceName = camelCase(model.name);

    const body = [
      `if (this == ${paramName}) {`,
      '  return true;',
      `} else if(${paramName} == null || getClass() != ${paramName}.getClass()) {`,
      '  return false;',
      '} else {',
    ];

    body.push(`${className} ${instanceName} = (${className}) ${paramName};`);
    const propCheck = indentMultiline(
      this.getNonConnectedField(model)
        .map(field => {
          const getterName = this.getFieldGetterName(field);
          return `ObjectsCompat.equals(${getterName}(), ${instanceName}.${getterName}())`;
        })
        .join(' &&\n'),
      4,
    ).trim();

    body.push(`return ${propCheck};`);
    body.push('}');

    declarationBlock.addClassMethod(
      'equals',
      'boolean',
      indentMultiline(body.join('\n')),
      [{ name: paramName, type: 'Object' }],
      [],
      'public',
      {},
      ['Override'],
    );
  }

  protected generateHashCodeMethod(model: CodeGenModel, declarationBlock: JavaDeclarationBlock): void {
    const body = [
      'return new StringBuilder()',
      ...this.getNonConnectedField(model).map(field => `.append(${this.getFieldGetterName(field)}())`),
      '.toString()',
      '.hashCode();',
    ].join('\n');
    declarationBlock.addClassMethod('hashCode', 'int', indentMultiline(body).trimLeft(), [], [], 'public', {}, ['Override']);
  }

  protected generateToStringMethod(model: CodeGenModel, declarationBlock: JavaDeclarationBlock): void {
    const fields = this.getNonConnectedField(model).map(field => {
      const fieldName = this.getFieldName(field);
      const fieldGetterName = this.getFieldGetterName(field);

      return '"' + fieldName + '=" + String.valueOf(' + fieldGetterName + '())';
    });

    const body = [
      'return new StringBuilder()',
      `.append("${this.getModelName(model)} {")`,
      fields
        .map((field, index) => {
          let fieldDelimiter = '';
          if (fields.length - index - 1 !== 0) {
            fieldDelimiter = ' + ", "';
          }
          return '.append(' + field + fieldDelimiter + ')';
        })
        .join('\n'),
      '.append("}")',
      '.toString();',
    ];
    declarationBlock.addClassMethod('toString', 'String', indentMultiline(body.join('\n')).trimLeft(), [], [], 'public', {}, ['Override']);
  }

  /**
   * Generate the builder method to get an instance of Builder class
   * @param model
   * @param classDeclaration
   */
  protected generateBuilderMethod(
    model: CodeGenModel,
    classDeclaration: JavaDeclarationBlock,
    isIdAsModelPrimaryKey: boolean = true,
  ): void {
    const requiredFields = this.getWritableFields(model).filter(
      field => !field.isNullable && !(isIdAsModelPrimaryKey && this.READ_ONLY_FIELDS.includes(field.name)),
    );
    const types = this.getTypesUsedByModel(model);
    const returnType = requiredFields.length
      ? this.getStepInterfaceName(requiredFields[0].name, types)
      : this.getStepInterfaceName('Build', types);
    classDeclaration.addClassMethod(
      'builder',
      returnType,
      indentMultiline(`return new Builder();`),
      [],
      [],
      'public',
      { static: true },
      [],
    );
  }

  /**
   * Generate the name of the step builder interface
   * @param nextFieldName: string
   * @param types: string - set of types for all fields on model
   * @returns string
   */
  private getStepInterfaceName(nextFieldName: string, types: Set<string>): string {
    const pascalCaseFieldName = pascalCase(nextFieldName);
    const stepInterfaceName = `${pascalCaseFieldName}Step`;

    if (types.has(stepInterfaceName)) {
      return `${pascalCaseFieldName}BuildStep`;
    }

    return stepInterfaceName;
  }

  /**
   * Get set of all types used by a model
   * @param model
   * @return Set<string>
   */
  private getTypesUsedByModel(model: CodeGenModel): Set<string> {
    return new Set(model.fields.map(field => field.type));
  }

  protected generateModelAnnotations(model: CodeGenModel): string[] {
    const annotations: string[] = model.directives.map(directive => {
      switch (directive.name) {
        case 'model':
          const modelArgs: string[] = [];
          const authDirectives: AuthDirective[] = model.directives.filter(d => d.name === 'auth') as AuthDirective[];
          const authRules = this.generateAuthRules(authDirectives);
          modelArgs.push(`pluralName = "${this.pluralizeModelName(model)}"`);
          if (this.isCustomPKEnabled()) {
            modelArgs.push(`type = Model.Type.USER`);
            modelArgs.push(`version = 1`);
          }
          if (authRules.length) {
            this.usingAuth = true;
            modelArgs.push(`authRules = ${authRules}`);
          }
          return `ModelConfig(${modelArgs.join(', ')})`;
        case 'key':
          const keyArgs: string[] = [];
          keyArgs.push(`name = "${directive.arguments.name}"`);
          keyArgs.push(`fields = {${(directive.arguments.fields as string[]).map((f: string) => `"${f}"`).join(',')}}`);
          return `Index(${keyArgs.join(', ')})`;
        default:
          break;
      }
      return '';
    });

    return ['SuppressWarnings("all")', ...annotations].filter(annotation => annotation);
  }

  protected generateAuthRules(authDirectives: AuthDirective[]): string {
    const operationMapping = {
      create: 'ModelOperation.CREATE',
      read: 'ModelOperation.READ',
      update: 'ModelOperation.UPDATE',
      delete: 'ModelOperation.DELETE',
    };
    const rules: string[] = [];
    authDirectives.forEach(directive => {
      directive.arguments?.rules.forEach(rule => {
        const authRule = [];
        switch (rule.allow) {
          case AuthStrategy.owner:
            authRule.push('allow = AuthStrategy.OWNER');
            authRule.push(`ownerField = "${rule.ownerField}"`);
            authRule.push(`identityClaim = "${rule.identityClaim}"`);
            break;
          case AuthStrategy.private:
            authRule.push('allow = AuthStrategy.PRIVATE');
            break;
          case AuthStrategy.public:
            authRule.push('allow = AuthStrategy.PUBLIC');
            break;
          case AuthStrategy.groups:
            authRule.push('allow = AuthStrategy.GROUPS');
            authRule.push(`groupClaim = "${rule.groupClaim}"`);
            if (rule.groups) {
              authRule.push(`groups = { ${rule.groups?.map(group => `"${group}"`).join(', ')} }`);
            } else {
              authRule.push(`groupsField = "${rule.groupField}"`);
            }
            break;
          default:
            printWarning(`Model has auth with authStrategy ${rule.allow} of which is not yet supported`);
            return;
        }
        if (rule.provider != null) {
          authRule.push(`provider = "${rule.provider}"`);
        }
        authRule.push(`operations = { ${rule.operations?.map(op => operationMapping[op]).join(', ')} }`);
        rules.push(`@AuthRule(${authRule.join(', ')})`);
      });
    });
    if (rules.length) {
      return ['{', `${indentMultiline(rules.join(',\n'))}`, '}'].join('\n');
    }
    return '';
  }

  protected generateFieldAnnotations(field: CodeGenField): string[] {
    const annotations: string[] = [];
    annotations.push(this.generateModelFieldAnnotation(field));
    annotations.push(this.generateConnectionAnnotation(field));
    return annotations.filter(annotation => annotation);
  }

  protected generateModelFieldAnnotation(field: CodeGenField): string {
    const authDirectives: AuthDirective[] = field.directives.filter(d => d.name === 'auth') as AuthDirective[];
    const authRules = this.generateAuthRules(authDirectives);
    if (authRules.length) {
      this.usingAuth = true;
    }
    const annotationArgs: string[] = [
      `targetType="${field.type}"`,
      this.isRequiredField(field) ? 'isRequired = true' : '',
      authRules.length ? `authRules = ${authRules}` : '',
      field.isReadOnly ? 'isReadOnly = true' : '',
    ].filter(arg => arg);

    return `ModelField${annotationArgs.length ? `(${annotationArgs.join(', ')})` : ''}`;
  }
  protected generateConnectionAnnotation(field: CodeGenField): string {
    if (!field.connectionInfo) return '';
    const { connectionInfo } = field;
    // Add annotation to import
    this.additionalPackages.add(CONNECTION_RELATIONSHIP_IMPORTS[connectionInfo.kind]);

    let connectionDirectiveName: string = '';
    const connectionArguments: string[] = [];

    switch (connectionInfo.kind) {
      case CodeGenConnectionType.HAS_ONE:
        connectionDirectiveName = 'HasOne';
        connectionArguments.push(`associatedWith = "${this.getFieldName(connectionInfo.associatedWith)}"`);
        break;
      case CodeGenConnectionType.HAS_MANY:
        connectionDirectiveName = 'HasMany';
        connectionArguments.push(`associatedWith = "${this.getFieldName(connectionInfo.associatedWith)}"`);
        break;
      case CodeGenConnectionType.BELONGS_TO:
        connectionDirectiveName = 'BelongsTo';
        const belongsToTargetNameArgs = `targetName = "${connectionInfo.targetName}"`;
        connectionArguments.push(belongsToTargetNameArgs);
        if (this.isCustomPKEnabled()) {
          const belongsToTargetNamesArgs = `targetNames = {${connectionInfo.targetNames.map(target => `"${target}"`).join(', ')}}`;
          connectionArguments.push(belongsToTargetNamesArgs);
        }
        break;
    }
    connectionArguments.push(`type = ${this.getModelName(connectionInfo.connectedModel)}.class`);

    return `${connectionDirectiveName}${connectionArguments.length ? `(${connectionArguments.join(', ')})` : ''}`;
  }
  protected generateJustIdMethod(model: CodeGenModel, classDeclaration: JavaDeclarationBlock): void {
    const returnType = this.getModelName(model);
    const comment = dedent`WARNING: This method should not be used to build an instance of this object for a CREATE mutation.
        This is a convenience method to return an instance of the object with only its ID populated
        to be used in the context of a parameter in a delete mutation or referencing a foreign key
        in a relationship.
        @param id the id of the existing item this instance will represent
        @return an instance of this model with only ID populated`;
    const initArgs = indentMultiline(['id', ...new Array(this.getWritableFields(model).length - 1).fill('null')].join(',\n'));
    const initBlock = `return new ${returnType}(\n${initArgs}\n);`;
    classDeclaration.addClassMethod(
      'justId',
      returnType,
      initBlock,
      [{ name: 'id', type: 'String' }],
      [],
      'public',
      { static: true },
      [],
      [],
      comment,
    );
  }
  /**
   * Get the list of fields that can be are writeable. These fields should exclude the following
   * fields that are connected and are either HAS_ONE or HAS_MANY
   * @param model
   */
  protected getNonConnectedField(model: CodeGenModel): CodeGenField[] {
    return model.fields.filter(f => {
      if (!f.connectionInfo) return true;
      if (f.connectionInfo.kind == CodeGenConnectionType.BELONGS_TO) {
        return true;
      }
    });
  }

  protected getWritableFields(model: CodeGenModel): CodeGenField[] {
    return this.getNonConnectedField(model).filter(f => !f.isReadOnly);
  }
}
