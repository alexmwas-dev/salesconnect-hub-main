import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { User, Organization, UserRole } from "@/types";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    organizationName: string;
    organizationSlug: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  googleAuth: (credential: string, organizationName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = api.getToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const { user, organization } = await api.auth.me();

      // Parse name into firstName/lastName for backward compatibility
      const nameParts = user.name?.split(" ") || [];
      const firstName = nameParts[0] || user.name;
      const lastName = nameParts.slice(1).join(" ") || "";

      setUser({ ...user, firstName, lastName });
      setOrganization(organization);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      api.setToken(null);
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const applyAuthSession = (payload: {
    user: User & { name?: string };
    organization: Organization;
    token: string;
  }) => {
    const { user, organization, token } = payload;
    api.setToken(token);

    // Parse name into firstName/lastName for backward compatibility
    const nameParts = user.name?.split(" ") || [];
    const firstName = nameParts[0] || user.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    setUser({ ...user, firstName, lastName });
    setOrganization(organization);
  };

  const login = async (email: string, password: string) => {
    const authData = await api.auth.login(email, password);
    applyAuthSession(authData);
  };

  const signup = async (data: {
    organizationName: string;
    organizationSlug: string;
    name: string;
    email: string;
    password: string;
  }) => {
    const authData = await api.auth.signup(data);
    applyAuthSession(authData);
  };

  const googleAuth = async (credential: string, organizationName?: string) => {
    const authData = await api.auth.googleAuth(credential, organizationName);
    applyAuthSession(authData);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      api.setToken(null);
      setUser(null);
      setOrganization(null);
    }
  };

  const updateProfile = async (data: { name?: string; email?: string }) => {
    if (!user) return;

    const { user: updatedUser } = await api.auth.updateProfile(data);
    setUser(updatedUser);
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => {
    await api.auth.changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        googleAuth,
        logout,
        updateProfile,
        changePassword,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
