"use client";

import { useState } from "react";
import { Radio, Send } from "lucide-react";
import { PageHead, Panel } from "@/components/partner/shared";

const HISTORY = [
  { id: "BC-0091", ts: "02:11", channel: "All Drivers", msg: "Surge active across SXR sector. Move to Lal Chowk.", reach: 412 },
  { id: "BC-0090", ts: "01:42", channel: "Riders · SXR", msg: "Heavy rain expected. ETAs may extend.", reach: 1204 },
  { id: "BC-0089", ts: "00:58", channel: "All Partners", msg: "Payout cycle complete. Check settlements.", reach: 412 },
];

export default function Broadcast() {
  const [audience, setAudience] = useState("all");
  const [msg, setMsg] = useState("");

  return (
    <div className="space-y-6">
      <PageHead code="ADM / 07" title="Broadcast" subtitle="Push directives across the fleet · throttled 1 msg / 30s" />

      <Panel code="TX / 07" title="Compose Transmission" accent="text-signal">
        <div className="space-y-4">
          <div>
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-2">Audience</div>
            <div className="hairline grid grid-cols-2 sm:grid-cols-4 bg-background">
              {[
                { v: "all", l: "All Users" },
                { v: "drivers", l: "Drivers" },
                { v: "riders", l: "Riders" },
                { v: "region", l: "By Region" },
              ].map((a) => (
                <button
                  key={a.v}
                  onClick={() => setAudience(a.v)}
                  className={`px-3 py-2.5 mono text-[10px] tracking-[0.22em] uppercase transition-colors cursor-pointer ${
                    audience === a.v ? "brick" : "hover:bg-secondary"
                  }`}
                >{a.l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-2">Payload · max 240 chars</div>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value.slice(0, 240))}
              rows={4}
              className="w-full hairline bg-background p-3 font-mono text-[12px] focus:outline-none focus:ring-1 focus:ring-signal resize-none"
              placeholder="> type_transmission_..."
            />
            <div className="mono text-[9px] tracking-[0.22em] text-muted-foreground mt-1 text-right">{msg.length} / 240</div>
          </div>
          <button className="brick mono text-[11px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-signal transition-colors cursor-pointer inline-flex items-center gap-2">
            <Send className="h-3.5 w-3.5" /> Transmit
          </button>
        </div>
      </Panel>

      <Panel code="LOG / 07" title="Transmission History">
        <div className="divide-y divide-border">
          {HISTORY.map((h) => (
            <div key={h.id} className="py-3 grid grid-cols-1 md:grid-cols-[80px_120px_1fr_80px] gap-3 items-start hover:bg-secondary/40 transition-colors px-2">
              <span className="mono text-[10px] text-signal">{h.id}</span>
              <span className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{h.ts} · {h.channel}</span>
              <span className="serif text-[15px] flex items-center gap-2"><Radio className="h-3 w-3 text-signal shrink-0" />{h.msg}</span>
              <span className="mono text-[10px] tracking-[0.22em] text-right">{h.reach} rx</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
