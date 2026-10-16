/**
 * Sends the site's forms (waitlist, contact) to the Google Apps Script web app that writes them
 * to the Google Sheet (apps-script/Code.gs).
 *
 * The body is sent as text/plain so the browser makes a "simple" request (no CORS preflight, which
 * Apps Script can't answer); the script still reads it as JSON.
 */
export type FormResult = { ok: true; duplicate?: boolean } | { ok: false; error: string; field?: string };

export const NOT_SET_UP = 'The form is not connected yet. Please email hello@lorapay.io and we will add you.';

export async function sendForm(endpoint: string, body: Record<string, unknown>, timeoutMs = 15_000): Promise<FormResult> {
  if (!endpoint) {
    return { ok: false, error: NOT_SET_UP };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: 'follow',
    });
    const data = (await response.json().catch(() => null)) as FormResult | null;
    if (!data || typeof data.ok !== 'boolean') {
      return { ok: false, error: 'Something went wrong on our side. Please try again in a moment.' };
    }
    return data;
  } catch {
    return { ok: false, error: "We couldn't reach Lorapay. Check your connection and try again." };
  } finally {
    clearTimeout(timer);
  }
}

/** A Nigerian mobile number as +234XXXXXXXXXX, or null. Accepts 0803…, 803…, 234803…, +234 803…. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('234')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^[789][01]\d{8}$/.test(d) ? `+234${d}` : null;
}

/** +2348031234567 -> 0803 123 4567 */
export function displayPhone(e164: string): string {
  const d = e164.replace(/^\+234/, '0');
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Where the visitor came from (utm_source etc., or the referring site), for counting what works. */
export function attribution(): Record<string, string> {
  const params = new URLSearchParams(location.search);
  const out: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'ref']) {
    const value = params.get(key);
    if (value) out[key] = value.slice(0, 80);
  }
  if (document.referrer && !document.referrer.startsWith(location.origin)) {
    try {
      out.referrer = new URL(document.referrer).hostname;
    } catch {
      /* ignore */
    }
  }
  out.page = location.pathname;
  return out;
}

export function setError(form: HTMLElement, name: string, message: string): void {
  const input = form.querySelector<HTMLElement>(`[name="${name}"]`);
  const box = input ? document.getElementById(input.getAttribute('aria-describedby') ?? '') : null;
  if (box) box.textContent = message;
  if (input) {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}
