import { OrganisationsTyp, RollenArt } from '../../base/api/generated';
import {
  email,
  firmenfitness,
  itslearning,
  kalender,
  adressbuch,
  schulportaladmin,
  opSH,
  schoolSH,
  webUntis,
  anleitungen,
  helpdeskKontaktieren,
  psychosozialesBeratungsangebot,
  schulrechtAZ,
} from '../../base/sp';

interface TestFixture {
  rollenArt: RollenArt;
  organisationsTyp: OrganisationsTyp;
  serviceProviderNames: string[];
}

export const testFixtures: TestFixture[] = [
  {
    rollenArt: RollenArt.Lehr,
    organisationsTyp: OrganisationsTyp.Schule,
    serviceProviderNames: [
      email,
      firmenfitness,
      itslearning,
      kalender,
      adressbuch,
      opSH,
      schoolSH,
      webUntis,
      anleitungen,
      helpdeskKontaktieren,
      psychosozialesBeratungsangebot,
      schulrechtAZ,
    ],
  },
  {
    rollenArt: RollenArt.Lern,
    organisationsTyp: OrganisationsTyp.Schule,
    serviceProviderNames: [itslearning, webUntis],
  },
  {
    rollenArt: RollenArt.Leit,
    organisationsTyp: OrganisationsTyp.Schule,
    serviceProviderNames: [
      schulportaladmin,
      anleitungen,
      helpdeskKontaktieren,
      psychosozialesBeratungsangebot,
      schulrechtAZ,
    ],
  },
  {
    rollenArt: RollenArt.Orgadmin,
    organisationsTyp: OrganisationsTyp.Traeger,
    serviceProviderNames: [schulportaladmin, anleitungen, helpdeskKontaktieren],
  },
  {
    rollenArt: RollenArt.Sysadmin,
    organisationsTyp: OrganisationsTyp.Land,
    serviceProviderNames: [
      schulportaladmin,
      anleitungen,
      helpdeskKontaktieren,
      psychosozialesBeratungsangebot,
      schulrechtAZ,
    ],
  },
];
