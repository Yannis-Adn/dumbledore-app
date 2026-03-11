const PANORAMIX_HOST = 'https://panoramix.epitest.eu/api';

export interface PanoramixRegistrationServer {
  _id: string;
  login?: string;
  firstName?: string;
  lastName?: string;
  members?: Array<{ _id: string; login?: string; firstName?: string; lastName?: string }>;
}

export interface PanoramixSlotServer {
  start: string;
  end: string;
  type: string;
  registeredStudents?: PanoramixRegistrationServer[];
  registeredStaff?: PanoramixRegistrationServer[];
}

export interface PanoramixEventServer {
  _id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  registrationType?: string;
  moduleRef?: {
    name: string;
    code: string;
    activityRef?: { name: string };
  };
  roomsRef?: Array<{ name: string }>;
  isRegistered?: boolean | { start: string; end: string } | null;
  cohortGroups?: Array<{
    city: { name: string };
    curriculum: { name: string };
    promotion: { name: string };
  }>;
}

export interface PanoramixEventDetailServer extends PanoramixEventServer {
  slots: PanoramixSlotServer[];
  registeredStudents?: PanoramixRegistrationServer[];
  registeredStaff?: PanoramixRegistrationServer[];
}

export class PanoramixServerAPI {
  private refreshToken: string;
  private accessToken: string | null = null;

  constructor(refreshToken: string) {
    this.refreshToken = refreshToken;
  }

  private getHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      Cookie: `refresh_token=${this.refreshToken}`,
    };
    if (this.accessToken) {
      h['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return h;
  }

  /** Exchange refresh token for access token. Returns true if successful. */
  async init(): Promise<boolean> {
    try {
      const res = await fetch(`${PANORAMIX_HOST}/users/token`, {
        headers: { Cookie: `refresh_token=${this.refreshToken}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.accessToken = data.jwt;
      return true;
    } catch {
      return false;
    }
  }

  /** Fetch events for a date range */
  async getEvents(start: string, end: string): Promise<PanoramixEventServer[]> {
    const url = new URL(`${PANORAMIX_HOST}/events`);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    url.searchParams.set('registrationStatus', 'true');

    const res = await fetch(url.toString(), { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Events fetch failed: ${res.status}`);
    return res.json();
  }

  /** Fetch full event detail (slots + all registrations) */
  async getEventDetail(eventId: string): Promise<PanoramixEventDetailServer> {
    const res = await fetch(`${PANORAMIX_HOST}/events/${eventId}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Event detail fetch failed: ${res.status}`);
    return res.json();
  }
}
