import { useAuth } from "./lib/auth";
import { useRouter } from "./lib/router";
import { BottomNav } from "./components/BottomNav";
import { SideNav } from "./components/SideNav";
import { OfflineSync } from "./components/OfflineSync";
import { LoadingState } from "./components/ui";
import { Login } from "./pages/Login";
import { InspectionsList } from "./pages/InspectionsList";
import { LogInspection } from "./pages/LogInspection";
import { InspectionDetail } from "./pages/InspectionDetail";
import { Summary } from "./pages/Summary";

function Screen({ path }: { path: string }) {
  const detail = /^\/inspections\/([^/]+)$/.exec(path);
  if (detail) return <InspectionDetail id={detail[1]!} />;
  if (path === "/log") return <LogInspection />;
  if (path === "/summary") return <Summary />;
  return <InspectionsList />;
}

export default function App() {
  const { status } = useAuth();
  const { path } = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-full bg-slate-50">
        <LoadingState label="Starting up…" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Login />;
  }

  // Mobile-first: content fills the full viewport width with a bottom tab bar. At md+
  // it becomes a two-pane app — a persistent left sidebar and a content pane. Each
  // screen's header spans the pane; only the body content is width-constrained.
  return (
    <div className="min-h-full md:flex">
      <OfflineSync />
      <SideNav />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <Screen path={path} />
      </main>
      <BottomNav />
    </div>
  );
}
