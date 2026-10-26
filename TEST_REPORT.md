# My Money Diary – Home interaction and currency regression checks

Change scope: original layout and financial calculations preserved.

## Source-level verification
- Removed runtime mutation of the viewport meta tag (changed from `viewport-fit=cover` and back).
- Replaced an overlay hide-only operation with actual removal of the unlock overlay after successful authentication.
- Existing PIN and biometric choice logic left intact.
- Currency decoration uses 28 symbols with 19 distinct currencies/abbreviations; Ghana cedi GH₵ and ₵ explicitly featured.
- Existing subscription table, charts, finances and layout unchanged.
- PWA cache namespace incremented to ensure updated files are fetched.

## Runtime verification
See validation results supplied alongside the release.

## Device limitation
Installed iOS PWA status bar and biometric hardware need testing on the device. Browser restrictions prevent live-hosting this app from the isolated test environment.

### Browser interaction checks (isolated using the actual unlock controller)
- PASS: no-lock unlock removes overlay and retains viewport
- PASS: no-lock Home/Expenses/Income buttons clickable
- PASS: 28 varied currency symbols including Ghana cedi
- PASS: PIN screen can return to method chooser
- PASS: Incorrect PIN cannot unlock
- PASS: pin-lock unlock removes overlay and retains viewport
- PASS: pin-lock Home/Expenses/Income buttons clickable
- PASS: Re-lock creates fresh working overlay

Note: Navigation buttons were mounted in a minimal browser harness to test that the unlock controller releases click targets. This is not a full app end-to-end test.

## Full-source desktop browser smoke test (restrictions: no network/CDNs; mocked empty browser storage)
- PASS expenses
- PASS income
- PASS wallets
- PASS subscriptions
- PASS dashboard
- Page errors: []

## Additional full-source mobile browser tests
The complete `index.html` ran in Chromium with a 390 × 844 mobile viewport and touch input (external CDNs disabled, empty or seeded test-only browser storage).

- PASS: With no PIN, Home/Expenses/Income/Wallets bottom-nav taps all switch to the correct page.
- PASS: With PIN enabled, unlock choices appear and 28 currencies are rendered.
- PASS: Entering the correct PIN removes the unlock DOM and privacy classes.
- PASS: After PIN unlock, Home/Expenses/Income/Wallets buttons all work by touch.
- PASS: No uncaught JavaScript errors in these scenarios.

The installed iPhone PWA's system chrome and device biometric prompt were not emulated, so these tests cannot guarantee all iPhone-specific behaviours.
