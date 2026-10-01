/**
 * Extended Playwright fixtures for cross-browser compatibility.
 *
 * Use this module (`import { test } from '../../base/fixtures'`) instead of `@playwright/test`
 * whenever a spec interacts with animated Vuetify components: `v-dialog` open/close sequences,
 * nested dialogs that mount further overlays (e.g. `v-select` or autocomplete inside a dialog),
 * bulk-operation flows that re-render while an overlay is still animating, or multiple
 * simultaneous `v-overlay`/`v-menu` layers.
 *
 * WebKit sequences CSS animation frames differently from Chromium/Firefox, causing clicks to
 * miss animating elements or actionability checks to time out — flaky only in CI.  The `page`
 * fixture below injects a script at document init that zeroes all transition/animation durations
 * for WebKit only, making Vuetify motion synchronous without affecting other browsers.
 *
 * Specs limited to page navigation or non-animated elements can import directly from
 * `@playwright/test`.
 */
import { expect, test as base } from '@playwright/test';

const NO_MOTION_STYLE: string = `
*, *::before, *::after {
  transition-duration: 0s !important;
  animation-duration: 0s !important;
}
`;

const NO_MOTION_STYLE_ID: string = '__pw_no_motion_style__';

export const test = base.extend({
  page: async ({ page, browserName }, use) => {
    if (browserName !== 'webkit') {
      await use(page);
      return;
    }

    await page.addInitScript(
      ({ styleId, styleContent }) => {
        const applyNoMotionStyle = (): void => {
          if (document.getElementById(styleId)) {
            return;
          }

          const styleElement: HTMLStyleElement = document.createElement('style');
          styleElement.id = styleId;
          styleElement.textContent = styleContent;

          const target: HTMLElement | null = document.head ?? document.documentElement;
          target?.append(styleElement);
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', applyNoMotionStyle, { once: true });
          return;
        }

        applyNoMotionStyle();
      },
      {
        styleId: NO_MOTION_STYLE_ID,
        styleContent: NO_MOTION_STYLE,
      },
    );

    await use(page);
  },
});

export { expect };
