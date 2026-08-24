"use client";

interface ProgressCardProps {
  questionsCompleted: boolean;
  sessionInfoCompleted: boolean;
  onViewDashboard?: () => void;
}

export function ProgressCard({
  questionsCompleted,
  sessionInfoCompleted,
  onViewDashboard,
}: ProgressCardProps) {
  const allComplete = questionsCompleted && sessionInfoCompleted;

  return (
    <div className="rounded-xl bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 p-4 shadow-sm">
      <h3 className="mb-3 font-bold text-slate-900">本日のセッション評価</h3>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className={`text-xl ${questionsCompleted ? "✓" : "☐"}`}>
            {questionsCompleted ? "✓" : "☐"}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">
              評価項目を入力 (8問)
            </p>
            <p className="text-xs text-slate-500">約4分</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-xl`}>
            {sessionInfoCompleted ? "✓" : "☐"}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">
              セッション情報を記入
            </p>
            <p className="text-xs text-slate-500">約1分</p>
          </div>
        </div>
      </div>

      {allComplete && (
        <>
          <div className="mt-4 rounded-lg bg-accent-50 p-3 text-center">
            <p className="text-sm font-semibold text-slate-900">
              ✨ すべて完了しました
            </p>
          </div>
          <button
            onClick={onViewDashboard}
            className="mt-3 w-full rounded-lg bg-primary-600 py-3 font-bold text-white shadow-md hover:bg-primary-700 active:bg-primary-800"
          >
            ダッシュボードを開く
          </button>
        </>
      )}
    </div>
  );
}
