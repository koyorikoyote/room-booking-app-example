export function getJSTDate(): Date {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9
  return new Date(now.getTime() + jstOffset);
}
