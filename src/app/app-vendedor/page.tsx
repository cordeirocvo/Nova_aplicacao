"use client";

import { Plus, MapPin, List, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AppVendedorPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 pb-24">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-black text-[#1E3A8A]">APP VENDEDOR</h1>
          <p className="text-sm text-slate-500 font-medium">Cordeiro Energia</p>
        </div>
        <button 
          onClick={() => signOut()}
          className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Main Action */}
      <Link 
        href="/app-vendedor/novo"
        className="w-full aspect-square max-w-[300px] bg-[#1E3A8A] rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-white hover:scale-105 transition-transform group"
      >
        <div className="bg-white/20 p-6 rounded-full mb-4 group-hover:scale-110 transition-transform">
          <Plus className="w-12 h-12" />
        </div>
        <span className="text-xl font-black tracking-tight uppercase">Nova Abordagem</span>
      </Link>

      {/* Stats/Quick Info */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-[400px] mt-12">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-2xl font-black text-[#00BFA5]">0</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hoje</span>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-2xl font-black text-[#1E3A8A]">0</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="fixed bottom-6 left-6 right-6 h-20 bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex items-center justify-around px-8">
        <button className="text-[#1E3A8A] flex flex-col items-center gap-1">
          <MapPin className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase">Campo</span>
        </button>
        <div className="w-px h-8 bg-slate-100"></div>
        <button className="text-slate-300 flex flex-col items-center gap-1">
          <List className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase">Meus Leads</span>
        </button>
      </div>
    </div>
  );
}
