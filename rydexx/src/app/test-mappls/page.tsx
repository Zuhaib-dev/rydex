import MapplsMapClient from "./MapplsMapClient";

export const dynamic = "force-dynamic";

export default async function TestMapplsPage() {
  // Read directly from the proper env var — NEXT_PUBLIC_ vars are available in Server Components
  const apiKey = process.env.NEXT_PUBLIC_MAPPLS_KEY ?? "";
  const errorMsg = !apiKey
    ? "NEXT_PUBLIC_MAPPLS_KEY is not set in .env.local."
    : null;

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 flex flex-col font-sans">
      {/* Dynamic Header Banner */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-black text-base shadow-md shadow-emerald-500/10">
            M
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white sm:text-base">Mappls Vector Sandbox</h1>
            <p className="text-[10px] text-zinc-500 sm:text-xs">MapmyIndia SDK Integration Testing</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1 rounded-full text-[10px] sm:text-xs">
          <span className={`w-2 h-2 rounded-full ${apiKey ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
          <span className="text-zinc-300">{apiKey ? "Dynamic Config Read" : "Config Error"}</span>
        </div>
      </header>

      {/* Workspace Area */}
      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-65px)] overflow-hidden">
        {/* Sidebar Diagnostics Panel */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-900 p-6 flex flex-col gap-6 overflow-y-auto bg-zinc-950/30">
          <div className="space-y-2">
            <h2 className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">API Credentials</h2>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 space-y-2">
              <div className="text-[10px] text-zinc-500 font-mono">Source File: <span className="text-zinc-400">.env.local</span></div>
              <div className="text-xs font-mono bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-900 text-emerald-400 truncate select-all">
                {apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}` : "Unavailable"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">How it Works</h2>
            <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
              <p>
                This sandbox reads <code className="text-zinc-300 bg-zinc-950 px-1 rounded">NEXT_PUBLIC_MAPPLS_KEY</code> from <code className="text-zinc-300 bg-zinc-950 px-1 rounded">.env.local</code> and injects it into the Mappls Web JS SDK via a dynamic script tag.
              </p>
              <p className="text-zinc-500">
                Mapbox is untouched — this sandbox is fully isolated to <code className="text-zinc-400">/test-mappls</code>.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/20 border border-rose-800/30 rounded-xl p-4 text-xs text-rose-400 space-y-1">
              <div className="font-semibold text-rose-300">Configuration Check</div>
              <div>{errorMsg}</div>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-zinc-900">
            <div className="text-[10px] text-zinc-600 font-mono">
              Rydex Engineering Sandbox
            </div>
          </div>
        </div>

        {/* Map Rendering Container */}
        <div className="flex-1 relative bg-zinc-900">
          {apiKey ? (
            <MapplsMapClient apiKey={apiKey} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-6 gap-3">
              <span className="text-3xl">🗺️</span>
              <h3 className="font-bold text-white text-base">Mappls Canvas Blocked</h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                Ensure that your Mappls SDK key is entered on the line immediately following the <code className="text-zinc-400 bg-zinc-950 px-1 py-0.5 rounded">#Mapples Map Key</code> comment.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
