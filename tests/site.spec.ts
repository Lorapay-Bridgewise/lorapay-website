import { expect, test, type Page } from '@playwright/test';

const ENDPOINT = 'https://script.google.com/macros/s/TEST/exec';

/** Answers the forms like the Apps Script web app would, and records what was sent. */
async function fakeSheet(page: Page, reply: object = { ok: true }) {
  const sent: any[] = [];
  await page.route(ENDPOINT, async route => {
    sent.push(JSON.parse(route.request().postData() ?? '{}'));
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(reply) });
  });
  return sent;
}

/** Fails the test on any console error (CSP violations show up here). */
function noConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(String(e)));
  return errors;
}

async function fillWaitlist(page: Page, scope = page.locator('#waitlist')) {
  await scope.getByLabel('Full name').fill('Chiamaka Eze');
  await scope.getByLabel('Phone number').fill('0803 123 4567');
  await scope.getByLabel('State').selectOption('Lagos');
  await scope.getByRole('button', { name: 'Bank transfers' }).click();
  await scope.getByRole('checkbox').check();
}

test('every page loads with the strict security headers and no errors', async ({ page }) => {
  const errors = noConsoleErrors(page);
  for (const path of ['/', '/waitlist', '/about', '/security', '/privacy', '/app-privacy', '/terms']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
  }
  expect(errors).toEqual([]);

  const missing = await page.goto('/nope');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: "This page didn't make it through." })).toBeVisible();
});

test('no page scrolls sideways on a phone', async ({ page }) => {
  for (const path of ['/', '/waitlist', '/about', '/security', '/privacy', '/app-privacy', '/terms']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('joins the waitlist from the landing page', async ({ page }) => {
  const errors = noConsoleErrors(page);
  const sent = await fakeSheet(page);
  await page.goto('/?utm_source=twitter');
  await page.locator('#waitlist').scrollIntoViewIfNeeded();
  await fillWaitlist(page);
  await page.locator('#waitlist').getByRole('button', { name: 'Join the waitlist' }).click();

  await expect(page.getByText("You're on the list, Chiamaka.")).toBeVisible();
  await expect(page.getByText('We\'ll text 0803 123 4567 as soon as Lorapay opens in Lagos.')).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ kind: 'waitlist', name: 'Chiamaka Eze', phone: '+2348031234567', state: 'Lagos', uses: ['Bank transfers'], consent: true, website: '', utm_source: 'twitter', page: '/' });
  const share = await page.getByRole('link', { name: 'Share on WhatsApp' }).getAttribute('href');
  expect(decodeURIComponent(share!)).toContain('/waitlist?ref=whatsapp');
  expect(errors).toEqual([]);
});

test('explains every mistake before sending anything', async ({ page }) => {
  const sent = await fakeSheet(page);
  await page.goto('/waitlist');
  await page.getByRole('button', { name: 'Join the waitlist' }).click();
  await expect(page.getByText('Please enter your name.')).toBeVisible();
  await expect(page.getByText('Enter a Nigerian mobile number, like 0803 123 4567.')).toBeVisible();
  await expect(page.getByText('Choose your state.')).toBeVisible();
  await expect(page.getByText('Tick the box so we can text you at launch.')).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeFocused();

  await page.getByLabel('Phone number').fill('12345');
  await expect(page.getByText('Enter a Nigerian mobile number, like 0803 123 4567.')).toBeVisible();
  expect(sent).toHaveLength(0);
});

test('says when the number is already on the list', async ({ page }) => {
  await fakeSheet(page, { ok: true, duplicate: true });
  await page.goto('/waitlist');
  await fillWaitlist(page, page.locator('main'));
  await page.getByRole('button', { name: 'Join the waitlist' }).click();
  await expect(page.getByText("You're already on the list, Chiamaka.")).toBeVisible();
});

test('shows the server\'s message when it refuses, and keeps what was typed', async ({ page }) => {
  await fakeSheet(page, { ok: false, error: 'We are getting a lot of sign-ups right now. Please try again in a minute.' });
  await page.goto('/waitlist');
  await fillWaitlist(page, page.locator('main'));
  await page.getByRole('button', { name: 'Join the waitlist' }).click();
  await expect(page.getByText('We are getting a lot of sign-ups right now.')).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveValue('Chiamaka Eze');
});

test('says so when Lorapay can\'t be reached', async ({ page }) => {
  await page.route(ENDPOINT, route => route.abort());
  await page.goto('/waitlist');
  await fillWaitlist(page, page.locator('main'));
  await page.getByRole('button', { name: 'Join the waitlist' }).click();
  await expect(page.getByText("We couldn't reach Lorapay. Check your connection and try again.")).toBeVisible();
});

test('sends a contact message', async ({ page }) => {
  const sent = await fakeSheet(page);
  await page.goto('/about#contact');
  await page.getByLabel('Your name').fill('Tunde Bakare');
  await page.getByLabel('Email').fill('tunde@example.com');
  await page.getByLabel('Topic').selectOption('Press');
  await page.getByLabel('Message').fill('Hello, I write for a newspaper in Lagos.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText("Thanks, we've got your message.")).toBeVisible();
  expect(sent[0]).toMatchObject({ kind: 'contact', name: 'Tunde Bakare', email: 'tunde@example.com', topic: 'Press' });
});

test('the menu opens on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Security' })).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await nav.getByRole('link', { name: 'Security' }).click();
  await expect(page).toHaveURL(/\/security$/);
});

test('security.txt and the sitemap are published', async ({ request }) => {
  expect(await (await request.get('/.well-known/security.txt')).text()).toContain('Contact: mailto:security@lorapay.io');
  expect(await (await request.get('/sitemap-index.xml')).text()).toContain('sitemap-0.xml');
});
