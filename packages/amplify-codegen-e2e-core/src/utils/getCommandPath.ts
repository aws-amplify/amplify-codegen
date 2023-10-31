import { execSync } from 'child_process';
/* Get the full absolute path of a command with `which`
 *
 * Windows executors on CB fail to spawn a command with custom nexpect unless the full path is used.
 */
export function getCommandPath(command: string): string {
  return execSync(`which ${command}`)
    .toString()
    .trim();
}
