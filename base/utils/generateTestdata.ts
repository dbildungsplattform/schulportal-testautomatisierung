import { faker } from '@faker-js/faker/locale/de';
import { addDays, addMonths, format } from 'date-fns';
import { createHash, randomUUID } from 'node:crypto';
import { CharacterSetType, generateRandomString } from 'ts-randomstring/lib/index.js';

export function initializeTestRunId(): void {
  process.env.TEST_RUN_ID ??= randomUUID();
  // The config is loaded by the runner and by every worker; log only once per run.
  if (process.env.TEST_WORKER_INDEX === undefined) {
    console.log(`TEST_RUN_ID: ${process.env.TEST_RUN_ID}`);
    console.log(`Test data prefix: ${getTestDataPrefix()}`);
  }
}

const namespaceTokenLength: number = 6;

// The token only has to separate runs (and shards) that are active against the same environment
// at the same time; 26^6 values keep collisions unlikely while keeping names short (the person
// details view truncates Schulnamen after 30 characters, privacyIDEA limits usernames to 40).
export function getTestDataPrefix(): string {
  const hash: string = createHash('sha256').update(getTestRunId()).digest('hex');
  return `TAuto-PW-${encodeAsLetters(Number.parseInt(hash.slice(0, 12), 16), namespaceTokenLength)}-`;
}

function getTestRunId(): string {
  const runId: string | undefined = process.env.TEST_RUN_ID;
  if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) {
    throw new Error('TEST_RUN_ID must be initialized and contain only letters, digits, underscores, and hyphens.');
  }
  return runId;
}

// Letters only, because the backend derives usernames from the ASCII letters of the name.
function encodeAsLetters(value: number, length: number): string {
  let letters: string = '';
  let remaining: number = value;
  for (let index = 0; index < length; index++) {
    letters = String.fromCodePoint(65 + (remaining % 26)) + letters;
    remaining = Math.floor(remaining / 26);
  }
  return letters;
}

export function generateVorname(): string {
  return (
    `${getTestDataPrefix()}V` +
    faker.person.firstName() +
    generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic })
  );
}

// privacyIDEA stores usernames in a VARCHAR(40) column; the backend derives the username
// from the first letter of the Vorname plus the Nachname reduced to ASCII letters.
const maxUsernameLength: number = 40;

function toAsciiLetters(value: string): string {
  return value.normalize('NFD').replace(/[^A-Za-z]/g, '');
}

export function generateNachname(suffix: string = ''): string {
  const prefix: string = `${getTestDataPrefix()}N`;
  const randomPart: string = generateRandomString({ length: 3, charSetType: CharacterSetType.Alphabetic });
  const lastNameBudget: number = Math.max(
    0,
    maxUsernameLength - 1 - toAsciiLetters(prefix + randomPart + suffix).length,
  );
  return prefix + toAsciiLetters(faker.person.lastName()).slice(0, lastNameBudget) + randomPart + suffix;
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

export function generateEmailAddress(): string {
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
