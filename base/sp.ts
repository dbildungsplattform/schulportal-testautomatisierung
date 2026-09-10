import { ServiceProviderKategorie } from './api/generated';

export const email: string = 'E-Mail';
export const itslearning: string = 'itslearning';
export const kalender: string = 'Kalender';
export const adressbuch: string = 'Adressbuch';
export const schulportaladmin: string = 'Schulportal-Administration';
export const opSH: string = 'OP.SH';
export const schoolSH: string = 'School-SH';
export const webUntis: string = 'WebUntis';
export const anleitungen: string = 'Anleitungen';
export const helpdeskKontaktieren: string = 'Helpdesk kontaktieren';
export const psychosozialesBeratungsangebot: string = 'Psychosoziales Beratungsangebot';
export const schulrechtAZ: string = 'Schulrecht A-Z';
export const firmenfitness: string = 'Firmenfitness Angebot';
export const uem: string = 'LK-Endgeräte';

export const KATEGORIE_LABEL: Record<ServiceProviderKategorie, string> = {
  EMAIL: 'Dienstliche Email',
  UNTERRICHT: 'Unterricht',
  VERWALTUNG: 'Verwaltung',
  SCHULISCH: 'Schulische Angebote',
  HINWEISE: 'Hinweise',
};
