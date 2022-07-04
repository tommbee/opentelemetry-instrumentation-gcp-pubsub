import { InstrumentationConfig } from '@opentelemetry/instrumentation';

export interface GCPPubSubInstrumentationConfig extends InstrumentationConfig {
  /** Specify the name of the {@link Span } created on subscribers */
  subscriberSpanName?: string;
}
