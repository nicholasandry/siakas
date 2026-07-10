import React from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Glowing backdrop ring */}
        <div className="absolute h-12 w-12 rounded-full border-4 border-emerald-600/10" />
        {/* Spinning indicator */}
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
      <p className="animate-pulse text-sm font-medium tracking-wide text-slate-500">
        Memuat data...
      </p>
    </div>
  );
}
