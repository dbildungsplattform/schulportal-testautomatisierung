import { faker } from '@faker-js/faker/locale/de';
import { addDays, addMonths, format } from 'date-fns';
import { CharacterSetType, generateRandomString } from 'ts-randomstring/lib/index.js';

// Marks generated data as test data. Ownership is tracked by ID (see testDataLedger.ts), not by name.
const testDataPrefix: string = 'TAuto-PW-';

function randomSuffix(): string {
  return generateRandomString({ length: 5, charSetType: CharacterSetType.Alphabetic });
}

export function generateVorname(): string {
  return `${testDataPrefix}V` + faker.person.firstName() + randomSuffix();
}

export function generateNachname(): string {
  return `${testDataPrefix}N` + faker.person.lastName() + randomSuffix();
}

export function generateRolleName(): string {
  return `${testDataPrefix}R-` + faker.lorem.word({ length: { min: 7, max: 7 } }) + randomSuffix();
}

export function generateKopersNr(): string {
  return '0815' + faker.string.numeric({ length: 8 });
}

export function generateKlassenname(): string {
  return `${testDataPrefix}K-` + faker.lorem.word({ length: { min: 8, max: 8 } }) + randomSuffix();
}

export function generateSchulname(): string {
  return `${testDataPrefix}S-` + faker.lorem.word({ length: { min: 8, max: 8 } }) + randomSuffix();
}

export function generateEmailAdress(): string {
  const [localPart, domain]: string[] = faker.internet.email().split('@');
  return `${testDataPrefix}E-${localPart}@${domain}${randomSuffix()}`;
}

export function generateDienststellenNr(): string {
  return '0' + faker.number.bigInt({ min: 10000000, max: 100000000 });
}

export function generateAngebotname(): string {
  return `${testDataPrefix}A-` + faker.lorem.word({ length: { min: 8, max: 8 } }) + randomSuffix();
}

export function generateCurrentDate({ days, months }: { days: number; months: number }): Date {
  const newDate: Date = addDays(addMonths(new Date(), months), days);
  return newDate;
}

export function formatDateDMY(date: Date): string {
  return format(date, 'dd.MM.yyyy');
}
