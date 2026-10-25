# My Money Diary — subscriptions, unlock screen and landscape typography

## Changes in this build
- Retains the latest investment-valuation and subscription-edit build as the source; leaves financial calculations, data structure, charts, navigation and other app pages unchanged.
- Allocates more room to My Subscriptions service names and details. Reduces the amount column to at most 108 px on larger screens and 88 px on narrow screens. Subscription-only Edit/Pause/Delete actions move beneath the details on narrow phones to avoid cramping the service name.
- Adds 12 subtle, non-interactive floating currency glyphs to the existing unlock page, theme-coloured and disabled under reduced-motion settings. Does not introduce another unlock controller.
- Sets viewport-fit=cover so the installed iPhone PWA's unlock background can extend under the status bar; reserves the existing safe-area inset for the normal app so its toolbar remains below the system status bar. Normal layout styling is unchanged elsewhere.
- Locks landscape section-description text sizing to match portrait (11.5 px, 1.5 line-height) and prevents iOS orientation-related text autosizing.
- Bumps the service worker cache version to replace previously cached CSS/HTML.

## Verified with Chromium (isolated source CSS and actual renderSubs template / actual unified unlock controller)
1. Subscription rows at 320×690, 375×812, 390×844, 667×375 and 900×600: no horizontal overflow; details retain available width; amount column respects 88/108 px upper bounds.
2. Service titles with a long name wrap instead of being clipped; Edit remains clickable.
3. Landscape section description computed font size = 11.5 px (same as portrait).
4. Unified unlock chooser fills the test viewport (393×852) and shows 12 currency symbols.
5. PIN flow: invalid PIN shows error, return to unlock choice works, correct PIN unlocks and clears the overlay; no runtime exceptions in the isolated test.
6. All embedded JavaScript blocks pass `node --check`.
7. Package ZIP integrity and required icon/manifest files verified.

## Device-only verification still needed
- Whether the unlock background reaches behind the physical iPhone's status-bar clock and indicators in the installed PWA. Desktop emulation cannot reproduce Apple's status-bar rendering.
- Visual consistency across every real iOS theme/font combination and accessibility text setting.

Note: Full app navigation was blocked by the test browser's file URL policy. This is a scoped change tested in isolated browser views using the app's existing functions and CSS; it is not a complete end-to-end regression certification of every app feature.
