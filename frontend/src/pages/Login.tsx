import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { detectBackendPort } from "../services/api";
import { jwtDecode } from "jwt-decode";
import GlassPage from "../components/GlassPage";
import { AlertCircle } from "lucide-react";

interface DecodedToken {
  id: number;
  email: string;
  tipo: "PACIENTE" | "PROFISSIONAL" | "RECEPCIONISTA";
  iat?: number;
  exp?: number;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    detectBackendPort().catch((err) => {
      console.warn('Erro ao detectar porta do backend:', err);
    });
  }, []);

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setInfoMessage(decodeURIComponent(message));
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('message');
      navigate(`/login?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, senha });
      const token = res.data.token;

      // Log do token no console
      console.log('🔑 Token JWT:', token);
      console.log('📋 Token decodificado:', jwtDecode<DecodedToken>(token));

      localStorage.setItem("token", token);

      const decoded = jwtDecode<DecodedToken>(token);

      const redirectPath = searchParams.get('redirect');
      
      if (redirectPath && redirectPath.startsWith('/')) {
        navigate(redirectPath);
      } else {
        switch (decoded.tipo) {
          case "PACIENTE":
            navigate("/dashboard/paciente");
            break;
          case "PROFISSIONAL":
            navigate("/dashboard/profissional");
            break;
          case "RECEPCIONISTA":
            navigate("/dashboard/recepcionista");
            break;
          default:
            navigate("/dashboard");
            break;
        }
      }
    } catch (err: any) {
      console.error("Erro no login:", err);
      
      if (err.message?.includes("Timeout") || err.message?.includes("timeout")) {
        setError("Timeout: O servidor demorou muito para responder. Verifique se o servidor está rodando.");
      } else if (err.message?.includes("conexão") || err.message?.includes("Network Error") || err.code === "ERR_NETWORK") {
        setError("Erro de conexão: Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
      } else if (err.response?.status === 401) {
        setError(err.response?.data?.erro || "Credenciais inválidas");
      } else if (err.response?.status >= 500) {
        setError("Erro no servidor. Tente novamente mais tarde.");
      } else {
        setError(err.response?.data?.erro || err.message || "Credenciais inválidas");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPage
      align="center"
      maxWidthClass="max-w-md"
      cardClassName="py-16 px-8 sm:py-20 sm:px-10 min-h-[500px] flex flex-col justify-center"
    >
      <div className="text-center mb-10">
        <div className="mx-auto mb-6 flex justify-center">
          <img
            src="https://vendasds.com/wp-content/uploads/2025/11/logo__1_-removebg-preview.png"
            alt="Logo"
            className="h-20 w-auto object-contain"
          />
        </div>
      </div>

      <form className="space-y-6 flex-1 flex flex-col justify-center" onSubmit={handleLogin}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4c4b0] focus:border-[#d4c4b0] focus:z-10 sm:text-sm transition duration-200 bg-white/90 backdrop-blur-sm shadow-sm"
              placeholder="email"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4c4b0] focus:border-[#d4c4b0] focus:z-10 sm:text-sm transition duration-200 bg-white/90 backdrop-blur-sm shadow-sm"
              placeholder="senha"
            />
          </div>
        </div>

        {infoMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm shadow-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm shadow-sm">
            {error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-gray-800 bg-gradient-to-r from-[#e8ddd4] to-[#d4c4b0] hover:from-[#d4c4b0] hover:to-[#c4b09f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d4c4b0] disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-800"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Entrando
              </div>
            ) : (
              "Entrar"
            )}
          </button>
        </div>
      </form>
    </GlassPage>
  );
}
