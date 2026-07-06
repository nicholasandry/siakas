import Link from "next/link";
import { ArrowRight, FileText, Layers3, ShieldCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    title: "Master Data Terstruktur",
    description: "Unit, badan hukum, dan aset dipisahkan sejak awal agar relasi dan scope akses jelas.",
    icon: Layers3,
  },
  {
    title: "RBAC + Scope Guard",
    description: "Permission disimpan di database dan diproses server-side untuk mutasi penting.",
    icon: ShieldCheck,
  },
  {
    title: "Tax Rules Versioned",
    description: "Konfigurasi depresiasi dan master pajak disimpan per periode agar histori tidak rusak.",
    icon: FileText,
  },
];

const ctaClassName =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
      <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            SIAKAS starter project
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight text-slate-950 lg:text-7xl">
              Sistem aset yang rapi untuk struktur gerejawi yang kompleks.
            </h1>
            <p className="max-w-2xl text-pretty text-lg leading-8 text-slate-600 lg:text-xl">
              Next.js, Drizzle, PostgreSQL, dan shadcn/ui disiapkan sebagai fondasi untuk master data,
              aset, depresiasi fiskal, dan audit trail yang bisa diawasi.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className={`${ctaClassName} bg-slate-950 text-white hover:bg-slate-800`}>
              Buka dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/master-data" className={`${ctaClassName} border border-slate-200 bg-white text-slate-950 hover:bg-slate-50`}>
              Lihat master data
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-white/70 bg-white/85 shadow-glow backdrop-blur">
                <CardHeader className="flex-row items-start gap-4 space-y-0">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-900">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="text-base leading-7">{item.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent />
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
