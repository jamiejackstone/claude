import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Location, User } from "../types";
import { LOCATIONS_CONFIG, getLocationByCode } from "../data/locations";
import { api, seg } from "../api";

// Retained for backwards compatibility with modules that imported these from
// here while the app was on Firestore. Errors are now plain fetch errors.
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`API Error [${operationType}] on [${path}]:`, error);
  throw new Error(errorMessage);
}

interface AuthContextType {
  user: User | null;
  activeLocation: string | null;
  setActiveLocation: (location: string) => void;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  authReady: boolean;
  authError: string | null;
  // Admin functions
  allUsers: User[];
  allLocations: Location[];
  addUser: (user: Omit<User, "id">) => Promise<void>;
  removeUser: (id: string) => void;
  addLocation: (location: Location) => void;
  updateLocation: (id: string, location: Partial<Location>) => void;
  removeLocation: (id: string) => void;
  updateUserLocations: (userId: string, locations: string[]) => void;
  updateUserHourlyRate: (userId: string, hourlyRate: number) => void;
  resendInvite: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Merge a raw location record with the static config so the UI always has
// complete metadata (venue, times, age groups), matching the old behaviour.
function normalizeLocation(rawLoc: any): Location {
  const fallbackConfig = getLocationByCode(rawLoc.name || rawLoc.code || rawLoc.id);
  return {
    ...rawLoc,
    id: rawLoc.id,
    name: rawLoc.name || fallbackConfig?.name || rawLoc.id,
    code: rawLoc.code || fallbackConfig?.code || rawLoc.name,
    location: rawLoc.location || fallbackConfig?.location || "",
    venue: rawLoc.venue || fallbackConfig?.venue || rawLoc.address || "",
    address: rawLoc.address || fallbackConfig?.address || rawLoc.venue || "",
    day: rawLoc.day || fallbackConfig?.day,
    dayFullName: rawLoc.dayFullName || fallbackConfig?.dayFullName,
    time: rawLoc.time || fallbackConfig?.time || "",
    hasBallers: typeof rawLoc.hasBallers === "boolean" ? rawLoc.hasBallers : fallbackConfig?.hasBallers ?? true,
    ageGroups: rawLoc.ageGroups && rawLoc.ageGroups.length > 0 ? rawLoc.ageGroups : fallbackConfig?.ageGroups || ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: rawLoc.sessionTimes || fallbackConfig?.sessionTimes || {},
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadIdentity = React.useCallback(async () => {
    try {
      const me = await api.get<any>("/api/me").catch((e: any) => {
        if (e.status === 403) return { authenticated: true, provisioned: false, ...e.body };
        if (e.status === 401) return { authenticated: false };
        throw e;
      });
      if (me?.provisioned && me.user) {
        const u = me.user as User;
        setUser(u);
        setActiveLocation((prev) => {
          if (prev && u.locations.includes(prev)) return prev;
          return u.locations.length > 0 ? u.locations[0] : null;
        });
        setAuthError(null);
      } else if (me?.authenticated && !me.provisioned) {
        setUser(null);
        setAuthError(`Your email (${me.email || "unknown"}) is not registered as a Hoop Heroes coach. Contact an administrator.`);
      } else {
        setUser(null);
        setAuthError(null);
      }
    } catch (err: any) {
      console.error("Identity load failed:", err);
      setAuthError(err?.message || "Could not verify your login.");
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  // Load users + locations once we know who the user is.
  const refreshDirectory = React.useCallback(
    async (currentUser: User) => {
      try {
        const [usersRaw, locsRaw] = await Promise.all([
          api.get<User[]>("/api/users"),
          api.get<any[]>("/api/locations"),
        ]);
        setAllUsers(usersRaw);

        const validNames = new Set(LOCATIONS_CONFIG.map((l) => l.name));
        let locations = locsRaw.map(normalizeLocation).filter((loc) => validNames.has(loc.name));
        locations.sort((a, b) => {
          const idxA = LOCATIONS_CONFIG.findIndex((l) => l.name === a.name);
          const idxB = LOCATIONS_CONFIG.findIndex((l) => l.name === b.name);
          return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
        });
        if (currentUser.role !== "OWNER" && currentUser.role !== "ADMINISTRATOR") {
          locations = locations.filter((loc) => currentUser.locations.includes(loc.name));
        }
        setAllLocations(locations);

        if (locations.length > 0) {
          setActiveLocation((prev) => {
            if (prev === "ALL LOCATIONS" && (currentUser.role === "OWNER" || currentUser.role === "ADMINISTRATOR")) return prev;
            if (!prev || !locations.some((l) => l.name === prev)) return locations[0].name;
            return prev;
          });
        }
      } catch (err) {
        console.error("Directory load failed:", err);
      }
    },
    [],
  );

  useEffect(() => {
    if (user) refreshDirectory(user);
  }, [user, refreshDirectory]);

  // With Cloudflare Access in front, "login" simply means the browser already
  // holds an Access session — re-checking identity is all that's needed.
  const login = async () => {
    await loadIdentity();
  };

  const loginWithEmail = async (_email: string, _password: string) => {
    // Access handles credentials (email OTP / Google). Re-check identity.
    await loadIdentity();
  };

  const resetPassword = async (_email: string) => {
    // No passwords in the app any more — Access owns authentication.
    return true;
  };

  const logout = () => {
    setUser(null);
    // Clear the Cloudflare Access session then return to the app.
    window.location.href = "/cdn-cgi/access/logout";
  };

  const addUser = async (newUser: Omit<User, "id">) => {
    const id = newUser.email.toLowerCase().trim();
    await api.post("/api/users", { ...newUser, email: id });
    if (user) await refreshDirectory(user);
  };

  const removeUser = async (id: string) => {
    await api.del(`/api/users/${seg(id)}`);
    if (user) await refreshDirectory(user);
  };

  const addLocation = async (location: Location) => {
    await api.post("/api/locations", location);
    if (user) await refreshDirectory(user);
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    await api.patch(`/api/locations/${seg(id)}`, updates);
    if (user) await refreshDirectory(user);
  };

  const removeLocation = async (id: string) => {
    await api.del(`/api/locations/${seg(id)}`);
    if (user) await refreshDirectory(user);
  };

  const updateUserLocations = async (userId: string, locations: string[]) => {
    if (user?.id === userId) setUser((prev) => (prev ? { ...prev, locations } : null));
    await api.patch(`/api/users/${seg(userId)}`, { locations });
    if (user) await refreshDirectory(user);
  };

  const updateUserHourlyRate = async (userId: string, hourlyRate: number) => {
    if (user?.id === userId) setUser((prev) => (prev ? { ...prev, hourlyRate } : null));
    await api.patch(`/api/users/${seg(userId)}`, { hourlyRate });
    if (user) await refreshDirectory(user);
  };

  const resendInvite = async (_email: string) => {
    // Invites are handled by Cloudflare Access policies now — nothing to send.
    return;
  };

  const contextValue = React.useMemo(
    () => ({
      user,
      activeLocation,
      setActiveLocation,
      login,
      logout,
      authReady,
      authError,
      allUsers,
      allLocations,
      addUser,
      removeUser,
      addLocation,
      updateLocation,
      removeLocation,
      updateUserLocations,
      updateUserHourlyRate,
      resendInvite,
      loginWithEmail,
      resetPassword,
    }),
    [user, activeLocation, allUsers, allLocations, authReady, authError],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
