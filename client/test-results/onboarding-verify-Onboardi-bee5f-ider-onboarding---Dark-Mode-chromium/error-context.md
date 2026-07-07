# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: onboarding-verify.spec.ts >> Onboarding UI Verification >> Provider onboarding - Dark Mode
- Location: tests/e2e/onboarding-verify.spec.ts:39:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e3]:
    - generic:
      - img
    - generic [ref=e5]:
      - img "Raiyah Plus" [ref=e6]
      - generic [ref=e7]:
        - link "Reality" [ref=e8] [cursor=pointer]:
          - /url: "#reality"
        - link "Belief" [ref=e9] [cursor=pointer]:
          - /url: "#belief"
        - link "System" [ref=e10] [cursor=pointer]:
          - /url: "#how-it-works"
    - generic [ref=e12]:
      - generic [ref=e14]:
        - heading "AI is transforming care. Structure is what makes it work." [level=1] [ref=e15]:
          - text: AI is transforming care.
          - text: Structure is what makes it work.
        - paragraph [ref=e16]: Riayah Plus brings together intelligent systems and dedicated Care Navigators to turn complex care into clear, trackable progress without the constant coordination.
        - generic [ref=e17]:
          - link "Login as Careseeker" [ref=e18] [cursor=pointer]:
            - /url: /careseeker/login
            - generic [ref=e19]: Login as Careseeker
          - link "Login as Provider" [ref=e20] [cursor=pointer]:
            - /url: /provider/login
            - generic [ref=e21]: Login as Provider
        - generic [ref=e22]: Purpose-built for disability and aged care, grounded in Australian expertise and real-world understanding of how care is delivered day to day.
      - generic [ref=e24]:
        - img "Care Professional with Client" [ref=e26]
        - generic [ref=e27]:
          - generic [ref=e29]: Guidance Signal
          - generic [ref=e33]: Trackable Progress
    - generic [ref=e38]:
      - generic [ref=e39]:
        - heading "Care shouldn't feel like a second full-time job." [level=2] [ref=e40]:
          - text: Care shouldn't
          - generic [ref=e41]:
            - text: feel like a second
            - text: full-time job.
        - generic [ref=e42]: The Reality of Complexity
        - list [ref=e43]:
          - listitem [ref=e44]: Chasing updates from support workers
          - listitem [ref=e45]: Coordinating appointments and schedules
          - listitem [ref=e46]: Trying to turn clinical advice into day-to-day actions
          - listitem [ref=e47]: Ensuring goals are actually followed
      - generic [ref=e49]:
        - generic [ref=e50]: 15–20+hrs
        - paragraph [ref=e51]: Most families spend 15–20+ hours per week coordinating care manually.
        - paragraph [ref=e53]: Without structure, independence is hard to measure and even harder to sustain.
    - generic [ref=e55]:
      - heading "Good care is human. Consistent care is structured." [level=2] [ref=e57]:
        - text: Good care is human.
        - text: Consistent care is structured.
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]: 01 // Families
          - paragraph [ref=e61]: Shouldn't carry the coordination burden alone. Care breaks down between appointments not during them.
        - generic [ref=e62]:
          - generic [ref=e63]: 02 // Clinicians
          - paragraph [ref=e64]: Shouldn't wonder what happens between visits. Their strategic input requires operational execution.
        - generic [ref=e65]:
          - generic [ref=e66]: 03 // Support Workers
          - paragraph [ref=e67]: Deserve clear guidance and total accountability to deliver their best operational care.
      - generic [ref=e68]:
        - text: "\"Technology reduces complexity. Humans provide judgment."
        - text: Together, care becomes predictable."
    - generic [ref=e70]:
      - generic [ref=e72]:
        - heading "From application to real-world independence." [level=2] [ref=e73]:
          - text: From application to
          - text: real-world independence.
        - paragraph [ref=e74]: No chasing. No guessing. Just coordinated care that moves forward.
      - generic [ref=e76]:
        - generic [ref=e78]:
          - generic [ref=e79]: "01"
          - generic [ref=e80]:
            - heading "Apply & Understand" [level=3] [ref=e81]
            - paragraph [ref=e82]: Families submit a simple application outlining their needs, goals, and current situation. We gather the right information upfront so nothing important is missed.
        - generic [ref=e84]:
          - generic [ref=e85]: "02"
          - generic [ref=e86]:
            - heading "Build the Care Plan" [level=3] [ref=e87]
            - paragraph [ref=e88]: A dedicated Care Navigator works with the family to create a structured care plan. This plan translates clinical advice and personal goals into clear, actionable steps tailored to the individual.
        - generic [ref=e90]:
          - generic [ref=e91]: "03"
          - generic [ref=e92]:
            - heading "Coordinate & Execute" [level=3] [ref=e93]
            - paragraph [ref=e94]: Your Care Navigator stays with you ensuring the plan is followed consistently. Support workers operate within structured workflows. Smart recommendations surface at the right moment.
            - generic [ref=e95]: One point of contact. Full visibility. Total accountability.
        - generic [ref=e97]:
          - generic [ref=e98]: "04"
          - generic [ref=e99]:
            - heading "Track & Improve" [level=3] [ref=e100]
            - paragraph [ref=e101]: Families see real-time progress across health, daily living, and independence. Insights highlight what&apos;s working, what needs attention, and what to do next.
    - generic [ref=e102]:
      - heading "Less admin. More living." [level=2] [ref=e104]:
        - text: Less admin.
        - text: More living.
      - generic [ref=e105]:
        - generic [ref=e108]: Reclaim 15–20+ hours per week
        - generic [ref=e111]: See exactly what&apos;s happening without constant follow-up
        - generic [ref=e114]: Reduce stress and mental load
        - generic [ref=e117]: Track real independence not just assumptions
        - generic [ref=e120]: Feel confident that nothing important is being missed
    - generic [ref=e122]:
      - generic [ref=e123]:
        - heading "Not another app. Not another agency." [level=2] [ref=e124]:
          - text: Not another app.
          - text: Not another agency.
        - generic [ref=e125]:
          - generic [ref=e126]:
            - generic [ref=e127]: "[ / ]"
            - generic [ref=e128]: We replace clinicians.
          - generic [ref=e129]:
            - generic [ref=e130]: "[ / ]"
            - generic [ref=e131]: We provide staffing.
          - generic [ref=e132]:
            - generic [ref=e133]: "[ / ]"
            - generic [ref=e134]: We simply digitise paperwork.
        - paragraph [ref=e135]: Riayah Plus is the coordination infrastructure that keeps everyone aligned purpose-built for disability and aged care, grounded in Australian expertise and real-world care delivery.
        - paragraph [ref=e136]:
          - text: Independence isn't accidental it's engineered.
          - text: And without coordination, even the best care plans fail.
      - generic [ref=e137]:
        - heading "Designed with the people who understand care best" [level=3] [ref=e139]
        - paragraph [ref=e140]: "Developed in consultation with:"
        - list [ref=e141]:
          - listitem [ref=e142]:
            - generic [ref=e143]: Independent support coordinators
            - generic [ref=e144]: +
          - listitem [ref=e145]:
            - generic [ref=e146]: Allied health professionals
            - generic [ref=e147]: +
          - listitem [ref=e148]:
            - generic [ref=e149]: Community care advisors
            - generic [ref=e150]: +
          - listitem [ref=e151]:
            - generic [ref=e152]: Technology and data specialists
            - generic [ref=e153]: +
        - link "Become a Founding Partner" [ref=e154] [cursor=pointer]:
          - /url: /partner
          - generic [ref=e155]: Become a Founding Partner
    - generic [ref=e158]:
      - heading "Independence deserves structure." [level=2] [ref=e159]:
        - text: Independence
        - text: deserves structure.
      - paragraph [ref=e160]: Join the 2026 pilot and help shape a better way to deliver care where intelligent systems and human guidance work together seamlessly.
      - generic [ref=e161]:
        - link "Login as Careseeker" [ref=e162] [cursor=pointer]:
          - /url: /careseeker/login
          - generic [ref=e163]: Login as Careseeker
        - link "Login as Provider" [ref=e164] [cursor=pointer]:
          - /url: /provider/login
          - generic [ref=e165]: Login as Provider
    - generic [ref=e167]:
      - generic [ref=e168]: © 2026 Raiyah Plus
      - generic [ref=e169]:
        - link "Privacy Policy" [ref=e170] [cursor=pointer]:
          - /url: /privacy
        - link "Terms of Service" [ref=e171] [cursor=pointer]:
          - /url: /terms
  - button "Open Next.js Dev Tools" [ref=e177] [cursor=pointer]:
    - img [ref=e178]
  - alert [ref=e181]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Onboarding verification tests
  4  | test.describe('Onboarding UI Verification', () => {
  5  |   
  6  |   test('Careseeker onboarding - Light Mode', async ({ page }) => {
  7  |     await page.goto('/careseeker/onboarding');
  8  |     await page.waitForLoadState('networkidle');
  9  |     await page.screenshot({ path: 'test-results/onboarding-careseeker-light.png', fullPage: true });
  10 |     
  11 |     // Verify page renders without crashing
  12 |     const errorBoundary = page.locator('text=Something went wrong');
  13 |     await expect(errorBoundary).toHaveCount(0);
  14 |   });
  15 | 
  16 |   test('Careseeker onboarding - Dark Mode', async ({ page }) => {
  17 |     await page.goto('/careseeker/onboarding');
  18 |     await page.emulateMedia({ colorScheme: 'dark' });
  19 |     await page.waitForLoadState('networkidle');
  20 |     await page.screenshot({ path: 'test-results/onboarding-careseeker-dark.png', fullPage: true });
  21 |     
  22 |     // Verify dark mode classes are applied
  23 |     const hasDarkClass = await page.evaluate(() => {
  24 |       const elements = document.querySelectorAll('[class*="dark:"]');
  25 |       return elements.length > 0;
  26 |     });
  27 |     expect(hasDarkClass).toBe(true);
  28 |   });
  29 | 
  30 |   test('Provider onboarding - Light Mode', async ({ page }) => {
  31 |     await page.goto('/provider/onboarding');
  32 |     await page.waitForLoadState('networkidle');
  33 |     await page.screenshot({ path: 'test-results/onboarding-provider-light.png', fullPage: true });
  34 |     
  35 |     const errorBoundary = page.locator('text=Something went wrong');
  36 |     await expect(errorBoundary).toHaveCount(0);
  37 |   });
  38 | 
  39 |   test('Provider onboarding - Dark Mode', async ({ page }) => {
  40 |     await page.goto('/provider/onboarding');
  41 |     await page.emulateMedia({ colorScheme: 'dark' });
  42 |     await page.waitForLoadState('networkidle');
  43 |     await page.screenshot({ path: 'test-results/onboarding-provider-dark.png', fullPage: true });
  44 |     
  45 |     const hasDarkClass = await page.evaluate(() => {
  46 |       const elements = document.querySelectorAll('[class*="dark:"]');
  47 |       return elements.length > 0;
  48 |     });
> 49 |     expect(hasDarkClass).toBe(true);
     |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  50 |   });
  51 | 
  52 |   test('Login page - Dark mode consistency', async ({ page }) => {
  53 |     await page.goto('/careseeker/login');
  54 |     await page.emulateMedia({ colorScheme: 'dark' });
  55 |     await page.waitForLoadState('networkidle');
  56 |     
  57 |     // Verify no sidebar elements on login
  58 |     const sidebar = page.locator('aside');
  59 |     await expect(sidebar).toHaveCount(0);
  60 |     
  61 |     await page.screenshot({ path: 'test-results/login-dark-no-sidebar.png', fullPage: true });
  62 |   });
  63 | 
  64 |   test('Zod schema does not crash registration step', async ({ page }) => {
  65 |     await page.goto('/careseeker/onboarding');
  66 |     await page.waitForLoadState('networkidle');
  67 |     
  68 |     // Click through to registration step (step 5)
  69 |     // This would require multiple clicks - simplified to just check no crash
  70 |     const body = page.locator('body');
  71 |     await expect(body).not.toContainText('Error: .pick() cannot be used');
  72 |   });
  73 | 
  74 | });
  75 | 
```