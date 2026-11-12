import { test, TestSchuleMitDstNrUndEmail } from '../../base/fixtures';
import { DEV, STAGE } from '../../base/tags';
import { generateEmailAddress, generateSchulname } from '../../base/utils/generateTestdata';
import { SchuleDetails, SchuleDetailsViewPage } from '../../pages/admin/organisationen/schulen/SchuleDetailsView.page';
import { SchuleEditSuccessPage } from '../../pages/admin/organisationen/schulen/SchuleEditSuccess.page';
import { SchuleManagementViewPage } from '../../pages/admin/organisationen/schulen/SchuleManagementView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';

test(
  'Schule bearbeiten als Landesadmin',
  { tag: [DEV, STAGE] },
  async ({ asLandesadmin, testSchuleMitDstNrUndEmail }) => {
    const personManagementViewPage: PersonManagementViewPage = asLandesadmin.personManagementViewPage;
    const schule: TestSchuleMitDstNrUndEmail = testSchuleMitDstNrUndEmail;
    const firstUpdate: SchuleDetails = {
      name: generateSchulname(),
      dstNr: schule.dstNr,
      emailAddress: generateEmailAddress(),
    };
    const secondUpdate: SchuleDetails = {
      ...firstUpdate,
      name: generateSchulname(),
    };

    const detailsViewPage: SchuleDetailsViewPage = await test.step('Gesamtübersicht der Schule öffnen', async () => {
      const managementViewPage: SchuleManagementViewPage = await personManagementViewPage
        .getMenu()
        .navigateToSchuleManagement();
      return managementViewPage.searchAndOpenGesamtuebersicht(schule.name);
    });

    await test.step('Gesamtübersicht prüfen', async () => {
      await detailsViewPage.assertSchuleDetails(schule);
    });

    const updatedDetailsViewPage = await test.step('Schuldaten bearbeiten und speichern', async () => {
      const editViewPage = await detailsViewPage.openEdit();
      const successPage: SchuleEditSuccessPage = await editViewPage.editSchule(
        firstUpdate.name,
        firstUpdate.emailAddress,
      );
      await successPage.assertSuccessfulUpdate(firstUpdate);
      const updatedDetailsPage = await successPage.goBackToSchule();
      await updatedDetailsPage.assertSchuleDetails(firstUpdate);
      return updatedDetailsPage;
    });

    const schuleManagementViewPage: SchuleManagementViewPage =
      await test.step('Schulname erneut bearbeiten und zur Schulliste zurückkehren', async () => {
        const editViewPage = await updatedDetailsViewPage.openEdit();
        const successPage: SchuleEditSuccessPage = await editViewPage.editSchule(secondUpdate.name);
        await successPage.assertSuccessfulUpdate(secondUpdate);
        const managementViewPage = await successPage.goBackToList();
        await managementViewPage.searchByText(secondUpdate.name);
        await managementViewPage.checkIfSchuleExists(secondUpdate.name);
        return managementViewPage;
      });

    await test.step('Gesamtübersicht schließen', async () => {
      const detailsPage = await schuleManagementViewPage.searchAndOpenGesamtuebersicht(secondUpdate.name);
      const managementViewPage = await detailsPage.close();
      await managementViewPage.searchByText(secondUpdate.name);
      await managementViewPage.checkIfSchuleExists(secondUpdate.name);
    });
  },
);
