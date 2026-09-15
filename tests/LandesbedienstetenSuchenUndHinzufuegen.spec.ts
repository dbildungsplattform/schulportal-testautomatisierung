import test, { Page, PlaywrightTestArgs } from '@playwright/test';

import { getOrganisationId } from '../base/api/organisationApi';
import {
  addOrganisationenToPerson,
  createPersonWithPersonenkontext,
  createRolleAndPersonWithPersonenkontext,
  getEmailByPersonId,
  lockPerson,
  removeAllPersonenkontexte,
  UserInfo,
  waitForEmailByPersonId,
} from '../base/api/personApi';
import { getRolleId } from '../base/api/rolleApi';
import {
  ersatzTestschuleName,
  testschule665DstNrUndName,
  testschule665Name,
  testschuleDstNr,
  testschuleDstNrUndName,
  testschuleName,
} from '../base/organisation';
import {
  ersatzschulLehrkraftRolle,
  lehrerImVorbereitungsdienstRolle,
  lehrkraftOeffentlichRolle,
  schuladminOeffentlichRolle,
  vertretungslehrkraftRolle,
} from '../base/rollen';
import { typeLehrer } from '../base/rollentypen';
import { email as emailServiceProvider } from '../base/sp';
import { DEV, STAGE } from '../base/tags';
import { loginAndNavigateToAdministration } from '../base/testHelperUtils';
import { generateKopersNr, generateNachname, generateVorname } from '../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../pages/admin/personen/PersonManagementView.page';
import { LandesbedienstetenHinzufuegenPage } from '../pages/admin/personen/search/LandesbedienstetenHinzufuegen.page';
import { LandesbedienstetenSearchFormPage } from '../pages/admin/personen/search/LandesbedienstetenSearchForm.page';
import { LandesbedienstetenSearchResultPage } from '../pages/admin/personen/search/LandesbedienstetenSearchResult.page';
import { LandesbedienstetenSuccessPage } from '../pages/admin/personen/search/LandesbedienstetenSucess.page';
import { HeaderPage } from '../pages/components/Header.page';
import { SearchResultErrorDialog } from '../pages/components/SearchResultErrorDialog';
import { LandingViewPage } from '../pages/LandingView.page';
import { LoginViewPage } from '../pages/LoginView.page';
import { StartViewPage } from '../pages/StartView.page';

let loginPage: LoginViewPage;
let landingPage: LandingViewPage;
let personManagementViewPage: PersonManagementViewPage;
let landesbedienstetenSearchFormPage: LandesbedienstetenSearchFormPage;
let landesbedienstetenHinzufuegenPage: LandesbedienstetenHinzufuegenPage;
let landesbedienstetenSearchResultPage: LandesbedienstetenSearchResultPage;
let landesbedienstetenSuccessPage: LandesbedienstetenSuccessPage;
let searchResultErrorDialog: SearchResultErrorDialog;

/**
 * Expects to be landesadmin
 * @param page
 * @param primarySchuleName
 * @param rolle
 * @param secondSchuleName
 * @returns
 */
async function setupSchuladminAndLoginAndNavigate(
  page: Page,
  primarySchuleName: string,
  rolle: string,
  secondSchuleName?: string,
): Promise<LandesbedienstetenSearchFormPage> {
  const schuladmin: UserInfo = await createPersonWithPersonenkontext(page, primarySchuleName, rolle);

  if (secondSchuleName) {
    const primarySchuleId: string = await getOrganisationId(page, primarySchuleName);
    const secondSchuleId: string = await getOrganisationId(page, secondSchuleName);
    const rolleId: string = await getRolleId(page, rolle);
    await addOrganisationenToPerson(page, schuladmin.personId, [primarySchuleId, secondSchuleId], rolleId);
  }

  const header: HeaderPage = new HeaderPage(page);
  landingPage = await header.logout();
  loginPage = await landingPage.navigateToLogin();
  const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(
    schuladmin.username,
    schuladmin.password,
  );
  await startPage.waitForPageLoad();
  personManagementViewPage = await startPage.navigateToAdministration();
  landesbedienstetenSearchFormPage =
    await personManagementViewPage.menu.navigateToLandesbedienstetenSuchenUndHinzufuegen();
  return await landesbedienstetenSearchFormPage.waitForPageLoad();
}
/*
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Schuladmin mit einer Schule xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
*/
test.describe('UI Test zu Landesbediensteten suchen', () => {
  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await loginAndNavigateToAdministration(page);
    landesbedienstetenSearchFormPage = await setupSchuladminAndLoginAndNavigate(
      page,
      testschuleName,
      schuladminOeffentlichRolle,
    );
  });
  //SPSH-3458
  test('Landesbediensteten (suchen und hinzufügen): UI prüfen', { tag: [STAGE, DEV] }, async () => {
    await landesbedienstetenSearchFormPage.checkSearchForm();
  });
});

test.describe('Funktions- und UI Testfälle zu Landesbediensteten suchen und hinzufügen', () => {
  test.describe('Ohne Datenanlage', () => {
    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      landesbedienstetenSearchFormPage = new LandesbedienstetenSearchFormPage(page);
      await loginAndNavigateToAdministration(page);

      landesbedienstetenSearchFormPage = await setupSchuladminAndLoginAndNavigate(
        page,
        testschuleName,
        schuladminOeffentlichRolle,
      );
    });

    //SPSH-3459
    test('Nachname ist ein Pflichtfeld', { tag: [STAGE, DEV] }, async () => {
      await landesbedienstetenSearchFormPage.checkMandatoryFieldsForNameSearch('zzzzz', '');
    });

    //SPSH-3460
    test('Vorname ist ein Pflichtfeld', { tag: [STAGE, DEV] }, async () => {
      await landesbedienstetenSearchFormPage.checkMandatoryFieldsForNameSearch('', 'zzzzz');
    });

    //SPSH-3461
    test(
      'Kein Treffer wegen falschen Namen: Popup wird angezeigt und ist vollständig',
      { tag: [STAGE, DEV] },
      async () => {
        searchResultErrorDialog = await landesbedienstetenSearchFormPage.clickLandesbedienstetenSuchenWithInvalidName(
          'zzzzz',
          'yyyyy',
        );
        await searchResultErrorDialog.checkPopupCompleteness();
      },
    );

    //SPSH-3462
    test('Abbrechen Button im Suchergebnis Dialog funktioniert', { tag: [STAGE, DEV] }, async () => {
      searchResultErrorDialog = await landesbedienstetenSearchFormPage.clickLandesbedienstetenSuchenWithInvalidName(
        'zzzzz',
        'yyyyy',
      );
      landesbedienstetenSearchFormPage = await searchResultErrorDialog.clickAbbrechenButton();
      await landesbedienstetenSearchFormPage.expectNameRadioChecked();
    });
    //SPSH-3463
    test(
      'Kein Treffer wegen falscher KoPers-Nr: Popup wird angezeigt und ist vollständig',
      { tag: [STAGE, DEV] },
      async () => {
        searchResultErrorDialog =
          await landesbedienstetenSearchFormPage.clickLandesbedienstetenSuchenWithInvalidKoPers('abc9999');
        await searchResultErrorDialog.checkPopupCompleteness();
      },
    );

    //SPSH-3464
    test(
      'Kein Treffer wegen falscher Mailadresse: Popup wird angezeigt und ist vollständig',
      { tag: [STAGE, DEV] },
      async () => {
        searchResultErrorDialog =
          await landesbedienstetenSearchFormPage.clickLandesbedienstetenSuchenWithInvalidMail('test@spaß.de');
        await searchResultErrorDialog.checkPopupCompleteness();
      },
    );

    //SPSH-3465
    test(
      'Kein Treffer wegen falschem Benutzernamen: Popup wird angezeigt und ist vollständig',
      { tag: [STAGE, DEV] },
      async () => {
        searchResultErrorDialog =
          await landesbedienstetenSearchFormPage.clickLandesbedienstetenSuchenWithInvalidBenutzername('chantall789');
        await searchResultErrorDialog.checkPopupCompleteness();
      },
    );

    //SPSH-3466
    test('Button Zurücksetzen funktioniert', { tag: [STAGE, DEV] }, async () => {
      await landesbedienstetenSearchFormPage.testZuruecksetzenButtonAlleSuchtypen();
    });
  });

  interface PopupFixture {
    label: string;
    setupPerson: (page: Page) => Promise<UserInfo>;
    formFunction: (
      landesbedienstetenSearchFormPage: LandesbedienstetenSearchFormPage,
      person: UserInfo,
    ) => Promise<SearchResultErrorDialog>;
  }

  const popupFixtures: PopupFixture[] = [
    {
      //SPSH-3467
      label: 'Kein Treffer bei Ersatzschullehrkraft Suche nach Namen',
      setupPerson: async (page: Page): Promise<UserInfo> =>
        await createPersonWithPersonenkontext(page, ersatzTestschuleName, ersatzschulLehrkraftRolle),
      formFunction: async (
        landesbedienstetenSearchFormPage: LandesbedienstetenSearchFormPage,
        person: UserInfo,
      ): Promise<SearchResultErrorDialog> => {
        return landesbedienstetenSearchFormPage.clickLandesbedienstetenSuchenWithInvalidName(
          person.vorname,
          person.nachname,
        );
      },
    },
    {
      //SPSH-3468
      label: 'Kein Treffer bei gesperrten Benutzer: Popup wird angezeigt und ist vollständig',
      setupPerson: async (page: Page): Promise<UserInfo> => {
        const lockedLehrkraft: UserInfo = await createPersonWithPersonenkontext(
          page,
          testschuleName,
          lehrkraftOeffentlichRolle,
          undefined,
          undefined,
          generateKopersNr(),
        );
        await lockPerson(page, lockedLehrkraft.personId, testschuleDstNr);
        return lockedLehrkraft;
      },
      formFunction: async (
        landesbedienstetenSearchFormPage: LandesbedienstetenSearchFormPage,
        person: UserInfo,
      ): Promise<SearchResultErrorDialog> => {
        return landesbedienstetenSearchFormPage.clickLandesbedienstetenSuchenWithInvalidBenutzername(person.username);
      },
    },
    {
      //SPSH-3469
      label: 'Mehr als ein Treffer bei doppelten Namen: Popup wird angezeigt und ist vollständig',
      setupPerson: async (page: Page): Promise<UserInfo> => {
        const vornameDoppelt: string = generateVorname();
        const nachnameDoppelt: string = generateNachname();
        let person!: UserInfo;
        for (let i: number = 0; i < 2; i++) {
          person = await createPersonWithPersonenkontext(
            page,
            testschuleName,
            lehrkraftOeffentlichRolle,
            vornameDoppelt,
            nachnameDoppelt,
            generateKopersNr(),
          );
        }
        return person;
      },
      formFunction: async (
        landesbedienstetenSearchFormPage: LandesbedienstetenSearchFormPage,
        person: UserInfo,
      ): Promise<SearchResultErrorDialog> => {
        return landesbedienstetenSearchFormPage.clickLandesbedienstetenSuchenWithDuplicateName(
          person.vorname,
          person.nachname,
        );
      },
    },
  ];

  popupFixtures.forEach(({ label, setupPerson, formFunction }: PopupFixture) => {
    test.describe(label, () => {
      let person: UserInfo;
      test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
        landesbedienstetenSearchFormPage = new LandesbedienstetenSearchFormPage(page);
        await loginAndNavigateToAdministration(page);
        person = await setupPerson(page);
        landesbedienstetenSearchFormPage = await setupSchuladminAndLoginAndNavigate(
          page,
          testschuleName,
          schuladminOeffentlichRolle,
        );
      });

      test('Popup wird angezeigt und ist vollständig', { tag: [STAGE, DEV] }, async () => {
        searchResultErrorDialog = await formFunction(landesbedienstetenSearchFormPage, person);
        await searchResultErrorDialog.checkPopupCompleteness();
      });
    });
  });

  test.describe('Mit Lehrkraft mit einer Schulzuordnung', () => {
    let lehrkraft: UserInfo;
    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      landesbedienstetenSearchFormPage = new LandesbedienstetenSearchFormPage(page);
      await loginAndNavigateToAdministration(page);

      lehrkraft = await createPersonWithPersonenkontext(
        page,
        testschuleName,
        lehrkraftOeffentlichRolle,
        undefined,
        undefined,
        generateKopersNr(),
      );

      landesbedienstetenSearchFormPage = await setupSchuladminAndLoginAndNavigate(
        page,
        testschuleName,
        schuladminOeffentlichRolle,
      );
    });

    ///SPSH-3470
    test('Dev: Suchergebnis: Persönliche Daten und Zuordnung werden korrekt angezeigt', { tag: [DEV] }, async () => {
      const landesbedienstetenSearchResultPage: LandesbedienstetenSearchResultPage =
        await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaName(lehrkraft.vorname, lehrkraft.nachname);
      await landesbedienstetenSearchResultPage.checkSearchResultCard();
      const lehrFullname: string = lehrkraft.vorname + ' ' + lehrkraft.nachname;
      await landesbedienstetenSearchResultPage.checkPersonalDataCard(
        lehrFullname,
        lehrkraft.username,
        lehrkraft.kopersnummer,
      );
      await landesbedienstetenSearchResultPage.checkZuordnungCard(
        testschuleName,
        lehrkraftOeffentlichRolle,
        testschuleDstNr,
      );
    });

    //SPSH-3471
    test(
      'Stage: Suchergebnis: Persönliche Daten und Zuordnung werden korrekt angezeigt',
      { tag: [STAGE] },
      async ({ page }: PlaywrightTestArgs) => {
        const landesbedienstetenSearchResultPage: LandesbedienstetenSearchResultPage =
          await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaName(lehrkraft.vorname, lehrkraft.nachname);
        await landesbedienstetenSearchResultPage.checkSearchResultCard();
        const lehrFullname: string = lehrkraft.vorname + ' ' + lehrkraft.nachname;
        const email: string | undefined = await getEmailByPersonId(page, lehrkraft.personId);
        await landesbedienstetenSearchResultPage.checkPersonalDataCard(
          lehrFullname,
          lehrkraft.username,
          lehrkraft.kopersnummer,
          email,
        );
        await landesbedienstetenSearchResultPage.checkZuordnungCard(
          testschuleName,
          lehrkraftOeffentlichRolle,
          testschuleDstNr,
        );
      },
    );

    /* 
    ----------------------------- Funktionale Testfälle ------------------------------
     */

    //SPSH-3472
    test('Button Zurück zur Suche funktioniert', { tag: [STAGE, DEV] }, async () => {
      interface SuchVariante {
        name: string;
        search: () => Promise<LandesbedienstetenSearchResultPage>;
        expectRadioChecked: () => Promise<void>;
        expectInputValue: () => Promise<void>;
      }

      const suchVarianten: SuchVariante[] = [
        {
          name: 'KoPers-Nr.',
          search: async () =>
            await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaKopers(lehrkraft.kopersnummer),
          expectRadioChecked: async () => await landesbedienstetenSearchFormPage.expectKopersRadioChecked(),
          expectInputValue: async () =>
            await landesbedienstetenSearchFormPage.expectKopersInputValue(lehrkraft.kopersnummer),
        },
        {
          name: 'Benutzername',
          search: async () =>
            await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaUsername(lehrkraft.username),
          expectRadioChecked: async () => await landesbedienstetenSearchFormPage.expectUsernameRadioChecked(),
          expectInputValue: async () =>
            await landesbedienstetenSearchFormPage.expectUsernameInputValue(lehrkraft.username),
        },
        {
          name: 'Name',
          search: async () =>
            await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaName(
              lehrkraft.vorname,
              lehrkraft.nachname,
            ),
          expectRadioChecked: async () => await landesbedienstetenSearchFormPage.expectNameRadioChecked(),
          expectInputValue: async () =>
            await landesbedienstetenSearchFormPage.expectNameInputValues(lehrkraft.vorname, lehrkraft.nachname),
        },
      ];
      for (const variante of suchVarianten) {
        const landesbedienstetenSearchResultPage: LandesbedienstetenSearchResultPage = await variante.search();
        await landesbedienstetenSearchResultPage.checkSearchResultCard();
        await landesbedienstetenSearchResultPage.clickZurueckZurSuche();
        await variante.expectRadioChecked();
        await variante.expectInputValue();
      }
    });

    //SPSH-3476
    test(
      'Schuladmin 1 Schule: Seite Landesbediensteten hinzufügen wird korrekt angezeigt',
      { tag: [STAGE, DEV] },
      async () => {
        landesbedienstetenSearchResultPage = await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaKopers(
          lehrkraft.kopersnummer,
        );
        landesbedienstetenHinzufuegenPage =
          await landesbedienstetenSearchResultPage.clickLandesbedienstetenHinzufuegen();
        await landesbedienstetenHinzufuegenPage.checkInitialFormState(
          lehrkraft.vorname,
          lehrkraft.nachname,
          lehrkraft.kopersnummer,
        );
        await landesbedienstetenHinzufuegenPage.additionalCheckInitialFormState(testschuleDstNrUndName);
      },
    );

    // SPSH-3477
    test(
      'Schuladmin 1 Schule: Landesbediensteten per KoPers suchen und erfolgreich hinzufügen',
      { tag: [STAGE, DEV] },
      async () => {
        landesbedienstetenSearchResultPage = await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaKopers(
          lehrkraft.kopersnummer,
        );
        landesbedienstetenHinzufuegenPage =
          await landesbedienstetenSearchResultPage.clickLandesbedienstetenHinzufuegen();
        await landesbedienstetenHinzufuegenPage.selectRolleAndConfirm(vertretungslehrkraftRolle);
        landesbedienstetenSuccessPage =
          await landesbedienstetenHinzufuegenPage.clickLandesbedienstetenHinzufügenOnConfirmationPopup();
        await landesbedienstetenSuccessPage.waitForPageLoad();
      },
    );

    //SPSH-3478
    test(
      'Schuladmin 1 Schule: Landesbediensteten suchen per Vorname und Nachname und erfolgreich hinzufügen',
      { tag: [STAGE, DEV] },
      async () => {
        landesbedienstetenSearchResultPage = await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaName(
          lehrkraft.vorname,
          lehrkraft.nachname,
        );
        landesbedienstetenHinzufuegenPage =
          await landesbedienstetenSearchResultPage.clickLandesbedienstetenHinzufuegen();
        await landesbedienstetenHinzufuegenPage.selectRolleAndConfirm(vertretungslehrkraftRolle);
        landesbedienstetenSuccessPage =
          await landesbedienstetenHinzufuegenPage.clickLandesbedienstetenHinzufügenOnConfirmationPopup();
        await landesbedienstetenSuccessPage.waitForPageLoad();
      },
    );
  });

  test.describe('Mit Lehrkraft mit einer Schulzuordnung und E-Mail Service Provider', () => {
    let lehrkraftMitEmail: UserInfo;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      landesbedienstetenSearchFormPage = new LandesbedienstetenSearchFormPage(page);
      await loginAndNavigateToAdministration(page);

      lehrkraftMitEmail = await createRolleAndPersonWithPersonenkontext(page, {
        organisationName: testschuleName,
        rollenArt: typeLehrer,
        serviceProviderNames: [emailServiceProvider],
        koPersNr: generateKopersNr(),
      });

      landesbedienstetenSearchFormPage = await setupSchuladminAndLoginAndNavigate(
        page,
        testschuleName,
        schuladminOeffentlichRolle,
      );
    });

    //SPSH-3475
    test('Button Zurück zur Suche funktioniert (E-Mail)', { tag: [STAGE] }, async ({ page }: PlaywrightTestArgs) => {
      const lehrkraftEmail: string = await waitForEmailByPersonId(page, lehrkraftMitEmail.personId);
      const landesbedienstetenSearchResultPage: LandesbedienstetenSearchResultPage =
        await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaEmail(lehrkraftEmail);
      await landesbedienstetenSearchResultPage.checkSearchResultCard();
      await landesbedienstetenSearchResultPage.clickZurueckZurSuche();
      await landesbedienstetenSearchFormPage.expectEmailRadioChecked();
      await landesbedienstetenSearchFormPage.expectEmailInputValue(lehrkraftEmail);
    });
  });

  test.describe('Mit Lehrkraft ohne Schulzuordnung', () => {
    let lehrkraft: UserInfo;
    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      landesbedienstetenSearchFormPage = new LandesbedienstetenSearchFormPage(page);
      await loginAndNavigateToAdministration(page);

      lehrkraft = await createPersonWithPersonenkontext(
        page,
        testschuleName,
        lehrkraftOeffentlichRolle,
        undefined,
        undefined,
        generateKopersNr(),
      );
      await removeAllPersonenkontexte(page, lehrkraft.personId);

      landesbedienstetenSearchFormPage = await setupSchuladminAndLoginAndNavigate(
        page,
        testschuleName,
        schuladminOeffentlichRolle,
      );
    });

    //SPSH-3479
    test(
      'Schuladmin 1 Schule: Landesbediensteten ohne Schulzuordnung suchen per Benutzername und erfolgreich hinzufügen',
      { tag: [STAGE, DEV] },
      async () => {
        landesbedienstetenSearchResultPage = await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaUsername(
          lehrkraft.username,
        );
        landesbedienstetenHinzufuegenPage =
          await landesbedienstetenSearchResultPage.clickLandesbedienstetenHinzufuegen();
        await landesbedienstetenHinzufuegenPage.selectRolleAndConfirm(lehrkraftOeffentlichRolle);
        landesbedienstetenSuccessPage =
          await landesbedienstetenHinzufuegenPage.clickLandesbedienstetenHinzufügenOnConfirmationPopup();
        await landesbedienstetenSuccessPage.waitForPageLoad();
      },
    );
  });
});

/*
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Schuladmin mit 2 Schulen xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
*/
test.describe('Testfälle für Landesbediensteten hinzufügen, Funktion und UI-Vollständigkeit - Schuladmin 2 Schulen', () => {
  let lehrkraft: UserInfo;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await loginAndNavigateToAdministration(page);

    lehrkraft = await createPersonWithPersonenkontext(
      page,
      testschuleName,
      lehrkraftOeffentlichRolle,
      undefined,
      undefined,
      generateKopersNr(),
    );

    landesbedienstetenSearchFormPage = await setupSchuladminAndLoginAndNavigate(
      page,
      testschuleName,
      schuladminOeffentlichRolle,
      testschule665Name,
    );
    landesbedienstetenSearchResultPage = await landesbedienstetenSearchFormPage.searchLandesbedienstetenViaUsername(
      lehrkraft.username,
    );
    landesbedienstetenHinzufuegenPage = await landesbedienstetenSearchResultPage.clickLandesbedienstetenHinzufuegen();
  });

  //SPSH-3480
  test('UI: Schuladmin 2 Schulen: initialer Formularstatus', { tag: [STAGE, DEV] }, async () => {
    await landesbedienstetenHinzufuegenPage.checkInitialFormState(
      lehrkraft.vorname,
      lehrkraft.nachname,
      lehrkraft.kopersnummer,
    );
  });

  //SPSH-3481
  test('Schuladmin 2 Schulen: Organisationsauswahl eingeschränkt', { tag: [STAGE, DEV] }, async () => {
    const erwarteteOrganisationen: string[] = [testschuleDstNrUndName, testschule665DstNrUndName];
    await landesbedienstetenHinzufuegenPage.assertAllMenuItemsForOrganisation(erwarteteOrganisationen);
  });
  //SPSH-3482
  test(
    'Schuladmin 2 Schulen: Rollenfelder werden nach Organisationsauswahl angezeigt',
    { tag: [STAGE, DEV] },
    async () => {
      await landesbedienstetenHinzufuegenPage.selectOrganisation(testschule665DstNrUndName);
    },
  );

  //SPSH-3483
  test('Schuladmin 2 Schulen: Bei Auswahl Rolle LiV wird Befristung angezeigt', { tag: [STAGE, DEV] }, async () => {
    await landesbedienstetenHinzufuegenPage.selectOrganisation(testschule665DstNrUndName);
    await landesbedienstetenHinzufuegenPage.selectRolle(lehrerImVorbereitungsdienstRolle);
    await landesbedienstetenHinzufuegenPage.checkIfBefristungIsEnforced();
  });
  //SPSH-3484
  test(
    'Schuladmin 2 Schulen: Bestätigungs-Popup wird angezeigt mit korrektem Text',
    { tag: [STAGE, DEV] },
    async () => {
      await landesbedienstetenHinzufuegenPage.addLandesbedienstetenWithOrgaAndRolle(
        testschule665DstNrUndName,
        lehrkraftOeffentlichRolle,
      );
      await landesbedienstetenHinzufuegenPage.verifyAddEmployeePopupIsShown(
        lehrkraftOeffentlichRolle,
        lehrkraft.username,
      );
    },
  );

  //SPSH-3485
  test('Schuladmin 2 Schulen: Bestätigungspopup schließt nach klick auf Abbrechen', { tag: [STAGE, DEV] }, async () => {
    await landesbedienstetenHinzufuegenPage.addLandesbedienstetenWithOrgaAndRolle(
      testschule665DstNrUndName,
      lehrkraftOeffentlichRolle,
    );
    await landesbedienstetenHinzufuegenPage.clickAbbrechenOnConfirmationPopup();
  });

  //SPSH-3486
  test('Schuladmin 2 Schulen: UI: Bestätigungseite wird komplett angezeigt.', { tag: [STAGE, DEV] }, async () => {
    await landesbedienstetenHinzufuegenPage.addLandesbedienstetenWithOrgaAndRolle(
      testschule665DstNrUndName,
      lehrkraftOeffentlichRolle,
    );
    landesbedienstetenSuccessPage =
      await landesbedienstetenHinzufuegenPage.clickLandesbedienstetenHinzufügenOnConfirmationPopup();
    const lehrFullname: string = lehrkraft.vorname + ' ' + lehrkraft.nachname;
    await landesbedienstetenSuccessPage.assertAllElementsVisible(lehrFullname);
  });
});
