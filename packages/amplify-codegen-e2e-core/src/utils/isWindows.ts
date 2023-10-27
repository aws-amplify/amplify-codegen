export function isWindows(): boolean {
  return !!process.env.WINDIR;
}
