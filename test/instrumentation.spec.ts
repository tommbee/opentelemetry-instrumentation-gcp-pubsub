import 'mocha';
import { SinonStubbedInstance } from 'sinon';
import { expect } from 'expect';
import { GCPPubSubInstrumentation } from '../src';
import {
  getTestSpans,
  registerInstrumentationTesting,
} from '@opentelemetry/contrib-test-utils';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
const instrumentation = registerInstrumentationTesting(
  new GCPPubSubInstrumentation()
);
import * as PubSub from '@google-cloud/pubsub';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { Message } from '@google-cloud/pubsub';
import * as sinon from 'sinon';

describe('GCP PubSub instrumentation', () => {
  beforeEach(() => {
    instrumentation.enable();
  });

  afterEach(() => {
    instrumentation.disable();
    sinon.reset();
  });

  describe('subscriber instrumentation', () => {
    it('should trace a received message', async () => {
      const mockPubSub: SinonStubbedInstance<PubSub.PubSub> =
        sinon.createStubInstance(PubSub.PubSub);

      const subscription = new PubSub.Subscription(
        mockPubSub,
        'test-subscription'
      );
      subscription.on('message', (message: Message) => {
        console.log(`Received message: ${message.id}`);
      });

      subscription.emit('message', {
        id: 112,
        ackId: 1,
        attributes: {},
        deliveryAttempt: 2,
        data: 'ok',
      });
      subscription.emit('message', { id: 112, ackId: 1, deliveryAttempt: 2 });

      const [span, spanTwo] = getTestSpans();

      expect(span.attributes[SemanticAttributes.MESSAGING_SYSTEM]).toEqual(
        'pubsub'
      );
      expect(span.attributes[SemanticAttributes.MESSAGING_PROTOCOL]).toEqual(
        'pubsub'
      );
      expect(span.attributes[SemanticAttributes.MESSAGING_OPERATION]).toEqual(
        'process'
      );
      expect(span.attributes[SemanticAttributes.MESSAGING_DESTINATION]).toEqual(
        'projects/{{projectId}}/subscriptions/test-subscription'
      );
      expect(
        span.attributes[SemanticAttributes.MESSAGING_DESTINATION_KIND]
      ).toEqual('topic');
      expect(span.attributes[SemanticAttributes.MESSAGING_MESSAGE_ID]).toEqual(
        112
      );
      expect(
        span.attributes[SemanticAttributes.MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES]
      ).toEqual(2);
      expect(
        spanTwo.attributes[
          SemanticAttributes.MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES
        ]
      ).toBeUndefined();
      expect(span.attributes['messaging.pubsub.acknowlege_id']).toEqual(1);
    });

    it('should set null config', async () => {
      instrumentation.setConfig();
      expect(instrumentation.getConfig()).toEqual({});
    });

    it('should capture error span on exception', async () => {
      const mockPubSub: SinonStubbedInstance<PubSub.PubSub> =
        sinon.createStubInstance(PubSub.PubSub);

      const subscription = new PubSub.Subscription(
        mockPubSub,
        'test-subscription'
      );
      subscription.on('message', (message: Message) => {
        throw new Error('Something wrong');
      });

      try {
        subscription.emit('message', {
          id: 112,
          ackId: 1,
          attributes: {},
          deliveryAttempt: 2,
          data: 'ok',
        });
      } catch (err) {}
      const [span] = getTestSpans();
      expect(span.status).toEqual({
        code: 2,
        message: 'Error: Something wrong',
      });
    });
  });
});
