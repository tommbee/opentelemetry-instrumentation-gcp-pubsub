import * as PubSub from '@google-cloud/pubsub';
import {
  InstrumentationBase,
  isWrapped,
  InstrumentationNodeModuleDefinition,
  safeExecuteInTheMiddle,
} from '@opentelemetry/instrumentation';
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  diag,
} from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { Subscription, Message } from '@google-cloud/pubsub';
import { VERSION } from './version';
import { GCPPubSubInstrumentationConfig } from './types';

export class GCPPubSubInstrumentation extends InstrumentationBase<
  typeof PubSub
> {
  protected override _config!: GCPPubSubInstrumentationConfig;

  constructor(config: GCPPubSubInstrumentationConfig = {}) {
    super(
      'opentelemetry-instrumentation-gcp-pubsub',
      VERSION,
      Object.assign({}, config)
    );
  }

  override setConfig(config: GCPPubSubInstrumentationConfig = {}) {
    this._config = config;
  }

  protected init():
    | InstrumentationNodeModuleDefinition<typeof PubSub>
    | InstrumentationNodeModuleDefinition<typeof PubSub>[]
    | void {
    diag.debug('Initiating GCP PubSub Open Telemetry instrumentation');

    return [
      new InstrumentationNodeModuleDefinition<typeof PubSub>(
        '@google-cloud/pubsub',
        ['^3.0.0'],
        this.patch.bind(this),
        this.unpatch.bind(this)
      ),
    ];
  }

  private unpatch(
    moduleExports: typeof PubSub,
    moduleVersion: string | undefined
  ) {
    diag.debug(`Unpatching @google-cloud/pubsub@${moduleVersion}`);

    if (isWrapped(moduleExports.Subscription.prototype.on)) {
      this._unwrap(moduleExports.Subscription.prototype, 'on');
    }
  }

  private patch(
    moduleExports: typeof PubSub,
    moduleVersion: string | undefined
  ) {
    diag.debug(`Applying patch for @google-cloud/pubsub@${moduleVersion}`);

    console.log(isWrapped(moduleExports.Subscription.prototype.on));
    if (!isWrapped(moduleExports.Subscription.prototype.on)) {
      this._wrap(
        moduleExports.Subscription.prototype,
        'on',
        this._getOnPatch.bind(this)
      );
    }

    return moduleExports;
  }

  private _getOnPatch(original: Subscription['on']) {
    const self = this;
    return function on(
      this: Subscription,
      eventName: string | symbol,
      listener: (...args: any[]) => void
    ) {
      if (eventName === 'message') {
        const originalListener = listener;

        listener = (message: Message) => {
          const ctx = propagation.extract(
            context.active(),
            message.attributes || {}
          );
          self.tracer.startActiveSpan(
            self._config.subscriberSpanName || `${this.name} process`,
            {
              kind: SpanKind.CONSUMER,
              attributes: {
                ackId: message.ackId,
                deliveryAttempt: message.deliveryAttempt,
                [SemanticAttributes.MESSAGING_SYSTEM]: 'pubsub',
                [SemanticAttributes.MESSAGING_OPERATION]: 'process',
                [SemanticAttributes.MESSAGING_DESTINATION]: this.name,
                [SemanticAttributes.MESSAGING_DESTINATION_KIND]: 'topic',
                [SemanticAttributes.MESSAGING_MESSAGE_ID]: message.id,
                [SemanticAttributes.MESSAGING_PROTOCOL]: 'pubsub',
                [SemanticAttributes.MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES]:
                  message.data ? (message.data as Buffer).length : undefined,
                'messaging.pubsub.received_at': message.received,
                'messaging.pubsub.acknowlege_id': message.ackId,
                'messaging.pubsub.delivery_attempt': message.deliveryAttempt,
              },
            },
            ctx,
            span => {
              try {
                safeExecuteInTheMiddle(
                  () => originalListener.apply(this, [message]),
                  () => {},
                  false
                );
              } catch (err: unknown) {
                span
                  .setStatus({
                    code: SpanStatusCode.ERROR,
                    message: String(err),
                  })
                  .end();
                throw err;
              }
              span.end();
            }
          );
        };
      }
      return original.apply(this, [eventName, listener]);
    };
  }
}
