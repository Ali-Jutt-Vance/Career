# Phase 6 — Chapter 15: SNS & SQS

---

## Chapter Overview

SNS (Simple Notification Service) and SQS (Simple Queue Service) are AWS's messaging services. SNS is for pub/sub fan-out (one message → many subscribers). SQS is for reliable queue-based message passing (one producer → one consumer pool). Together they form the backbone of event-driven architectures in AWS.

**Topics:**
- SNS topics and subscriptions (email, Lambda, SQS, HTTP)
- SQS Standard vs. FIFO queues
- Dead Letter Queues (DLQ)
- Message visibility timeout
- SQS with Lambda event source mapping
- SNS fan-out pattern (SNS → multiple SQS queues)
- FIFO ordering and deduplication

---

## Beginner Theory

### SNS vs. SQS

```
SNS (Simple Notification Service) — pub/sub:
  One publisher → N subscribers (fan-out)
  Push delivery: SNS pushes to all subscribers immediately
  Subscribers: Lambda, SQS, HTTP/S, email, SMS, mobile push
  Message persistence: NOT stored (if subscriber is unavailable, message is lost)
  Use for: notifications, fan-out to multiple systems, alerting

SQS (Simple Queue Service) — message queue:
  Producers → Queue → Consumers (pull)
  Pull delivery: consumers poll the queue
  Message persistence: stored for 1–14 days (default 4 days)
  Guarantees at-least-once delivery (Standard) or exactly-once (FIFO)
  Use for: decoupling, background jobs, load leveling

SNS + SQS fan-out pattern (best of both):
  Publisher → SNS Topic
  SNS Topic → SQS Queue 1 (email service)
              SQS Queue 2 (analytics service)
              SQS Queue 3 (audit service)
  Each service processes messages independently, at its own pace.
  If one service is down, messages buffer in its SQS queue.

SQS Queue Types:
  Standard:  at-least-once, nearly unlimited throughput, messages may be out of order
  FIFO:      exactly-once, 300 messages/sec (3,000 with batching), strict ordering
             Use FIFO for: payment processing, order management, financial transactions
```

---

## Basic Examples

### SNS + SQS with Terraform

```hcl
# SNS Topic
resource "aws_sns_topic" "orders" {
  name              = "myapp-orders"
  kms_master_key_id = "alias/aws/sns"   # encrypt messages at rest
}

# SQS Queue for Email Service
resource "aws_sqs_queue" "email_jobs" {
  name                       = "myapp-email-jobs"
  message_retention_seconds  = 86400  # 1 day
  visibility_timeout_seconds = 300    # 5 min (must be >= Lambda timeout)
  receive_wait_time_seconds  = 20     # long polling (efficient)
  max_message_size           = 262144 # 256 KB max

  kms_master_key_id = "alias/aws/sqs"

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_jobs_dlq.arn
    maxReceiveCount     = 3  # 3 failed attempts → DLQ
  })

  tags = { Name = "myapp-email-jobs" }
}

# Dead Letter Queue for email jobs
resource "aws_sqs_queue" "email_jobs_dlq" {
  name                      = "myapp-email-jobs-dlq"
  message_retention_seconds = 1209600  # 14 days (investigate failures)
  tags = { Name = "myapp-email-dlq" }
}

# SQS Queue Policy: allow SNS to send messages
resource "aws_sqs_queue_policy" "email_jobs" {
  queue_url = aws_sqs_queue.email_jobs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.email_jobs.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.orders.arn }
      }
    }]
  })
}

# SNS → SQS subscription (email jobs)
resource "aws_sns_topic_subscription" "orders_to_email" {
  topic_arn = aws_sns_topic.orders.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.email_jobs.arn

  # Filter: only route specific order types to email queue
  filter_policy = jsonencode({
    event_type = ["order.created", "order.shipped"]
  })

  raw_message_delivery = true  # deliver raw message body, not JSON-wrapped
}

# SQS → Lambda trigger
resource "aws_lambda_event_source_mapping" "email_worker" {
  function_name    = aws_lambda_function.email_worker.arn
  event_source_arn = aws_sqs_queue.email_jobs.arn

  batch_size                         = 5
  maximum_batching_window_in_seconds = 10

  function_response_types = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 10  # limit concurrent Lambda invocations
  }
}

# FIFO Queue (for order processing — strict ordering required)
resource "aws_sqs_queue" "order_processing" {
  name                        = "myapp-order-processing.fifo"   # must end in .fifo
  fifo_queue                  = true
  content_based_deduplication = true   # dedup by message content hash
  deduplication_scope         = "messageGroup"

  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_processing_dlq.arn
    maxReceiveCount     = 3
  })
}
```

### Publishing Messages (Node.js)

```typescript
import { SNSClient, PublishCommand }    from "@aws-sdk/client-sns";
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";

const sns = new SNSClient({ region: process.env.AWS_REGION });
const sqs = new SQSClient({ region: process.env.AWS_REGION });

// Publish to SNS (fan-out to all subscribers)
export async function publishOrderEvent(event: {
  type: string;
  orderId: string;
  userId: string;
  amount: number;
}) {
  await sns.send(new PublishCommand({
    TopicArn: process.env.ORDERS_TOPIC_ARN!,
    Message:  JSON.stringify(event),
    Subject:  `Order Event: ${event.type}`,

    // Message attributes for filter policies
    MessageAttributes: {
      event_type: {
        DataType:    "String",
        StringValue: event.type
      },
      userId: {
        DataType:    "String",
        StringValue: event.userId
      }
    }
  }));

  console.log(`Published event: ${event.type} for order ${event.orderId}`);
}

// Send directly to SQS queue
export async function enqueueEmailJob(job: {
  to: string;
  template: string;
  data: Record<string, unknown>;
}) {
  await sqs.send(new SendMessageCommand({
    QueueUrl:     process.env.EMAIL_QUEUE_URL!,
    MessageBody:  JSON.stringify(job),
    DelaySeconds: 0,   // delay before message becomes visible (0-900s)
    MessageAttributes: {
      template: {
        DataType:    "String",
        StringValue: job.template
      }
    }
  }));
}

// Send to FIFO queue (requires MessageGroupId for ordering)
export async function enqueueOrderUpdate(orderId: string, update: unknown) {
  await sqs.send(new SendMessageCommand({
    QueueUrl:               process.env.ORDER_QUEUE_URL!,
    MessageBody:            JSON.stringify(update),
    MessageGroupId:         orderId,   // all messages for same orderId → ordered
    MessageDeduplicationId: `${orderId}-${Date.now()}`  // prevent duplicates
  }));
}

// Consume SQS messages manually (without Lambda trigger)
export async function pollQueue() {
  while (true) {
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl:            process.env.EMAIL_QUEUE_URL!,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds:     20,    // long polling — wait up to 20s for messages
      VisibilityTimeout:   300,   // 5 min to process before visible again
      AttributeNames:      ["All"],
      MessageAttributeNames: ["All"]
    }));

    if (!response.Messages?.length) continue;

    await Promise.allSettled(
      response.Messages.map(async msg => {
        try {
          const job = JSON.parse(msg.Body!);
          await sendEmail(job);

          // Delete on success
          await sqs.send(new DeleteMessageCommand({
            QueueUrl:      process.env.EMAIL_QUEUE_URL!,
            ReceiptHandle: msg.ReceiptHandle!
          }));
        } catch (err) {
          console.error("Failed to process message:", msg.MessageId, err);
          // Don't delete — message becomes visible again after VisibilityTimeout
          // Will retry up to maxReceiveCount times before going to DLQ
        }
      })
    );
  }
}
```

---

## Interview Preparation

**Q1: What is the difference between SNS and SQS?**
A: SNS: push-based pub/sub. One message goes to ALL subscribers simultaneously (fan-out). Message not stored — if a subscriber is unavailable at delivery time, the message is lost (unless subscriber is an SQS queue, which buffers it). Good for: real-time notifications, fan-out to multiple systems. SQS: pull-based queue. Producers send to queue; consumers poll and pull at their own pace. Messages stored durably (up to 14 days). At-least-once delivery. Consumer deletes message after processing. Good for: decoupling, load leveling, retry with DLQ. Pattern: SNS + SQS = fan-out with durability. SNS pushes to multiple SQS queues; each SQS queue decouples its consumer service and adds retry/DLQ.

**Q2: What is the visibility timeout in SQS?**
A: When a consumer receives a message, SQS hides it from other consumers for the visibility timeout period (default 30 seconds). This prevents two consumers from processing the same message simultaneously. The consumer must: 1) process the message, 2) delete it before visibility timeout expires. If it fails to delete within the timeout, the message becomes visible again and another consumer can pick it up. Setting: visibility timeout must be > consumer processing time. For Lambda, set visibility timeout ≥ Lambda function timeout × 6 (recommended). If a message is received `maxReceiveCount` times without deletion, it goes to the DLQ.

**Q3: What is a Dead Letter Queue and why is it critical?**
A: A DLQ receives messages that failed to process after `maxReceiveCount` attempts (e.g., 3 retries). Without a DLQ, failed messages either stay in the queue forever (poisoning the queue) or get dropped after retention expires. With a DLQ: failed messages move to DLQ, regular queue stays healthy. You can inspect DLQ messages to understand failure patterns, fix bugs, and replay messages. Always set a DLQ alarm (CloudWatch) to page when messages arrive — DLQ messages represent business failures (orders not processed, emails not sent). DLQ retention should be long (14 days) to give you time to investigate and fix. Redrive policy: move DLQ messages back to the source queue for reprocessing after fixing the bug.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create an SNS topic.
2. Subscribe an email address to the SNS topic.
3. Publish a message to the SNS topic via console.
4. Verify email delivery.
5. Create an SQS Standard queue.
6. Subscribe the SQS queue to the SNS topic.
7. Send a message to SQS manually.
8. Receive the message from SQS with the CLI.
9. Delete the message after receiving.
10. Set a DLQ on the SQS queue.

### Intermediate (10 Tasks)
1. Create SNS + SQS fan-out with Terraform.
2. Add SNS filter policy to route specific event types.
3. Set up Lambda triggered by SQS with batch processing.
4. Implement partial batch failure handling in Lambda.
5. Set up CloudWatch alarm when DLQ receives messages.
6. Create a FIFO queue and publish with MessageGroupId.
7. Test FIFO ordering (messages arrive in order).
8. Set up visibility timeout larger than Lambda timeout.
9. Implement a Node.js worker that polls SQS (long polling).
10. Use SNS to send email notifications on order events.

### Advanced (10 Tasks)
1. Build a complete event-driven order processing pipeline (SNS → SQS → Lambda).
2. Implement message replay from DLQ after bug fix.
3. Set up SNS message signing verification in consumer.
4. Build a rate-limited consumer with SQS and token bucket.
5. Implement idempotent message processing (handle duplicates).
6. Set up SQS extended client for messages > 256 KB (S3 offload).
7. Build an audit trail with SNS → Kinesis → S3.
8. Implement priority queue pattern with multiple SQS queues.
9. Set up cross-account SNS subscription.
10. Build circuit breaker for SQS consumer.

---

## Self Assessment
1. What is SNS?
2. What is SQS?
3. What is the difference between SNS and SQS?
4. What is the fan-out pattern?
5. What is visibility timeout?
6. What is a Dead Letter Queue?
7. What is maxReceiveCount?
8. What is the difference between Standard and FIFO queues?
9. What is long polling in SQS?
10. What is raw message delivery in SNS subscriptions?

---

## Cheat Sheet

```bash
# SNS
aws sns list-topics
aws sns create-topic --name myapp-orders
aws sns publish --topic-arn arn:aws:sns:... --message '{"event":"order.created"}' \
  --message-attributes '{"event_type":{"DataType":"String","StringValue":"order.created"}}'
aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:...
aws sns subscribe --topic-arn arn:aws:sns:... --protocol sqs --notification-endpoint arn:aws:sqs:...

# SQS
aws sqs list-queues
aws sqs create-queue --queue-name myapp-jobs
aws sqs send-message --queue-url https://sqs... --message-body '{"job":"email"}'
aws sqs receive-message --queue-url https://sqs... --wait-time-seconds 20 --max-number-of-messages 10
aws sqs delete-message --queue-url https://sqs... --receipt-handle <handle>
aws sqs get-queue-attributes --queue-url https://sqs... --attribute-names All
aws sqs purge-queue --queue-url https://sqs...   # delete all messages (careful!)
```

```
SQS limits:
  Max message size:        256 KB (use SQS Extended Client for larger)
  Max retention:           14 days
  Max visibility timeout:  12 hours
  Long polling max wait:   20 seconds
  Batch operations:        up to 10 messages per request
  FIFO throughput:         300 messages/sec (3,000 with batching)
  Standard throughput:     nearly unlimited

SNS limits:
  Max message size:        256 KB
  Max subscribers per topic: 12.5 million (email), 200 SQS queues, unlimited Lambda
  Fan-out: unlimited subscribers

Pricing:
  SQS: $0.40 per million requests (first 1M free)
  SNS: $0.50 per million publishes + $0.09 per 100K notification deliveries
```
