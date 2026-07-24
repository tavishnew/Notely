# UI Audit and Fix Design

**Date:** 2025-07-23  
**Project:** NitroAI  
**Related:** AGENTS.md, UI-SPEC.md  

## Overview
This document describes the plan to audit the NitroAI user interface for non‑functional or placeholder interactive elements and implement the missing functionality while preserving the existing visual design and architecture.

## Goals
- Make every visible button, link, input, modal, dropdown, etc. perform its intended action.
- Remove all placeholder behavior (`console.log`, `alert`, `TODO`, `Coming Soon`, empty callbacks).
- Ensure navigation works, forms submit with validation, modals open/close with proper focus management, and mock data is replaced with real service calls.
- Maintain the existing design system (Tailwind CSS, component library) and architectural patterns (React, custom hooks, context/services).
- Provide basic accessibility (keyboard navigation, ARIA labels, focus trapping) and error handling (loading, success, error states).
- Clean up unused code and duplicate implementations.

## Approach
We will use a **hybrid** strategy:
1. **Automated checks** – Enable/reconfigure ESLint with `jsx-a11y`, run any existing tests, and add a lightweight smoke test suite (using `@testing-library/react` and `jest-axe`) to catch low‑hanging accessibility and correctness issues.
2. **Manual verification** – Systematically walk through each major page and reusable component, identify every interactive element, determine its intended behavior, and implement the missing logic.

## Audit Process

### Automated
- Ensure `eslint-plugin-jsx-a11y` is enabled and run `npm run lint`.
- If the project lacks Jest/testing‑library tests, add a basic test suite that renders each core page (`Landing`, `Dashboard`, `NoteView`, `Onboarding`, `Settings`) and runs `axe` to detect common a11y violations.
- Run any existing end‑to‑end tests (Cypress/Playwright) to verify basic navigation.

### Manual
Create a checklist for each of the following pages:
- `/` (Landing)
- `/dashboard`
- `/note/:id`
- `/onboarding`
- `/settings`

For each page, list all interactive components:
- Navigation items (sidebar, navbar, breadcrumbs)
- Buttons (primary, secondary, icon‑only, floating action)
- Links (text links, button‑styled links)
- Inputs, selects, checkboxes, radio groups
- Modals, drawers, pop‑overs, tooltips, context menus
- Cards or tiles that act as buttons
- Any custom interactive widgets (drag‑drop, sliders, etc.)

For each element, note:
- **Intended behavior** (navigation, open modal, submit form, toggle UI, etc.).
- **Current behavior** (does nothing, logs, alerts, wrong route, disabled).
- **Missing pieces** (event handler, API call, state update, routing prop, validation).

## Fix Implementation Plan

### 1. Dead Buttons & Interactive Controls
Replace placeholder handlers with real logic:
- **Navigation** – use `useNavigate` or `<Link to>` to change route.
- **Open modal/drawer** – toggle the appropriate state (context, hook, or local state).
- **Submit form** – call the existing submit/mutation function (from `src/lib/generation/` or `src/lib/engine/`).
- **Trigger file/URL import** – reuse utilities from `src/lib/ingest/` (e.g., `extractFromFile`, `extractFromUrl`, `extractFromYoutube`).
- **Toggle UI (sidebar, theme, etc.)** – update the relevant context or state.
- Remove `console.log`, `alert`, empty functions, and `TODO` comments.

### 2. Navigation
Ensure every nav item changes the route correctly:
- Identify target path (e.g., Dashboard → `/`, Settings → `/settings`).
- Use `<NavLink to>` for active styling, or `<Link>` with manual active class logic.
- For buttons/icons that navigate, use `useNavigate`.
- Fix external links (`target="_blank" rel="noopener noreferrer"`).
- Verify active state styling works.

### 3. Forms
Make forms functional with validation and submission:
- Convert uncontrolled inputs to controlled components (use state or existing form library like `react-hook-form`).
- Bind `value`/`checked` and `onChange` for each field.
- Add client‑side validation (required, pattern, min/max) using a lightweight solution (e.g., `yup` + `react-hook‑form` or custom validation).
- Show inline error messages and disable submit when invalid.
- On submit:
  - Prevent default.
  - Set loading state.
  - Call the appropriate API/mutation (reuse existing service functions).
  - On success: show toast, reset form, redirect if needed.
  - On error: show error message, retain user input.
- Handle loading and empty states (spinners, skeleton UI).

### 4. Dialogs, Modals, Drawers, Popovers, Dropdowns
Ensure overlay UI opens/closes correctly and manages focus:
- Identify the trigger (button/link) and ensure it toggles open state.
- Implement closing via backdrop click, Escape key, and internal cancel/close button.
- Manage focus:
  - On open: move focus to the first focusable element inside (or the container with `tabindex="-1"`).
  - On trap focus while open (if a focus‑trap library exists, verify it works; otherwise implement a simple trap).
  - On close: return focus to the trigger.
- Animate using existing CSS classes or motion library (e.g., `framer-motion` or Tailwind transitions).
- Populate dynamic content (e.g., note editor) with data from state or props; reset forms on open when appropriate.
- Replace mock open/close handlers with real logic.

### 5. Replace Mock Functionality
Eliminate hard‑coded data and fake loading:
- Delete placeholder data arrays, static text, and fake spinners.
- Replace with calls to existing services:
  - Data fetching → `src/lib/engine/` (e.g., `fetchNotes`, `getUserSettings`).
  - File/URL/YouTube ingestion → `src/lib/ingest/` (e.g., `extractFromFile`, `extractFromUrl`, `extractFromYoutube`).
  - Note/generation features → `src/lib/generation/` (e.g., `generateNotes`, `createFlashcards`, `startQuiz`).
- Use the same state‑management approach already in place (React Context, custom hooks, etc.).
- Remove any temporary UI that only shows static examples.

### 6. Error Handling
Provide robust error states for async operations:
- Wrap API/mutation calls in `try/catch`.
- Show error toast/snackbar using the existing toast component (if available) or implement a simple one.
- Offer a retry button where appropriate (e.g., failed file upload).
- Display empty/loading states with skeleton UI or placeholders while data loads.
- Form validation errors appear inline; submission errors appear near the submit button or as a toast.

### 7. Accessibility (a11y)
Ensure keyboard and screen‑reader usability:
- **Keyboard navigation**: Tab order follows visual hierarchy; no trapped focus except in modals/drawers (where it is intentional).
- **Focus visible**: Ensure `:focus-visible` or an outline is present on all focusable elements; avoid `outline: none` without a visible replacement.
- **ARIA attributes**:
  - Use native `<button>` and `<a>` where possible.
  - For custom buttons (`role="button"`), ensure `tabindex="0"` and keyboard event handling (Enter/Space).
  - Every `<input>`, `<select>`, `<textarea>` has an associated `<label>` (via `htmlFor` or wrapping) or `aria-label`.
  - Modals: `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to a heading inside.
  - Drawers with menu‑like behavior: `role="menu"` and appropriate `aria‑*` attributes.
  - Icon-only buttons: `aria-label` describing the action.
  - Decorative icons: `aria-hidden="true"`.
- **Landmarks**: Use `<header>`, `<nav>`, `<main>`, `<footer>` where appropriate.
- **Color contrast**: Rely on the existing Tailwind palette; verify WCAG AA contrast for text vs. background.
- **Live regions**: Use `aria-live="polite"` for toast messages, loading indicators, and form validation updates.
- **Test**: Navigate the whole app with only keyboard (Tab, Shift+Tab, Enter, Space, Esc, arrow keys); run `eslint-plugin-jsx-a11y` and/or `jest-axe` and fix violations.

### 8. Code Quality
Keep the codebase clean and maintainable:
- Remove unused imports, variables, functions, components, and files (verify they are not referenced elsewhere).
- Deduplicate: before creating a new helper or component, search for existing similar functionality and reuse it.
- Follow existing ESLint and Prettier configurations; match naming conventions (camelCase for vars/functions, PascalCase for components).
- Prefer composition: if a pattern repeats (e.g., a card with title/content/actions), consider extracting a reusable component if one does not already exist.
- Keep changes focused on making UI functional; avoid unrelated refactors unless they directly block the fix.
- Add missing PropTypes or TypeScript types where appropriate to improve self‑documentation.
- Update documentation (JSDoc comments or README) if we introduce a new public helper or modify an interface.

## Assumptions
- The existing codebase already contains the necessary services (data fetching, file ingestion, note generation, etc.) that we can hook into; we do not need to create new backend services.
- Routing is handled by `react-router-dom` (v6) and the route definitions can be inferred from the `src/pages` folder or a dedicated routes file.
- State management relies on React Context and/or custom hooks; we will extend or use those patterns rather than introducing a new state library.
- The project uses a UI component library (likely custom or shadcn/ui) that provides base components (Button, Input, Modal, etc.) which we can extend or use directly.
- There is an existing toast/notification system (or a simple one can be added) for error/success feedback.
- The design must remain visually identical; we are only adding behavior and fixing broken interactions.

## Out of Scope
- Redesigning visual layout, typography, or color scheme.
- Adding entirely new features not presently represented by UI placeholders (e.g., a new settings tab that does not exist anywhere in the UI).
- Major architectural changes (e.g., migrating to a different state‑management library, rewriting the routing system).
- Writing comprehensive unit or end‑to‑end test suites beyond the basic smoke checks mentioned.
- Performance optimization or bundle‑size reduction (unless fixing a bug inadvertently improves performance).

## Implementation Notes
- Start by running the linter and fixing any existing warnings to establish a clean baseline.
- Proceed page by page, using the checklist from the Audit Process.
- After implementing fixes for a page, manually verify that all interactive elements work as expected and that no console errors appear.
- Run the automated checks again to ensure no regressions.
- Commit changes frequently with clear messages (e.g., “fix: enable navigation on Settings button”, “fix: add validation to login form”).
- Once all pages are cleared, run the full test suite (if any) and perform a final manual regression pass.

---
*This design document is ready for review. Once approved, the next step is to create an implementation plan using the `writing-plans` skill.*