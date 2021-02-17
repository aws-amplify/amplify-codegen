import { buildSchema } from 'graphql';
import { isS3Field } from '../src/utilities/complextypes';

describe('Should detect S3 complex objects in schema', () => {
    it('Should return false for S3Object type without localUri and mimeType', () => {
        const schema = buildSchema(`
            type S3Object {
                bucket: String!
                region: String!
                key: String!
            }          
        `);
        expect(isS3Field(schema.getTypeMap()['S3Object'])).toBe(false);
    })

    it('Should return false for S3Object type with optional localUri and mimeType', () => {
        const schema = buildSchema(`
            type S3Object {
                bucket: String!
                region: String!
                key: String!
                localUri: String
                mimeType: String
            }          
        `);
        expect(isS3Field(schema.getTypeMap()['S3Object'])).toBe(false);
    })

    it('Should return true for valid S3Object type', () => {
        const schema = buildSchema(`
            type S3Object {
                bucket: String!
                region: String!
                key: String!
                localUri: String!
                mimeType: String!
            }          
        `);
        expect(isS3Field(schema.getTypeMap()['S3Object'])).toBe(true);
    })
})
