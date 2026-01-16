import { useState, useEffect, useCallback } from 'react';
import { login, register, logout, getCurrentUser, isLoggedIn } from '../lib/appwrite';

interface User {
  $id: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): [AuthState, AuthActions] {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await isLoggedIn();
      if (authenticated) {
        const userResult = await getCurrentUser();
        if (userResult.success) {
          setState({
            user: userResult.user as User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const loginAction = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        const userResult = await getCurrentUser();
        setState({
          user: userResult.success ? userResult.user as User : null,
          isAuthenticated: userResult.success,
          isLoading: false,
          error: null,
        });
        return { success: true };
      } else {
        setState((prev) => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error || 'Login failed' 
        }));
        return { success: false, error: result.error };
      }
    } catch {
      const errorMessage = 'An unexpected error occurred';
      setState((prev) => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const registerAction = useCallback(async (email: string, password: string, name: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await register(email, password, name);
      
      if (result.success) {
        setState((prev) => ({ 
          ...prev, 
          isLoading: false 
        }));
        return { success: true };
      } else {
        setState((prev) => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error || 'Registration failed' 
        }));
        return { success: false, error: result.error };
      }
    } catch {
      const errorMessage = 'An unexpected error occurred';
      setState((prev) => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const logoutAction = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      await logout();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch {
      setState((prev) => ({ 
        ...prev, 
        isLoading: false 
      }));
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await checkAuth();
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return [
    state,
    {
      login: loginAction,
      register: registerAction,
      logout: logoutAction,
      refreshUser,
      clearError,
    },
  ];
}

export function useIsAuthenticated(): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const result = await isLoggedIn();
      setIsAuthenticated(result);
      setIsLoading(false);
    };
    
    check();
  }, []);

  return isAuthenticated;
}

export function useCurrentUser(): { user: User | null; isLoading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await getCurrentUser();
        if (result.success) {
          setUser(result.user as User);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  return { user, isLoading };
}

