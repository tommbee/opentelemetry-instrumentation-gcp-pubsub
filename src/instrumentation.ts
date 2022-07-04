import * as PubSub from '@google-cloud/pubsub';
import {
  InstrumentationBase,
  isWrapped,
  InstrumentationNodeModuleDefinition,
  safeExecuteInTheMiddle, InstrumentationConfig,
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

export class GCPPubSubInstrumentation extends InstrumentationBase<
  typeof PubSub
> {
  constructor(config: InstrumentationConfig = {}) {
    console.log('pubsub instrucmentation constructor');
    super('opentelemetry-instrumentation-gcp-pubsub', '0.0.1', { ...config });
  }

  private _getOnPatch(original: Subscription['on']) {
    const self = this;
    return function on(
      this: Subscription,
      eventName: string | symbol,
      listener: (...args: any[]) => void
    ) {
      console.log('patching listener');
      if (eventName === 'message') {
        const originalListener = listener;

        listener = async (message: Message) => {
          const ctx = propagation.extract(
            context.active(),
            message.attributes || {}
          );
          await self.tracer.startActiveSpan(
            `${this.name} process`,
            {
              kind: SpanKind.CONSUMER,
              attributes: {
                ackId: message.ackId,
                deliveryAttempt: message.deliveryAttempt,
                [SemanticAttributes.MESSAGING_SYSTEM]: 'pubsub',
                [SemanticAttributes.MESSAGING_OPERATION]: 'process',
                [SemanticAttributes.MESSAGING_DESTINATION]: original.name,
                [SemanticAttributes.MESSAGING_DESTINATION_KIND]: 'topic',
                [SemanticAttributes.MESSAGING_MESSAGE_ID]: message.id,
                [SemanticAttributes.MESSAGING_PROTOCOL]: 'pubsub',
                [SemanticAttributes.MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES]: (
                  message.data as Buffer
                ).length,
                'messaging.pubsub.received_at': message.received,
                'messaging.pubsub.acknowlege_id': message.ackId,
                'messaging.pubsub.delivery_attempt': message.deliveryAttempt,
              },
            },
            ctx,
            async span => {
              try {
                safeExecuteInTheMiddle(
                  () => originalListener.apply(this, [message]),
                  () => {
                    span.end();
                  },
                  false
                );
              } catch (err: unknown) {
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: String(err),
                });
              }
              span.end();
            }
          );
        };
      }
      return original.apply(this, [eventName, listener]);
    };
  }

  private unpatch(
    moduleExports: typeof PubSub,
    moduleVersion: string | undefined
  ) {
    if (isWrapped(moduleExports.Subscription.prototype.on)) {
      this._unwrap(moduleExports.Subscription.prototype, 'on');
    }
  }

  private patch(
    moduleExports: typeof PubSub,
    moduleVersion: string | undefined
  ) {
    console.log('patching');
    diag.debug(`Applying patch for @${moduleVersion}`);
    if (!isWrapped(moduleExports.Subscription.prototype.on)) {
      console.log('wrapping');
      this._wrap(
        moduleExports.Subscription.prototype,
        'on',
        this._getOnPatch.bind(this)
      );
    }

    return moduleExports;
  }

  protected init():
    | InstrumentationNodeModuleDefinition<typeof PubSub>
    | InstrumentationNodeModuleDefinition<typeof PubSub>[]
    | void {
    diag.debug(`Initiating PubSub instrumentation`);
    return [
      new InstrumentationNodeModuleDefinition<typeof PubSub>(
        '@google-cloud/pubsub',
        ['^3.0.0'],
        this.patch.bind(this),
        this.unpatch.bind(this)
      ),
    ];
  }
}
