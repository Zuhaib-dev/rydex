import { useState } from "react";

export function CommandSearch({ placeholder = "search_..." }: { placeholder?: string }) {
  const [v, setV] = useState("");
  return (
    <div className="hairline bg-ink text-bone flex items-center gap-2 px-3 py-2.5 font-mono text-[12px]">
      <span className="text-signal">&gt;</span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:text-bone/40"
      />
      <span className="w-2 h-4 bg-signal animate-blink" />
    </div>
  );
}
