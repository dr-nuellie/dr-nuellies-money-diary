# My Money Diary — scoped restoration and tests

## What changed
- Reverted to the pre-fullscreen-update application markup, CSS and viewport dimensions. Global `viewport-fit=cover`, `html`/`body` background and padding changes are **not** present.
- The only lock visual changes are scoped to `#nuellieUnifiedUnlock`: full available app viewport, the correct wallet-only mark, and theme-specific title font. No lock controller was replaced.
- Logo roles are now explicit: `logo-app-icon.png` and generated `icon-*.png` for app/PWA icons, `logo-wallet-mark.png` for header/sidebar/unlock, `logo-full-wordmark.png` for wide branding.
- Removed the stand-alone investment valuation calculator. The existing **Investments > My Portfolio** table has one valuation date and an *Est. worth* column. Estimates are read-only and do not credit wallets or alter investments.

## Verified checks
- JavaScript syntax: `node --check` passed.
- ZIP integrity: passed.
- Previous global viewport meta content unchanged; the app’s previous topbar/navigation dimensions are retained in the source markup.
- Valuation arithmetic: 10 test cases passed (today, simple interest, monthly reinvestment, fixed monthly returns, maturity cap, zero rate, before start, historical unavailability, invalid dates, and nonmutation).
- Portfolio UI renderer: 4 scenarios passed in an isolated JavaScript DOM stub (today, future, historical limitation, no investments).
- All PWA icon sizes are derived from the desired plum square logo.

## Important valuation assumptions
- The **base date is the current day**. Future values use the recorded current value (if available) or principal.
- Simple interest is used for percentage rates whose payments are credited outside the investment. Their estimate **includes projected income paid out** and should not be read as capital still held in the fund.
- Monthly compounding is used only when the investment is explicitly configured to reinvest returns.
- Fixed monthly returns are accumulated proportionally by elapsed days; a full month may not be exactly 30 days.
- Estimates are limited to the recorded maturity date. They exclude future tax, additional contributions, fee changes, market-price movements and withdrawals.
- Accurate *historical* values cannot be derived from the app’s current undated valuation fields and are therefore shown as unavailable rather than invented.

## Not verified on-device
- Native iPhone PWA status-bar coverage, Face ID/Touch ID and installation cache updates require real-device testing.
- Full app browser navigation was blocked in this container (`ERR_BLOCKED_BY_ADMINISTRATOR`), so no full in-browser regression claim is made. The calculations and source structure were tested separately.
