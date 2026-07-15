export function getComboPercent(combo, tiers) {
  return [...tiers]
    .sort((a, b) => b.minimum_days - a.minimum_days)
    .find((tier) => combo >= tier.minimum_days)?.bonus_percent ?? 0;
}

export function isConsecutiveQuizDate(previousDate, currentDate, schedule) {
  if (!previousDate) return true;
  const activeDates = schedule.filter((entry) => !entry.skip).map((entry) => entry.date);
  return activeDates.indexOf(currentDate) - activeDates.indexOf(previousDate) === 1;
}

export function getCloseDateKey(entry) {
  const date = new Date(`${entry.date}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (entry.day === 'Friday' ? 3 : 1));
  return date.toISOString().slice(0, 10);
}

function timezoneOffset(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map(({ type, value }) => [type, value]),
  );
  const representedAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return representedAsUtc - date.getTime();
}

export function getQuizCloseAt(entry, timeZone = 'Asia/Bangkok') {
  const [year, month, day] = getCloseDateKey(entry).split('-').map(Number);
  const approximate = new Date(Date.UTC(year, month - 1, day, 16, 59, 59));
  return new Date(approximate.getTime() - timezoneOffset(approximate, timeZone));
}

export function isQuizOpen(entry, timeZone, now = new Date()) {
  return now.getTime() <= getQuizCloseAt(entry, timeZone).getTime();
}

export function getSpeedBonusPercent(seconds, tiers) {
  return tiers.find((tier) =>
    tier.max_elapsed_seconds === null || seconds <= tier.max_elapsed_seconds
  )?.bonus_percent ?? 0;
}
