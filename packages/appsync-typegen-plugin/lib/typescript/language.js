'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.methodDeclaration = exports.pickedPropertySetsDeclaration = exports.propertyDeclaration = exports.interfaceDeclaration = void 0;
const codeGeneration_1 = require('./codeGeneration');
const types_1 = require('./types');
function interfaceDeclaration(generator, { interfaceName, noBrackets }, closure) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  generator.print(`export type ${interfaceName} = `);
  generator.pushScope({ typeName: interfaceName });
  if (noBrackets) {
    generator.withinBlock(closure, '', '');
  } else {
    generator.withinBlock(closure, '{', '}');
  }
  generator.popScope();
  generator.print(';');
}
exports.interfaceDeclaration = interfaceDeclaration;
function propertyDeclaration(
  generator,
  { fieldName, type, propertyName, typeName, description, isOptional, isArray, isNullable, isArrayElementNullable },
  closure,
) {
  const name = fieldName || propertyName;
  if (description) {
    description.split('\n').forEach(line => {
      generator.printOnNewline(`// ${line.trim()}`);
    });
  }
  if (closure) {
    generator.printOnNewline(name);
    if (isNullable || isOptional) {
      generator.print('?');
    }
    generator.print(': ');
    if (isArray) {
      generator.print(' Array<');
    }
    generator.pushScope({ typeName: name });
    generator.withinBlock(closure);
    generator.popScope();
    if (isArray) {
      if (isArrayElementNullable) {
        generator.print(' | null');
      }
      generator.print(' >');
    }
    if (isNullable) {
      generator.print(' | null');
    }
  } else {
    generator.printOnNewline(name);
    if (isOptional || isNullable) {
      generator.print('?');
    }
    generator.print(': ');
    if (isArray) {
      generator.print(' Array<');
    }
    generator.print(`${typeName || (type && types_1.typeNameFromGraphQLType(generator.context, type))}`);
    if (isArray) {
      if (isArrayElementNullable) {
        generator.print(' | null');
      }
      generator.print(' >');
    }
    if (isNullable && (!typeName || isArray)) {
      generator.print(' | null');
    }
  }
  generator.print(',');
}
exports.propertyDeclaration = propertyDeclaration;
function pickedPropertySetsDeclaration(generator, property, propertySets, standalone = false) {
  const { description, fieldName, propertyName, isNullable, isArray, isArrayElementNullable } = property;
  const name = fieldName || propertyName;
  if (description) {
    description.split('\n').forEach(line => {
      generator.printOnNewline(`// ${line.trim()}`);
    });
  }
  if (!standalone) {
    generator.printOnNewline(`${name}: `);
  }
  if (isArray) {
    generator.print(' Array<');
  }
  generator.pushScope({ typeName: name });
  generator.withinBlock(
    () => {
      propertySets.forEach((propertySet, index, propertySets) => {
        generator.withinBlock(() => {
          codeGeneration_1.pickedPropertyDeclarations(generator, propertySet);
        });
        if (index !== propertySets.length - 1) {
          generator.print(' |');
        }
      });
    },
    '(',
    ')',
  );
  generator.popScope();
  if (isArray) {
    if (isArrayElementNullable) {
      generator.print(' | null');
    }
    generator.print(' >');
  }
  if (isNullable) {
    generator.print(' | null');
  }
  if (!standalone) {
    generator.print(',');
  }
}
exports.pickedPropertySetsDeclaration = pickedPropertySetsDeclaration;
function methodDeclaration(generator, { methodName, returnType, async, args }, closure) {
  generator.printNewline();
  if (async) generator.print('async ');
  generator.print(`${methodName}(${args.join(', ')}):${returnType}`);
  generator.pushScope({ methodName });
  generator.withinBlock(closure, '{', '}');
  generator.popScope();
}
exports.methodDeclaration = methodDeclaration;
//# sourceMappingURL=language.js.map
