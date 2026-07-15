export function getDateKey(timeZone = 'Asia/Bangkok', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function elapsedSeconds(startIso, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - new Date(startIso).getTime()) / 1000));
}
