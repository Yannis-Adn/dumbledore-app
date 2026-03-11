import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GandalfAPI, type UserProfile } from '@/lib/gandalf-api';
import { PanoramixAPI } from '@/lib/panoramix-api';
import { DemoGandalfAPI, DemoPanoramixAPI, DEMO_USER } from '@/lib/demo-api';
import { TokenExpiredError, NetworkError } from '@/lib/errors';
import { useToast } from '@/context/toast';

interface AuthState {
  token: string | null;
  panoramixToken: string | null;
  api: GandalfAPI | null;
  panoramixApi: PanoramixAPI | null;
  user: UserProfile | null;
  userid: number | null;
  curriculum: string | null;
  loading: boolean;
  error: string | null;
  tokenExpired: { gandalf: boolean; panoramix: boolean };
  isDemo: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, panoramixToken: string) => Promise<void>;
  loginDemo: () => void;
  updateTokens: (tokens: { moodle?: string; panoramix?: string }) => Promise<void>;
  logout: () => void;
  handleApiError: (error: unknown) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'dumbledore_token';
const PANORAMIX_STORAGE_KEY = 'dumbledore_panoramix_token';
const DEMO_STORAGE_KEY = 'dumbledore_demo';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [state, setState] = useState<AuthState>({
    token: null,
    panoramixToken: null,
    api: null,
    panoramixApi: null,
    user: null,
    userid: null,
    curriculum: null,
    loading: true,
    error: null,
    tokenExpired: { gandalf: false, panoramix: false },
    isDemo: false,
  });

  // Deduplicate token expiry toasts
  const toastShownRef = useRef({ gandalf: false, panoramix: false });

  const handleApiError = useCallback((error: unknown) => {
    if (error instanceof TokenExpiredError) {
      setState((s) => ({
        ...s,
        tokenExpired: { ...s.tokenExpired, [error.source]: true },
      }));
      if (!toastShownRef.current[error.source]) {
        toastShownRef.current[error.source] = true;
        addToast({
          type: 'warning',
          message:
            error.source === 'gandalf'
              ? 'Votre session Moodle a expiré. Mettez à jour votre token MoodleSession.'
              : 'Votre token Panoramix a expiré. Mettez à jour votre token Panoramix.',
          action: {
            label: 'Mettre à jour mes tokens',
            onClick: () => navigate('/tokens'),
          },
          duration: 0,
        });
      }
    } else if (error instanceof NetworkError) {
      addToast({
        type: 'error',
        message: error.message,
        duration: 5000,
      });
    }
  }, [addToast, navigate]);

  const initSession = useCallback(async (token: string, panoramixToken: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const api = new GandalfAPI(token);
      const { userid } = await api.init();
      const user = await api.getUserProfile(userid);

      const panoramixApi = new PanoramixAPI(panoramixToken);
      await panoramixApi.init();

      // Fetch curriculum from Panoramix cohort groups
      let curriculum: string | null = null;
      try {
        const cohortGroups = await panoramixApi.getUserCohortGroups();
        curriculum = cohortGroups[0]?.curriculum?.name ?? null;
      } catch {
        // Non-blocking — curriculum is a nice-to-have
      }

      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(PANORAMIX_STORAGE_KEY, panoramixToken);

      // Reset expiry flags on successful init
      toastShownRef.current = { gandalf: false, panoramix: false };

      setState({
        token,
        panoramixToken,
        api,
        panoramixApi,
        user,
        userid,
        curriculum,
        loading: false,
        error: null,
        tokenExpired: { gandalf: false, panoramix: false },
        isDemo: false,
      });

      // Silently refresh notification token + sync Gandalf deadlines
      try {
        const ntfyRaw = localStorage.getItem('dumbledore_ntfy');
        if (ntfyRaw) {
          const ntfyConfig = JSON.parse(ntfyRaw);
          if (ntfyConfig.enabled && ntfyConfig.topicId) {
            // Refresh Panoramix token (fire-and-forget)
            fetch('/api/refresh-notif-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                panoramixRefreshToken: panoramixToken,
                topicId: ntfyConfig.topicId,
                cohortKey: ntfyConfig.cohortKey,
                reminders: ntfyConfig.reminders,
              }),
            }).catch((e) => { if (import.meta.env.DEV) console.warn('Notif token refresh failed:', e); });

            // Sync Gandalf assign deadlines (fire-and-forget)
            api
              .getActionEvents(Math.floor(Date.now() / 1000), 50)
              .then((resp) => {
                const deadlines = resp.events
                  .filter((e) => e.modulename === 'assign')
                  .map((e) => ({
                    eventId: String(e.id),
                    name: e.name,
                    courseName: e.course.fullname.replace(/^T-\w+-\d+\s*-\s*/, ''),
                    courseCode: e.course.shortname?.split('_')[0] ?? '',
                    deadline: e.timesort,
                  }));
                if (deadlines.length > 0) {
                  return fetch('/api/sync-deadlines', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      topicId: ntfyConfig.topicId,
                      deadlines,
                    }),
                  });
                }
              })
              .catch((e) => { if (import.meta.env.DEV) console.warn('Deadline sync failed:', e); });
          }
        }
      } catch {
        // never block auth flow
      }
    } catch (e) {
      // On token expiry, keep tokens in state so ProtectedRoute doesn't redirect to /login
      if (e instanceof TokenExpiredError) {
        setState({
          token,
          panoramixToken,
          api: null,
          panoramixApi: null,
          user: null,
          userid: null,
          curriculum: null,
          loading: false,
          error: null,
          tokenExpired: { gandalf: e.source === 'gandalf', panoramix: e.source === 'panoramix' },
          isDemo: false,
        });
        return; // don't re-throw, let the app render with the banner
      }

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PANORAMIX_STORAGE_KEY);
      setState({
        token: null,
        panoramixToken: null,
        api: null,
        panoramixApi: null,
        user: null,
        userid: null,
        curriculum: null,
        loading: false,
        error: e instanceof Error ? e.message : 'Connection failed',
        tokenExpired: { gandalf: false, panoramix: false },
        isDemo: false,
      });
      throw e;
    }
  }, []);

  const login = useCallback(async (token: string, panoramixToken: string) => {
    await initSession(token, panoramixToken);
  }, [initSession]);

  const loginDemo = useCallback(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, 'true');
    setState({
      token: '__demo__',
      panoramixToken: '__demo__',
      api: new DemoGandalfAPI() as unknown as GandalfAPI,
      panoramixApi: new DemoPanoramixAPI() as unknown as PanoramixAPI,
      user: DEMO_USER,
      userid: DEMO_USER.id,
      curriculum: 'MSc Pro 1',
      loading: false,
      error: null,
      tokenExpired: { gandalf: false, panoramix: false },
      isDemo: true,
    });
  }, []);

  const updateTokens = useCallback(async (tokens: { moodle?: string; panoramix?: string }) => {
    const newMoodle = tokens.moodle || state.token;
    const newPanoramix = tokens.panoramix || state.panoramixToken;
    if (!newMoodle || !newPanoramix) throw new Error('Both tokens are required');
    await initSession(newMoodle, newPanoramix);
  }, [initSession, state.token, state.panoramixToken]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PANORAMIX_STORAGE_KEY);
    localStorage.removeItem(DEMO_STORAGE_KEY);
    toastShownRef.current = { gandalf: false, panoramix: false };
    setState({
      token: null,
      panoramixToken: null,
      api: null,
      panoramixApi: null,
      user: null,
      userid: null,
      curriculum: null,
      loading: false,
      error: null,
      tokenExpired: { gandalf: false, panoramix: false },
      isDemo: false,
    });
  }, []);

  useEffect(() => {
    if (localStorage.getItem(DEMO_STORAGE_KEY) === 'true') {
      loginDemo();
      return;
    }
    const savedToken = localStorage.getItem(STORAGE_KEY);
    const savedPanoramix = localStorage.getItem(PANORAMIX_STORAGE_KEY);
    if (savedToken && savedPanoramix) {
      initSession(savedToken, savedPanoramix).catch((e) => {
        // TokenExpiredError is already handled inside initSession (doesn't re-throw)
        // Network and other errors: show toast
        if (e instanceof NetworkError) {
          // Will be shown by toast on next render
        }
      });
    } else {
      setState(s => ({ ...s, loading: false }));
    }
  }, [initSession, loginDemo]);

  return (
    <AuthContext.Provider value={{ ...state, login, loginDemo, updateTokens, logout, handleApiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
