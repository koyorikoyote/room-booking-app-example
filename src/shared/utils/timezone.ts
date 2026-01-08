export const JST_OFFSET = 9 * 60 * 60 * 1000; // 9 hours in milliseconds

export function convertUTCtoJST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + JST_OFFSET);
}

export function convertJSTtoUTC(jstDate: Date): Date {
  return new Date(jstDate.getTime() - JST_OFFSET);
}

export function getCurrentJSTDate(): Date {
  return convertUTCtoJST(new Date());
}

export function formatJSTDateTime(date: Date): string {
  const jstDate = convertUTCtoJST(date);
  return jstDate.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
