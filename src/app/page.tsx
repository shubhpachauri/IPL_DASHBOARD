import { SSRDashboard } from "@/component/SSRDashboard";

// Force dynamic rendering (SSR) for this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <main className="flex flex-col gap-8 items-center max-w-6xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              IPL T20 Live Dashboard (SSR)
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real-time IPL cricket dashboard with server-side rendering
            </p>
          </div>
          <SSRDashboard />
        </main>
      </div>
    </div>
  );
}
