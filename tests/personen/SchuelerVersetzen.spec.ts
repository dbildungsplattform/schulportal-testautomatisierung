import { test } from '../../base/fixtures';
import { createKlasse, getOrganisationId } from '../../base/api/organisationApi';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { testschuleDstNr, testschuleName } from '../../base/organisation';
import { typeSchueler } from '../../base/rollentypen';
import { itslearning } from '../../base/sp';
import { DEV, STAGE } from '../../base/tags';
import { generateKlassenname, generateRolleName } from '../../base/utils/generateTestdata';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { ZuordnungenPage } from '../../pages/admin/personen/details/Zuordnungen.page';

test.describe(`Schüler versetzen, Umgebung ${process.env.ENV}, URL: ${process.env.FRONTEND_URL}`, () => {
  test('von einer Klasse in eine andere', { tag: [DEV, STAGE] }, async ({ page, asLandesadmin }) => {
    const { userInfoSchueler, rolleName, klasseNameCurrent, klasseNameNew } =
      await test.step('Schüler, aktuelle Klasse und Zielklasse anlegen', async () => {
        const rolleName: string = generateRolleName();
        const klasseNameCurrent: string = generateKlassenname();
        const klasseNameNew: string = generateKlassenname();
        const idSchule: string = await getOrganisationId(page, testschuleName);
        const klasseIdCurrent: string = await createKlasse(page, idSchule, klasseNameCurrent);
        const userInfoSchueler: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: testschuleName,
          rollenArt: typeSchueler,
          rollenName: rolleName,
          serviceProviderNames: [itslearning],
          klasseId: klasseIdCurrent,
        });
        await createKlasse(page, idSchule, klasseNameNew);
        return { userInfoSchueler, rolleName, klasseNameCurrent, klasseNameNew };
      });
    const personDetailsView: PersonDetailsViewPage = await test.step('Gesamtübersicht Schüler öffnen', async () => {
      return asLandesadmin.personManagementViewPage.searchAndOpenGesamtuebersicht(userInfoSchueler.username);
    });

    await test.step('Schüler in neue Klasse versetzen', async () => {
      const zuordnungenPage: ZuordnungenPage = new ZuordnungenPage(page);
      await zuordnungenPage.changeKlasse(testschuleDstNr, testschuleName, rolleName, klasseNameCurrent, klasseNameNew);
    });

    await test.step('Prüfen, dass Schüler in neuer Klasse zugeordnet ist', async () => {
      await personDetailsView.checkZuordnungExists({
        dstNr: testschuleDstNr,
        organisation: testschuleName,
        rolle: rolleName,
        klasse: klasseNameNew,
      });
    });
  });
});
