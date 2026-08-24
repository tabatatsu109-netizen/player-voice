"use client";

interface Props {
  question: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (v: number) => void;
  /** 補足（この項目が何に使われるか） */
  note?: string;
}

/**
 * 1〜10 を 1タップで選ぶ入力。
 * スライダーではなくボタンにしているのは、スマホで狙いを外さず、
 * 全項目を1分以内に終えられるようにするため。
 */
export default function ScaleInput({
  question,
  low,
  high,
  value,
  onChange,
  note,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-bold text-slate-800">{question}</p>
      {note && <p className="mt-0.5 text-[11px] text-slate-500">{note}</p>}
      <div className="mt-2 grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${question} ${n}`}
              aria-pressed={selected}
              onClick={() => onChange(n)}
              className={`aspect-square rounded-md text-xs font-bold transition ${
                selected
                  ? "bg-primary-600 text-white ring-2 ring-primary-300"
                  : "bg-slate-100 text-slate-600 active:bg-slate-200"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>1 {low}</span>
        <span>{high} 10</span>
      </div>
    </div>
  );
}
