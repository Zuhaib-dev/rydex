import { motion } from "framer-motion";

export function Crosshairs() {
  return (
    <>
      <span className="absolute -top-1 -left-1 w-2 h-2 border-l border-t border-foreground" />
      <span className="absolute -top-1 -right-1 w-2 h-2 border-r border-t border-foreground" />
      <span className="absolute -bottom-1 -left-1 w-2 h-2 border-l border-b border-foreground" />
      <span className="absolute -bottom-1 -right-1 w-2 h-2 border-r border-b border-foreground" />
    </>
  );
}

export function Panel({
  code,
  title,
  children,
  accent,
  className = "",
}: {
  code: string;
  title: string;
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative hairline bg-card ${className}`}
    >
      <Crosshairs />
      <header className="hairline-b flex items-center justify-between px-4 py-2 mono text-[10px] tracking-[0.22em] uppercase">
        <span className="text-muted-foreground">{code}</span>
        <span className="truncate">{title}</span>
        <span className={accent ?? "text-signal"}>●</span>
      </header>
      <div className="p-5">{children}</div>
    </motion.section>
  );
}

export function PageHead({ code, title, subtitle }: { code: string; title: string; subtitle: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative hairline bg-card p-6"
    >
      <Crosshairs />
      <div className="mono text-[10px] tracking-[0.22em] uppercase text-signal mb-2">{code}</div>
      <h1 className="serif text-[44px] leading-[0.95] font-black tracking-tighter">{title}.</h1>
      <p className="serif italic text-[15px] text-foreground/70 mt-2">{subtitle}</p>
    </motion.header>
  );
}
