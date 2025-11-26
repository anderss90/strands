/**
 * Format date and time in European 24-hour format
 * Date: DD/MM/YYYY
 * Time: HH:mm (24-hour format)
 */

const EUROPEAN_LOCALE = 'en-GB'; // British English uses DD/MM/YYYY and 24-hour time

/**
 * Format a date string to European date format (DD/MM/YYYY)
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(EUROPEAN_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a date string to European time format (HH:mm - 24-hour)
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString(EUROPEAN_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // 24-hour format
  });
}

/**
 * Format a date string to European date and time format (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(EUROPEAN_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // 24-hour format
  });
}

/**
 * Format a date string to European date format with month name (DD Month YYYY)
 */
export function formatDateLong(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(EUROPEAN_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date string to European date and time format with month name (DD Month YYYY, HH:mm)
 */
export function formatDateTimeLong(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateStr = dateObj.toLocaleDateString(EUROPEAN_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString(EUROPEAN_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // 24-hour format
  });
  return `${dateStr}, ${timeStr}`;
}

