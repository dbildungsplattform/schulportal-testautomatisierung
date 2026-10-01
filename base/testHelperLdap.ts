import { Client, Entry, SearchResult } from 'ldapts';
import { LdapOperationError } from './ldap/error/ldap-operation.error';

declare type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export class TestHelperLdap {
  // Default-retries of 3 equals the value defined for BE.
  private static readonly DEFAULT_RETRIES: number = 3; // e.g. DEFAULT_RETRIES = 3 will produce retry sequence: 1sek, 8sek, 27sek (1000ms * retrycounter^3)
  private static readonly GROUPS: string = 'cn=groups';
  private static readonly BASE_DN: string = 'dc=schule-sh,dc=de';

  private static readonly OEFFENTLICHE_SCHULEN_OU: string = 'ou=oeffentlicheSchulen';
  private static readonly ERSATZ_SCHULEN_OU: string = 'ou=ersatzSchulen';

  private client: Client;

  /**
   *
   * @param ldapUrl the url of LDAP e.g.ldap://localhost
   * @param ldapAdminUser the user that is used at the bind-dn
   * @param ldapAdminPassword the password that is used at the bind-dn
   * @param retries specifies the amount of retries used for methods which are using retries (see method-docs), defaults is 3
   */
  public constructor(
    private ldapUrl: string,
    private ldapAdminUser: string,
    private ldapAdminPassword: string,
    private retries: number = TestHelperLdap.DEFAULT_RETRIES,
  ) {
    this.client = new Client({
      url: this.ldapUrl,
      timeout: 3000,
    });
  }

  //** PUBLIC methods for direct usage in tests */

  /**
   * Checks whether a user-entry exists in LDAP for the specified username.
   * Polls until the user exists or the maximum attempts are reached.
   * Uses retries for enhanced reliability of the LDAP-request and its result.
   * @param username
   */
  public async validateUserExists(
    username: string,
    maxAttempts: number = 10,
    delayMs: number = 1000,
  ): Promise<boolean> {
    for (let attempt: number = 1; attempt <= maxAttempts; attempt++) {
      const res: Result<Entry> = await this.executeWithRetry(() => this.getUser(username));

      if (res.ok && !!res.value) {
        return true;
      }

      // If this wasn't the last attempt, wait before trying again
      if (attempt < maxAttempts) {
        await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, delayMs));
      }
    }

    return false;
  }

  /**
   * Checks whether a organizationalUnit-entry exists in LDAP for the specified orgaKennung.
   * Uses retries for enhanced reliability of the LDAP-request and its result.
   * @param orgaKennung
   */
  public async validateOuExists(orgaKennung: string): Promise<boolean> {
    const res: Result<Entry> = await this.executeWithRetry(() => this.getOu(orgaKennung));

    return res.ok && !!res.value;
  }

  /**
   * Checks whether a organizationalRole-entry exists in LDAP for the specified orgaKennung.
   * Uses retries for enhanced reliability of the LDAP-request and its result.
   * @param orgaKennung
   */
  public async validateOuRoleExists(orgaKennung: string): Promise<boolean> {
    const res: Result<Entry> = await this.executeWithRetry(() => this.getOuRole(orgaKennung));

    return res.ok && !!res.value;
  }

  /**
   * Checks whether a groupOfNames-entry exists in LDAP for the specified orgaKennung.
   * Uses retries for enhanced reliability of the LDAP-request and its result.
   * @param orgaKennung
   */
  public async validateGroupOfNamesExists(orgaKennung: string): Promise<boolean> {
    const res: Result<Entry> = await this.executeWithRetry(() => this.getLehrerGroupEntry(orgaKennung));

    return res.ok && !!res.value;
  }

  /**
   * Checks whether the uid for a specified username is contained as member in a groupOfNames-entry specified by an orgaKennung.
   * Uses retries for enhanced reliability of the LDAP-request and its result.
   * @param username
   * @param orgaKennung
   */
  public async validateUserIsInGroupOfNames(username: string, orgaKennung: string): Promise<boolean> {
    const res: Result<boolean> = await this.executeWithRetry(() =>
      this.checkUserIsInGroupOfNames(username, orgaKennung),
    );

    return res.ok && res.value;
  }

  /**
   * Checks whether the (encoded result of) clear password matches the persisted Inbetriebnahme-Passwort.
   * Uses retries for enhanced reliability of the LDAP-request and its result.
   * @param username
   * @param clearPassword the password non-encoded as clear string (for comparison response from an API-Call)
   */
  public async validateInbetriebnahmePasswortMatches(username: string, clearPassword: string): Promise<boolean> {
    return this.checkUserPasswordMatchesPassword(username, clearPassword);
  }

  // Polls for the primary email address of a user in LDAP until the email is not empty (This is necessary because email creation is asynchronous and could return an empty if we dont wait)
  public async getMailPrimaryAddress(
    username: string,
    maxAttempts: number = 10,
    delayMs: number = 1000,
  ): Promise<string> {
    for (let attempt: number = 1; attempt <= maxAttempts; attempt++) {
      const res: Result<Entry> = await this.executeWithRetry(() => this.getUser(username));

      if (!res.ok) {
        throw new Error(
          `Failed to retrieve user ${username} from LDAP: ${(res as { ok: false; error: Error }).error.message}`,
        );
      }

      const mailPrimaryAddress: string | Buffer<ArrayBufferLike> | Buffer<ArrayBufferLike>[] | string[] =
        res.value['mailPrimaryAddress'];

      let emailString: string;
      if (Array.isArray(mailPrimaryAddress)) {
        const firstValue: string | Buffer<ArrayBufferLike> = mailPrimaryAddress[0];
        emailString = Buffer.isBuffer(firstValue) ? firstValue.toString() : firstValue;
      } else {
        emailString = Buffer.isBuffer(mailPrimaryAddress) ? mailPrimaryAddress.toString() : mailPrimaryAddress;
      }

      // If we got a non-empty email, return it
      if (emailString && emailString.trim() !== '') {
        return emailString;
      }

      // If this wasn't the last attempt, wait before trying again
      if (attempt < maxAttempts) {
        await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, delayMs));
      }
    }

    // If we get here, we never found a non-empty email
    return '';
  }

  //** PRIVATE methods */
  private async bind(): Promise<void> {
    await this.client.bind(this.ldapAdminUser, this.ldapAdminPassword);
  }

  private async unbind(): Promise<void> {
    await this.client.unbind();
  }

  private async getUser(username: string): Promise<Result<Entry>> {
    await this.bind();

    try {
      const searchResultLehrer: SearchResult = await this.client.search(
        `${TestHelperLdap.OEFFENTLICHE_SCHULEN_OU},${TestHelperLdap.BASE_DN}`,
        {
          scope: 'sub',
          filter: `(uid=${username})`,
        },
      );
      await this.unbind();
      return {
        ok: true,
        value: searchResultLehrer.searchEntries[0],
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (ex: unknown) {
      await this.unbind();
      return {
        ok: false,
        error: new LdapOperationError('getUser'),
      };
    }
  }

  private async getOu(orgaKennung: string): Promise<Result<Entry>> {
    await this.bind();

    try {
      const searchResultOrgUnit: SearchResult = await this.client.search(`${TestHelperLdap.BASE_DN}`, {
        filter: `(ou=${orgaKennung})`,
      });
      await this.unbind();

      return {
        ok: true,
        value: searchResultOrgUnit.searchEntries[0],
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (ex: unknown) {
      await this.unbind();
      return {
        ok: false,
        error: new LdapOperationError('getOU'),
      };
    }
  }

  private async getOuRole(orgaKennung: string): Promise<Result<Entry>> {
    await this.bind();

    try {
      const orgUnitDn: string = `ou=${orgaKennung},${TestHelperLdap.BASE_DN}`;
      const searchResultOrgRole: SearchResult = await this.client.search(orgUnitDn, {
        filter: `(${TestHelperLdap.GROUPS})`,
      });
      await this.unbind();

      return {
        ok: true,
        value: searchResultOrgRole.searchEntries[0],
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (ex: unknown) {
      await this.unbind();
      return {
        ok: false,
        error: new LdapOperationError('getOuRole'),
      };
    }
  }

  private async getLehrerGroupEntry(orgaKennung: string): Promise<Result<Entry>> {
    await this.bind();

    try {
      const orgUnitDn: string = `ou=${orgaKennung},${TestHelperLdap.BASE_DN}`;
      const searchResultGroupOfNames: SearchResult = await this.client.search(orgUnitDn, {
        filter: `(cn=lehrer-${orgaKennung})`,
      });
      await this.unbind();

      return {
        ok: true,
        value: searchResultGroupOfNames.searchEntries[0],
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (ex: unknown) {
      await this.unbind();
      return {
        ok: false,
        error: new LdapOperationError('getGroupOfNames'),
      };
    }
  }

  private async checkUserIsInGroupOfNames(username: string, orgaKennung: string): Promise<Result<boolean>> {
    await this.bind();
    try {
      const groupOfNames: Result<Entry> = await this.getLehrerGroupEntry(orgaKennung);
      if (!groupOfNames.ok) return groupOfNames;
      const userUid: string = `uid=${username},${TestHelperLdap.OEFFENTLICHE_SCHULEN_OU},${TestHelperLdap.BASE_DN}`;
      const isUserInGroup: boolean = this.isUserInGroup(groupOfNames.value, userUid);
      await this.unbind();
      return {
        ok: true,
        value: isUserInGroup,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (ex: unknown) {
      await this.unbind();
      return {
        ok: false,
        error: new LdapOperationError('checkUserIsInGroupOfNames'),
      };
    }
  }

  private async checkUserPasswordMatchesPassword(username: string, password: string): Promise<boolean> {
    // bind as admin to search user
    await this.bind();

    try {
      const result: SearchResult = await this.client.search(
        `${TestHelperLdap.OEFFENTLICHE_SCHULEN_OU},${TestHelperLdap.BASE_DN}`,
        {
          scope: 'sub',
          filter: `(uid=${username})`,
          attributes: ['dn'],
        },
      );

      if (result.searchEntries.length !== 1) {
        return false;
      }

      const userDN: string = result.searchEntries[0].dn;

      // unbind admin before binding as user
      await this.unbind();

      // try bind as user
      try {
        await this.client.bind(userDN, password);
        return true; // password correct
      } catch (ex: unknown) {
        console.warn(`User bind failed for ${username}: ${ex instanceof Error ? ex.message : String(ex)}`);
        return false; // password wrong
      }
    } catch (ex: unknown) {
      console.warn(`Admin search failed for ${username}: ${ex instanceof Error ? ex.message : String(ex)}`);
      return false;
    } finally {
      // clean state
      try {
        await this.unbind();
      } catch (ex: unknown) {
        console.warn(`Unbind failed: ${ex instanceof Error ? ex.message : String(ex)}`);
      }
    }
  }
  /**
   * This search/validate function comes from the original BE-service.
   */
  private isUserInGroup(groupOfNamesEntry: Entry, userUid: string): boolean {
    const member: string | string[] | Buffer | Buffer[] | undefined = groupOfNamesEntry['member'];

    if (typeof member === 'string') {
      return member === userUid;
    }

    if (Buffer.isBuffer(member)) {
      return member.toString() === userUid;
    }

    if (Array.isArray(member)) {
      return member.some((entry: string | Buffer) => {
        if (typeof entry === 'string') {
          return entry === userUid;
        }
        return entry.toString() === userUid;
      });
    }

    return false;
  }

  /**
   * This retry-wrapper function comes from the original BE-service, but logging-methods were replaced by their console-equivalents,
   * retries and delay are both optional here.
   */
  private async executeWithRetry<T>(
    func: () => Promise<Result<T>>,
    retries: number = this.retries,
    delay: number = 1000,
  ): Promise<Result<T>> {
    let currentAttempt: number = 1;
    let result: Result<T> = {
      ok: false,
      error: new Error('executeWithRetry default fallback'),
    };

    while (currentAttempt <= retries) {
      try {
        result = await func();
        if (result.ok) {
          return result;
        } else {
          throw new Error(`Function returned error: ${(result as { ok: false; error: Error }).error.message}`);
        }
      } catch (error: unknown) {
        if (!result.ok && error instanceof Error) {
          result = {
            ok: false,
            error,
          };
        }
        const currentDelay: number = delay * Math.pow(currentAttempt, 3);
        console.warn(
          `Attempt ${currentAttempt} failed. Retrying in ${currentDelay}ms... Remaining retries: ${retries - currentAttempt}`,
        );

        await this.sleep(currentDelay);
      }
      currentAttempt++;
    }
    console.error(`All ${retries} attempts failed. Exiting with failure.`);
    throw (result as { ok: false; error: Error }).error;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve: () => void) => setTimeout(resolve, ms));
  }
}
