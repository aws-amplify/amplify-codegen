"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSyncModelJavaVisitor = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
const change_case_1 = require("change-case");
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const java_config_1 = require("../configs/java-config");
const scalars_1 = require("../scalars");
const java_declaration_block_1 = require("../languages/java-declaration-block");
const appsync_visitor_1 = require("./appsync-visitor");
const process_connections_1 = require("../utils/process-connections");
const process_auth_1 = require("../utils/process-auth");
const warn_1 = require("../utils/warn");
const validate_field_name_1 = require("../utils/validate-field-name");
class AppSyncModelJavaVisitor extends appsync_visitor_1.AppSyncModelVisitor {
    constructor() {
        super(...arguments);
        this.additionalPackages = new Set();
        this.usingAuth = false;
    }
    generate() {
        this.processDirectives();
        if (this._parsedConfig.generate === 'loader') {
            return this.generateClassLoader();
        }
        validate_field_name_1.validateFieldName({ ...this.getSelectedModels(), ...this.getSelectedNonModels() });
        if (this.selectedTypeIsEnum()) {
            return this.generateEnums();
        }
        else if (this.selectedTypeIsNonModel()) {
            return this.generateNonModelClasses();
        }
        return this.generateModelClasses();
    }
    generateClassLoader() {
        const AMPLIFY_MODEL_VERSION = 'AMPLIFY_MODEL_VERSION';
        const result = [this.generatePackageName(), '', this.generateImportStatements(java_config_1.LOADER_IMPORT_PACKAGES)];
        result.push(visitor_plugin_common_1.transformComment(ts_dedent_1.default ` Contains the set of model classes that implement {@link Model}
    interface.`));
        const loaderClassDeclaration = new java_declaration_block_1.JavaDeclarationBlock()
            .withName(java_config_1.LOADER_CLASS_NAME)
            .access('public')
            .final()
            .asKind('class')
            .implements(['ModelProvider']);
        loaderClassDeclaration.addClassMember(AMPLIFY_MODEL_VERSION, 'String', `"${this.computeVersion()}"`, [], 'private', {
            final: true,
            static: true,
        });
        loaderClassDeclaration.addClassMember('amplifyGeneratedModelInstance', java_config_1.LOADER_CLASS_NAME, '', [], 'private', { static: true });
        loaderClassDeclaration.addClassMethod(java_config_1.LOADER_CLASS_NAME, null, '', [], [], 'private');
        const getInstanceBody = ts_dedent_1.default `
    if (amplifyGeneratedModelInstance == null) {
      amplifyGeneratedModelInstance = new ${java_config_1.LOADER_CLASS_NAME}();
    }
    return amplifyGeneratedModelInstance;`;
        loaderClassDeclaration.addClassMethod('getInstance', java_config_1.LOADER_CLASS_NAME, getInstanceBody, [], [], 'public', {
            static: true,
            synchronized: true,
        });
        const modelsMethodDocString = ts_dedent_1.default `
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
        loaderClassDeclaration.addClassMethod('models', 'Set<Class<? extends Model>>', modelsMethodImplementation, [], [], 'public', {}, ['Override'], undefined, modelsMethodDocString);
        const versionMethodDocString = ts_dedent_1.default `
    Get the version of the models.

    @return the version string of the models.
    `;
        loaderClassDeclaration.addClassMethod('version', 'String', `return ${AMPLIFY_MODEL_VERSION};`, [], [], 'public', {}, ['Override'], undefined, versionMethodDocString);
        result.push(loaderClassDeclaration.string);
        return result.join('\n');
    }
    generateEnums() {
        const result = [this.generatePackageName()];
        Object.entries(this.getSelectedEnums()).forEach(([name, enumValue]) => {
            const enumDeclaration = new java_declaration_block_1.JavaDeclarationBlock()
                .asKind('enum')
                .access('public')
                .withName(this.getEnumName(enumValue))
                .annotate(['SuppressWarnings("all")'])
                .withComment('Auto generated enum from GraphQL schema.');
            const body = Object.values(enumValue.values);
            enumDeclaration.withBlock(visitor_plugin_common_1.indentMultiline(body.join(',\n')));
            result.push(enumDeclaration.string);
        });
        return result.join('\n');
    }
    generateModelClasses() {
        const result = [];
        Object.entries(this.getSelectedModels()).forEach(([name, model]) => {
            const modelDeclaration = this.generateModelClass(model);
            result.push(...[modelDeclaration]);
        });
        const packageDeclaration = this.generatePackageHeader();
        return [packageDeclaration, ...result].join('\n');
    }
    generateNonModelClasses() {
        const result = [];
        Object.entries(this.getSelectedNonModels()).forEach(([name, type]) => {
            const nonModelDeclaration = this.generateNonModelClass(type);
            result.push(...[nonModelDeclaration]);
        });
        const packageDeclaration = this.generatePackageHeader(false);
        return [packageDeclaration, ...result].join('\n');
    }
    generatePackageName() {
        return `package ${java_config_1.GENERATED_PACKAGE_NAME};`;
    }
    generateModelClass(model) {
        const classDeclarationBlock = new java_declaration_block_1.JavaDeclarationBlock()
            .asKind('class')
            .access('public')
            .withName(this.getModelName(model))
            .implements(['Model'])
            .withComment(`This is an auto generated class representing the ${model.name} type in your schema.`)
            .final();
        const annotations = this.generateModelAnnotations(model);
        classDeclarationBlock.annotate(annotations);
        const nonConnectedFields = this.getNonConnectedField(model);
        nonConnectedFields.forEach(field => this.generateQueryFields(model, field, classDeclarationBlock));
        model.fields.forEach(field => {
            const value = nonConnectedFields.includes(field) ? '' : 'null';
            this.generateModelField(field, value, classDeclarationBlock);
        });
        this.generateStepBuilderInterfaces(model).forEach((builderInterface) => {
            classDeclarationBlock.nestedClass(builderInterface);
        });
        this.generateBuilderClass(model, classDeclarationBlock);
        this.generateCopyOfBuilderClass(model, classDeclarationBlock);
        this.generateGetters(model, classDeclarationBlock);
        this.generateConstructor(model, classDeclarationBlock);
        this.generateEqualsMethod(model, classDeclarationBlock);
        this.generateHashCodeMethod(model, classDeclarationBlock);
        this.generateToStringMethod(model, classDeclarationBlock);
        this.generateBuilderMethod(model, classDeclarationBlock);
        this.generateJustIdMethod(model, classDeclarationBlock);
        this.generateCopyOfBuilderMethod(model, classDeclarationBlock);
        return classDeclarationBlock.string;
    }
    generateNonModelClass(nonModel) {
        const classDeclarationBlock = new java_declaration_block_1.JavaDeclarationBlock()
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
        this.generateStepBuilderInterfaces(nonModel, false).forEach((builderInterface) => {
            classDeclarationBlock.nestedClass(builderInterface);
        });
        this.generateBuilderClass(nonModel, classDeclarationBlock, false);
        this.generateCopyOfBuilderClass(nonModel, classDeclarationBlock, false);
        this.generateGetters(nonModel, classDeclarationBlock);
        this.generateConstructor(nonModel, classDeclarationBlock);
        this.generateEqualsMethod(nonModel, classDeclarationBlock);
        this.generateHashCodeMethod(nonModel, classDeclarationBlock);
        this.generateBuilderMethod(nonModel, classDeclarationBlock);
        this.generateCopyOfBuilderMethod(nonModel, classDeclarationBlock);
        return classDeclarationBlock.string;
    }
    generatePackageHeader(isModel = true) {
        let baseImports;
        if (isModel) {
            if (this.usingAuth) {
                baseImports = java_config_1.MODEL_AUTH_CLASS_IMPORT_PACKAGES;
            }
            else {
                baseImports = java_config_1.MODEL_CLASS_IMPORT_PACKAGES;
            }
        }
        else {
            baseImports = java_config_1.NON_MODEL_CLASS_IMPORT_PACKAGES;
        }
        const imports = this.generateImportStatements([...Array.from(this.additionalPackages), '', ...baseImports]);
        return [this.generatePackageName(), '', imports].join('\n');
    }
    generateImportStatements(packages) {
        return packages.map(pkg => (pkg ? `import ${pkg};` : '')).join('\n');
    }
    generateQueryFields(model, field, classDeclarationBlock) {
        const queryFieldName = change_case_1.constantCase(field.name);
        const fieldName = field.connectionInfo && field.connectionInfo.kind === process_connections_1.CodeGenConnectionType.BELONGS_TO
            ? field.connectionInfo.targetName
            : this.getFieldName(field);
        classDeclarationBlock.addClassMember(queryFieldName, 'QueryField', `field("${this.getModelName(model)}", "${fieldName}")`, [], 'public', {
            final: true,
            static: true,
        });
    }
    generateModelField(field, value, classDeclarationBlock) {
        const annotations = this.generateFieldAnnotations(field);
        const fieldType = this.getNativeType(field);
        const fieldName = this.getFieldName(field);
        classDeclarationBlock.addClassMember(fieldName, fieldType, value, annotations, 'private', {
            final: true,
        });
    }
    generateNonModelField(field, value, classDeclarationBlock) {
        const fieldType = this.getNativeType(field);
        const fieldName = this.getFieldName(field);
        classDeclarationBlock.addClassMember(fieldName, fieldType, value, [], 'private', {
            final: true,
        });
    }
    generateStepBuilderInterfaces(model, isModel = true) {
        const nonNullableFields = this.getNonConnectedField(model).filter(field => !field.isNullable);
        const nullableFields = this.getNonConnectedField(model).filter(field => field.isNullable);
        const requiredInterfaces = nonNullableFields.filter((field) => !this.READ_ONLY_FIELDS.includes(field.name));
        const interfaces = requiredInterfaces.map((field, idx) => {
            const isLastField = requiredInterfaces.length - 1 === idx ? true : false;
            const returnType = isLastField ? 'Build' : requiredInterfaces[idx + 1].name;
            const interfaceName = this.getStepInterfaceName(field.name);
            const methodName = this.getStepFunctionName(field);
            const argumentType = this.getNativeType(field);
            const argumentName = this.getStepFunctionArgumentName(field);
            const interfaceDeclaration = new java_declaration_block_1.JavaDeclarationBlock()
                .asKind('interface')
                .withName(interfaceName)
                .access('public');
            interfaceDeclaration.withBlock(visitor_plugin_common_1.indent(`${this.getStepInterfaceName(returnType)} ${methodName}(${argumentType} ${argumentName});`));
            return interfaceDeclaration;
        });
        const builder = new java_declaration_block_1.JavaDeclarationBlock()
            .asKind('interface')
            .withName(this.getStepInterfaceName('Build'))
            .access('public');
        const builderBody = [];
        builderBody.push(`${this.getModelName(model)} build();`);
        if (isModel) {
            builderBody.push(`${this.getStepInterfaceName('Build')} id(String id) throws IllegalArgumentException;`);
        }
        nullableFields.forEach(field => {
            const fieldName = this.getStepFunctionArgumentName(field);
            const methodName = this.getStepFunctionName(field);
            builderBody.push(`${this.getStepInterfaceName('Build')} ${methodName}(${this.getNativeType(field)} ${fieldName});`);
        });
        builder.withBlock(visitor_plugin_common_1.indentMultiline(builderBody.join('\n')));
        return [...interfaces, builder];
    }
    generateBuilderClass(model, classDeclaration, isModel = true) {
        const nonNullableFields = this.getNonConnectedField(model).filter(field => !field.isNullable);
        const nullableFields = this.getNonConnectedField(model).filter(field => field.isNullable);
        const stepFields = nonNullableFields.filter((field) => !this.READ_ONLY_FIELDS.includes(field.name));
        const stepInterfaces = stepFields.map((field) => {
            return this.getStepInterfaceName(field.name);
        });
        const builderClassDeclaration = new java_declaration_block_1.JavaDeclarationBlock()
            .access('public')
            .static()
            .asKind('class')
            .withName('Builder')
            .implements([...stepInterfaces, this.getStepInterfaceName('Build')]);
        [...nonNullableFields, ...nullableFields].forEach((field) => {
            const fieldName = this.getFieldName(field);
            builderClassDeclaration.addClassMember(fieldName, this.getNativeType(field), '', undefined, 'private');
        });
        const buildImplementation = isModel ? [`String id = this.id != null ? this.id : UUID.randomUUID().toString();`, ''] : [''];
        const buildParams = this.getNonConnectedField(model)
            .map(field => this.getFieldName(field))
            .join(',\n');
        buildImplementation.push(`return new ${this.getModelName(model)}(\n${visitor_plugin_common_1.indentMultiline(buildParams)});`);
        builderClassDeclaration.addClassMethod('build', this.getModelName(model), visitor_plugin_common_1.indentMultiline(buildImplementation.join('\n')), undefined, [], 'public', {}, ['Override']);
        stepFields.forEach((field, idx, fields) => {
            const isLastStep = idx === fields.length - 1;
            const fieldName = this.getFieldName(field);
            const methodName = this.getStepFunctionName(field);
            const returnType = isLastStep ? this.getStepInterfaceName('Build') : this.getStepInterfaceName(fields[idx + 1].name);
            const argumentType = this.getNativeType(field);
            const argumentName = this.getStepFunctionArgumentName(field);
            const body = [`Objects.requireNonNull(${argumentName});`, `this.${fieldName} = ${argumentName};`, `return this;`].join('\n');
            builderClassDeclaration.addClassMethod(methodName, returnType, visitor_plugin_common_1.indentMultiline(body), [{ name: argumentName, type: argumentType }], [], 'public', {}, ['Override']);
        });
        nullableFields.forEach((field) => {
            const fieldName = this.getFieldName(field);
            const methodName = this.getStepFunctionName(field);
            const returnType = this.getStepInterfaceName('Build');
            const argumentType = this.getNativeType(field);
            const argumentName = this.getStepFunctionArgumentName(field);
            const body = [`this.${fieldName} = ${argumentName};`, `return this;`].join('\n');
            builderClassDeclaration.addClassMethod(methodName, returnType, visitor_plugin_common_1.indentMultiline(body), [{ name: argumentName, type: argumentType }], [], 'public', {}, ['Override']);
        });
        if (isModel) {
            const idBuildStepBody = ts_dedent_1.default `this.id = id;

    try {
        UUID.fromString(id); // Check that ID is in the UUID format - if not an exception is thrown
    } catch (Exception exception) {
      throw new IllegalArgumentException("Model IDs must be unique in the format of UUID.",
                exception);
    }

    return this;`;
            const idComment = ts_dedent_1.default `WARNING: Do not set ID when creating a new object. Leave this blank and one will be auto generated for you.
    This should only be set when referring to an already existing object.
    @param id id
    @return Current Builder instance, for fluent method chaining
    @throws IllegalArgumentException Checks that ID is in the proper format`;
            builderClassDeclaration.addClassMethod('id', this.getStepInterfaceName('Build'), visitor_plugin_common_1.indentMultiline(idBuildStepBody), [{ name: 'id', type: 'String' }], [], 'public', {}, [], ['IllegalArgumentException'], idComment);
        }
        classDeclaration.nestedClass(builderClassDeclaration);
    }
    generateCopyOfBuilderClass(model, classDeclaration, isModel = true) {
        const builderName = 'CopyOfBuilder';
        const copyOfBuilderClassDeclaration = new java_declaration_block_1.JavaDeclarationBlock()
            .access('public')
            .final()
            .asKind('class')
            .withName(builderName)
            .extends(['Builder']);
        const nonNullableFields = this.getNonConnectedField(model)
            .filter(field => !field.isNullable)
            .filter(f => (isModel ? f.name !== 'id' : true));
        const nullableFields = this.getNonConnectedField(model).filter(field => field.isNullable);
        const constructorArguments = this.getNonConnectedField(model).map(field => {
            return { name: this.getStepFunctionArgumentName(field), type: this.getNativeType(field) };
        });
        const stepBuilderInvocation = [...nonNullableFields, ...nullableFields].map(field => {
            const methodName = this.getStepFunctionName(field);
            const argumentName = this.getStepFunctionArgumentName(field);
            return `.${methodName}(${argumentName})`;
        });
        const invocations = stepBuilderInvocation.length === 0 ? '' : ['super', visitor_plugin_common_1.indentMultiline(stepBuilderInvocation.join('\n')).trim(), ';'].join('');
        const body = [...(isModel ? ['super.id(id);'] : []), invocations].join('\n');
        copyOfBuilderClassDeclaration.addClassMethod(builderName, null, body, constructorArguments, [], 'private');
        [...nonNullableFields, ...nullableFields].forEach(field => {
            const methodName = this.getStepFunctionName(field);
            const argumentName = this.getStepFunctionArgumentName(field);
            const argumentType = this.getNativeType(field);
            const implementation = `return (${builderName}) super.${methodName}(${argumentName});`;
            copyOfBuilderClassDeclaration.addClassMethod(methodName, builderName, implementation, [
                {
                    name: argumentName,
                    type: argumentType,
                },
            ], [], 'public', {}, ['Override']);
        });
        classDeclaration.nestedClass(copyOfBuilderClassDeclaration);
    }
    generateCopyOfBuilderMethod(model, classDeclaration) {
        const args = visitor_plugin_common_1.indentMultiline(this.getNonConnectedField(model)
            .map(field => this.getFieldName(field))
            .join(',\n')).trim();
        const methodBody = `return new CopyOfBuilder(${args});`;
        classDeclaration.addClassMethod('copyOfBuilder', 'CopyOfBuilder', methodBody, [], [], 'public');
    }
    generateGetters(model, declarationsBlock) {
        model.fields.forEach((field) => {
            const fieldName = this.getFieldName(field);
            const returnType = this.getNativeType(field);
            const methodName = this.getFieldGetterName(field);
            const body = visitor_plugin_common_1.indent(`return ${fieldName};`);
            declarationsBlock.addClassMethod(methodName, returnType, body, undefined, undefined, 'public');
        });
    }
    getFieldGetterName(field) {
        return `get${change_case_1.pascalCase(field.name)}`;
    }
    getStepFunctionName(field) {
        return change_case_1.camelCase(field.name);
    }
    getStepFunctionArgumentName(field) {
        return change_case_1.camelCase(field.name);
    }
    generateConstructor(model, declarationsBlock) {
        const name = this.getModelName(model);
        const body = this.getNonConnectedField(model)
            .map((field) => {
            const fieldName = this.getFieldName(field);
            return `this.${fieldName} = ${fieldName};`;
        })
            .join('\n');
        const constructorArguments = this.getNonConnectedField(model).map(field => {
            return { name: this.getFieldName(field), type: this.getNativeType(field) };
        });
        declarationsBlock.addClassMethod(name, null, body, constructorArguments, undefined, 'private');
    }
    getNativeType(field) {
        const nativeType = super.getNativeType(field);
        if (Object.keys(scalars_1.JAVA_TYPE_IMPORT_MAP).includes(nativeType)) {
            this.additionalPackages.add(scalars_1.JAVA_TYPE_IMPORT_MAP[nativeType]);
        }
        return nativeType;
    }
    generateEqualsMethod(model, declarationBlock) {
        const paramName = 'obj';
        const className = this.getModelName(model);
        const instanceName = change_case_1.camelCase(model.name);
        const body = [
            `if (this == ${paramName}) {`,
            '  return true;',
            `} else if(${paramName} == null || getClass() != ${paramName}.getClass()) {`,
            '  return false;',
            '} else {',
        ];
        body.push(`${className} ${instanceName} = (${className}) ${paramName};`);
        const propCheck = visitor_plugin_common_1.indentMultiline(this.getNonConnectedField(model)
            .map(field => {
            const getterName = this.getFieldGetterName(field);
            return `ObjectsCompat.equals(${getterName}(), ${instanceName}.${getterName}())`;
        })
            .join(' &&\n'), 4).trim();
        body.push(`return ${propCheck};`);
        body.push('}');
        declarationBlock.addClassMethod('equals', 'boolean', visitor_plugin_common_1.indentMultiline(body.join('\n')), [{ name: paramName, type: 'Object' }], [], 'public', {}, ['Override']);
    }
    generateHashCodeMethod(model, declarationBlock) {
        const body = [
            'return new StringBuilder()',
            ...this.getNonConnectedField(model).map(field => `.append(${this.getFieldGetterName(field)}())`),
            '.toString()',
            '.hashCode();',
        ].join('\n');
        declarationBlock.addClassMethod('hashCode', 'int', visitor_plugin_common_1.indentMultiline(body).trimLeft(), [], [], 'public', {}, ['Override']);
    }
    generateToStringMethod(model, declarationBlock) {
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
        declarationBlock.addClassMethod('toString', 'String', visitor_plugin_common_1.indentMultiline(body.join('\n')).trimLeft(), [], [], 'public', {}, ['Override']);
    }
    generateBuilderMethod(model, classDeclaration) {
        const requiredFields = this.getNonConnectedField(model).filter(field => !field.isNullable && !this.READ_ONLY_FIELDS.includes(field.name));
        const returnType = requiredFields.length ? this.getStepInterfaceName(requiredFields[0].name) : this.getStepInterfaceName('Build');
        classDeclaration.addClassMethod('builder', returnType, visitor_plugin_common_1.indentMultiline(`return new Builder();`), [], [], 'public', { static: true }, []);
    }
    getStepInterfaceName(nextFieldName) {
        return `${change_case_1.pascalCase(nextFieldName)}Step`;
    }
    generateModelAnnotations(model) {
        const annotations = model.directives.map(directive => {
            switch (directive.name) {
                case 'model':
                    const modelArgs = [];
                    const authDirectives = model.directives.filter(d => d.name === 'auth');
                    const authRules = this.generateAuthRules(authDirectives);
                    modelArgs.push(`pluralName = "${this.pluralizeModelName(model)}"`);
                    if (authRules.length) {
                        this.usingAuth = true;
                        modelArgs.push(`authRules = ${authRules}`);
                    }
                    return `ModelConfig(${modelArgs.join(', ')})`;
                case 'key':
                    const keyArgs = [];
                    keyArgs.push(`name = "${directive.arguments.name}"`);
                    keyArgs.push(`fields = {${directive.arguments.fields.map((f) => `"${f}"`).join(',')}}`);
                    return `Index(${keyArgs.join(', ')})`;
                default:
                    break;
            }
            return '';
        });
        return ['SuppressWarnings("all")', ...annotations].filter(annotation => annotation);
    }
    generateAuthRules(authDirectives) {
        const operationMapping = {
            create: 'ModelOperation.CREATE',
            read: 'ModelOperation.READ',
            update: 'ModelOperation.UPDATE',
            delete: 'ModelOperation.DELETE',
        };
        const rules = [];
        authDirectives.forEach(directive => {
            var _a;
            (_a = directive.arguments) === null || _a === void 0 ? void 0 : _a.rules.forEach(rule => {
                var _a, _b;
                const authRule = [];
                switch (rule.allow) {
                    case process_auth_1.AuthStrategy.owner:
                        authRule.push('allow = AuthStrategy.OWNER');
                        authRule.push(`ownerField = "${rule.ownerField}"`);
                        authRule.push(`identityClaim = "${rule.identityClaim}"`);
                        break;
                    case process_auth_1.AuthStrategy.private:
                        authRule.push('allow = AuthStrategy.PRIVATE');
                        break;
                    case process_auth_1.AuthStrategy.public:
                        authRule.push('allow = AuthStrategy.PUBLIC');
                        break;
                    case process_auth_1.AuthStrategy.groups:
                        authRule.push('allow = AuthStrategy.GROUPS');
                        authRule.push(`groupClaim = "${rule.groupClaim}"`);
                        if (rule.groups) {
                            authRule.push(`groups = { ${(_a = rule.groups) === null || _a === void 0 ? void 0 : _a.map(group => `"${group}"`).join(', ')} }`);
                        }
                        else {
                            authRule.push(`groupsField = "${rule.groupField}"`);
                        }
                        break;
                    default:
                        warn_1.printWarning(`Model has auth with authStrategy ${rule.allow} of which is not yet supported`);
                        return;
                }
                authRule.push(`operations = { ${(_b = rule.operations) === null || _b === void 0 ? void 0 : _b.map(op => operationMapping[op]).join(', ')} }`);
                rules.push(`@AuthRule(${authRule.join(', ')})`);
            });
        });
        if (rules.length) {
            return ['{', `${visitor_plugin_common_1.indentMultiline(rules.join(',\n'))}`, '}'].join('\n');
        }
        return '';
    }
    generateFieldAnnotations(field) {
        const annotations = [];
        annotations.push(this.generateModelFieldAnnotation(field));
        annotations.push(this.generateConnectionAnnotation(field));
        return annotations.filter(annotation => annotation);
    }
    generateModelFieldAnnotation(field) {
        const authDirectives = field.directives.filter(d => d.name === 'auth');
        const authRules = this.generateAuthRules(authDirectives);
        if (authRules.length) {
            this.usingAuth = true;
        }
        const annotationArgs = [
            `targetType="${field.type}"`,
            !field.isNullable ? 'isRequired = true' : '',
            authRules.length ? `authRules = ${authRules}` : '',
        ].filter(arg => arg);
        return `ModelField${annotationArgs.length ? `(${annotationArgs.join(', ')})` : ''}`;
    }
    generateConnectionAnnotation(field) {
        if (!field.connectionInfo)
            return '';
        const { connectionInfo } = field;
        this.additionalPackages.add(java_config_1.CONNECTION_RELATIONSHIP_IMPORTS[connectionInfo.kind]);
        let connectionDirectiveName = '';
        const connectionArguments = [];
        switch (connectionInfo.kind) {
            case process_connections_1.CodeGenConnectionType.HAS_ONE:
                connectionDirectiveName = 'HasOne';
                connectionArguments.push(`associatedWith = "${this.getFieldName(connectionInfo.associatedWith)}"`);
                break;
            case process_connections_1.CodeGenConnectionType.HAS_MANY:
                connectionDirectiveName = 'HasMany';
                connectionArguments.push(`associatedWith = "${this.getFieldName(connectionInfo.associatedWith)}"`);
                break;
            case process_connections_1.CodeGenConnectionType.BELONGS_TO:
                connectionDirectiveName = 'BelongsTo';
                connectionArguments.push(`targetName = "${connectionInfo.targetName}"`);
                break;
        }
        connectionArguments.push(`type = ${this.getModelName(connectionInfo.connectedModel)}.class`);
        return `${connectionDirectiveName}${connectionArguments.length ? `(${connectionArguments.join(', ')})` : ''}`;
    }
    generateJustIdMethod(model, classDeclaration) {
        const returnType = this.getModelName(model);
        const comment = ts_dedent_1.default `WARNING: This method should not be used to build an instance of this object for a CREATE mutation.
        This is a convenience method to return an instance of the object with only its ID populated
        to be used in the context of a parameter in a delete mutation or referencing a foreign key
        in a relationship.
        @param id the id of the existing item this instance will represent
        @return an instance of this model with only ID populated
        @throws IllegalArgumentException Checks that ID is in the proper format`;
        const exceptionBlock = ts_dedent_1.default `
    try {
      UUID.fromString(id); // Check that ID is in the UUID format - if not an exception is thrown
    } catch (Exception exception) {
      throw new IllegalArgumentException(
              "Model IDs must be unique in the format of UUID. This method is for creating instances " +
              "of an existing object with only its ID field for sending as a mutation parameter. When " +
              "creating a new object, use the standard builder method and leave the ID field blank."
      );
    }`;
        const initArgs = visitor_plugin_common_1.indentMultiline(['id', ...new Array(this.getNonConnectedField(model).length - 1).fill('null')].join(',\n'));
        const initBlock = `return new ${returnType}(\n${initArgs}\n);`;
        classDeclaration.addClassMethod('justId', returnType, [exceptionBlock, initBlock].join('\n'), [{ name: 'id', type: 'String' }], [], 'public', { static: true }, [], [], comment);
    }
    getNonConnectedField(model) {
        return model.fields.filter(f => {
            if (!f.connectionInfo)
                return true;
            if (f.connectionInfo.kind == process_connections_1.CodeGenConnectionType.BELONGS_TO) {
                return true;
            }
        });
    }
}
exports.AppSyncModelJavaVisitor = AppSyncModelJavaVisitor;
//# sourceMappingURL=appsync-java-visitor.js.map