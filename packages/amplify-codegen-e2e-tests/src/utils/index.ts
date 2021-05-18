import { existsSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import path from 'path';

export function isNotEmptyDir(dirPath: string) : boolean {
  return existsSync(dirPath) && readdirSync(dirPath).length > 0;
}

export function generateSourceCode(projectRoot: string, srcDir: string) : string {
  const userFileData = 'This is a pre-existing file.';
  const srcCodePath = path.join(projectRoot, srcDir, 'sample.txt');
  if (!existsSync(path.dirname(srcCodePath))) {
    mkdirSync(path.dirname(srcCodePath), {recursive: true});
  }
  writeFileSync(srcCodePath, userFileData);
  return srcCodePath;
}