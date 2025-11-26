import axios from 'axios';

// Detecta automaticamente a porta do backend
const getBackendPort = (): number => {
  // Tenta detectar a porta do backend testando portas comuns
  // Por padrão, usa 3001 se a 3000 estiver ocupada
  const storedPort = localStorage.getItem('backendPort');
  if (storedPort) {
    return parseInt(storedPort, 10);
  }
  // Tenta 3001 primeiro (já que 3000 pode estar ocupada)
  return 3001;
};

const BACKEND_PORT = getBackendPort();

const api = axios.create({
  baseURL: `http://localhost:${BACKEND_PORT}/api`,
  timeout: 10000, // 10 segundos de timeout
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout: A requisição demorou muito para responder');
      return Promise.reject(new Error('Timeout: O servidor demorou muito para responder'));
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('Erro de rede: Não foi possível conectar ao servidor');
      return Promise.reject(new Error('Erro de conexão: Verifique se o servidor está rodando'));
    }
    return Promise.reject(error);
  }
);

// Função para detectar e atualizar a porta do backend
export const detectBackendPort = async (): Promise<number> => {
  const ports = [3000, 3001, 3002, 3003, 3004];
  
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/healthcheck`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        localStorage.setItem('backendPort', port.toString());
        api.defaults.baseURL = `http://localhost:${port}/api`;
        console.log(`Backend detectado e configurado para porta ${port}`);
        return port;
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Continua tentando outras portas
    }
  }
  
  console.warn('Backend não encontrado, usando porta padrão');
  return BACKEND_PORT;
};

// Detecta a porta na inicialização
detectBackendPort();

export default api;