import { TokenExpiredError, NetworkError, ApiError } from './errors';

const PANORAMIX_BASE = '/panoramix-api';

export class PanoramixAPI {
  private refreshTokenValue: string;
  private accessToken: string | null = null;

  constructor(refreshToken: string) {
    this.refreshTokenValue = refreshToken;
  }

  /** Exchange the refresh_token cookie for a short-lived access JWT */
  async init(): Promise<void> {
    await this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<void> {
    const url = new URL(`${PANORAMIX_BASE}/users/token`, window.location.origin);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { 'X-Panoramix-Token': this.refreshTokenValue },
      });
    } catch {
      throw new NetworkError('Impossible de contacter Panoramix. Vérifiez votre connexion.');
    }
    if (!res.ok) {
      throw new TokenExpiredError('panoramix');
    }
    const data: { jwt: string } = await res.json();
    this.accessToken = data.jwt;
  }

  private getHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      'X-Panoramix-Token': this.refreshTokenValue,
    };
    if (this.accessToken) {
      h['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return h;
  }

  private async fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch {
      throw new NetworkError('Impossible de contacter Panoramix. Vérifiez votre connexion.');
    }
    if (res.status === 401 && this.accessToken) {
      await this.refreshAccessToken(); // throws TokenExpiredError if refresh fails
      const retryHeaders = { ...this.getHeaders() };
      if (init?.headers) Object.assign(retryHeaders, init.headers);
      let retryRes: Response;
      try {
        retryRes = await fetch(url, { ...init, headers: retryHeaders });
      } catch {
        throw new NetworkError('Impossible de contacter Panoramix. Vérifiez votre connexion.');
      }
      if (retryRes.status === 401) {
        throw new TokenExpiredError('panoramix');
      }
      return retryRes;
    }
    return res;
  }

  private async request<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const url = new URL(`${PANORAMIX_BASE}${path}`, window.location.origin);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await this.fetchWithRetry(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new ApiError(res.status, `Panoramix API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /** For array query params: param[0]=val0&param[1]=val1 */
  private async requestWithArrayParams<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    arrayParams?: Record<string, string[]>,
  ): Promise<T> {
    const url = new URL(`${PANORAMIX_BASE}${path}`, window.location.origin);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }
    if (arrayParams) {
      for (const [key, values] of Object.entries(arrayParams)) {
        values.forEach((v, i) => url.searchParams.set(`${key}[${i}]`, v));
      }
    }

    const res = await this.fetchWithRetry(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new ApiError(res.status, `Panoramix API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  private async mutate<T>(
    method: 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const url = new URL(`${PANORAMIX_BASE}${path}`, window.location.origin);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = { ...this.getHeaders() };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await this.fetchWithRetry(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new ApiError(res.status, `Panoramix API error: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : (undefined as T);
  }

  // ──────────────── Users ────────────────

  /** Search users */
  async searchUsers(opts: {
    search?: string;
    moduleId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    return this.request<PanoramixUserRef[]>('/users', {
      refOnly: true,
      ...(opts.search && { search: opts.search }),
      ...(opts.moduleId && { moduleId: opts.moduleId }),
      limit: opts.limit ?? 10,
      offset: opts.offset ?? 0,
    });
  }

  /** Get current user's settings */
  async getUserSettings() {
    return this.request<PanoramixUserSettings>('/users/settings');
  }

  /** Update current user's settings */
  async updateUserSettings(settings: PanoramixUserSettings) {
    return this.mutate<PanoramixUserSettings>('PUT', '/users/settings', settings);
  }

  /** Get current user's cohort groups */
  async getUserCohortGroups() {
    return this.request<PanoramixCohortGroup[]>('/users/cohortGroups');
  }

  // ──────────────── Events ────────────────

  /** Get events for a date range (calendar view) with registration status */
  async getEvents(start: string, end: string, registrationStatus = true) {
    return this.request<PanoramixEvent[]>('/events', {
      start,
      end,
      registrationStatus,
    });
  }

  /** Search events (paginated, minimal fields) */
  async searchEvents(search = '', limit = 10, offset = 0) {
    return this.request<PanoramixEventRef[]>('/events', {
      limit,
      offset,
      refOnly: true,
      search,
    });
  }

  /** Get a single event with full details (slots, registrations) */
  async getEventDetail(eventId: string) {
    return this.request<PanoramixEventDetail>(`/events/${eventId}`);
  }

  /** Get modification history of an event */
  async getEventHistory(eventId: string) {
    return this.request<PanoramixEventHistoryEntry[]>(`/events/${eventId}/history`);
  }

  /** Get events for a specific module */
  async getEventsByModule(moduleId: string, opts: {
    start?: string;
    end?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    return this.request<PanoramixEvent[]>(`/events/module/${moduleId}`, {
      ...(opts.start && { start: opts.start }),
      ...(opts.end && { end: opts.end }),
      ...(opts.search && { search: opts.search }),
      ...(opts.limit && { limit: opts.limit }),
      ...(opts.offset && { offset: opts.offset }),
    });
  }

  // ──────────────── Event Registration ────────────────

  /** Register to an event slot */
  async registerToSlot(
    eventId: string,
    type: string,
    registerId: string,
    body: unknown,
    slotIdx?: number,
  ) {
    return this.mutate<PanoramixEventDetail>(
      'POST',
      `/events/${eventId}/${type}/${registerId}`,
      body,
      slotIdx != null ? { slotIdx } : undefined,
    );
  }

  /** Unregister from an event slot */
  async unregisterFromSlot(
    eventId: string,
    type: string,
    registerId: string,
    slotIdx?: number,
  ) {
    return this.mutate<PanoramixEventDetail>(
      'DELETE',
      `/events/${eventId}/${type}/${registerId}`,
      undefined,
      slotIdx != null ? { slotIdx } : undefined,
    );
  }

  // ──────────────── Rooms ────────────────

  /** Search rooms */
  async searchRooms(opts: {
    search?: string;
    city?: string;
    disabled?: boolean;
    limit?: number;
    offset?: number;
  } = {}) {
    return this.request<PanoramixRoom[]>('/rooms', {
      refOnly: true,
      ...(opts.search && { search: opts.search }),
      ...(opts.city && { city: opts.city }),
      ...(opts.disabled != null && { disabled: opts.disabled }),
      limit: opts.limit ?? 10,
      offset: opts.offset ?? 0,
    });
  }

  // ──────────────── Modules ────────────────

  /** Get a single module with full details */
  async getModule(moduleId: string) {
    return this.request<PanoramixModuleFull>(`/modules/${moduleId}`);
  }

  /** Search modules (paginated, minimal fields) */
  async getModules(search = '', limit = 50, offset = 0) {
    return this.request<PanoramixModuleRef[]>('/modules', {
      limit,
      offset,
      refOnly: true,
      search,
    });
  }

  /** Get groupings for a module */
  async getModuleGroupings(moduleId: string, opts: {
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    return this.request<PanoramixGroupingRef[]>(`/modules/${moduleId}/groupings`, {
      refOnly: true,
      ...(opts.search && { search: opts.search }),
      limit: opts.limit ?? 10,
      offset: opts.offset ?? 0,
    });
  }

  /** Search project groups for a module */
  async searchProjectGroups(moduleId: string, opts: {
    search?: string;
    groupingIds?: string[];
    limit?: number;
    offset?: number;
  } = {}) {
    return this.requestWithArrayParams<PanoramixProjectGroupRef[]>(
      `/modules/${moduleId}/projectGroups`,
      {
        refOnly: true,
        ...(opts.search && { search: opts.search }),
        limit: opts.limit ?? 10,
        offset: opts.offset ?? 0,
      },
      opts.groupingIds ? { groupingIds: opts.groupingIds } : undefined,
    );
  }

  /** Get the project group a user belongs to in a module */
  async getUserProjectGroup(moduleId: string, userId: string, groupingIds?: string[]) {
    return this.requestWithArrayParams<PanoramixProjectGroup[]>(
      `/modules/${moduleId}/projectGroups`,
      {},
      {
        userIds: [userId],
        ...(groupingIds ? { groupingIds } : {}),
      },
    ).then((groups) => groups[0] ?? null);
  }

  /** Get follow-up data for a project group in a module activity */
  async getFollowUp(moduleId: string, activityId: string, projectGroupId: string) {
    return this.request<PanoramixFollowUp>(
      `/modules/${moduleId}/activities/${activityId}/followUps/${projectGroupId}`,
    );
  }

  // ──────────────── Cohorts ────────────────

  /** Search cohorts by type */
  async getCohorts(type: 'city' | 'curriculum' | 'promotion', search = '', limit = 50, offset = 0) {
    return this.request<PanoramixCohort[]>('/cohorts', {
      type,
      limit,
      offset,
      refOnly: true,
      search,
    });
  }

  /** Get a single cohort */
  async getCohort(cohortId: string) {
    return this.request<PanoramixCohort>(`/cohorts/${cohortId}`);
  }
}

// ──────────────── Enums / Constants ────────────────

export type EventType = 'course' | 'appointment' | 'appointment_multiple';
export type EventRegistrationType = 'individual' | 'group';
export type SlotType = 'break' | 'slot' | 'slot_multiple';
export type SlotTypeSingle = 'break' | 'slot';
export type SlotTypeMultiple = 'break' | 'slot_multiple';
export type EventHistoryAction =
  | 'create'
  | 'createMass'
  | 'update'
  | 'add_room'
  | 'remove_room'
  | 'register_student'
  | 'force_register_student'
  | 'register_staff'
  | 'force_register_staff'
  | 'unregister_student'
  | 'force_unregister_student'
  | 'unregister_staff'
  | 'force_unregister_staff';

// ──────────────── Types ────────────────

export interface TpId {
  id: string;
  source: 'gandalf' | 'intra' | 'oai';
  sourceType?: string;
  _id?: string;
}

export interface PanoramixRoom {
  _id: string;
  name: string;
  seats: number;
  city: string;
  disabled: boolean;
  tpIds: TpId[];
}

export interface PanoramixActivityRef {
  _id: string;
  name: string;
  tpIds: TpId[];
}

export interface PanoramixModuleRef {
  _id: string;
  name: string;
  code: string;
  tpIds: TpId[];
}

export interface PanoramixModuleEnriched extends PanoramixModuleRef {
  activityRef?: PanoramixActivityRef;
  groupingsRef: unknown[];
}

export interface PanoramixModuleFull extends PanoramixModuleRef {
  activityRef?: PanoramixActivityRef;
  groupingsRef: unknown[];
}

export interface PanoramixCohort {
  _id: string;
  name: string;
  type: 'city' | 'curriculum' | 'promotion';
}

export interface PanoramixCohortGroup {
  city: PanoramixCohort;
  curriculum: PanoramixCohort;
  promotion: PanoramixCohort;
}

export interface PanoramixEvent {
  _id: string;
  title: string;
  start: string;
  end: string;
  type: EventType;
  registrationType: EventRegistrationType;
  roomsRef: PanoramixRoom[];
  seats: number | null;
  moduleRef: PanoramixModuleEnriched;
  cohortGroups: PanoramixCohortGroup[];
  visible: boolean;
  isRegistered: { start: string; end: string } | false | null;
}

export interface PanoramixEventDetail extends PanoramixEvent {
  description?: string | null;
  slots: PanoramixSlot[];
  registeredStudents?: PanoramixRegistration[];
  registeredStaff?: PanoramixRegistration[];
}

export interface PanoramixSlot {
  start: string;
  end: string;
  type: SlotType;
  occurence?: number;
  breakDuration?: number;
  slotNumber?: number;
  registeredStudents?: PanoramixRegistration[];
  registeredStaff?: PanoramixRegistration[];
}

export interface PanoramixRegistration {
  _id: string;
  login?: string;
  firstName?: string;
  lastName?: string;
  members?: PanoramixUserRef[];
}

export interface PanoramixEventRef {
  _id: string;
  title: string;
  start: string;
  end: string;
}

export interface PanoramixEventHistoryEntry {
  _id: string;
  action: EventHistoryAction;
  logasUserRef?: PanoramixUserRef;
  log?: Record<string, unknown>;
}

export interface PanoramixUser {
  _id: string;
  login: string;
  firstName: string;
  lastName: string;
  ionisId: string;
  disabled: boolean;
  tpIds: TpId[];
  cohortGroups: PanoramixCohortGroup[];
  modulesRef: PanoramixModuleRef[];
}

export interface PanoramixUserRef {
  _id: string;
  login: string;
  firstName: string;
  lastName: string;
}

/** User settings — shape varies per user configuration, only `language` is stable */
export interface PanoramixUserSettings {
  language?: string;
  [key: string]: unknown;
}

export interface PanoramixGroupingRef {
  _id: string;
  name: string;
}

export interface PanoramixProjectGroupRef {
  _id: string;
  name: string;
}

export interface PanoramixProjectGroup {
  _id: string;
  name: string;
  members: PanoramixUserRef[];
}

/** Follow-up data varies by module configuration — shape is not fixed */
export interface PanoramixFollowUp {
  _id?: string;
  [key: string]: unknown;
}
