export function capitalize(str: string | undefined): string {
  // capitalize first letter of each word
  if (str === undefined) return '';
  return str.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

