// src/contexts/AuthContext.ts
import { createContext } from 'react';
import type { DecodedToken } from '../utils/getUserFromToken';

interface AuthContextType {
  isAuthenticated: boolean;
  user: DecodedToken | null;
  logout: () => void;
}

export const AuthContext = createContext({} as AuthContextType);
