import { ChangeEvent } from "react";

export function CommandSearch({ 
  placeholder = "search_...", 
  value, 
  onChange 
}: { 
  placeholder?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="hairline bg-ink text-bone flex items-center gap-2 px-3 py-2.5 font-mono text-[12px]">
      <span className="text-signal">&gt;</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:text-bone/40"
      />
      <span className="w-2 h-4 bg-signal animate-blink" />
    </div>
  );
}
