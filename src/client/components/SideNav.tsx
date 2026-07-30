import { useAuth } from "../lib/auth";
import { useOffline } from "../lib/useOffline";
import { useRouter } from "../lib/router";

// Desktop-only left rail (hidden below md). Mirrors the mobile BottomNav's
// destinations, plus branding, the signed-in user, and sign-out.
export function SideNav() {
  const { path, navigate } = useRouter();
  const { user, logout } = useAuth();
  const { online, pendingCount } = useOffline();

  const isList = path === "/" || path.startsWith("/inspections");

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg shadow-sm shadow-indigo-600/30">
          🧵
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-slate-900">Quality Inspection</div>
          <div className="text-xs text-slate-500">Tracker</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        <NavItem icon="📋" label="Inspections" active={isList} onClick={() => navigate("/")} />
        <NavItem icon="＋" label="Log inspection" active={path === "/log"} onClick={() => navigate("/log")} />
        <NavItem icon="📊" label="Summary" active={path === "/summary"} onClick={() => navigate("/summary")} />
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4">
        {!online && (
          <div className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
            Offline{pendingCount > 0 ? ` · ${pendingCount} queued` : ""}
          </div>
        )}
        {user && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium text-slate-700">
              {user.username}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-11 rounded-xl px-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}
