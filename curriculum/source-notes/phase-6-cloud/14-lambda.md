# Phase 6 — Chapter 14: Lambda

---

## Chapter Overview

AWS Lambda is serverless compute — you upload code, define triggers, and AWS runs it. No servers to manage, no idle capacity, scales to 1,000+ concurrent executions automatically. You pay only for the milliseconds your code runs.

**Topics:**
- Lambda execution model (cold starts, warm starts)
- Function configuration (memory, timeout, environment)
- Triggers (API Gateway, ALB, S3, SQS, EventBridge, DynamoDB Streams)
- IAM execution role
- Lambda Layers
- Lambda@Edge and CloudFront Functions
- Lambda in VPC
- Lambda Power Tuning
- Provisioned Concurrency

---

## Beginner Theory

### Lambda Execution Model

```
Cold Start:
  Lambda runtime isn't initialized yet (new instance).
  AWS must: allocate container, load runtime, initialize your code.
  Adds latency: 100ms–2s depending on runtime and package size.
  Cold starts happen: first invocation, after scaling up, after inactivity.
  
Warm Start:
  The container is already running. Lambda reuses it.
  Your /tmp directory, global variables, and DB connections persist.
  Near-instant execution (no initialization overhead).

Execution Flow:
  1. Trigger fires (API request, S3 upload, SQS message, cron)
  2. Lambda allocates/reuses a container
  3. Your handler() function is called with event + context
  4. Function executes
  5. Response returned (synchronous) or acknowledged (async)
  6. Container stays warm for reuse (~15 min idle timeout)

Concurrency:
  Each concurrent invocation needs its own container instance.
  1,000 concurrent Lambda executions by default (adjustable to millions).
  Reserved concurrency: limit a function to N concurrent executions.
  Provisioned concurrency: pre-warm N containers (eliminates cold starts).

Pricing:
  $0.20 per 1M requests
  $0.0000166667 per GB-second (memory × duration)
  Free tier: 1M requests/mo + 400,000 GB-seconds/mo (≈ generous)
  128 MB × 100ms = 0.0000000213 USD per invocation
```

---

## Basic Examples

### Lambda Function (Node.js)

```typescript
// index.ts — compiled to index.js for Lambda
import { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

// Initialize clients OUTSIDE handler (reused across warm invocations)
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

// Handler for API Gateway events
export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (event, context) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  console.log("Request ID:", context.awsRequestId);

  try {
    const body = JSON.parse(event.body || "{}");

    await dynamodb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME!,
      Item: {
        id:        { S: context.awsRequestId },
        data:      { S: JSON.stringify(body) },
        createdAt: { S: new Date().toISOString() }
      }
    }));

    return {
      statusCode: 201,
      headers: {
        "Content-Type":                "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ id: context.awsRequestId, status: "created" })
    };
  } catch (err: any) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};

// Handler for SQS events (batch processing)
import { SQSEvent, SQSBatchResponse } from "aws-lambda";

export const sqsHandler: Handler<SQSEvent, SQSBatchResponse> = async (event) => {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  await Promise.allSettled(
    event.Records.map(async record => {
      try {
        const message = JSON.parse(record.body);
        console.log("Processing:", message);
        await processMessage(message);
      } catch (err) {
        console.error("Failed to process record:", record.messageId, err);
        // Report failure — SQS will retry just this message
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    })
  );

  return { batchItemFailures };  // partial failure: re-queue only failed messages
};

// Handler for S3 events
import { S3Event } from "aws-lambda";

export const s3Handler: Handler<S3Event> = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key    = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    console.log(`Processing: s3://${bucket}/${key}`);
    await processFile(bucket, key);
  }
};

// Handler for scheduled events (EventBridge)
import { EventBridgeEvent } from "aws-lambda";

export const scheduledHandler: Handler<EventBridgeEvent<string, unknown>> = async (event) => {
  console.log("Scheduled trigger at:", event.time);
  await runDailyJob();
};
```

### Lambda with Terraform

```hcl
# Package Lambda function
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../dist"   # compiled output
  output_path = "${path.module}/lambda.zip"
}

# Lambda Function
resource "aws_lambda_function" "api" {
  function_name = "myapp-api"
  description   = "MyApp API handler"

  runtime  = "nodejs22.x"
  handler  = "index.handler"

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  memory_size = 512    # MB (also affects CPU proportionally)
  timeout     = 30     # seconds (max 900 = 15 min)

  role = aws_iam_role.lambda.arn

  environment {
    variables = {
      NODE_ENV   = "production"
      TABLE_NAME = aws_dynamodb_table.main.name
      REGION     = var.region
    }
  }

  # VPC (if Lambda needs access to RDS, ElastiCache)
  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Layers
  layers = [aws_lambda_layer_version.deps.arn]

  # Dead letter queue for async failures
  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  # X-Ray tracing
  tracing_config {
    mode = "Active"
  }

  # Concurrency
  reserved_concurrent_executions = 100  # cap at 100 concurrent

  tags = { Name = "myapp-api" }
}

# Provisioned Concurrency (eliminates cold starts)
resource "aws_lambda_provisioned_concurrency_config" "api" {
  function_name                  = aws_lambda_function.api.function_name
  qualifier                      = aws_lambda_alias.production.name
  provisioned_concurrent_executions = 5  # 5 always-warm instances
}

# Lambda Alias
resource "aws_lambda_alias" "production" {
  name             = "production"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}

# Lambda URL (direct HTTPS endpoint without API Gateway)
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "AWS_IAM"   # or "NONE" for public

  cors {
    allow_credentials = false
    allow_origins     = ["https://myapp.com"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE"]
    allow_headers     = ["Content-Type", "Authorization"]
    max_age           = 300
  }
}

# SQS Trigger for Lambda
resource "aws_lambda_event_source_mapping" "sqs" {
  function_name    = aws_lambda_function.api.arn
  event_source_arn = aws_sqs_queue.jobs.arn
  batch_size       = 10           # process up to 10 messages per invocation
  maximum_batching_window_in_seconds = 5  # wait up to 5s for a full batch

  function_response_types = ["ReportBatchItemFailures"]  # partial batch failures

  filter_criteria {
    filter {
      pattern = jsonencode({ body = { type = ["order"] } })  # only order messages
    }
  }
}

# S3 Trigger for Lambda
resource "aws_lambda_permission" "s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.uploads.arn
}

resource "aws_s3_bucket_notification" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  lambda_function {
    lambda_function_arn = aws_lambda_function.api.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }
}

# EventBridge scheduled trigger (cron)
resource "aws_cloudwatch_event_rule" "daily" {
  name                = "myapp-daily-job"
  schedule_expression = "cron(0 3 * * ? *)"  # 3 AM UTC daily
}

resource "aws_cloudwatch_event_target" "daily" {
  rule      = aws_cloudwatch_event_rule.daily.name
  target_id = "myapp-daily"
  arn       = aws_lambda_function.api.arn
}

resource "aws_lambda_permission" "events" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily.arn
}
```

---

## Interview Preparation

**Q1: What causes Lambda cold starts and how do you reduce them?**
A: Cold start: Lambda must provision a new container, install the runtime, load the function code, and run any initialization code outside the handler. Factors increasing cold start: large deployment package (more code to load), heavy initialization (DB connection pools, loading models), VPC Lambda (extra ENI allocation, adds 500ms+ for first VPC connection), interpreted languages with large frameworks. Mitigation strategies: 1) Minimize deployment package size (tree-shake, use bundlers like esbuild). 2) Use Lambda Layers to separate dependencies from code. 3) Keep global initialization minimal. 4) Use Provisioned Concurrency (pre-warm containers — eliminates cold starts but adds cost). 5) For VPC Lambda, use RDS Proxy (keeps connections warm). 6) Use ARM64 (Graviton) — faster cold starts. 7) Keep functions warm with a scheduled ping (poor man's solution).

**Q2: What is the difference between synchronous and asynchronous Lambda invocation?**
A: Synchronous: caller waits for the response. API Gateway → Lambda → response returned to caller. Timeout: API GW max 29s, Lambda max 900s. Errors: returned directly to caller. Async: caller sends event, Lambda processes later. S3 events, EventBridge, SNS → Lambda. Caller gets 202 Accepted immediately. Lambda retries on failure: 2 times (with exponential backoff). On final failure: routes to Dead Letter Queue (SQS or SNS). Best practice: always set a DLQ on async Lambda functions. Event source mappings (SQS → Lambda): Lambda polls SQS and invokes synchronously from Lambda's perspective but the SQS producer doesn't wait. Enables batch processing, partial batch failures, retry logic.

**Q3: What are Lambda Layers and when would you use them?**
A: Lambda Layers are ZIP archives containing shared dependencies, runtimes, or data that multiple functions can reference. Benefits: 1) Separate dependencies from code — dependencies change rarely, code changes often. Update function code without re-uploading 50 MB of node_modules. 2) Share across functions — one layer for common utilities used by 20 Lambda functions. 3) Reduce cold start time slightly (layer content is cached separately). 4) Size limits: function + layers ≤ 250 MB unzipped. Common uses: Node.js: `node_modules` layer. Python: pip packages layer. Data files: ML model weights, static data. Runtime extensions: X-Ray agent, DataDog agent. AWS provides AWS SDK layers, Parameter Store layer, etc.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a Lambda function that returns "Hello World" via Node.js.
2. Set up an API Gateway HTTP API trigger.
3. Test the Lambda from API Gateway URL.
4. View Lambda logs in CloudWatch.
5. Set environment variables (NODE_ENV, TABLE_NAME).
6. Increase memory to 512 MB and timeout to 30 seconds.
7. Create an SQS queue and set it as a Lambda trigger.
8. Send an SQS message and verify Lambda processes it.
9. Add a Dead Letter Queue for Lambda async failures.
10. Enable X-Ray active tracing.

### Intermediate (10 Tasks)
1. Deploy Lambda with Terraform (function + IAM role + trigger).
2. Create a Lambda Layer with node_modules.
3. Set up Lambda in a VPC to access RDS.
4. Implement S3 trigger to process uploaded images.
5. Set up EventBridge cron job (daily 3 AM trigger).
6. Implement partial batch failure handling for SQS.
7. Set up Provisioned Concurrency on a Lambda Alias.
8. Use Lambda Function URL (direct HTTPS without API Gateway).
9. Implement Lambda to send emails via SES.
10. Add Lambda CloudWatch custom metrics.

### Advanced (10 Tasks)
1. Run Lambda Power Tuning to find optimal memory setting.
2. Build a Lambda function with ARM64 (Graviton) for cost savings.
3. Implement Lambda streaming response for AI token streaming.
4. Set up Lambda SnapStart (Java) for near-zero cold starts.
5. Build a Lambda extension for custom telemetry.
6. Implement fan-out with SNS → multiple Lambda consumers.
7. Build a Lambda function that runs a database migration.
8. Implement Lambda with Prisma (ORM in serverless context).
9. Set up Lambda concurrency controls (throttling per function).
10. Build a complex Lambda orchestration with Step Functions.

---

## Self Assessment
1. What is a cold start?
2. What is a warm start?
3. What is concurrency in Lambda?
4. What is provisioned concurrency?
5. What is the maximum Lambda timeout?
6. What is a Lambda Layer?
7. What is a Dead Letter Queue?
8. What triggers can invoke Lambda?
9. What is the difference between synchronous and asynchronous invocation?
10. Why should you initialize AWS clients outside the handler function?

---

## Cheat Sheet

```bash
# Lambda CLI
aws lambda list-functions
aws lambda get-function --function-name myapp-api
aws lambda invoke --function-name myapp-api \
  --payload '{"key":"value"}' \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json

# Deploy code
aws lambda update-function-code \
  --function-name myapp-api \
  --zip-file fileb://lambda.zip

# Update configuration
aws lambda update-function-configuration \
  --function-name myapp-api \
  --memory-size 1024 \
  --timeout 60

# View logs
aws logs tail /aws/lambda/myapp-api --follow

# List event source mappings
aws lambda list-event-source-mappings --function-name myapp-api
```

```
Lambda limits:
  Max timeout:        900 seconds (15 minutes)
  Max memory:         10,240 MB (10 GB)
  /tmp storage:       10,240 MB
  Deployment package: 50 MB (zipped), 250 MB (unzipped)
  Concurrent executions: 1,000 per region (default, can increase)
  Payload size (sync): 6 MB request, 6 MB response
  Payload size (async): 256 KB

Cost estimate:
  128 MB × 100ms = ~$0.000000021 per invocation
  1M invocations/day = $20.80/mo (128MB, 100ms avg)
  Use Lambda Power Tuning to find optimal memory/cost tradeoff
```
