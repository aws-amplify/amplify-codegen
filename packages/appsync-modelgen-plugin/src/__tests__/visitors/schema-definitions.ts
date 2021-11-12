export const schemaWithDefaultDirective = /* GraphQL */ `
  type SimpleModel @model {
    id: ID!
    stringValue: String @default(value: "hello world")
    intVal: Int @default(value: "10002000")
    floatValue: Float @default(value: "123456.34565")
    booleanValue: Boolean @default(value: "true")
    awsJsonValue: AWSJSON @default(value: "{\\"a\\":1, \\"b\\":3, \\"string\\": 234}")
    awsDateValue: AWSDate @default(value: "2016-01-29")
    awsTimestampValue: AWSTimestamp @default(value: "545345345")
    awsEmailValue: AWSEmail @default(value: "local-part@domain-part")
    awsURLValue: AWSURL @default(value: "https://www.amazon.com/dp/B000NZW3KC/")
    awsPhoneValue: AWSPhone @default(value: "+41 44 668 18 00")
    awsIPAddressValue1: AWSIPAddress @default(value: "123.12.34.56")
    awsIPAddressValue2: AWSIPAddress @default(value: "1a2b:3c4b::1234:4567")
    enumValue: Tag @default(value: "RANDOM")
    awsTimeValue: AWSTime @default(value: "12:00:34Z")
    awsDateTime: AWSDateTime @default(value: "2007-04-05T14:30:34Z")
  }

  enum Tag {
    NEWS
    RANDOM
  }
`;
