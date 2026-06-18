import { Loader } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="flex h-[70vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-slate-100 border-t-[#00BFA5] animate-spin"></div>
          <Loader className="absolute h-5 w-5 text-[#1E3A8A] animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-500 tracking-wide animate-pulse">Carregando...</p>
      </div>
    </div>
  );
}
