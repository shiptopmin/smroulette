"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  excluded: string[];
  onClearExcluded: () => void;
};

export function ParticipantPanel({ value, onChange, excluded, onClearExcluded }: Props) {
  const names = value.split("\n").map((s) => s.trim()).filter(Boolean);
  const remaining = names.filter((n) => !excluded.includes(n));

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
          참가자 목록
        </label>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
        >
          {remaining.length}명
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"이름을 한 줄에 하나씩 입력하세요\n예)\n홍길동\n김철수\n이영희"}
        className="flex-1 rounded-2xl p-4 text-sm resize-none outline-none transition-all duration-200 min-h-[160px]"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.9)",
          lineHeight: 1.8,
        }}
        onFocus={(e) => {
          e.target.style.border = "1px solid rgba(255,215,0,0.4)";
          e.target.style.background = "rgba(255,255,255,0.07)";
        }}
        onBlur={(e) => {
          e.target.style.border = "1px solid rgba(255,255,255,0.1)";
          e.target.style.background = "rgba(255,255,255,0.05)";
        }}
        spellCheck={false}
      />

      {excluded.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "rgba(255,215,0,0.7)" }}>
              이미 당첨된 사람
            </span>
            <button
              onClick={onClearExcluded}
              className="text-xs px-2 py-0.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}
            >
              초기화
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {excluded.map((name) => (
              <span
                key={name}
                className="text-xs px-2 py-0.5 rounded-full line-through"
                style={{ background: "rgba(255,100,100,0.15)", color: "rgba(255,150,150,0.7)" }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
