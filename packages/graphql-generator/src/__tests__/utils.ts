import * as fs from 'fs';
import * as path from 'path';

export function readSchema(schemaName: string): string {
  return fs.readFileSync(path.join(__dirname, 'schemas', schemaName), 'utf8');
}
