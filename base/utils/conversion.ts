/**
 * Maps a boolean to 'Ja' or 'Nein'.
 * @param value The boolean to convert.
 * @returns 'Ja' if the boolean is true, 'Nein' otherwise.
 */
export function booleanToString(value: boolean): string {
  return value ? 'Ja' : 'Nein';
}
