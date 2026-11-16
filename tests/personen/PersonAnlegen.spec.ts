import { PlaywrightTestArgs } from '@playwright/test';
import { createKlasse, createSchule, getOrganisationId } from '../../base/api/organisationApi';
import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { createRolle, RollenArt } from '../../base/api/rolleApi';
import { test as baseTest } from '../../base/fixtures';
import { landSH } from '../../base/organisation';
import {
  landesadminRolle,
  lehrerImVorbereitungsdienstRolle,
  lehrkraftOeffentlichRolle,
  schuelerRolle,
  schuladminOeffentlichRolle,
} from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import {
  generateDienststellenNr,
  generateKlassenname,
  generateKopersNr,
  generateNachname,
  generateRolleName,
  generateSchulname,
  generateVorname,
} from '../../base/utils/generateTestdata';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import {
  PersonCreationSuccessPage,
  PersonCreationSuccessValidationParams,
} from '../../pages/admin/personen/creation/PersonCreationSuccess.page';
import {
  PersonCreationParams,
  PersonCreationViewPage,
} from '../../pages/admin/personen/creation/PersonCreationView.page';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { ZuordnungenPage } from '../../pages/admin/personen/details/Zuordnungen.page';

const test = baseTest.extend<{ personCreationPageAsLandesadmin: PersonCreationViewPage }>({
  personCreationPageAsLandesadmin: async ({ asLandesadmin }, use) => {
    const personCreationViewPage: PersonCreationViewPage = await asLandesadmin.personManagementViewPage
      .getMenu()
      .navigateToPersonCreation();
    await use(personCreationViewPage);
  },
});

function calculateBefristung(): string {
  const currentYear: number = new Date().getFullYear();
  let yearForBefristung: number = currentYear;
  const today: Date = new Date();

  // getMonth() is 0-based
  if (today.getMonth() >= 7 || (today.getMonth() === 6 && today.getDate() === 31)) {
    yearForBefristung = currentYear + 1;
  }
  return '31.7.' + yearForBefristung;
}

test.describe(`Testfälle für die Anlage von Personen`, () => {
  test.describe(`Als ${landesadminRolle}`, () => {
    test.describe(`Nutzer mit schulspezifischen Rollen anlegen`, () => {
      [schuladminOeffentlichRolle, lehrkraftOeffentlichRolle, lehrerImVorbereitungsdienstRolle, schuelerRolle].forEach(
        (userRolle: string) => {
          test(
            `${userRolle} anlegen`,
            { tag: [DEV, STAGE] },
            async ({ page, testSchuleMitDstNr, personCreationPageAsLandesadmin }) => {
              const isSchueler: boolean = userRolle === schuelerRolle;
              const isLehrer: boolean =
                userRolle === lehrerImVorbereitungsdienstRolle || userRolle === lehrkraftOeffentlichRolle;
              const isBefristet: boolean = userRolle === lehrerImVorbereitungsdienstRolle;
              const klasseName: string = generateKlassenname();

              const validationParameters: PersonCreationSuccessValidationParams = {
                nachname: generateNachname(),
                vorname: generateVorname(),
                rollen: [userRolle],
                organisation: testSchuleMitDstNr.name,
                dstNr: testSchuleMitDstNr.dstNr,
              };

              if (isSchueler) {
                await test.step('Klasse anlegen', async () => {
                  await createKlasse(page, testSchuleMitDstNr.id, klasseName);
                  validationParameters.klasse = klasseName;
                });
              }

              if (isLehrer) {
                validationParameters.kopersnr = generateKopersNr();
                if (isBefristet) {
                  validationParameters.befristung = calculateBefristung();
                }
              }

              const creationParameters: PersonCreationParams = { ...validationParameters };

              await test.step('Formular ausfüllen', async () => {
                await personCreationPageAsLandesadmin.fillForm(creationParameters);
              });

              const successPage: PersonCreationSuccessPage = await test.step('Abschicken', async () =>
                personCreationPageAsLandesadmin.submit());

              const { benutzername, startpasswort }: { benutzername: string; startpasswort: string } =
                await test.step('Erfolgsmeldung prüfen', async () => {
                  await successPage.assertSuccessfulCreation(validationParameters);
                  return {
                    benutzername: await successPage.getBenutzername(),
                    startpasswort: await successPage.getPassword(),
                  };
                });

              const personManagementViewPage: PersonManagementViewPage =
                await test.step('Zurück zur Personenübersicht', async () =>
                  successPage.getMenu().navigateToPersonManagement());

              await test.step('Neuen Benutzer in Übersicht prüfen', async () => {
                await personManagementViewPage.searchByText(benutzername);
                await personManagementViewPage.assertThatPersonExists(benutzername);
              });

              const landingPage: LandingViewPage = await test.step('Abmelden', async () => {
                return personManagementViewPage.getHeader().logout();
              });

              await test.step('Einloggen mit neu angelegtem Benutzer', async () => {
                const loginPage: LoginViewPage = await landingPage.navigateToLogin();
                const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(
                  benutzername,
                  startpasswort,
                );
                await startPage.assertServiceProvidersAreLoaded();
              });
            },
          );
        },
      );

      test(
        'Mehrere Benutzer hintereinander anlegen',
        { tag: [DEV, STAGE] },
        async ({ page, testSchuleMitDstNr, personCreationPageAsLandesadmin }) => {
          const personenParameters: PersonCreationSuccessValidationParams[] = [
            {
              nachname: generateNachname(),
              vorname: generateVorname(),
              rollen: [schuelerRolle],
              organisation: testSchuleMitDstNr.name,
              dstNr: testSchuleMitDstNr.dstNr,
              klasse: generateKlassenname(),
            },
            {
              nachname: generateNachname(),
              vorname: generateVorname(),
              rollen: [lehrkraftOeffentlichRolle],
              organisation: testSchuleMitDstNr.name,
              dstNr: testSchuleMitDstNr.dstNr,
              kopersnr: generateKopersNr(),
            },
            {
              nachname: generateNachname(),
              vorname: generateVorname(),
              rollen: [lehrkraftOeffentlichRolle],
              organisation: testSchuleMitDstNr.name,
              dstNr: testSchuleMitDstNr.dstNr,
              kopersnr: generateKopersNr(),
            },
          ];

          await test.step('Klasse anlegen', async () => {
            await Promise.all(
              personenParameters.map(
                (params: PersonCreationSuccessValidationParams) =>
                  params.klasse && createKlasse(page, testSchuleMitDstNr.id, params.klasse),
              ),
            );
          });

          let currentCreationPage: PersonCreationViewPage = personCreationPageAsLandesadmin;
          for (const [index, params] of personenParameters.entries()) {
            await test.step(`Nutzer ${index + 1} anlegen und prüfen`, async () => {
              await currentCreationPage.fillForm(params);
              const successPage: PersonCreationSuccessPage = await currentCreationPage.submit();
              await successPage.assertSuccessfulCreation(params);
              currentCreationPage = await successPage.createAnotherPerson();
            });
          }
        },
      );

      test(
        'Benutzer mit mehreren Rollen anlegen',
        { tag: [DEV, STAGE] },
        async ({ page, testSchuleMitDstNr, personCreationPageAsLandesadmin }) => {
          const params: PersonCreationSuccessValidationParams = {
            nachname: generateNachname(),
            vorname: generateVorname(),
            rollen: [generateRolleName(), generateRolleName(), generateRolleName()],
            organisation: testSchuleMitDstNr.name,
            dstNr: testSchuleMitDstNr.dstNr,
          };

          await test.step('Rollen anlegen', async () => {
            const orgaId: string = await getOrganisationId(page, testSchuleMitDstNr.name);
            await Promise.all(params.rollen.map((name: string) => createRolle(page, RollenArt.Lehr, orgaId, name)));
          });

          const personManagementViewPage: PersonManagementViewPage =
            await test.step(`Nutzer anlegen und prüfen`, async () => {
              await personCreationPageAsLandesadmin.fillForm(params);
              const successPage: PersonCreationSuccessPage = await personCreationPageAsLandesadmin.submit();
              await successPage.assertSuccessfulCreation(params);
              return successPage.backToList();
            });

          await test.step('Neuen Benutzer in Übersicht prüfen', async () => {
            await personManagementViewPage.searchByText(params.vorname);
            await personManagementViewPage.assertThatPersonExists(params.vorname);
          });
        },
      );

      test.describe('Personenkontext wiederherstellen', () => {
        test(
          'Lehrer anlegen, Kontext entfernen und wiederherstellen',
          { tag: [DEV] },
          async ({ page, testSchuleMitDstNr, personCreationPageAsLandesadmin }) => {
            const params: PersonCreationSuccessValidationParams = {
              nachname: generateNachname(),
              vorname: generateVorname(),
              rollen: [lehrkraftOeffentlichRolle],
              organisation: testSchuleMitDstNr.name,
              dstNr: testSchuleMitDstNr.dstNr,
              kopersnr: generateKopersNr(),
            };

            const [createdBenutzername, initialPersonManagementView]: [string, PersonManagementViewPage] =
              await test.step('Nutzer anlegen', async () => {
                await personCreationPageAsLandesadmin.fillForm(params);
                const successPage: PersonCreationSuccessPage = await personCreationPageAsLandesadmin.submit();
                await successPage.assertSuccessfulCreation(params);

                return [await successPage.getBenutzername(), await successPage.backToList()];
              });

            let personManagementView: PersonManagementViewPage = initialPersonManagementView;

            let personDetailsViewPage: PersonDetailsViewPage = await test.step(`Gesamtübersicht öffnen`, async () => {
              return personManagementView.searchAndOpenGesamtuebersicht(createdBenutzername);
            });

            personManagementView = await test.step(`Personenkontext entfernen`, async () => {
              const zuordnungenPage: ZuordnungenPage = await personDetailsViewPage.editZuordnungen();
              return zuordnungenPage.removeLastZuordnung({
                organisation: testSchuleMitDstNr.name,
                dstNr: testSchuleMitDstNr.dstNr,
              });
            });

            personDetailsViewPage = await test.step('Person suchen und Gesamtübersicht erneut öffnen', async () => {
              await personManagementView.searchByText(createdBenutzername);
              await personManagementView.assertThatPersonExists(createdBenutzername);
              return personManagementView.openGesamtuebersicht(createdBenutzername);
            });

            await test.step('Schulzuordnung wiederherstellen', async () => {
              const zuordnungenView: ZuordnungenPage = new ZuordnungenPage(page);
              await zuordnungenView.assertZuordnungDoesNotExist({
                organisation: testSchuleMitDstNr.name,
                dstNr: testSchuleMitDstNr.dstNr,
                rolle: lehrkraftOeffentlichRolle,
              });
              const zuordnungenPage: ZuordnungenPage = await personDetailsViewPage.editZuordnungen();
              await zuordnungenPage.addZuordnung({
                organisation: testSchuleMitDstNr.name,
                rolle: lehrkraftOeffentlichRolle,
              });
            });

            await test.step('Schulzuordnung prüfen', async () => {
              const zuordnungenView: ZuordnungenPage = new ZuordnungenPage(page);
              await zuordnungenView.assertZuordnungExists({
                organisation: testSchuleMitDstNr.name,
                dstNr: testSchuleMitDstNr.dstNr,
                rolle: lehrkraftOeffentlichRolle,
              });
            });
          },
        );
      });
    });

    test.describe(`Nutzer mit landesspezifischen Rollen anlegen`, () => {
      test(`${landesadminRolle} anlegen`, { tag: [DEV, STAGE] }, async ({ personCreationPageAsLandesadmin }) => {
        const validationParameters: PersonCreationSuccessValidationParams = {
          nachname: generateNachname(),
          vorname: generateVorname(),
          rollen: [landesadminRolle],
          organisation: landSH,
        };

        const creationParameters: PersonCreationParams = { ...validationParameters };

        await test.step('Formular ausfüllen', async () => {
          await personCreationPageAsLandesadmin.fillForm(creationParameters);
        });

        const successPage: PersonCreationSuccessPage = await test.step('Abschicken', async () =>
          personCreationPageAsLandesadmin.submit());

        const benutzername: string = await test.step('Erfolgsmeldung prüfen', async () => {
          await successPage.assertSuccessfulCreation(validationParameters);
          return successPage.getBenutzername();
        });

        const personManagementViewPage: PersonManagementViewPage =
          await test.step('Zurück zur Personenübersicht', async () =>
            successPage.getMenu().navigateToPersonManagement());

        await test.step('Neuen Benutzer in Übersicht prüfen', async () => {
          await personManagementViewPage.searchByText(benutzername);
          await personManagementViewPage.assertThatPersonExists(benutzername);
        });
      });
    });
  });

  test.describe(`Als ${schuladminOeffentlichRolle}`, () => {
    let schuleId: string;
    let schuleName: string;
    let schuleDstNr: string;
    let klasseName: string;
    let adminUserInfo: UserInfo;
    let personCreationViewPage: PersonCreationViewPage;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
      schuleName = generateSchulname();
      schuleDstNr = generateDienststellenNr();
      klasseName = generateKlassenname();
      schuleId = await createSchule(page, schuleName, schuleDstNr);
      await createKlasse(page, schuleId, klasseName);
      adminUserInfo = await createPersonWithPersonenkontext(page, schuleName, schuladminOeffentlichRolle);

      const landingPage = await personManagementViewPage.getHeader().logout();
      const loginPage = await landingPage.navigateToLogin();
      const startPage = await loginPage.loginNewUserWithPasswordChange(adminUserInfo.username, adminUserInfo.password);
      const adminViewPage = await startPage.navigateToAdministration();
      personCreationViewPage = await adminViewPage.getMenu().navigateToPersonAdd();
    });

    test(`${schuelerRolle} anlegen`, { tag: [DEV, STAGE] }, async () => {
      const creationParameters: PersonCreationParams = {
        nachname: generateNachname(),
        vorname: generateVorname(),
        rollen: [schuelerRolle],
        klasse: klasseName,
      };

      await test.step('Formular ausfüllen', async () => {
        await personCreationViewPage.fillForm(creationParameters);
      });

      const successPage: PersonCreationSuccessPage = await test.step('Abschicken', async () =>
        personCreationViewPage.submit());

      const { benutzername, startpasswort }: { benutzername: string; startpasswort: string } =
        await test.step('Erfolgsmeldung prüfen', async () => {
          const validationParams: PersonCreationSuccessValidationParams = {
            ...creationParameters,
            organisation: schuleName,
            dstNr: schuleDstNr,
          };
          await successPage.assertSuccessfulCreation(validationParams);
          return {
            benutzername: await successPage.getBenutzername(),
            startpasswort: await successPage.getPassword(),
          };
        });

      const personManagementViewPage: PersonManagementViewPage =
        await test.step('Zurück zur Personenübersicht', async () => successPage.getMenu().navigateToPersonManagement());

      await test.step('Neuen Benutzer in Übersicht prüfen', async () => {
        await personManagementViewPage.searchByText(benutzername);
        await personManagementViewPage.assertThatPersonExists(benutzername);
      });

      const landingPage: LandingViewPage = await test.step('Abmelden', async () => {
        return personManagementViewPage.getHeader().logout();
      });

      await test.step('Einloggen mit neu angelegtem Benutzer', async () => {
        const loginPage: LoginViewPage = await landingPage.navigateToLogin();
        const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(benutzername, startpasswort);
        await startPage.assertServiceProvidersAreLoaded();
      });
    });
  });
});
