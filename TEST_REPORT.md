# Dr. Nuellie’s Money Diary — Functional Audit Report

Audit date: 2026-06-14
Build: feature audit fixed package

## What was checked

The app was loaded in a headless Chromium runtime using a mobile viewport and a test storage shim so the PWA data flows could be tested without exposing real user data. The following areas were checked repeatedly with seeded test data and direct UI actions where possible.

## Passed functional checks

1. App boot
   - App loads without JavaScript page errors in the test runtime.
   - Core state object initialises correctly.
   - Core functions exist: navigation, transaction save, Quick Add save, dashboard rendering, chart rendering, budget rendering, SMS parser, CSV parser.

2. Navigation
   - All main navigation targets activate correctly.
   - The Assets navigation correctly opens the Investments/Assets area, matching the current app structure where assets are housed inside the Investments page.

3. Wallet debit/credit decision flow
   - Income save → Credit Wallet? → Yes credit: wallet increased correctly.
   - Income save → Credit Wallet? → Just record: transaction saved without wallet change.
   - Expense save → Debit Wallet? → Yes debit: wallet reduced correctly.
   - Expense save → Debit Wallet? → Just record: transaction saved without wallet change.
   - Quick Add save closes the Quick Add sheet first, then opens the wallet prompt.
   - Quick Add expense → Yes debit: wallet reduced correctly and transaction saved.
   - Only one wallet dialog remains visible during the prompt; duplicate legacy wallet dialogs are hidden.

4. Dashboard and charts
   - Dashboard income, expense and net savings totals calculated correctly from seeded transactions.
   - Financial overview chart renders.
   - Income pie chart renders.
   - Expense pie chart renders.
   - Built-in fallback chart engine works without relying on the missing Chart.js CDN.

5. Budgeting
   - Budget Snapshot shows only budgeted categories.
   - Unbudgeted spending is excluded from the dashboard Budget Snapshot.
   - Unbudgeted Spending appears in the Budget Sheet.
   - Set Budget button on an unbudgeted item selects the correct category in the budget controls.
   - Budget snapshot sorting follows highest actual spend first, then highest budgeted amount.

6. Dynamic categories and wallets
   - New custom categories added in the app’s expected object format appear in transaction dropdowns.
   - New wallets/accounts appear in transaction dropdowns.
   - Other remains last in wallet dropdowns.
   - New USD wallets display the USD amount and cedi equivalent.

7. Finance calculations
   - Percentage investment return calculation tested: GH₵12,000 at 12% p.a. = GH₵120/month.
   - Fixed investment return calculation tested: fixed GH₵250/month = GH₵250/month.
   - Loan outstanding calculation includes principal, fees, paid amount and accrued interest.

8. Parsers and import basics
   - SMS parser extracts a transaction amount from a sample SMS alert.
   - CSV parser detects rows from a simple statement sample.
   - Statement review table logic remains available for editable confirmation before saving.

9. Themes
   - Theme labels checked: Soft Pink, Navy, Neutral, Obsidian, Nature, Aurora, Dark Mode.
   - Nature theme applies a green palette.

10. Lock screen
   - When PIN lock is active, the unlock-method chooser appears before the PIN screen.
   - Selecting Use PIN opens the PIN screen.
   - Entering the correct PIN unlocks the app and sets the session-unlocked state.

## Areas that cannot be fully verified inside this sandbox

1. Face ID / Touch ID / fingerprint unlock
   - The WebAuthn logic can be checked structurally, but true biometric prompts require HTTPS or an installed PWA on a supported phone.

2. OCR-based receipt parsing
   - The app uses browser file input and OCR libraries, which require a real browser/device environment and, in some cases, network access to the OCR library.
   - The text-parsing logic was inspected, but camera/photo OCR cannot be fully proven in this sandbox.

3. Native file picker and real PDF OCR
   - CSV parsing can be tested from text.
   - Real file picker behaviour and image-based PDF OCR require a real browser/device session.

4. Excel export library
   - The app attempts to lazy-load XLSX from CDN. In offline/sandbox mode, that library cannot load. The app should show the user a clear failure message if unavailable.

## Fixes applied during audit

- Replaced competing transaction wallet-confirmation event flows with one final controller.
- Ensured wallet prompt buttons work on mobile/touch through a high-priority capture handler.
- Ensured Quick Add closes before the wallet prompt opens.
- Normalised budget period handling so object and string formats both resolve correctly.
- Ensured unbudgeted spending appears in the Budget Sheet while the dashboard snapshot remains budgeted-only.
- Ensured Set Budget selects the correct unbudgeted category.
- Confirmed theme final labels and Nature naming.

## Result

The automated test pass covered the core app logic, dashboard totals, wallet effects, budget logic, navigation, dynamic categories/accounts, core finance calculations, chart rendering, parser basics, theme labels and PIN unlock flow. Device-only features still require final validation on an actual installed iPhone/Android PWA.


## Final QA pass added
- Added fixed unlock-choice overlay positioning and secure prelock flow to prevent black-screen-only state.
- Merged final integrity and budget controllers into the main consolidated script.
- Added offline adviser robustness so dashboard stats and app terms can be explained without external AI/API access.
- Added chart refresh safeguards when moving between Dashboard, Wallets and Analysis.

- Final QA correction: edit/delete confirmation now uses delegated handlers; Net Worth Trend renders even with only one snapshot; custom wallets are listed before Other.

## Additional targeted QA evidence from the final pass
The following automated browser-level tests were run using the app in a controlled browser context with seeded app data and simulated local/session storage:

1. Lock and privacy flow
- With a stored PIN and no unlocked session, the homepage is hidden and the Unlock Money Diary choice overlay is displayed full-screen.
- Use PIN opens the PIN pad.
- Choose another unlock method returns from the PIN pad to the unlock choice screen.
- Correct PIN clears the secure-pending state and reveals the app.

2. Transaction and wallet logic
- Expense save of GH₵50 from Cash opens Debit Wallet?, and Yes debit records the transaction and changes Cash from GH₵0 to −GH₵50.
- Income save of GH₵100 to MTN MoMo opens Credit Wallet?, and Just record saves the transaction without changing the MTN MoMo wallet.
- Delete and Reverse Wallet removes the transaction and reverses the wallet effect.
- Edit transaction now uses a delegated save handler, so the Save button does not lose its logic after delayed UI refreshes.

3. Charts and summary logic
- Dashboard income pie, expense pie, financial overview and net worth trend rendered non-empty canvases with seeded data.
- Wallet chart rendered after opening Wallets.
- Analysis income pie, expense pie and trend chart rendered after opening Analysis.
- Summary cards matched seeded data: income GH₵5,000, expenses GH₵1,575 and net savings GH₵3,425 in the test scenario.

4. Budget logic
- Unbudgeted spending appeared only in the Budget Sheet.
- Set Budget selected the unbudgeted category and focused the budget amount field.

5. New records appearing across the app
- A new custom expense category created through the category function appeared in both the expense form and Quick Add category list.
- A new custom wallet appears in transaction wallet dropdowns, with Other retained as the final option.

6. Adviser robustness
- The adviser now works offline without depending on an external API.
- A seeded test question asking for all dashboard stats returned explanations for net worth, liquid balance, income, expenses, net savings, investment returns, health score, emergency fund, debt-to-income, forecast and savings rate.

Device-only limitation: Face ID/Touch ID and native file-picker/camera receipt behaviour still require final verification on an installed iPhone PWA or HTTPS mobile browser.


## Chart styling revert
- Removed the custom built-in lightweight canvas chart renderer that was introduced during the QA pass.
- Restored the previous Chart.js renderer reference used by the source-style app.
- Left the original chart functions and dataset logic intact.
- No other app logic was changed in this package.
