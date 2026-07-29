import { useRouter } from "../lib/router";

// Persistent bottom tab bar with a raised "+ Log" action in the middle — the
// supervisor's most frequent task is always one thumb-tap away.
export function BottomNav() {
  const { path, navigate } = useRouter();

  const isList = path === "/" || path.startsWith("/inspections");
  const isSummary = path === "/summary";

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] border-t border-slate-200 bg-white">
      <div className="grid grid-cols-3 items-center">
        <TabButton
          label="Inspections"
          icon="📋"
          active={isList}
          onClick={() => navigate("/")}
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/log")}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl font-light text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
            aria-label="Log a new inspection"
          >
            +
          </button>
        </div>
        <TabButton
          label="Summary"
          icon="📊"
          active={isSummary}
          onClick={() => navigate("/summary")}
        />
      </div>
    </nav>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
        active ? "text-indigo-600" : "text-slate-400"
      }`}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}
