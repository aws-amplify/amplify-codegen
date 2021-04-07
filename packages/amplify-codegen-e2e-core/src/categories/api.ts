import { getCLIPath, updateSchema, nspawn as spawn, KEY_DOWN_ARROW } from '..';
import * as fs from 'fs-extra';
import { singleSelect, multiSelect } from '../utils/selectors';
import _ from 'lodash';

export function getSchemaPath(schemaName: string): string {
  return `${__dirname}/../../../amplify-codegen-e2e-tests/schemas/${schemaName}`;
}

export function apiGqlCompile(cwd: string, testingWithLatestCodebase: boolean = false) {
  return new Promise<void>((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['api', 'gql-compile'], { cwd, stripColors: true })
      .wait('GraphQL schema compiled successfully.')
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

interface AddApiOptions {
  apiName: string;
}

const defaultOptions: AddApiOptions = {
  apiName: '\r',
};

export function addApiWithoutSchema(cwd: string, opts: Partial<AddApiOptions> = {}) {
  const options = _.assign(defaultOptions, opts);
  return new Promise<void>((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'api'], { cwd, stripColors: true })
      .wait('Please select from one of the below mentioned services:')
      .sendCarriageReturn()
      .wait('Provide API name:')
      .sendLine(options.apiName)
      .wait(/.*Choose the default authorization type for the API.*/)
      .sendCarriageReturn()
      .wait(/.*Enter a description for the API key.*/)
      .sendCarriageReturn()
      .wait(/.*After how many days from now the API key should expire.*/)
      .sendCarriageReturn()
      .wait(/.*Do you want to configure advanced settings for the GraphQL API.*/)
      .sendCarriageReturn()
      .wait('Do you have an annotated GraphQL schema?')
      .sendLine('n')
      .wait('Choose a schema template:')
      .sendCarriageReturn()
      .wait('Do you want to edit the schema now?')
      .sendLine('n')
      .wait(
        '"amplify publish" will build all your local backend and frontend resources (if you have hosting category added) and provision it in the cloud',
      )
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function addApiWithSchema(cwd: string, schemaFile: string, opts: Partial<AddApiOptions & { apiKeyExpirationDays: number }> = {}) {
  const options = _.assign(defaultOptions, opts);
  const schemaPath = getSchemaPath(schemaFile);
  return new Promise<void>((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'api'], { cwd, stripColors: true })
      .wait('Please select from one of the below mentioned services:')
      .sendCarriageReturn()
      .wait('Provide API name:')
      .sendLine(options.apiName)
      .wait(/.*Choose the default authorization type for the API.*/)
      .sendCarriageReturn()
      .wait(/.*Enter a description for the API key.*/)
      .sendCarriageReturn()
      .wait(/.*After how many days from now the API key should expire.*/)
      .sendLine(opts.apiKeyExpirationDays ? opts.apiKeyExpirationDays.toString() : '1')
      .wait(/.*Do you want to configure advanced settings for the GraphQL API.*/)
      .sendCarriageReturn()
      .wait('Do you have an annotated GraphQL schema?')
      .sendLine('y')
      .wait('Provide your schema file path:')
      .sendLine(schemaPath)
      .wait(
        '"amplify publish" will build all your local backend and frontend resources (if you have hosting category added) and provision it in the cloud',
      )
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function updateApiSchema(cwd: string, projectName: string, schemaName: string, forceUpdate: boolean = false) {
  const testSchemaPath = getSchemaPath(schemaName);
  let schemaText = fs.readFileSync(testSchemaPath).toString();
  if (forceUpdate) {
    schemaText += '  ';
  }
  updateSchema(cwd, projectName, schemaText);
}

const allAuthTypes = ['API key', 'Amazon Cognito User Pool', 'IAM', 'OpenID Connect'];

export function addApi(projectDir: string, settings?: any) {
  let authTypesToSelectFrom = allAuthTypes.slice();
  return new Promise<void>((resolve, reject) => {
    let chain = spawn(getCLIPath(), ['add', 'api'], { cwd: projectDir, stripColors: true })
      .wait('Please select from one of the below mentioned services:')
      .sendCarriageReturn()
      .wait('Provide API name:')
      .sendCarriageReturn();

    if (settings && Object.keys(settings).length > 0) {
      const authTypesToAdd = Object.keys(settings);
      const defaultType = authTypesToAdd[0];

      singleSelect(chain.wait('Choose the default authorization type for the API'), defaultType, authTypesToSelectFrom);
      setupAuthType(defaultType, chain, settings);

      if (authTypesToAdd.length > 1) {
        authTypesToAdd.shift();

        chain
          .wait('Do you want to configure advanced settings for the GraphQL API')
          .send(KEY_DOWN_ARROW) //yes
          .sendCarriageReturn()
          .wait('Configure additional auth types?')
          .sendLine('y');

        authTypesToSelectFrom = authTypesToSelectFrom.filter(x => x !== defaultType);

        multiSelect(
          chain.wait('Choose the additional authorization types you want to configure for the API'),
          authTypesToAdd,
          authTypesToSelectFrom,
        );

        authTypesToAdd.forEach(authType => {
          setupAuthType(authType, chain, settings);
        });

        chain.wait('Enable conflict detection?').sendCarriageReturn(); //No
      } else {
        chain.wait('Do you want to configure advanced settings for the GraphQL API').sendCarriageReturn(); //No
      }
    } else {
      chain.wait('Choose the default authorization type for the API').sendCarriageReturn();
      setupAPIKey(chain);

      chain.wait('Do you want to configure advanced settings for the GraphQL API').sendCarriageReturn(); //No
    }

    chain
      .wait('Do you have an annotated GraphQL schema?')
      .sendLine('n')
      .wait('Choose a schema template:')
      .sendCarriageReturn()
      .wait('Do you want to edit the schema now?')
      .sendLine('n')
      .wait('"amplify publish" will build all your local backend and frontend resources')
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

function setupAuthType(authType: string, chain: any, settings?: any) {
  switch (authType) {
    case 'API key':
      setupAPIKey(chain);
      break;
    case 'Amazon Cognito User Pool':
      setupCognitoUserPool(chain);
      break;
    case 'IAM':
      setupIAM(chain);
      break;
    case 'OpenID Connect':
      setupOIDC(chain, settings);
      break;
  }
}

function setupAPIKey(chain: any) {
  chain
    .wait('Enter a description for the API key')
    .sendCarriageReturn()
    .wait('After how many days from now the API key should expire')
    .sendCarriageReturn();
}

function setupCognitoUserPool(chain: any) {
  chain
    .wait('Do you want to use the default authentication and security configuration')
    .sendCarriageReturn()
    .wait('How do you want users to be able to sign in')
    .sendCarriageReturn()
    .wait('Do you want to configure advanced settings?')
    .sendCarriageReturn();
}

function setupIAM(chain: any) {
  //no need to do anything
}

function setupOIDC(chain: any, settings?: any) {
  if (!settings || !settings['OpenID Connect']) {
    throw new Error('Must provide OIDC auth settings.');
  }
  chain
    .wait('Enter a name for the OpenID Connect provider')
    .send(settings['OpenID Connect'].oidcProviderName)
    .sendCarriageReturn()
    .wait('Enter the OpenID Connect provider domain')
    .send(settings['OpenID Connect'].oidcProviderDomain)
    .sendCarriageReturn()
    .wait('Enter the Client Id from your OpenID Client Connect application (optional)')
    .send(settings['OpenID Connect'].oidcClientId)
    .sendCarriageReturn()
    .wait('Enter the number of milliseconds a token is valid after being issued to a user')
    .send(settings['OpenID Connect'].ttlaIssueInMillisecond)
    .sendCarriageReturn()
    .wait('Enter the number of milliseconds a token is valid after being authenticated')
    .send(settings['OpenID Connect'].ttlaAuthInMillisecond)
    .sendCarriageReturn();
}

export function addApiWithCognitoUserPoolAuthTypeWhenAuthExists(projectDir: string) {
  return new Promise<void>((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'api'], { cwd: projectDir, stripColors: true })
      .wait('Please select from one of the below mentioned services:')
      .sendCarriageReturn()
      .wait('Provide API name:')
      .sendCarriageReturn()
      .wait('Choose the default authorization type for the API')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('Do you want to configure advanced settings for the GraphQL AP')
      .sendCarriageReturn()
      .wait('Do you have an annotated GraphQL schema?')
      .sendLine('n')
      .wait('Choose a schema template:')
      .sendCarriageReturn()
      .wait('Do you want to edit the schema now?')
      .sendLine('n')
      .wait('"amplify publish" will build all your local backend and frontend resources')
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

