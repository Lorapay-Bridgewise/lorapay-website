import { attribution, displayPhone, isEmail, normalizePhone, sendForm, setError } from './forms';

const SITE_SHARE_TEXT = 'I just joined the Lorapay waitlist: pay anyone, online or offline. Join me:';

export function setupWaitlist(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('form.wl-form');
  const done = root.querySelector<HTMLElement>('.wl-done');
  if (!form || !done) return;
  const endpoint = root.dataset.formsEndpoint ?? '';
  const submit = form.querySelector<HTMLButtonElement>('.submit')!;
  const label = submit.querySelector<HTMLElement>('.label')!;
  const formError = form.querySelector<HTMLElement>('.form-error')!;
  const uses = new Set<string>();
  let tried = false;

  form.querySelectorAll<HTMLButtonElement>('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const use = chip.dataset.use!;
      const on = !uses.has(use);
      if (on) uses.add(use);
      else uses.delete(use);
      chip.setAttribute('aria-pressed', String(on));
    });
  });

  const values = () => {
    const data = new FormData(form);
    return {
      name: String(data.get('name') ?? '').trim(),
      phone: String(data.get('phone') ?? ''),
      email: String(data.get('email') ?? '').trim(),
      state: String(data.get('state') ?? ''),
      consent: data.get('consent') === 'on',
      website: String(data.get('website') ?? ''),
    };
  };

  const validate = (): boolean => {
    const v = values();
    const errors: Record<string, string> = {
      name: v.name.length >= 2 ? '' : 'Please enter your name.',
      phone: normalizePhone(v.phone) ? '' : 'Enter a Nigerian mobile number, like 0803 123 4567.',
      email: !v.email || isEmail(v.email) ? '' : 'That email doesn’t look right.',
      state: v.state ? '' : 'Choose your state.',
      consent: v.consent ? '' : 'Tick the box so we can text you at launch.',
    };
    for (const [field, message] of Object.entries(errors)) setError(form, field, message);
    return Object.values(errors).every(m => !m);
  };

  form.addEventListener('input', () => tried && validate());
  form.addEventListener('change', () => tried && validate());

  form.addEventListener('submit', async event => {
    event.preventDefault();
    tried = true;
    formError.hidden = true;
    if (!validate()) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    const v = values();
    const phone = normalizePhone(v.phone)!;

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    label.textContent = 'Joining…';
    const result = await sendForm(endpoint, {
      kind: 'waitlist',
      name: v.name,
      phone,
      email: v.email,
      state: v.state,
      uses: [...uses],
      consent: v.consent,
      website: v.website, // honeypot: people leave it empty
      ...attribution(),
    });
    submit.disabled = false;
    submit.removeAttribute('aria-busy');
    label.textContent = 'Join the waitlist';

    if (!result.ok) {
      if (result.field) {
        setError(form, result.field, result.error);
      } else {
        formError.textContent = result.error;
        formError.hidden = false;
      }
      return;
    }

    const first = v.name.split(/\s+/)[0];
    done.querySelector('.done-title')!.textContent = result.duplicate ? `You're already on the list, ${first}.` : `You're on the list, ${first}.`;
    done.querySelector('.done-text')!.textContent = `We'll text ${displayPhone(phone)} as soon as Lorapay opens in ${v.state}.`;
    const link = `${location.origin}/waitlist?ref=whatsapp`;
    done.querySelector<HTMLAnchorElement>('.share')!.href = `https://wa.me/?text=${encodeURIComponent(`${SITE_SHARE_TEXT} ${link}`)}`;
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  done.querySelector('.again')?.addEventListener('click', () => {
    form.reset();
    uses.clear();
    form.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
    tried = false;
    for (const f of ['name', 'phone', 'email', 'state', 'consent']) setError(form, f, '');
    done.hidden = true;
    form.hidden = false;
    form.querySelector<HTMLInputElement>('[name="name"]')?.focus();
  });
}
