//  Used only in  tests. Directive definition will be passed as part of the configuration when modelgen is run using CLI
export const scalars = [
  'ID',
  'String',
  'Int',
  'Float',
  'Boolean',
  'AWSDate',
  'AWSDateTime',
  'AWSTime',
  'AWSTimestamp',
  'AWSEmail',
  'AWSJSON',
  'AWSURL',
  'AWSPhone',
  'AWSIPAddress',
]
  .map(typeName => `scalar ${typeName}`)
  .join();
