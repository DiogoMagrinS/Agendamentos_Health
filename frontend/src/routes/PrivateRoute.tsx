// src/routes/PrivateRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Verifica se há token no localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      // Se há token, aguarda um pouco para o AuthProvider verificar
      const timer = setTimeout(() => {
        setIsChecking(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Se não há token, não precisa aguardar
      setIsChecking(false);
    }
  }, []);

  // Se está verificando, mostra loading
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se está autenticado ou tem token no localStorage, permite acesso
  const hasToken = localStorage.getItem('token');
  if (isAuthenticated || hasToken) {
    return <>{children}</>;
  }

  return <Navigate to="/login" />;
}