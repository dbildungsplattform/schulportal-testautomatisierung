import { expect, Page } from '@playwright/test';
import { HeaderPage } from '../../pages/components/Header.page';
import FromAnywhere from '../../pages/FromAnywhere';
import { LoginViewPage } from '../../pages/LoginView.page';
import { befristungPflicht } from '../merkmale';
import { testschuleName } from '../organisation';
import { adressbuch, email, kalender } from '../sp';
import {
  generateCurrentDate,
  generateKopersNr,
  generateNachname,
  generateRolleName,
  generateVorname,
} from '../utils/generateTestdata';
import { constructApi } from './apiFactory';
import { Class2FAApi } from './generated';
import { DbiamPersonenuebersichtApi } from './generated/apis/DbiamPersonenuebersichtApi';
import {
  PersonControllerDeletePersonByIdRequest,
  PersonControllerLockPersonRequest,
  PersonControllerResetUEMPasswordByPersonIdRequest,
  PersonenApi,
} from './generated/apis/PersonenApi';
import { PersonenFrontendApi, PersonFrontendControllerFindPersonsRequest } from './generated/apis/PersonenFrontendApi';
import {
  DbiamPersonenkontextWorkflowControllerCreatePersonWithPersonenkontexteRequest,
  PersonenkontextApi,
} from './generated/apis/PersonenkontextApi';
import {
  DbiamCreatePersonWithPersonenkontexteBodyParams,
  DBiamPersonenuebersichtResponse,
  DBiamPersonResponse,
  DbiamUpdatePersonenkontexteBodyParams,
  LockUserBodyParams,
  PersonendatensatzResponse,
  PersonenkontexteUpdateResponse,
  PersonFrontendControllerFindPersons200Response,
  PersonLockResponse,
  RollenArt,
  RollenMerkmal,
  RollenSystemRechtEnum
} from './generated/models';
import { ApiResponse } from './generated/runtime';
import { getOrganisationId } from './organisationApi';
import { createRolle, getRolleId } from './rolleApi';
import { getServiceProviderIdsMappedByName } from './serviceProviderApi';

export interface UserInfo {
  username: string;
  password: string;
  rolleId: string;
  organisationId: string;
  personId: string;
  vorname: string;
  nachname: string;
  kopersnummer: string;
}

export function constructPersonenkontextApi(page: Page): PersonenkontextApi {
  return constructApi(page, PersonenkontextApi);
}

export function constructPersonenApi(page: Page): PersonenApi {
  return constructApi(page, PersonenApi);
}

export function constructPersonenFrontendApi(page: Page): PersonenFrontendApi {
  return constructApi(page, PersonenFrontendApi);
}

export function construct2FAApi(page: Page): Class2FAApi {
  return constructApi(page, Class2FAApi);
}

export function constructPersonenuebersichtApi(page: Page): DbiamPersonenuebersichtApi {
  return constructApi(page, DbiamPersonenuebersichtApi);
}

function toUserInfo(createdPerson: DBiamPersonResponse): UserInfo {
  const primaryPersonenkontext = createdPerson.dBiamPersonenkontextResponses[0];
  if (!primaryPersonenkontext) {
    throw new Error('Created person is missing personenkontext response.');
  }

  return {
    username: createdPerson.person.username!,
    password: createdPerson.person.startpasswort,
    rolleId: primaryPersonenkontext.rolleId,
    organisationId: primaryPersonenkontext.organisationId,
    personId: createdPerson.person.id,
    vorname: createdPerson.person.name.vorname,
    nachname: createdPerson.person.name.familienname,
    kopersnummer: createdPerson.person.personalnummer ?? '',
  };
}

async function commitPersonenkontexteWithRetry(
  page: Page,
  personId: string,
  buildPersonenkontexte: (
    personenuebersicht: DBiamPersonenuebersichtResponse,
  ) => DbiamUpdatePersonenkontexteBodyParams['personenkontexte'] | null,
  validate?: (result: PersonenkontexteUpdateResponse) => void,
): Promise<void> {
  const personenuebersichtApi: DbiamPersonenuebersichtApi = constructPersonenuebersichtApi(page);
  const personenkontextApi: PersonenkontextApi = constructPersonenkontextApi(page);

  for (let attempt: number = 0; attempt < 3; attempt++) {
    const personenuebersicht: DBiamPersonenuebersichtResponse = await personenuebersichtApi
      .dBiamPersonenuebersichtControllerFindPersonenuebersichtenByPersonRaw({ personId })
      .then((response) => response.value());

    const personenkontexte: DbiamUpdatePersonenkontexteBodyParams['personenkontexte'] | null =
      buildPersonenkontexte(personenuebersicht);
    if (personenkontexte === null) {
      continue;
    }

    const dbiamUpdatePersonenkontexteBodyParams: DbiamUpdatePersonenkontexteBodyParams = {
      lastModified: personenuebersicht.lastModifiedZuordnungen ?? undefined,
      count: personenuebersicht.zuordnungen.length,
      personenkontexte,
    };

    try {
      const response: ApiResponse<PersonenkontexteUpdateResponse> =
        await personenkontextApi.dbiamPersonenkontextWorkflowControllerCommitRaw({
          personId,
          dbiamUpdatePersonenkontexteBodyParams,
        });
      expect(response.raw.status).toBe(200);
      validate?.(await response.value());
      return;
    } catch (error) {
      const statusCode: number | undefined = (error as { response?: { status?: number } }).response?.status;
      if (statusCode === 400 && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Unable to commit personenkontexte for person ${personId} after 3 attempts because required source data was not available.`,
  );
}

export async function freshLoginPage(page: Page): Promise<LoginViewPage> {
  return (await FromAnywhere(page).start()).navigateToLogin();
}

interface CreatePersonParams {
  organisationId: string;
  rolleId: string;
  familienname?: string;
  vorname?: string;
  koPersNr?: string;
  klasseId?: string;
  merkmalNames?: Set<RollenMerkmal>;
  secondaryRolleId?: string;
}

export async function createPerson(page: Page, params: CreatePersonParams): Promise<UserInfo> {
  try {
    const { organisationId, rolleId, familienname, vorname, koPersNr, klasseId, merkmalNames, secondaryRolleId } =
      params;

    const createPersonBodyParams: DbiamCreatePersonWithPersonenkontexteBodyParams = {
      familienname: familienname || generateNachname(),
      vorname: vorname || generateVorname(),
      createPersonenkontexte: [
        {
          organisationId: organisationId,
          rolleId: rolleId,
        },
      ],
    };

    if (klasseId) {
      createPersonBodyParams.createPersonenkontexte.push({
        organisationId: klasseId,
        rolleId: rolleId,
      });
    }

    if (secondaryRolleId) {
      createPersonBodyParams.createPersonenkontexte.push({
        organisationId: organisationId,
        rolleId: secondaryRolleId,
      });
      if (klasseId) {
        createPersonBodyParams.createPersonenkontexte.push({
          organisationId: klasseId,
          rolleId: secondaryRolleId,
        });
      }
    }

    if (koPersNr) {
      createPersonBodyParams.personalnummer = koPersNr;
    }

    if (merkmalNames) {
      for (const merkmal of merkmalNames) {
        if (merkmal == befristungPflicht) {
          createPersonBodyParams.befristung = generateCurrentDate({ days: 0, months: 6 });
        }
      }
    }

    const requestParameters: DbiamPersonenkontextWorkflowControllerCreatePersonWithPersonenkontexteRequest = {
      dbiamCreatePersonWithPersonenkontexteBodyParams: createPersonBodyParams,
    };

    const personenkontextApi: PersonenkontextApi = constructPersonenkontextApi(page);
    const response: ApiResponse<DBiamPersonResponse> =
      await personenkontextApi.dbiamPersonenkontextWorkflowControllerCreatePersonWithPersonenkontexteRaw(
        requestParameters,
      );
    expect(response.raw.status).toBe(201);
    const createdPerson: DBiamPersonResponse = await response.value();

    return toUserInfo(createdPerson);
  } catch (error) {
    console.error('[ERROR] createPerson failed:', error);
    throw error;
  }
}

export async function createUserWithLernRollenInDifferentKlassen(
  page: Page,
  schuleId: string,
  primaryRolleId: string,
  secondaryRolleId: string,
  primaryKlasseId: string,
  secondaryKlasseId: string,
): Promise<UserInfo> {
  try {
    const personenkontextApi: PersonenkontextApi = constructPersonenkontextApi(page);
    const response: ApiResponse<DBiamPersonResponse> =
      await personenkontextApi.dbiamPersonenkontextWorkflowControllerCreatePersonWithPersonenkontexteRaw({
        dbiamCreatePersonWithPersonenkontexteBodyParams: {
          familienname: generateNachname(),
          vorname: generateVorname(),
          createPersonenkontexte: [
            { organisationId: schuleId, rolleId: primaryRolleId },
            { organisationId: primaryKlasseId, rolleId: primaryRolleId },
            { organisationId: schuleId, rolleId: secondaryRolleId },
            { organisationId: secondaryKlasseId, rolleId: secondaryRolleId },
          ],
        },
      });
    expect(response.raw.status).toBe(201);
    const createdPerson: DBiamPersonResponse = await response.value();

    return toUserInfo(createdPerson);
  } catch (error) {
    console.error('[ERROR] createUserWithLernRollenInDifferentKlassen failed:', error);
    throw error;
  }
}

export async function createPersonWithPersonenkontext(
  page: Page,
  organisationName: string,
  rolleName: string,
  vorname?: string,
  familienname?: string,
  koPersNr?: string,
): Promise<UserInfo> {
  // Organisation wird nicht angelegt, da diese zur Zeit nicht gelöscht werden kann
  const organisationId: string = await getOrganisationId(page, organisationName);
  const rolleId: string = await getRolleId(page, rolleName);
  const userInfo: UserInfo = await createPerson(page, {
    organisationId,
    rolleId,
    familienname,
    vorname,
    koPersNr,
  });
  return userInfo;
}

interface CreateRolleAndPersonWithPersonenkontextParams {
  organisationName: string;
  rollenArt: RollenArt;
  serviceProviderNames?: string[];
  rollenName?: string;
  familienname?: string;
  vorname?: string;
  klasseId?: string;
  koPersNr?: string;
  rollenMerkmalNamen?: Set<RollenMerkmal>;
  systemrechte?: Set<RollenSystemRechtEnum>;
}
export async function createRolleAndPersonWithPersonenkontext(
  page: Page,
  params: CreateRolleAndPersonWithPersonenkontextParams,
): Promise<UserInfo> {
  // Organisation wird nicht angelegt, da diese zur Zeit nicht gelöscht werden kann
  const organisationId: string = await getOrganisationId(page, params.organisationName);

  let serviceProviderIds = new Set<string>();
  if (params.serviceProviderNames && params.serviceProviderNames.length > 0) {
    const serviceProviderByNameMap: Map<string, string> = await getServiceProviderIdsMappedByName(
      page,
      params.serviceProviderNames,
      organisationId,
    );

    const missingServiceProviderNames: string[] = params.serviceProviderNames.filter(
      (name: string) => !serviceProviderByNameMap.has(name),
    );
    if (missingServiceProviderNames.length > 0) {
      throw new Error(
        `The following service providers were not found in the organization ${params.organisationName}: ${missingServiceProviderNames.join(
          ', ',
        )}`,
      );
    }

    serviceProviderIds = new Set(serviceProviderByNameMap.values());
  }

  const rolleId: string = await createRolle(
    page,
    params.rollenArt,
    organisationId,
    params.rollenName ?? generateRolleName(),
    params.rollenMerkmalNamen,
    params.systemrechte,
    serviceProviderIds,
  );

  const userInfo: UserInfo = await createPerson(page, {
    organisationId,
    rolleId,
    familienname: params.familienname,
    vorname: params.vorname,
    koPersNr: params.koPersNr,
    klasseId: params.klasseId,
    merkmalNames: params.rollenMerkmalNamen,
  });
  return userInfo;
}

export async function removeAllPersonenkontexte(page: Page, personId: string): Promise<void> {
  try {
    await commitPersonenkontexteWithRetry(page, personId, () => []);
  } catch (error) {
    console.error('[ERROR] removeAllPersonenkontexte failed:', error);
    throw error;
  }
}

export async function lockPerson(page: Page, personId: string, organisationId: string): Promise<void> {
  try {
    const lockUserBodyParams: LockUserBodyParams = {
      lock: true,
      lockedBy: organisationId,
      lockedUntil: generateCurrentDate({ days: 30, months: 0 }),
    };

    const requestParameters: PersonControllerLockPersonRequest = {
      personId: personId,
      lockUserBodyParams,
    };

    const personenApi: PersonenApi = constructPersonenApi(page);
    const response: ApiResponse<PersonLockResponse> =
      await personenApi.personControllerLockPersonRaw(requestParameters);
    expect(response.raw.status).toBe(202);

    const lockMessage: PersonLockResponse = await response.value();
    expect(lockMessage.message).toBe('User has been successfully locked.');
  } catch (error) {
    console.error('[ERROR] lockPerson failed:', error);
    throw error;
  }
}

export async function addOrganisationenToPerson(
  page: Page,
  personId: string,
  organisationIds: string[],
  rolleId: string,
): Promise<void> {
  try {
    await commitPersonenkontexteWithRetry(
      page,
      personId,
      (personenuebersicht) => {
        if (personenuebersicht.zuordnungen.length === 0) {
          return null;
        }
        return organisationIds.map((organisationId) => ({
          personId,
          organisationId,
          rolleId,
        }));
      },
      (result) => {
        expect(result.dBiamPersonenkontextResponses.length).toBe(organisationIds.length);
      },
    );
  } catch (error) {
    console.error('[ERROR] addOrganisationenToPerson failed:', error);
    throw error;
  }
}

export async function deletePerson(page: Page, personId: string): Promise<void> {
  try {
    const requestParameters: PersonControllerDeletePersonByIdRequest = {
      personId,
    };

    const personenApi: PersonenApi = constructPersonenApi(page);
    const response: ApiResponse<void> = await personenApi.personControllerDeletePersonByIdRaw(requestParameters);
    expect(response.raw.status).toBe(204);
  } catch (error) {
    console.error('[ERROR] deletePerson failed:', error);
    throw error;
  }
}

export async function getPersonId(page: Page, searchString: string): Promise<string> {
  try {
    const requestParameters: PersonFrontendControllerFindPersonsRequest = {
      suchFilter: searchString,
      limit: 1,
    };

    const personenFrontendApi: PersonenFrontendApi = constructPersonenFrontendApi(page);
    const response: ApiResponse<PersonFrontendControllerFindPersons200Response> =
      await personenFrontendApi.personFrontendControllerFindPersonsRaw(requestParameters);
    expect(response.raw.status).toBe(200);

    const fetchedPersonen: PersonFrontendControllerFindPersons200Response = await response.value();
    return fetchedPersonen.items[0].person.id;
  } catch (error) {
    console.error('[ERROR] getPersonId failed:', error);
    throw error;
  }
}

export async function createTeacherAndLogin(page: Page): Promise<UserInfo> {
  const header: HeaderPage = new HeaderPage(page);
  const userInfo: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
    organisationName: testschuleName,
    rollenArt: RollenArt.Lehr,
    serviceProviderNames: [email, kalender, adressbuch],
    koPersNr: generateKopersNr(),
  });

  await header.logout();
  const loginPage = await header.navigateToLogin();
  await loginPage.login(userInfo.username, userInfo.password);
  await loginPage.updatePassword();
  await header.checkIfIconsAreVisible();
  return userInfo;
}

/**
 * Sets the Inbetriebnahme-Passwort (device password) for a person in LDAP.
 * @param page
 * @param personId
 */
export async function setInbetriebnahmePasswort(page: Page, personId: string): Promise<string> {
  try {
    const requestParameters: PersonControllerResetUEMPasswordByPersonIdRequest = {
      personId,
    };

    const personenApi: PersonenApi = constructPersonenApi(page);
    const response: ApiResponse<string> =
      await personenApi.personControllerResetUEMPasswordByPersonIdRaw(requestParameters);
    expect(response.raw.status).toBe(202);

    const newPassword: string = await response.value();
    return newPassword;
  } catch (error) {
    console.error('[ERROR] setInbetriebnahmePasswort failed:', error);
    throw error;
  }
}

export async function setTimeLimitPersonenkontext(
  page: Page,
  personId: string,
  organisationId: string,
  rolleId: string,
  timeLimit: Date,
): Promise<void> {
  try {
    await commitPersonenkontexteWithRetry(page, personId, (personenuebersicht) =>
      personenuebersicht.zuordnungen.map((zuordnung) => ({
        personId,
        organisationId: zuordnung.sskId,
        rolleId: zuordnung.rolleId,
        befristung:
          zuordnung.sskId === organisationId && zuordnung.rolleId === rolleId
            ? timeLimit
            : (zuordnung.befristung ?? undefined),
      })),
    );
  } catch (error) {
    console.error('[ERROR] setTimeLimitPersonenkontext failed:', error);
    throw error;
  }
}

export async function getEmailByPersonId(page: Page, id: string): Promise<string | undefined> {
  const personenApi: PersonenApi = constructPersonenApi(page);
  const personendatensatzResponse: ApiResponse<PersonendatensatzResponse> =
    await personenApi.personControllerFindPersonByIdRaw({ personId: id });
  expect(personendatensatzResponse.raw.status).toBe(200);
  const personendatensatz: PersonendatensatzResponse = await personendatensatzResponse.value();
  return personendatensatz.person.email?.address;
}

export async function waitForEmailByPersonId(
  page: Page,
  id: string,
  maxAttempts: number = 10,
  delayMs: number = 2000,
): Promise<string> {
  for (let attempt: number = 1; attempt <= maxAttempts; attempt++) {
    const email: string | undefined = await getEmailByPersonId(page, id);
    if (email && email.trim() !== '') {
      return email;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `No email address available for personId ${id} after ${maxAttempts} attempts (${delayMs}ms interval).`,
  );
}
