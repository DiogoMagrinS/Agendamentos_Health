import { useState, useEffect, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { getUserFromToken } from '../utils/getUserFromToken';
import type { DecodedToken } from '../utils/getUserFromToken';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<DecodedToken | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = getUserFromToken();
          if (decoded) {
            setIsAuthenticated(true);
            setUser(decoded);
          } else {
            // Token inválido
            localStorage.removeItem('token');
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch (error) {
          // Token inválido ou expirado
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    // Verifica imediatamente
    checkAuth();
    
    // Verifica novamente após um pequeno delay (para casos de redirecionamento)
    const immediateCheck = setTimeout(checkAuth, 50);
    
    // Verifica a autenticação periodicamente e quando a janela recebe foco
    const interval = setInterval(checkAuth, 5000);
    window.addEventListener('focus', checkAuth);
    window.addEventListener('storage', checkAuth);

    return () => {
      clearTimeout(immediateCheck);
      clearInterval(interval);
      window.removeEventListener('focus', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
