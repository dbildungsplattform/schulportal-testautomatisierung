import test, { expect, PlaywrightTestArgs } from '@playwright/test';
import { createKlasse, createSchule, getOrganisationId } from '../../base/api/organisationApi';
import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { createRolle, RollenArt } from '../../base/api/rolleApi';
import { landSH } from '../../base/organisation';
import {
  landesadminRolle,
  lehrerImVorbereitungsdienstRolle,
  lehrkraftOeffentlichRolle,
  schuelerRolle,
  schuladminOeffentlichRolle,
} from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { TestHelperLdap } from '../../base/testHelperLdap';
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
    let schuleId: string;
    let schuleName: string;
    let schuleDstNr: string;
    let personCreationViewPage: PersonCreationViewPage;

    test.describe(`Nutzer mit schulspezifischen Rollen anlegen`, () => {
      test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
        const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
        schuleName = generateSchulname();
        schuleDstNr = generateDienststellenNr();
        schuleId = await createSchule(page, schuleName, schuleDstNr);
        personCreationViewPage = await personManagementViewPage.getMenu().navigateToPersonCreation();
      });

      [schuladminOeffentlichRolle, lehrkraftOeffentlichRolle, lehrerImVorbereitungsdienstRolle, schuelerRolle].forEach(
        (userRolle: string) => {
          test(`${userRolle} anlegen`, { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
            const isSchueler: boolean = userRolle === schuelerRolle;
            const isLehrer: boolean =
              userRolle === lehrerImVorbereitungsdienstRolle || userRolle === lehrkraftOeffentlichRolle;
            const isBefristet: boolean = userRolle === lehrerImVorbereitungsdienstRolle;
            const klasseName: string = generateKlassenname();

            const validationParameters: PersonCreationSuccessValidationParams = {
              nachname: generateNachname(),
              vorname: generateVorname(),
              rollen: [userRolle],
              organisation: schuleName,
              dstNr: schuleDstNr,
            };

            if (isSchueler) {
              await test.step('Klasse anlegen', async () => {
                await createKlasse(page, schuleId, klasseName);
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
              await personCreationViewPage.fillForm(creationParameters);
            });

            const successPage: PersonCreationSuccessPage = await test.step('Abschicken', async () =>
              personCreationViewPage.submit());

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
          });
        },
      );

      test('Mehrere Benutzer hintereinander anlegen', { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
        const personenParameters: PersonCreationSuccessValidationParams[] = [
          {
            nachname: generateNachname(),
            vorname: generateVorname(),
            rollen: [schuelerRolle],
            organisation: schuleName,
            dstNr: schuleDstNr,
            klasse: generateKlassenname(),
          },
          {
            nachname: generateNachname(),
            vorname: generateVorname(),
            rollen: [lehrkraftOeffentlichRolle],
            organisation: schuleName,
            dstNr: schuleDstNr,
            kopersnr: generateKopersNr(),
          },
          {
            nachname: generateNachname(),
            vorname: generateVorname(),
            rollen: [lehrkraftOeffentlichRolle],
            organisation: schuleName,
            dstNr: schuleDstNr,
            kopersnr: generateKopersNr(),
          },
        ];

        await test.step('Klasse anlegen', async () => {
          await Promise.all(
            personenParameters.map(
              (params: PersonCreationSuccessValidationParams) =>
                params.klasse && createKlasse(page, schuleId, params.klasse),
            ),
          );
        });

        for (const [index, params] of personenParameters.entries()) {
          await test.step(`Nutzer ${index + 1} anlegen und prüfen`, async () => {
            await personCreationViewPage.fillForm(params);
            const successPage: PersonCreationSuccessPage = await personCreationViewPage.submit();
            await successPage.assertSuccessfulCreation(params);
            personCreationViewPage = await successPage.createAnotherPerson();
          });
        }
      });

      test('Benutzer mit mehreren Rollen anlegen', { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
        const params: PersonCreationSuccessValidationParams = {
          nachname: generateNachname(),
          vorname: generateVorname(),
          rollen: [generateRolleName(), generateRolleName(), generateRolleName()],
          organisation: schuleName,
          dstNr: schuleDstNr,
        };

        await test.step('Rollen anlegen', async () => {
          const orgaId: string = await getOrganisationId(page, schuleName);
          await Promise.all(params.rollen.map((name: string) => createRolle(page, RollenArt.Lehr, orgaId, name)));
        });

        const personManagementViewPage: PersonManagementViewPage =
          await test.step(`Nutzer anlegen und prüfen`, async () => {
            await personCreationViewPage.fillForm(params);
            const successPage: PersonCreationSuccessPage = await personCreationViewPage.submit();
            await successPage.assertSuccessfulCreation(params);
            return successPage.backToList();
          });

        await test.step('Neuen Benutzer in Übersicht prüfen', async () => {
          await personManagementViewPage.searchByText(params.vorname);
          await personManagementViewPage.assertThatPersonExists(params.vorname);
        });
      });

      test.describe(`LDAP-Integration`, () => {
        test('Lehrer anlegen und LDAP-Daten prüfen', { tag: [DEV] }, async () => {
          const params: PersonCreationSuccessValidationParams = {
            nachname: generateNachname(),
            vorname: generateVorname(),
            rollen: [lehrkraftOeffentlichRolle],
            organisation: schuleName,
            dstNr: schuleDstNr,
            kopersnr: generateKopersNr(),
          };

          const createdBenutzername: string = await test.step('Nutzer anlegen', async () => {
            await personCreationViewPage.fillForm(params);
            const successPage: PersonCreationSuccessPage = await personCreationViewPage.submit();
            await successPage.assertSuccessfulCreation(params);
            return successPage.getBenutzername();
          });

          const ldapHelper: TestHelperLdap = new TestHelperLdap(
            process.env.LDAP_URL!,
            process.env.LDAP_ADMIN_USER!,
            process.env.LDAP_ADMIN_PASSWORD!,
          );

          await test.step(`Prüfen, dass Lehrkraft im LDAP angelegt wurde`, async () => {
            expect(await ldapHelper.validateUserExists(createdBenutzername, 10, 1000)).toBeTruthy();
          });

          await test.step(`Prüfen, dass Lehrkraft im LDAP korrekter Gruppe zugeordnet wurde`, async () => {
            expect(await ldapHelper.validateUserIsInGroupOfNames(createdBenutzername, params.dstNr!)).toBeTruthy();
          });

          await test.step(`Mail Primary Address Auf Existenz Prüfen`, async () => {
            const mailPrimaryAddress: string = await ldapHelper.getMailPrimaryAddress(createdBenutzername, 10, 1000);
            expect(mailPrimaryAddress).toContain('schule-sh.de');
            expect(mailPrimaryAddress.length).toBeGreaterThan(5);
          });
        });

        test(
          'Lehrer anlegen, Kontext entfernen und wiederherstellen und LDAP-Daten prüfen',
          { tag: [DEV] },
          async () => {
            const params: PersonCreationSuccessValidationParams = {
              nachname: generateNachname(),
              vorname: generateVorname(),
              rollen: [lehrkraftOeffentlichRolle],
              organisation: schuleName,
              dstNr: schuleDstNr,
              kopersnr: generateKopersNr(),
            };

            const ldapHelper: TestHelperLdap = new TestHelperLdap(
              process.env.LDAP_URL!,
              process.env.LDAP_ADMIN_USER!,
              process.env.LDAP_ADMIN_PASSWORD!,
            );

            const [createdBenutzername, initialPersonManagementView]: [string, PersonManagementViewPage] =
              await test.step('Nutzer anlegen', async () => {
                await personCreationViewPage.fillForm(params);
                const successPage: PersonCreationSuccessPage = await personCreationViewPage.submit();
                await successPage.assertSuccessfulCreation(params);

                return [await successPage.getBenutzername(), await successPage.backToList()];
              });

            let personManagementView: PersonManagementViewPage = initialPersonManagementView;

            await test.step(`Prüfen, dass Lehrkraft im LDAP angelegt wurde`, async () => {
              expect(await ldapHelper.validateUserExists(createdBenutzername, 10, 1000)).toBeTruthy();
            });

            await test.step(`Prüfen, dass Lehrkraft im LDAP korrekter Gruppe zugeordnet wurde`, async () => {
              expect(await ldapHelper.validateUserIsInGroupOfNames(createdBenutzername, params.dstNr!)).toBeTruthy();
            });

            const generatedPrimaryMailAddress: string =
              await test.step(`Mail Primary Address Auf Existenz Prüfen`, async () => {
                const primaryMailAddress: string = await ldapHelper.getMailPrimaryAddress(
                  createdBenutzername,
                  10,
                  1000,
                );
                expect(primaryMailAddress).toContain('schule-sh.de');
                expect(primaryMailAddress.length).toBeGreaterThan(5);
                return primaryMailAddress;
              });

            let personDetailsViewPage: PersonDetailsViewPage = await test.step(`Gesamtübersicht öffnen`, async () => {
              return personManagementView.searchAndOpenGesamtuebersicht(createdBenutzername);
            });

            personManagementView = await test.step(`Personenkontext entfernen`, async () => {
              const zuordnungenPage: ZuordnungenPage = await personDetailsViewPage.editZuordnungen();
              return zuordnungenPage.removeLastZuordnung({ organisation: schuleName, dstNr: schuleDstNr });
            });

            personDetailsViewPage = await test.step('Person suchen und Gesamtübersicht erneut öffnen', async () => {
              await personManagementView.searchByText(createdBenutzername);
              await personManagementView.assertThatPersonExists(createdBenutzername);
              return personManagementView.openGesamtuebersicht(createdBenutzername);
            });

            await test.step('Schulzuordnung wiederherstellen', async () => {
              const zuordnungenPage: ZuordnungenPage = await personDetailsViewPage.editZuordnungen();
              await zuordnungenPage.addZuordnung({ organisation: schuleName, rolle: lehrkraftOeffentlichRolle });
            });

            await test.step(`Prüfen, dass Lehrkraft im LDAP noch existiert`, async () => {
              expect(await ldapHelper.validateUserExists(createdBenutzername, 10, 1000)).toBeTruthy();
            });

            await test.step(`Prüfen, dass Lehrkraft noch im LDAP korrekter Gruppe zugeordnet ist`, async () => {
              expect(await ldapHelper.validateUserIsInGroupOfNames(createdBenutzername, params.dstNr!)).toBeTruthy();
            });

            await test.step(`Prüfen, dass eine Mail weiterhin existiert und zugeordnet ist`, async () => {
              const mailPrimaryAddress: string = await ldapHelper.getMailPrimaryAddress(createdBenutzername);
              const expected: string = generatedPrimaryMailAddress.replace('@', '1@');
              expect(mailPrimaryAddress).toBe(expected);
            });
          },
        );
      });
    });

    test.describe(`Nutzer mit landesspezifischen Rollen anlegen`, () => {
      let personCreationViewPage: PersonCreationViewPage;

      test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
        const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
        personCreationViewPage = await personManagementViewPage.getMenu().navigateToPersonCreation();
      });

      test(`${landesadminRolle} anlegen`, { tag: [DEV, STAGE] }, async () => {
        const validationParameters: PersonCreationSuccessValidationParams = {
          nachname: generateNachname(),
          vorname: generateVorname(),
          rollen: [landesadminRolle],
          organisation: landSH,
        };

        const creationParameters: PersonCreationParams = { ...validationParameters };

        await test.step('Formular ausfüllen', async () => {
          await personCreationViewPage.fillForm(creationParameters);
        });

        const successPage: PersonCreationSuccessPage = await test.step('Abschicken', async () =>
          personCreationViewPage.submit());

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
