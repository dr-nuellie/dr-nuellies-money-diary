# My Money Diary — investment valuation and subscription-edit verification

## Changes
- Kept existing app design, dimensions, chart library, navigation and lock behaviour.
- Used `logo-app-icon.png` (the selected square plum My Money Diary design) for the sidebar, top bar and unlock chooser, instead of the wallet-only mark. The square icon remains the app/favicon artwork.
- Made the portfolio column **Projected value at date** and the total beneath the portfolio explain what is retained versus paid out.
- Added **rate period** (monthly or annual) to percentage-based investments. Older records default to **annual**, retaining their prior meaning until explicitly edited.
- Compounds reinvested returns on each completed monthly anniversary; separately estimates accrued interest on the fraction of a month. Excludes interest paid to external wallets from the balance still in the investment. Shows both individual values and the combined value at the selected date.
- Uses original principal and start date for new records. For older GHS records with prior rollover events, uses `amtRaw` as the original principal when reliable. If a historical starting value cannot be reconstructed, the value is left unavailable rather than invented.
- Added a subscription **Edit** button to each saved subscription. Editing updates the same ID, preserves active/paused status and `lastRun`, and retains the historical USD/GHS exchange rate unless explicitly changed.

## Verified
- Full inline JS syntax: `node --check` passed.
- Finance model: 13 assertions passed (monthly compounding, annual-rate conversion, incomplete month, fixed return, external payout, maturity, missing history, rollover original principal, leap-day month end).
- Browser UI, isolated with extracted real implementation: portfolio per-row and combined values at two dates passed.
- Browser UI, isolated with extracted real implementation: two consecutive edits of a subscription; status preservation, USD FX, category/wallet/date and no duplicated record passed.
- Browser UI, isolated with extracted real implementation: switching an existing investment to a monthly rate and reinvestment preserves the same record passed.
- Package integrity and selected logo asset presence checked.

## Calculation notes
- Valuations are **projections**, not independently verified historical investment prices.
- For returns **rolled over**, value is modelled as original (or known anchor) capital compounded at each full month. Any incomplete month is estimated pro rata and is not yet capitalised.
- For returns **paid to a wallet**, investment value excludes that cash interest (shown separately as projected earnings).
- No future contributions, withdrawals, taxes, changing interest rates, market gains or unusual contract terms are assumed.
- Maturity stops further projected interest.
- Older records with rates saved before this change remain annual-rate records; edit **Rate Period** and **Credit Returns To** where applicable.

## Not verified
- Complete installed iPhone PWA session, actual Face ID/Touch ID and offline service-worker replacement; these require device testing. Chromium refused navigation to the complete local app, so UI tests ran on an isolated browser DOM loaded with the production calculation/editing functions, not the full app shell.
