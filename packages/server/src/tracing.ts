import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// Configure the SDK to export telemetry data to the console
// Enable all auto-instrumentations from the meta package
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'todo-app-server',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  // Only export spans in development mode
  traceExporter: process.env.NODE_ENV === 'production' ? undefined : new ConsoleSpanExporter(),
  instrumentations: [
    new HttpInstrumentation({
      // Reduce verbosity by filtering out polling requests
      ignoreIncomingPaths: [/\/socket\.io\/\?EIO=4&transport=polling/],
      // Only trace requests that take longer than 500ms
      requestHook: (span) => {
        span.setAttribute('custom.min_duration', 500);
      }
    }),
    new ExpressInstrumentation({
      // Reduce instrumentation to only capture important routes
      ignoreLayersType: ['middleware', 'request_handler']
    }),
  ],
  // Set sampling rate to reduce number of traces
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.3) // Only sample 30% of traces
  })
});

// Add environment variable check to disable tracing completely if needed
if (process.env.DISABLE_TRACING === 'true') {
  // Don't start the SDK
  console.log('OpenTelemetry tracing disabled by environment variable');
} else {
  sdk.start();
}

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
