import { RollenSystemRechtEnum } from './api/generated/models/RollenSystemRechtEnum';
import { RollenArt } from './api/rolleApi';
import { landSH, testschule665Name, testschuleName } from './organisation';

export const schuelerRolle: string = 'itslearning-Schüler';
export const landesadminRolle: string = 'Landesadministrator';
export const schuladminOeffentlichRolle: string = 'Schuladministrator öffentlich';
export const lehrkraftOeffentlichRolle: string = 'Lehrkraft';
export const lehrerImVorbereitungsdienstRolle: string = 'LiV';
export const ersatzschulLehrkraftRolle: string = 'Ersatzschullehrkraft';
export const vertretungslehrkraftRolle: string = 'Vertretungslehrkraft';
export const religionsLehrkraftRolle: string = 'Ev./Kat. Religionslehrkraft';

export interface RolleCase {
  name: string;
  permissions: RollenSystemRechtEnum[];
  organisations: string[];
  rollenArt: RollenArt;
}

/**
 * Defines different roles with corresponding system rights (permissions)
 * for testing purposes.
 *
 * Each role specifies:
 * - `name`: Human-readable role description.
 * - `permissions`: Array of system rights assigned to that role.
 * - `organisations`: Organisations to assign to the test user (first is primary).
 *
 * These roles are used in tests to check:
 * - Visibility of menu items based on system rights.
 * - Navigation functionality for different permission sets.
 */
export const ROLLEN_CASES: RolleCase[] = [
  {
    name: 'Rolle mit allen Systemrechte',
    permissions: [
      'PERSONEN_VERWALTEN',
      'PERSONEN_ANLEGEN',
      'IMPORT_DURCHFUEHREN',
      'KLASSEN_VERWALTEN',
      'ROLLEN_VERWALTEN',
      'SCHULEN_VERWALTEN',
      'LANDESBEDIENSTETE_SUCHEN_UND_HINZUFUEGEN',
      'EINGESCHRAENKT_NEUE_BENUTZER_ERSTELLEN',
      'SCHULTRAEGER_VERWALTEN',
      'SCHULPORTAL_VERWALTEN',
      'HINWEISE_BEARBEITEN',
      'ROLLEN_ERWEITERN',
      'ANGEBOTE_VERWALTEN',
      'ANGEBOTE_EINGESCHRAENKT_VERWALTEN',
    ],
    organisations: [landSH],
    rollenArt: RollenArt.Sysadmin,
  },
  {
    name: 'Rolle mit PERSONEN_VERWALTEN',
    permissions: ['PERSONEN_VERWALTEN'],
    organisations: [testschuleName, testschule665Name],
    rollenArt: RollenArt.Leit,
  },
  {
    name: 'Rolle mit PERSONEN_VERWALTEN + KLASSEN_VERWALTEN',
    permissions: ['PERSONEN_VERWALTEN', 'KLASSEN_VERWALTEN'],
    organisations: [testschuleName, testschule665Name],
    rollenArt: RollenArt.Leit,
  },
];
