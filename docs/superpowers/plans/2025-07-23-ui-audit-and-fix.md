# UI Audit and Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all interactive elements in the NitroAI frontend functional while preserving design and architecture.

**Architecture:** Hybrid approach: automated linting/testing + manual verification per page/component. We will first establish a baseline with accessibility and lint checks, then systematically fix issues in each major UI piece (navigation, forms, modals, buttons, etc.), replacing mock functionality with real service calls and ensuring proper error/loading states.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Radix UI, React Router Dom, React Hook Form, Vitest, ESLint.

## Global Constraints
- Do not redesign UI or alter layouts unnecessarily.
- Preserve existing styling and component hierarchy.
- Reuse existing services (src/lib/*, src/lib/engine/*, src/lib/generation/*, src/lib/ingest/*) and state management (React Context, hooks).
- Keep changes minimal and focused on making interactive elements work.
- Maintain WCAG AA accessibility (keyboard navigation, ARIA labels, focus management).
- Remove all placeholder code (console.log, alert, TODO, FIXME, mock data, fake loading).
- Ensure every form validates input, handles submission, and shows loading/error/success states.
- Ensure every navigation link uses correct routing (client-side via react-router-dom).
- Ensure every modal/drawer opens/closes with proper focus trapping and restoration.
- Every interactive element must have an accessible name (aria-label, label, or visible text).

---
### Task 1: Set up accessibility linting
**Files:**
- Create: `none` (modify existing)
- Modify: 
  - `frontend/package.json`: add dev dependency
  - `frontend/.eslintrc.js` (if exists) or create `frontend/eslint.config.js` (based on project's ESLint config)
  - `frontend/vite.config.ts` (if needed to ensure lint runs)
**Interfaces:**
- Consumes: N/A
- Produces: ESLint rule `jsx-a11y/*` enabled
- [ ] **Step 1: Install eslint-plugin-jsx-a11y**
  ```bash
  npm install -D eslint-plugin-jsx-a11y
  ```
- [ ] **Step 2: Enable jsx-a11y rules in ESLint config**
  - If using ES19+ flat config (`eslint.config.js`), add plugin and extend recommended rules.
  - If using older `.eslintrc.js`, add `"plugins": ["jsx-a11y"]` and extend `"plugin:jsx-a11y/recommended"`.
  - Ensure rules like `jsx-a11y/anchor-is-valid`, `jsx-a11y/label-has-associated-control`, etc. are set to `"warn"` or `"error"`.
- [ ] **Step 3: Run lint to see baseline**
  ```bash
  npm run lint
  ```
  (Assume lint script exists; if not, add `"lint": "eslint . --ext .ts,.tsx"` to package.json and run it.)
- [ ] **Step 4: Fix the first batch of auto-fixable errors**
  ```bash
  npm run lint -- --fix
  ```
- [ ] **Step 5: Commit**
  ```bash
  git add frontend/package.json frontend/eslint.config.js frontend/package-lock.json
  git commit -m "chore: add jsx-a11y plugin and fix auto-fixable a11y issues"
  ```

### Task 2: Set up accessibility testing with jest-axe
**Files:**
- Create: `frontend/tests/accessibility.test.tsx`
- Modify:
  - `frontend/package.json`: add dev dependency
  - `frontend/vitest.config.ts` (if needed to ensure test environment)
**Interfaces:**
- Consumes: None
- Produces: Test file that renders each major page and runs axe check
- [ ] **Step 1: Install jest-axe**
  ```bash
  npm install -D jest-axe
  ```
- [ ] **Step 2: Create test file**
  ```tsx
  // frontend/tests/accessibility.test.tsx
  import { render, screen } from '@testing-library/react';
  import { axe, toHaveNoViolations } from 'jest-axe';
  import { BrowserRouter } from 'react-router-dom';
  import Landing from '@/pages/Landing';
  import Dashboard from '@/pages/Dashboard';
  import NoteView from '@/pages/NoteView';
  import Onboarding from '@/pages/Onboarding';
  import Settings from '@/pages/Settings';

  expect.extend(toHaveNoViolations);

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  describe('Accessibility', () => {
    test('Landing page has no accessibility violations', async () => {
      const { container } = renderWithRouter(<Landing />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('Dashboard page has no accessibility violations', async () => {
      const { container } = renderWithRouter(<Dashboard />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('NoteView page has no accessibility violations', async () => {
      const { container } = renderWithRouter(<NoteView />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('Onboarding page has no accessibility violations', async () => {
      const { container } = renderWithRouter(<Onboarding />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('Settings page has no accessibility violations', async () => {
      const { container } = renderWithRouter(<Settings />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  ```
- [ ] **Step 3: Run the test to see baseline**
  ```bash
  npm run test -- ./tests/accessibility.test.tsx
  ```
- [ ] **Step 4: Commit**
  ```bash
  git add frontend/package.json frontend/tests/accessibility.test.tsx
  git commit -m "test: add accessibility smoke tests with jest-axe"
  ```

### Task 3: Fix navigation links in Nav.tsx
**Files:**
- Modify: `frontend/src/components/Nav.tsx`
**Interfaces:**
- Consumes: `react-router-dom`'s `Link`, `useNavigate` (if needed)
- Produces: Functional navigation with correct routes and active states
- [ ] **Step 1: Examine the Nav component to identify issues**
  - The `<a href="#features">` etc. are anchor links to sections on the same page. Verify that those sections exist in the Landing page (they do). However, for a SPA, we might prefer to use `<Link to="/#features">`? Actually, the app uses separate pages (Landing, Dashboard, etc.), so anchor links within the same page are fine if the user stays on Landing. But the Nav component appears on every page? We need to check where Nav is used. Likely only on Landing. If so, anchor links are okay. However, the "Open app" link goes to `/app` which may not be a defined route. We should change it to go to `/dashboard` (or whatever the main app route is).
  - Let's check the routes: The app likely has a route for `/` (Landing) and `/dashboard` (maybe). We'll adjust accordingly.
- [ ] **Step 2: Replace the "Open app" link to point to the correct dashboard route**
  ```tsx
  // Change from:
  // <Link to="/app" className="...">Open app</Link>
  // To:
  <Link to="/dashboard" className="...">Open app</Link>
  ```
  (If `/dashboard` is not the correct route, we will adjust after checking the router.)
- [ ] **Step 3: Ensure the nav links use `<NavLink>` for active styling (optional, but good practice)**
  - We can keep as `<a>` for anchor links because they are same-page scroll links; but we could also use `<Link to="/#features">` to enable client-side navigation without full reload. However, since the Landing page is already at `/`, the anchor link works. We'll leave them as is for simplicity, but ensure they are accessible (they are text links, fine).
- [ ] **Step 4: Add aria-label to the hamburger/menu button if exists (not visible in this snippet; maybe there is a mobile menu toggle). We'll check the full component.**
  - Actually, the Nav component as shown does not have a menu button; it shows desktop nav only. We need to see if there is a mobile menu elsewhere (maybe in AppShell). We'll handle that in another task.
- [ ] **Step 5: Run lint and tests to ensure no regressions**
  ```bash
  npm run lint
  npm run test -- ./tests/accessibility.test.tsx::"Navigation links are accessible"
  ```
- [ ] **Step 6: Commit**
  ```bash
  git add frontend/src/components/Nav.tsx
  git commit -m "fix: correct Nav open app link to dashboard"
  ```

### Task 4: Fix footer links (if any)
**Files:**
- Modify: `frontend/src/components/Footer.tsx`
**Interfaces:**
- Consumes: None
- Produces: Functional footer links (external or internal)
- [ ] **Step 1: Inspect Footer.tsx for any broken links or placeholders**
- [ ] **Step 2: Replace any `href="#"` or `javascript:void(0)` with proper URLs or remove if not needed**
- [ ] **Step 3: Ensure external links have `target="_blank" rel="noopener noreferrer"`**
- [ ] **Step 4: Run lint and tests**
- [ ] **Step 5: Commit**

### Task 5: Fix modals and drawers (CreateNoteModal, LocalSetupModal, etc.)
**Files:**
- Modify: 
  - `frontend/src/components/CreateNoteModal.tsx`
  - `frontend/src/components/LocalSetupModal.tsx`
  - `frontend/src/components/ui/dialog.tsx`
  - `frontend/src/components/ui/drawer.tsx`
  - `frontend/src/components/PodcastPanel.tsx` (if Modal)
  - `frontend/src/components/QuizView.tsx` (if Modal)
  - `frontend/src/components/FlashcardsView.tsx` (if Modal)
  - `frontend/src/components/Assistant.tsx` (if Modal)
**Interfaces:**
- Consumes: State management (likely React Context or hooks) for open/close state
- Produces: Modals open/close correctly, trap focus, return focus to trigger, load dynamic content, submit forms with validation
- [ ] **Step 1: For each modal file, identify the trigger and state**
  - Look for a state variable like `isOpen` or `open` and its setter.
  - Ensure the trigger button sets open to true.
- [ ] **Step 2: Ensure closing mechanisms work**
  - Clicking backdrop closes (if applicable).
  - Pressing Escape closes.
  - Cancel/close button inside sets open to false.
- [ ] **Step 3: Manage focus**
  - On open: set focus to the first focusable element (e.g., first input) or the modal container (with `tabindex="-1"`).
  - On close: return focus to the trigger element (we need to store a reference to the trigger).
  - Trap focus while modal is open (if not already handled by Radix UI Dialog/Drawer primitives; we should verify that the `@radix-ui/react-dialog` and `@radix-ui/react-drawer` already handle focus trapping; if so, we just need to ensure we are using them correctly).
- [ ] **Step 4: Ensure form validation and submission**
  - For modals that contain forms (e.g., CreateNoteModal), ensure form fields are controlled, validation runs on submit, and submission calls the appropriate service (e.g., from `src/lib/generation/`).
  - Show loading state on submit.
  - Show success/error toast.
  - Reset form on success or after cancel.
- [ ] **Step 5: Replace any mock data or placeholder content with real data from state or props**
- [ ] **Step 6: Run lint and tests**
- [ ] **Step 7: Commit each modal fix separately or group similar ones**

### Task 6: Fix forms (in pages and modals)
**Files:**
- Modify: 
  - `frontend/src/pages/Onboarding.tsx` (API key form)
  - `frontend/src/pages/Settings.tsx` (API key form)
  - `frontend/src/components/CreateNoteModal.tsx` (note creation form)
  - `frontend/src/components/Assistant.tsx` (chat input form?)
  - `frontend/src/components/ui/form.tsx` (if used)
  - `frontend/src/components/BlockEditor.tsx` (if contains forms)
**Interfaces:**
- Consumes: Form values, validation rules, submit handlers
- Produces: Forms validate input, disable submit on invalid, show loading on submit, show success/error, reset on success
- [ ] **Step 1: For each form, ensure all inputs are controlled (value bound to state, onChange handler)**
- [ ] **Step 2: Add client-side validation (required, email, etc.) using a lightweight solution (e.g., react-hook-form's built-in validation or custom)**
- [ ] **Step 3: Display validation errors inline near the field**
- [ ] **Step 4: Prevent default submit, call async submit function**
- [ ] **Step 5: Set loading state, disable submit button**
- [ ] **Step 6: On success, show toast, reset form, redirect if appropriate**
- [ ] **Step 7: On error, show error message, keep form values**
- [ ] **Step 8: Replace any mock submit (setTimeout) with actual service call**
- [ ] **Step 9: Run lint and tests**
- [ ] **Step 10: Commit**

### Task 7: Replace mock data and fake loading
**Files:**
- Modify: Any file that contains:
  - Hardcoded arrays/objects meant to simulate data (e.g., `const mockNotes = [...]`)
  - `setTimeout` used to delay setting loading state
  - Static placeholder text like "Sample note", "Example flashcard"
  - Temporary state variables that are never updated from real data
**Interfaces:**
- Consumes: Data from services (e.g., `getNotes`, `createNote`, `generateFlashcards` from `src/lib/engine/
 
 
 
  the 
the 
data 
from 
the 
services 
(
  etc.
 
  e
  g
  ,
  getNotes
  ,
  createNote
  ,
  generateFlashcards
)
  via 
  hooks 
  or
  direct 
  calls
  .
  Produces
  
  
  Real
  data
  displayed
  ,
  loading
  state
  tied
  to
  actual
  promises
  ,
  error
  handling
  .
  -
  [
  ]
  
  
  Step
  1
  :
  
  
  Search
  for
  patterns
  :
  
  
  -
  console
  .
  log
  (
  ,
  alert
  (
  ,
  TODO
  ,
  FIXME
  ,
  ,
  ,
  etc
  .
  (
  via
  grep
  )
  .
  For
  each
  match
  ,
  decide
  the 
  appropriate
  replacement
  (
  e
  .
  g
  .
  ,
  remove
  console
  .
  log
  ,
  implement
  real
  logic
  )
  .
  -
  [
  ]
  
  
  Step
  2
  :
  
  
  Replace
  setTimeout
  (
  ,
  1500
  )
  ,
  setLoading
  (
  false
  )
  with
  actual
  promise
  resolution
  .
  -
  [
  ]
  
  
  Step
  3
  :
  
  
  Replace
  hardcoded
  data
  arrays
  with
  calls
  to
  fetch
  functions
  (e
  .
  g
  .
  ,
  useQuery
  from
  
  
  
  react
  -
  query
  if
  used
  ,
  or
  custom
  hooks
  )
  .
  Store
  result
  in
  state
  .
  -
  [
  ]
  
  
  Step
  4
  :
  
  
  Remove
  static
  placeholder
  text
  and
  bind
  to
  state
  ;
  show
  empty
  state
  message
  when
  data
  is
  empty
  (
  e
  .
  g
  .
  ,
  "No
  notes
  yet"
  )
  .
  -
  [
  ]
  
  
  Step
  5
  :
  
  
  Run
  lint
  and
  tests
  .
  -
  [
  ]
  
  
  Step
  6
  :
  
  
  Commit
  .
  -
  [
  ]
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  ###
  Task
  8
  :
  
  
  Fix
  accessibility
  issues
  (
  from
  lint
  and
  test
  )
  
  
  Files
  :
  
  
  Modify
  :
  
  
  Any
  file
  flagged
  by
  eslint
  -
  plugin
  -
  jsx
  -
  a11y
  or
  the
  jest
  -
  axe
  test
  .
  
  
  Interfaces
  :
  
  
  Consumes
  
  
  :
  
  
  Lint
  /
  test
  output
  .
  
  
  Produces
  
  
  :
  
  
  No
  a11y
  violations
  .
  
  
  -
  [
  ]
  
  
  Step
  1
  :
  
  
  Run
  lint
  and
  note
  all
  errors
  .
  -
  [
  ]
  
  
  Step
  2
  :
  
  
  For
  each
  error
  ,
  
  
  fix
  the
  issue
  (
  e
  .
  g
  .
  ,
  add
  missing
  label
  ,
  fix
  invalid
  aria
  -
  attribute
  ,
  ensure
  keyboard
  accessibility
  )
  .
  -
  [
  ]
  
  
  Step
  3
  :
  
  
  Run
  the
  axe
  test
  again
  to
  confirm
  fixes
  .
  -
  [
  ]
  
  
  Step
  4
  :
  
  
  Commit
  after
  each
  batch
  of
  fixes
  .
  -
  [
  ]
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  ###
  Task
  9
  :
  
  
  Remove
  unused
  code
  and
  files
  
  
  Files
  :
  
  
  Modify
  :
  
  
  Any
  
  
  .
  
  
  Interfaces
  :
  
  
  Consumes
  
  
  :
  
  
  None
  .
  
  
  Produces
  
  
  :
  
  
  Cleaner
  codebase
  .
  
  
  -
  [
  ]
  
  
  Step
  1
  :
  
  
  Use
  ```
  npm
  run
  lint
  ```
  (
  with
 
  eslint
  -
  plugin
  -
  unused
  ?
  )
  or
  manual
  inspection
  to
  find
  unused
  imports
  ,
  variables
  ,
  functions
  ,
  components
  .
  -
  [
  ]
  
  
  Step
  2
  :
  
  
  Remove
  them
  .
  -
  [
  ]
  
  
  Step
  3
  :
  
  
  Delete
  any
  empty
  or
  placeholder
  files
  (
  e
  .
  g
  .
  ,
  files
 
  that
  only
  contain
  `
  export
  default
  function
  Foo
  (
  )
  {
 
  return
  null
  ;
  }
  `
  )
  .
  -
  [
  ]
  
  
  Step
  4
  :
  
  
  Run
  lint
  and
  tests
  .
  -
  [
  ]
  
  
  Step
  5
  :
  
  
  Commit
  .
  -
  [
  ]
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  ##
  Execution
  Handoff
  
  
  Plan
  complete
  and
  saved
  to
  `docs/superpowers/plans/2025-07-23-ui-audit-and-fix.md`
  .
  
  
  Two
  execution
  options
  :
  
  
  1
  .
  
  
  Subagent
  -Driven
  (
  recommended
  )
  
  
  -
  I
  dispatch
  a
  fresh
  subagent
  per
  task
  ,
  review
  between
  tasks
  ,
  fast
  iteration
  .
  
  
  2
  .
  
  
  Inline
  Execution
  
  
  -
  Execute
  tasks
  in
  this
  session
  using
  executing
  -
  plans
  ,
  batch
  execution
  with
  checkpoints
  for
  review
  .
  
  
  Which
  approach
  ?
  We
  will
  proceed
  with
  inline
  execution
  for
  simplicity
  ,
  but
  we
  can
  switch
  to
  subagent
  -driven
  if
  needed
  .
  .