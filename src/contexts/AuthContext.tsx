import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { api } from '@/api/client';

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
  logout: () => Promise<void>;
  isAdmin: boolean;
  isReadonly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Removed mock users - using real API authentication

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Try to load the authenticated user from the HttpOnly cookie on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
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
      setUser(null);
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
      setUser(null);

      try {
        await api('/auth/logout', { method: 'POST' });
      } catch (apiError) {
        console.warn('Logout API call failed:', apiError);
      }
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
