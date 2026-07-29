// Chunky, thumb-friendly segmented buttons — the primary input pattern for the
// Log screen (defect type / severity). Each button is ≥44px tall.
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  activeClass?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const activeStyle = opt.activeClass ?? "border-indigo-600 bg-indigo-600 text-white";
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-11 rounded-xl border px-2 text-sm font-semibold transition ${
              active
                ? activeStyle
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
