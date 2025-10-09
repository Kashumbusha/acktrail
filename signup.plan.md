<!-- 591b50d9-a47e-45b7-92a0-a7a843185af6 50136485-b1fe-4013-8c1f-38c1c7c32028 -->
# Signup flow + unified theme with dark/light mode

## Goals

- Make “Get started” go to a new Signup page, with a small Sign in link.
- Keep Sign in going to Login.
- Add a consistent app theme system with light/dark mode and a persistent toggle.

## Changes

### 1) Routing and pages

- Add route `/signup` in `frontend/src/App.jsx`.
- Create `frontend/src/pages/Signup.jsx` by reusing `Login.jsx` logic (email → code → verify), but:
- Update copy for signup (primary button text, headings).
- Add a small inline link: “Already have an account? Sign in”.
- Keep `/login` as-is for signing in.

### 2) Landing CTAs

- In `frontend/src/pages/Landing.jsx`:
- Change nav button “Get Started” and hero CTA to link to `/signup`.
- Keep a secondary “Sign in” link pointing to `/login`.

### 3) Tailwind dark mode and theme tokens

- Enable Tailwind dark mode via class strategy in `frontend/tailwind.config.js`:
- Add `darkMode: 'class'`.
- Add theme boot script in `frontend/index.html` to set the initial theme before paint (reads `localStorage.theme` or system preference):
- Minimal inline script to add/remove `document.documentElement.classList` accordingly.
- Introduce CSS variables in `frontend/src/index.css` for surface, text, border, and accent; provide dark equivalents under `.dark`.
- Update existing utility composites (`.card`, `.btn`, `.input`, etc.) in `index.css` to include dark variants using Tailwind’s `dark:`.

### 4) Theme provider and toggle

- Create `frontend/src/hooks/useTheme.js` to manage theme state with `localStorage` and system fallback.
- Create `frontend/src/components/ThemeToggle.jsx` (icon button) to switch themes.
- Add the toggle to:
- Public `Landing.jsx` navbar
- `Login.jsx` and new `Signup.jsx` (top-right small toggle)
- Shared `Layout.jsx` (visible on private pages)

### 5) Apply dark variants to key views

- Light/dark pass on:
- `Login.jsx` and new `Signup.jsx`: form card, inputs, text.
- `Dashboard.jsx`: cards, dividers, text, hover states.
- `PolicyList.jsx`: table header/body, row hovers, empty state.
- `components/StatsCard.jsx`: card surface/border/icon background.
- `components/Layout.jsx` and `pages/Landing.jsx` navbar/footer backgrounds.

### 6) Quick verification

- Run the app and verify `http://localhost:5173/` in both themes:
- CTAs route correctly to `/signup` and `/login`.
- Toggle persists across reloads and pages; follows system when unset.

## Notes

- Signup uses the same passwordless email+code backend as Login; only copy/CTA differs. If you later need separate signup APIs, we’ll split accordingly.
- The theme system is opt-in via the `dark` class on `html`, leaving SSR unaffected.

### To-dos

- [ ] Add /signup route and create Signup.jsx based on Login.jsx
- [ ] Point Landing CTAs to /signup; keep Sign in link
- [ ] Enable darkMode:'class' in tailwind.config.js
- [ ] Add pre-paint theme boot script in index.html
- [ ] Create useTheme.js for persisted theme with system fallback
- [ ] Create ThemeToggle.jsx and render in navs and auth pages
- [ ] Add CSS variables + dark variants to index.css components
- [ ] Apply dark classes in Dashboard, PolicyList, Login, Signup, StatsCard, Layout
- [ ] Verify flows and theme persistence via http://localhost:5173/