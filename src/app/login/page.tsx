"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email ou senha inválidos.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 z-50">
      <div className="absolute inset-0 bg-[#0A192F]">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00BFA5] via-transparent to-transparent"></div>
      </div>
      
      <div className="relative w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-auto flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Cordeiro Energia Logo" className="object-contain w-full drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cordeiro Energia</h1>
          <p className="text-slate-400 mt-2 text-sm text-center">Entre para gerenciar suas tarefas e instalações.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">E-mail Corporativo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent transition-all"
              placeholder="admin@cordeiroenergia.com.br"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#1E3A8A] to-[#015299] hover:from-[#1e3470] hover:to-[#01417a] text-white font-medium rounded-xl shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2 focus:ring-offset-[#0A192F] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out"></div>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Acessar Plataforma"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
