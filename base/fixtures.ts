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
 *
 * Additionally this module provides shared, composable setup fixtures (POC SPSH-3199):
 * - `asLandesadmin`: logs in as the worker's Landesadmin and navigates to the administration.
 * - `testSchule`: creates a fresh test school (requires an authenticated Landesadmin page).
 * - `asSchuladmin`: creates a Schuladmin in `testSchule` and logs in as that user.
 *
 * The fixtures are test-scoped: no shared state across tests and no per-fixture cleanup —
 * global teardown owns the lifecycle of prefixed test data. Compose spec-specific payload
 * (target page objects, angebot params, ...) in a local `test.extend` on top of these.
 */
import { expect, test as base } from '@playwright/test';

import { PersonManagementViewPage } from '../pages/admin/personen/PersonManagementView.page';
import { createKlasse, createSchule } from './api/organisationApi';
import { addOrganisationenToPerson, createPersonWithPersonenkontext, UserInfo } from './api/personApi';
import { schuladminOeffentlichRolle } from './rollen';
import { loginAndNavigateToAdministration, switchToNewUserAndNavigateToAdministration } from './testHelperUtils';
import { generateDienststellenNr, generateKlassenname, generateSchulname } from './utils/generateTestdata';

export interface TestSchule {
  id: string;
  name: string;
}

export interface TestSchuleMitDstNr extends TestSchule {
  dstNr: string;
}

export interface TestKlasse {
  id: string;
  name: string;
}

export interface LandesadminFixture {
  personManagementViewPage: PersonManagementViewPage;
}

export interface SchuladminAccount {
  userinfo: UserInfo;
  schule: TestSchule;
}

export interface SchuladminFixture extends SchuladminAccount {
  personManagementViewPage: PersonManagementViewPage;
}

export interface SchuladminAccountWith2Schulen {
  userinfo: UserInfo;
  schulen: TestSchule[];
}

export interface SchuladminWith2SchulenFixture extends SchuladminAccountWith2Schulen {
  personManagementViewPage: PersonManagementViewPage;
}

const NO_MOTION_STYLE: string = `
*, *::before, *::after {
  transition-duration: 0s !important;
  animation-duration: 0s !important;
}
`;

const NO_MOTION_STYLE_ID: string = '__pw_no_motion_style__';

export const test = base.extend<{
  /** Logs in as the worker Landesadmin; no test data is created and navigation ends on PersonManagementView. */
  asLandesadmin: LandesadminFixture;
  /** Creates a school without a DstNr; Landesadmin stays logged in on PersonManagementView. */
  testSchule: TestSchule;
  /** Creates a school with a DstNr; Landesadmin stays logged in on PersonManagementView. */
  testSchuleMitDstNr: TestSchuleMitDstNr;
  /** Creates a class in testSchule; Landesadmin stays logged in on PersonManagementView. */
  testKlasse: TestKlasse;
  /** Creates a Schuladmin in testSchule; Landesadmin stays logged in on PersonManagementView. */
  schuladminAccount: SchuladminAccount;
  /** Uses the Schuladmin created in testSchule; logs in as them and ends on PersonManagementView. */
  asSchuladmin: SchuladminFixture;
  /** Adds a DstNr school to the testSchule Schuladmin; Landesadmin stays on PersonManagementView. */
  schuladminAccountWith2Schulen: SchuladminAccountWith2Schulen;
  /** Creates the two-school Schuladmin setup; logs in as them and ends on PersonManagementView. */
  asSchuladminWith2Schulen: SchuladminWith2SchulenFixture;
}>({
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

  asLandesadmin: async ({ page }, use) => {
    const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
    await use({ personManagementViewPage });
  },

  testSchule: async ({ page, asLandesadmin: _asLandesadmin }, use) => {
    const name: string = generateSchulname();
    const id: string = await createSchule(page, name);
    await use({ id, name });
  },

  testSchuleMitDstNr: async ({ page, asLandesadmin: _asLandesadmin }, use) => {
    const name: string = generateSchulname();
    const dstNr: string = generateDienststellenNr();
    const id: string = await createSchule(page, name, dstNr);
    await use({ id, name, dstNr });
  },

  testKlasse: async ({ page, testSchule }, use) => {
    const name: string = generateKlassenname();
    const id: string = await createKlasse(page, testSchule.id, name);
    await use({ id, name });
  },

  schuladminAccount: async ({ page, testSchule }, use): Promise<void> => {
    const userinfo: UserInfo = await createPersonWithPersonenkontext(page, testSchule.name, schuladminOeffentlichRolle);
    await use({ userinfo, schule: testSchule });
  },

  schuladminAccountWith2Schulen: async ({ page, schuladminAccount }, use): Promise<void> => {
    const zweiteSchuleName: string = generateSchulname();
    const dstNr: string = generateDienststellenNr();
    const zweiteSchuleId: string = await createSchule(page, zweiteSchuleName, dstNr);
    const zweiteSchule: TestSchuleMitDstNr = { id: zweiteSchuleId, name: zweiteSchuleName, dstNr };
    await addOrganisationenToPerson(
      page,
      schuladminAccount.userinfo.personId,
      [schuladminAccount.schule.id, zweiteSchule.id],
      schuladminAccount.userinfo.rolleId,
    );
    await use({
      userinfo: schuladminAccount.userinfo,
      schulen: [schuladminAccount.schule, zweiteSchule],
    });
  },

  asSchuladmin: async ({ page, schuladminAccount }, use): Promise<void> => {
    const personManagementViewPage: PersonManagementViewPage = await switchToNewUserAndNavigateToAdministration(
      page,
      schuladminAccount.userinfo,
    );
    await use({ ...schuladminAccount, personManagementViewPage });
  },

  asSchuladminWith2Schulen: async ({ page, schuladminAccountWith2Schulen }, use): Promise<void> => {
    const personManagementViewPage: PersonManagementViewPage = await switchToNewUserAndNavigateToAdministration(
      page,
      schuladminAccountWith2Schulen.userinfo,
    );
    await use({ ...schuladminAccountWith2Schulen, personManagementViewPage });
  },
});

export { expect };
