# OpenTelemetry GCP PubSub Instrumentation for Node.js

This module provides automatic instrumentation for [`@google-cloud/pubsub`](https://github.com/@google-cloud/pubsub).

## Installation

```
npm install --save @tommbee/opentelemetry-instrumentation-gcp-pubsub
```

## Usage
Initiate this module as part of the `instrumentations` config in your Open Telemetry set up: [@opentelemetry/instrumentation](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-instrumentation)

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { GCPPubSubInstrumentation } = require('@tommbee/opentelemetry-instrumentation-gcp-pubsub');

registerInstrumentations({
  tracerProvider,
  instrumentations: [
    new GCPPubSubInstrumentation({
      subscriberSpanName: 'handle.subscription'
    })
  ]
});
```

### Instrumentation Options

| Options              | Description                                                                |
|----------------------|----------------------------------------------------------------------------|
| `subscriberSpanName` | The name of the Span created to trace events received through a subscriber |

---

[License](LICENSE) 
