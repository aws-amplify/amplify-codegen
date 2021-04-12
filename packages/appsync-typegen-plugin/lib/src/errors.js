'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function() {
            return m[k];
          },
        });
      }
    : function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function(o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function(o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== 'default' && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.logErrorMessage = exports.logError = exports.ToolError = void 0;
const graphql_1 = require('graphql');
const path = __importStar(require('path'));
class ToolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolError';
    this.message = message;
  }
}
exports.ToolError = ToolError;
const isRunningFromXcodeScript = process.env.XCODE_VERSION_ACTUAL;
function logError(error) {
  if (error instanceof ToolError) {
    logErrorMessage(error.message);
  } else if (error instanceof graphql_1.GraphQLError) {
    const fileName = error.source && error.source.name;
    if (error.locations) {
      for (const location of error.locations) {
        logErrorMessage(error.message, fileName, location.line);
      }
    } else {
      logErrorMessage(error.message, fileName);
    }
  } else {
    console.log(error.stack);
  }
}
exports.logError = logError;
function logErrorMessage(message, fileName, lineNumber) {
  if (isRunningFromXcodeScript) {
    if (fileName && lineNumber) {
      console.log(`${fileName}:${lineNumber}: error: ${message}`);
    } else {
      console.log(`error: ${message}`);
    }
  } else {
    if (fileName) {
      const truncatedFileName =
        '/' +
        fileName
          .split(path.sep)
          .slice(-4)
          .join(path.sep);
      console.log(`...${truncatedFileName}: ${message}`);
    } else {
      console.log(`error: ${message}`);
    }
  }
}
exports.logErrorMessage = logErrorMessage;
//# sourceMappingURL=errors.js.map
