# Dr. Nuellie’s Money Diary — Unlock Flow Correction Report

## Root causes removed

1. Four competing unlock controllers were present in the consolidated JavaScript and were each trying to show or hide the PIN, biometric and method-selection screens.
2. A removed `initUnlockChoice()` function was still called by a delayed boot handler and a `pageshow` handler. This could throw a `ReferenceError` before the final controller displayed the unlock screen, leaving the privacy guard active as a black screen.
3. The early privacy guard treated a biometric-enabled flag without a stored credential as a complete lock configuration, which could hide the app with no valid unlock method.
4. Several controllers wrapped `dismissPin()`, `lockAppNow()` and biometric callbacks repeatedly, causing inconsistent state and screen switching.

## Final architecture

- One early privacy guard runs before the body is painted.
- One unlock controller owns method selection, PIN, biometric fallback, session unlock and manual/automatic relock.
- The app remains hidden whenever a configured lock is pending.
- The PIN screen cannot appear before PIN is selected.
- PIN and biometric screens both provide a route back to the method selector.
- An incomplete biometric setting no longer causes a black screen.
- The existing Chart.js chart presentation was not changed.

## Automated browser tests

A Chromium test harness executed the actual privacy guard, PIN overlay, PIN keypad logic and final unlock controller.

Passed 19/19 checks:

- No-lock PC opening reveals the app.
- No-lock PC opening does not display the chooser.
- PIN lock hides sensitive content.
- Method chooser appears before PIN.
- PIN does not appear before selection.
- Selecting PIN opens the PIN screen.
- Incorrect PIN is rejected.
- Sensitive content remains hidden after an incorrect PIN.
- PIN screen can return to method selection.
- Correct PIN reveals the app.
- Correct PIN sets the unlocked session state.
- Manual relock hides the app.
- Manual relock returns to method selection.
- PIN and biometric options coexist when both are configured.
- Biometric screen opens correctly.
- Biometric screen can switch to PIN.
- PIN screen can switch back to method selection.
- An incomplete biometric setting does not lock the app.
- An incomplete biometric setting does not show an unusable chooser.

## Static validation

- Consolidated JavaScript syntax: passed with `node --check`.
- Obsolete unlock-controller markers: removed.
- Stale runtime calls to `initUnlockChoice()`: removed.
- ZIP integrity: checked after packaging.

## Device limitation

Face ID/Touch ID authentication itself requires HTTPS or an installed PWA on a supported device. The navigation and fallback logic around biometric authentication was tested; the operating-system biometric prompt must be verified on the target phone.
