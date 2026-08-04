export default async function run(page, ui) {
  const lrn = 'T896852'
  const code = 'A07F3'
  const T = 8000
  const seen = []

  await page.waitForTimeout(1200)
  const pre = await ui.snapshot()
  const lrnRef = pre.match(/@(e\d+) textbox "STUDENT CODE"/)?.[1]
  const codeRef = pre.match(/@(e\d+) textbox "VOTING PIN"/)?.[1]
  const loginRef = pre.match(/@(e\d+) button "Login"/)?.[1]
  if (!lrnRef || !codeRef || !loginRef) return { error: 'no login fields' }

  await ui.fill(lrnRef, lrn, { timeout: T })
  await ui.fill(codeRef, code, { timeout: T })
  await ui.click(loginRef, { timeout: T })
  await page.waitForURL('**/ballot', { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(1500)

  await page.getByRole('button', { name: /Let's Vote/ }).click({ timeout: T }).catch(() => {})
  await page.waitForTimeout(600)

  let guard = 0
  while (guard++ < 20) {
    const isReview = await page
      .getByRole('heading', { name: 'Review your ballot' })
      .isVisible({ timeout: 1000 })
      .catch(() => false)
    if (isReview) break
    const n = await page.locator('main button').count({ timeout: 1000 }).catch(() => 0)
    if (n === 0) break
    await page.locator('main button').first().click({ timeout: T }).catch(() => {})
    await page.waitForTimeout(250)
    await page.getByRole('button', { name: 'Next', exact: true }).click({ timeout: T }).catch(() => {})
    await page.waitForTimeout(450)
  }

  await page.getByRole('button', { name: /Submit my vote/ }).click({ timeout: T }).catch(() => {})
  await page.waitForTimeout(800)
  const modal = await ui.snapshot()
  const yesRef = modal.match(/@(e\d+) button "Yes, submit my vote"/)?.[1]
  await ui.click(yesRef, { timeout: T }).catch(() => {})
  await page.waitForTimeout(1500)
  seen.push({ t: '1.5s', url: page.url(), thanks: await page.getByText('Thank you for voting!').isVisible().catch(() => false) })
  await page.waitForTimeout(2000)
  seen.push({ t: '3.5s', url: page.url(), thanks: await page.getByText('Thank you for voting!').isVisible().catch(() => false) })
  await page.waitForTimeout(2000)
  seen.push({ t: '5.5s', url: page.url(), thanks: await page.getByText('Thank you for voting!').isVisible().catch(() => false) })
  await page.waitForTimeout(2000)
  seen.push({ t: '7.5s', url: page.url(), thanks: await page.getByText('Thank you for voting!').isVisible().catch(() => false) })
  return { seen }
}
