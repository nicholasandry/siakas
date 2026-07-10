import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AssetDashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="h-8 w-40 animate-pulse rounded bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
