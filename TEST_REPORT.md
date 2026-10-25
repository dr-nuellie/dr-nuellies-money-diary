# My Money Diary — logo, lock screen and investment projection

## Scope
This update starts from `dr_nuellies_money_diary_dates_assets_import_updated.zip` and changes only branding, PWA safe-area metadata/styling, and a new read-only investment value calculator.

## Verified
- Main JavaScript (all six inline scripts combined): `node --check` passes.
- Installed icon assets exist at 120, 152, 167, 180, 192, 384, 512 and 1024 px; PWA manifest names and references checked.
- CSS lock-screen mockup at 390 × 844: overlay bounds equal viewport (0,0,390,844).
- Welcome title computed font families verified separately for all seven themes (Soft Pink, Navy, Neutral, Obsidian, Nature, Aurora, Dark).
- Isolated Chromium interactive investment calculator, no console exceptions:
  - GH₵1,000 at 12% simple annual over 365 days → GH₵1,120.
  - GH₵1,000 at 12% nominal annually, compounded monthly for 365 days → GH₵1,126.8250.
  - 0% rate gives no return.
  - Same starting/target date gives no return.
  - GH₵1,000 with GH₵30 fixed monthly return over 365 days → GH₵1,360 combined worth.
  - Target date before start, zero principal and negative returns are rejected.
  - Calculate button displays the breakdown; adding an investment to the portfolio populates the selector; selecting it prefills principal, saved rate and dates.
- New PWA cache name and wallet-brand image added to service-worker pre-cache.

## Finance calculation conventions
For annual nominal percentage rate `r`, years `t = actual days / 365`:
- Simple: interest = principal × r × t. Capital remains principal; combined worth includes the unreinvested interest.
- Compound `m` periods per year: capital = principal × (1 + r/m)^(m × t).
- Fixed monthly amount: return = fixed amount × (12 × t). This represents accrual without automatic reinvestment.
- Projection excludes fees, taxes, further payments, redemptions, inflation and exchange-rate changes. Existing investments' USD fixed return amounts are estimated with the app's current exchange rate because the saved record contains the GHS-converted return.
- Projection does not change investment records, wallet balances or logged interest.

## Not verified here
- Full original app end-to-end in a browser: navigation to the local server was blocked by the browser environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). The investment calculator was tested in a standalone browser harness; this is not a complete regression suite.
- True iPhone iOS status-bar treatment (standalone PWA with notch/dynamic island), Face ID and offline app-upgrade behaviour: requires on-device testing. `viewport-fit=cover`, translucent iOS status bar metadata and safe-area CSS are provided, but native browser/OS restrictions cannot be overruled.
