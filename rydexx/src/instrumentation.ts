/**
 * Next.js built-in instrumentation hook.
 * This file is automatically loaded by Next.js before any routes are handled.
 * It's the ONLY guaranteed place to initialize OTel before the first request.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the Node.js runtime (not the Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { register: startTracing } = await import("./lib/tracing");
    startTracing();
  }
}
