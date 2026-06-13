/**
 * OpenTelemetry SDK bootstrap for rydexx (Next.js).
 * Loaded via src/instrumentation.ts before any requests are handled.
 *
 * OTLP (Jaeger/Grafana) → set OTEL_EXPORTER_OTLP_ENDPOINT in .env.local
 * Console fallback       → leave OTEL_EXPORTER_OTLP_ENDPOINT blank
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

let sdk: NodeSDK | null = null;

export function register() {
  // Read env vars here — at call time — so .env.local values are already loaded
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const isProduction = process.env.NODE_ENV === "production";

  // In production with no OTLP endpoint configured → skip tracing entirely
  // (avoids ConsoleSpanExporter flooding prod logs)
  if (isProduction && !otlpEndpoint) {
    console.log("[OTel] No OTEL_EXPORTER_OTLP_ENDPOINT set — tracing disabled in production.");
    return;
  }

  const useOtlp = !!otlpEndpoint;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "rydexx",
    [ATTR_SERVICE_VERSION]: "1.0.0",
    "deployment.environment": process.env.NODE_ENV ?? "development",
  });

  const exporter = useOtlp
    ? new OTLPTraceExporter({ url: otlpEndpoint })
    : new ConsoleSpanExporter();

  const processor = useOtlp
    ? new BatchSpanProcessor(exporter)
    : new SimpleSpanProcessor(exporter);

  sdk = new NodeSDK({
    resource,
    spanProcessors: [processor],
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-mongodb": {
          dbStatementSerializer: (cmd: Record<string, unknown>) =>
            JSON.stringify(cmd),
        },
        "@opentelemetry/instrumentation-http": { enabled: true },
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
    console.log(
      `[OTel] Tracing → ${useOtlp ? "Jaeger @ " + otlpEndpoint : "console (no OTEL_EXPORTER_OTLP_ENDPOINT set)"}`,
    );
  } catch (err) {
    console.error("[OTel] Failed to start tracing SDK:", err);
  }
}
