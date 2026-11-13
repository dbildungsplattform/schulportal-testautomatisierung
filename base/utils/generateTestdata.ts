import { faker } from '@faker-js/faker/locale/de';
import { addDays, addMonths, format } from 'date-fns';
import { createHash, randomUUID } from 'node:crypto';
import { CharacterSetType, generateRandomString } from 'ts-randomstring/lib/index.js';

export function initializeTestRunId(): void {
  process.env.TEST_RUN_ID ??= randomUUID();
  console.log(`TEST_RUN_ID: ${getTestDataPrefix()}`);
}

export function getTestDataPrefix(): string {
  const runId: string | undefined = process.env.TEST_RUN_ID;
  if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) {
    throw new Error('TEST_RUN_ID must be initialized and contain only letters, digits, underscores, and hyphens.');
  }

  const shardIndex: string = process.env.SHARD_INDEX ?? '0';
  if (!/^(0|[1-9]\d*)$/.test(shardIndex) || !Number.isSafeInteger(Number(shardIndex))) {
    throw new Error('SHARD_INDEX must be a non-negative safe integer without leading zeros.');
  }

  // Keep 80 bits of the run hash, encoded as letters for Personen names.
  const runToken: string = encodeHexAsLetters(createHash('sha256').update(runId).digest('hex').slice(0, 20));
  const shardToken: string = encodeHexAsLetters(shardIndex);
  return `TAuto-PW-${runToken}-S${shardToken}-`;
}

function encodeHexAsLetters(value: string): string {
  return value.replace(/[0-9a-f]/g, (character: string): string => String.fromCharCode(65 + parseInt(character, 16)));
}

export function generateVorname(): string {
  return (
    `${getTestDataPrefix()}V` +
    faker.person.firstName() +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateNachname(): string {
  return (
    `${getTestDataPrefix()}N` +
    faker.person.lastName() +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateRolleName(): string {
  return (
    `${getTestDataPrefix()}R-` +
    faker.lorem.word({ length: { min: 7, max: 7 } }) +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateKopersNr(): string {
  return '0815' + faker.string.numeric({ length: 8 });
}

export function generateKlassenname(): string {
  return (
    `${getTestDataPrefix()}K-` +
    faker.lorem.word({ length: { min: 8, max: 8 } }) +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateSchulname(): string {
  return (
    `${getTestDataPrefix()}S-` +
    faker.lorem.word({ length: { min: 8, max: 8 } }) +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

export function generateEmailAdress(): string {
  const prefix: string = `${getTestDataPrefix()}E-`;
  const [localPart, domain]: string[] = faker.internet.email().split('@');
  const suffix: string = generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic });
  return `${prefix}${localPart.slice(0, 64 - prefix.length)}@${domain}${suffix}`;
}

export function generateDienststellenNr(): string {
  return '0' + faker.number.bigInt({ min: 10000000, max: 100000000 });
}

export function generateAngebotname(): string {
  return (
    `${getTestDataPrefix()}A-` +
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
