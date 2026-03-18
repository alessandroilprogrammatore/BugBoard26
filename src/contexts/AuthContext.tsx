import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { api, setStoredToken, getStoredToken } from '@/api/client';

export type UserRole = 'admin' | 'user' | 'readonly';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isReadonly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Removed mock users - using real API authentication

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Try to load user from token on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      if (!getStoredToken()) {
        setUser(null);
        return;
      }

      const me = await api('/auth/me');
      if (me && me.id) {
        setUser({
          id: me.id,
          name: me.name,
          email: me.email,
          role: me.role.toLowerCase() as UserRole,
        });
      } else {
        // No valid user data, clear state
        setUser(null);
      }
    } catch (error) {
      // User not authenticated, clear any stale state
      setUser(null);
      setStoredToken(null);
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Force complete logout before login to avoid conflicts
      await logout();
      
      // Wait a bit to ensure logout is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const me = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setStoredToken(me.token ?? null);

      setUser({
        id: me.id,
        name: me.name,
        email: me.email,
        role: me.role.toLowerCase() as UserRole,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Email o password non corretti');
    }
  };

  const logout = async () => {
    try {
      // Clear user state first
      setUser(null);
      setStoredToken(null);
      
      // Try to call logout API (but don't fail if it doesn't work)
      try {
        await api('/auth/logout', { method: 'POST' });
      } catch (apiError) {
        console.warn('Logout API call failed:', apiError);
      }
      
      // Clear any cached data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cookies by setting them to expire
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin: user?.role === 'admin',
        isReadonly: user?.role === 'readonly',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
