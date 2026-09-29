import { faker } from '@faker-js/faker/locale/de';
import { addDays, addMonths, format } from 'date-fns';
import { CharacterSetType, generateRandomString } from 'ts-randomstring/lib/index.js';

const shardIndex = process.env.SHARD_INDEX ?? '0';
const shardLetter = String.fromCharCode(65 + parseInt(shardIndex, 10));

export function generateVorname(): string {
  return (
    `TAuto-PW-S${shardLetter}-V` +
    faker.person.firstName() +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateNachname(): string {
  return (
    `TAuto-PW-S${shardLetter}-N` +
    faker.person.lastName() +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateRolleName(): string {
  return (
    `TAuto-PW-S${shardIndex}-R-` +
    faker.lorem.word({ length: { min: 7, max: 7 } }) +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateKopersNr(): string {
  return '0815' + faker.string.numeric({ length: 8 });
}

export function generateKlassenname(): string {
  return (
    `TAuto-PW-S${shardIndex}-K-` +
    faker.lorem.word({ length: { min: 8, max: 8 } }) +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateSchulname(): string {
  return (
    `TAuto-PW-S${shardIndex}-S-` +
    faker.lorem.word({ length: { min: 8, max: 8 } }) +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateEmailAdress(): string {
  return (
    `TAuto-PW-S${shardIndex}-E-` +
    faker.internet.email() +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateDienststellenNr(): string {
  return '0' + faker.number.bigInt({ min: 10000000, max: 100000000 });
}

export function generateAngebotname(): string {
  return (
    `TAuto-PW-S${shardIndex}-A-` +
    faker.lorem.word({ length: { min: 8, max: 8 } }) +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateCurrentDate({ days, months }: { days: number; months: number }): Date {
  const newDate: Date = addDays(addMonths(new Date(), months), days);
  return newDate;
}

export function formatDateDMY(date: Date): string {
  return format(date, 'dd.MM.yyyy');
}
