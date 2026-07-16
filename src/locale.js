// 247420 design system — locale controller.
//
// User-configurable locale override for date/time formatting; persists to
// localStorage like theme.js's controller. Absent an override, falls back to
// navigator.language (the browser's own locale) explicitly rather than
// relying on Intl's implicit-undefined-locale default, so a caller can always
// know which locale actually formatted a given string.

const KEY = '247420:locale';

function isBrowser() {
    return typeof navigator !== 'undefined' && typeof window !== 'undefined';
}

function readStored() {
    try { return window.localStorage.getItem(KEY) || null; } catch { return null; }
}

export function getLocale() {
    const stored = readStored();
    if (stored) return stored;
    if (isBrowser() && navigator.language) return navigator.language;
    return 'en-US';
}

export function setLocale(locale) {
    if (!isBrowser()) return locale;
    try {
        if (locale) window.localStorage.setItem(KEY, locale);
        else window.localStorage.removeItem(KEY);
    } catch { /* swallow: persistence is best-effort, locale still applies in-memory this session */ }
    return locale;
}

function hour12Preference(locale) {
    try { return Intl.DateTimeFormat(locale).resolvedOptions().hour12; }
    catch { return undefined; }
}

// formatTime: replaces bare `new Date().toLocaleTimeString()` -- explicit
// locale (never the implicit-undefined default) plus the locale's own
// resolved hour12 preference (never hardcoded 12/24h).
export function formatTime(date, locale = getLocale()) {
    const hour12 = hour12Preference(locale);
    try { return new Date(date).toLocaleTimeString(locale, hour12 === undefined ? undefined : { hour12 }); }
    catch { return new Date(date).toLocaleTimeString(); }
}

export function formatDateTime(date, locale = getLocale()) {
    const hour12 = hour12Preference(locale);
    try { return new Date(date).toLocaleString(locale, hour12 === undefined ? undefined : { hour12 }); }
    catch { return new Date(date).toLocaleString(); }
}

// formatNumber: replaces bare `n.toLocaleString()` -- explicit locale for
// thousands-separator/decimal conventions that genuinely differ (e.g.
// '1,234.5' en-US vs '1.234,5' de-DE).
export function formatNumber(n, locale = getLocale()) {
    try { return n.toLocaleString(locale); } catch { return String(n); }
}

const RTF_DIVISIONS = [
    { amount: 60, unit: 'seconds' },
    { amount: 60, unit: 'minutes' },
    { amount: 24, unit: 'hours' },
    { amount: 7, unit: 'days' },
    { amount: 4.34524, unit: 'weeks' },
    { amount: 12, unit: 'months' },
    { amount: Infinity, unit: 'years' },
];

// formatRelativeTime: "2 hours ago" via the real Intl.RelativeTimeFormat,
// never a hand-rolled string-concat implementation.
export function formatRelativeTime(date, locale = getLocale(), now = Date.now()) {
    let duration = (new Date(date).getTime() - now) / 1000;
    try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        for (const division of RTF_DIVISIONS) {
            if (Math.abs(duration) < division.amount) return rtf.format(Math.round(duration), division.unit);
            duration /= division.amount;
        }
    } catch { /* fall through to the plain-time fallback below */ }
    return formatTime(date, locale);
}
