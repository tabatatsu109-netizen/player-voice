interface Props {
  label: string;
  value: string | number | null;
  unit?: string;
  hint?: string;
  tone?: "default" | "player" | "coach" | "alert";
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-white text-slate-800",
  player: "bg-sky-50 text-sky-900",
  coach: "bg-violet-50 text-violet-900",
  alert: "bg-red-50 text-red-900",
};

export default function StatCard({ label, value, unit, hint, tone = "default" }: Props) {
  return (
    <div className={`rounded-xl border border-slate-200 p-3 ${TONE[tone]}`}>
      <p className="text-[11px] font-medium opacity-70">{label}</p>
      <p className="mt-0.5 text-2xl font-black tabular-nums leading-none">
        {value === null || value === undefined || value === "" ? (
          <span className="text-base font-normal opacity-50">—</span>
        ) : (
          value
        )}
        {value !== null && unit && (
          <span className="ml-0.5 text-xs font-bold opacity-60">{unit}</span>
        )}
      </p>
      {hint && <p className="mt-1 text-[10px] leading-tight opacity-60">{hint}</p>}
    </div>
  );
}
