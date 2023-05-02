export function toUpper(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function toLower(word: string): string {
  return word.charAt(0).toLowerCase() + word.slice(1);
}
