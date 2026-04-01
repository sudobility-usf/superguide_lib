/**
 * Formats a duration in seconds to a human-readable string.
 *
 * @example formatDuration(90) => "2 min"
 * @example formatDuration(3700) => "1 hr 2 min"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return '< 1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

/**
 * Formats a distance in metres to a human-readable string (imperial).
 *
 * @example formatDistance(500) => "1640 ft"
 * @example formatDistance(5000) => "3.1 mi"
 */
export function formatDistance(metres: number): string {
  const miles = metres / 1609.344;
  if (miles < 0.1) return `${Math.round(metres * 3.281)} ft`;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Parses a HH:mm time string to a decimal hour value.
 *
 * @example parseTime("14:30") => 14.5
 */
export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + (m ?? 0) / 60;
}

/**
 * Formats a HH:mm time string to 12-hour format.
 *
 * @example formatTime12("14:30") => "2:30 PM"
 */
export function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Formats an hour number to a display string.
 *
 * @example formatHour(14) => "2 PM"
 */
export function formatHour(hour: number): string {
  if (hour === 12) return '12 PM';
  if (hour === 0) return '12 AM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}
