import { Page } from '@playwright/test';
import { createKlasse, getKlasseId } from '../../base/api/organisationApi';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { typeSchueler } from '../../base/rollentypen';
import { createMany } from '../../base/utils/concurrency';
import { generateKlassenname } from '../../base/utils/generateTestdata';
import { SchuleCreationParams } from '../../pages/admin/organisationen/schulen/SchuleCreationView.page';

export interface KlassenAndSchuelerData {
  klassenNamenSchule: string[];
  schuelerSchule: UserInfo[];
}

interface Klassen {
  id: string;
  klassenCount: number;
}

interface Schueler {
  schuleName: string;
  klassenName: string;
  count: number;
}

interface Schule {
  params: SchuleCreationParams;
  schuleId: string;
  klassenCount: number;
  schuelerCount: number;
}

export async function createKlassenAndSchuelerForSchulen(
  page: Page,
  schulen: Schule[],
): Promise<KlassenAndSchuelerData[]> {
  return Promise.all(
    schulen.map(async (schule: Schule): Promise<KlassenAndSchuelerData> => {
      const klassenNamenSchule: string[] = await createKlassenForSchule(page, {
        id: schule.schuleId,
        klassenCount: schule.klassenCount,
      });
      const schuelerSchule: UserInfo[] = await createSchuelerForSchule(page, {
        schuleName: schule.params.name,
        klassenName: klassenNamenSchule[0],
        count: schule.schuelerCount,
      });
      return { klassenNamenSchule, schuelerSchule };
    }),
  );
}

/**
 * Erstellt Klassen für eine Schule
 */
async function createKlassenForSchule(page: Page, klasse: Klassen): Promise<string[]> {
  return createMany(klasse.klassenCount, async () => {
    const klassenname: string = generateKlassenname();
    await createKlasse(page, klasse.id, klassenname);
    return klassenname;
  });
}

/**
 * Erstellt Schüler für eine Schule und ordnet sie einer Klasse zu
 */
async function createSchuelerForSchule(page: Page, schueler: Schueler): Promise<UserInfo[]> {
  return createMany(schueler.count, async () => {
    const klasseId: string | undefined = await getKlasseId(page, schueler.klassenName);

    return createRolleAndPersonWithPersonenkontext(page, {
      organisationName: schueler.schuleName,
      rollenArt: typeSchueler,
      klasseId,
    });
  });
}
