# Phase 2 — Chapter 14: Email Services

---

## Chapter Overview

Email is a critical communication channel: transactional (receipts, OTPs, password resets), marketing (newsletters, promotions), and operational (alerts, reports). Building email correctly means deliverability, not just sending.

**Core concepts:**
- SMTP: Simple Mail Transfer Protocol — the wire protocol for sending email
- Transactional email providers: SendGrid, AWS SES, Mailgun, Resend, Postmark
- Email deliverability: SPF, DKIM, DMARC records that prove you own the domain
- Templates: HTML email with Handlebars, MJML, or React Email
- Queuing: never send email synchronously in a request handler

---

## Beginner Theory

### Why Not Use SMTP Directly

Building your own SMTP server means managing: deliverability reputation, IP warming, bounce handling, spam filtering, unsubscribe compliance (CAN-SPAM, GDPR). Transactional providers handle all of this. Use them.

### Email Authentication Records

```
SPF (Sender Policy Framework):
  DNS TXT record listing which servers can send from your domain
  v=spf1 include:sendgrid.net ~all

DKIM (DomainKeys Identified Mail):
  Cryptographic signature in email headers — proves you sent it
  DNS TXT record with public key

DMARC (Domain-based Message Authentication):
  Policy for how receivers handle SPF/DKIM failures
  v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com

All three together → high deliverability, no spam folder
```

---

## Basic Examples

### Nodemailer with SMTP

```javascript
// npm install nodemailer
const nodemailer = require("nodemailer");

// Development: use Ethereal (fake SMTP, captures emails)
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Production: SendGrid SMTP
const prodTransporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY
  }
});

async function sendEmail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: `"My App" <noreply@myapp.com>`,
    to,
    subject,
    html,
    text   // plain-text fallback
  });
  return info.messageId;
}
```

### SendGrid SDK

```javascript
// npm install @sendgrid/mail
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendWelcomeEmail(user) {
  await sgMail.send({
    to:       user.email,
    from:     { email: "noreply@myapp.com", name: "MyApp" },
    subject:  "Welcome to MyApp!",
    templateId: process.env.SENDGRID_WELCOME_TEMPLATE_ID,
    dynamicTemplateData: {
      firstName: user.name.split(" ")[0],
      loginUrl:  `${process.env.CLIENT_URL}/login`,
      year:      new Date().getFullYear()
    }
  });
}

// Batch send (up to 1000 recipients per call)
async function sendNewsletter(recipients, subject, html) {
  const messages = recipients.map(r => ({
    to:       r.email,
    from:     "newsletter@myapp.com",
    subject,
    html,
    customArgs: { recipientId: r.id }  // for webhook event correlation
  }));

  await sgMail.send(messages);
}
```

### Email Templates with Handlebars

```javascript
// npm install handlebars

const fs         = require("fs");
const path       = require("path");
const Handlebars = require("handlebars");

class EmailTemplateRenderer {
  #templates = new Map();

  load(name) {
    if (!this.#templates.has(name)) {
      const file = path.join(__dirname, "../templates/emails", `${name}.hbs`);
      const src  = fs.readFileSync(file, "utf-8");
      this.#templates.set(name, Handlebars.compile(src));
    }
    return this.#templates.get(name);
  }

  render(name, data) {
    return this.load(name)(data);
  }
}

const renderer = new EmailTemplateRenderer();

// templates/emails/password-reset.hbs
/*
<!DOCTYPE html>
<html>
<body>
  <h1>Password Reset</h1>
  <p>Hi {{name}},</p>
  <p>Click the link below to reset your password. It expires in 1 hour.</p>
  <a href="{{resetUrl}}" style="background:#007bff;color:white;padding:12px 24px;border-radius:4px;">
    Reset Password
  </a>
  <p>If you didn't request this, ignore this email.</p>
</body>
</html>
*/

async function sendPasswordReset(user, resetToken) {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const html = renderer.render("password-reset", {
    name:     user.name,
    resetUrl
  });

  await emailTransporter.sendMail({
    to:      user.email,
    subject: "Reset your password",
    html
  });
}
```

---

## Intermediate Concepts

### Email Service Layer

```javascript
// services/email.service.js
const sgMail    = require("@sendgrid/mail");
const logger    = require("../utils/logger");
const queue     = require("../queues/email.queue");

class EmailService {
  // Queue emails instead of sending synchronously
  async sendWelcome(user) {
    await queue.add("send-welcome", { userId: user.id, email: user.email, name: user.name }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 }
    });
  }

  async sendVerification(user, token) {
    await queue.add("send-verification", { userId: user.id, email: user.email, token });
  }

  async sendPasswordReset(user, token) {
    await queue.add("send-password-reset", { email: user.email, name: user.name, token });
  }

  // Direct send (for critical, time-sensitive emails only)
  async sendImmediate(options) {
    try {
      await sgMail.send(options);
      logger.info("Email sent", { to: options.to, subject: options.subject });
    } catch (err) {
      logger.error("Email send failed", { to: options.to, error: err.message });
      throw err;
    }
  }
}

// workers/email.worker.js — processes the queue
const { Worker } = require("bullmq");

const emailWorker = new Worker("emails", async (job) => {
  const { name, data } = job;

  switch (name) {
    case "send-welcome":
      await sendWelcomeEmail(data);
      break;
    case "send-verification":
      await sendVerificationEmail(data);
      break;
    case "send-password-reset":
      await sendPasswordResetEmail(data);
      break;
    default:
      throw new Error(`Unknown email job: ${name}`);
  }
}, { connection: redisConfig, concurrency: 5 });

emailWorker.on("failed", (job, err) => {
  logger.error("Email job failed", { jobId: job.id, name: job.name, error: err.message });
});
```

### Webhook Handling (Bounce, Unsubscribe)

```javascript
// SendGrid sends webhook events for delivery events
// Must handle: bounce, unsubscribe, spam report

router.post("/webhooks/sendgrid", express.raw({ type: "application/json" }), async (req, res) => {
  // Verify webhook signature
  const signature  = req.headers["x-twilio-email-event-webhook-signature"];
  const timestamp  = req.headers["x-twilio-email-event-webhook-timestamp"];
  const publicKey  = process.env.SENDGRID_WEBHOOK_KEY;

  // Verify using SendGrid's EventWebhook verification
  const valid = EventWebhook.verifySignature(publicKey, req.body, signature, timestamp);
  if (!valid) return res.status(403).json({ error: "Invalid signature" });

  const events = JSON.parse(req.body);

  for (const event of events) {
    switch (event.event) {
      case "bounce":
      case "blocked":
        // Permanently bounce → unsubscribe from all emails
        await emailListService.markBounced(event.email);
        break;

      case "unsubscribe":
      case "group_unsubscribe":
        await emailListService.unsubscribe(event.email, event.asm_group_id);
        break;

      case "spamreport":
        await emailListService.markSpam(event.email);
        break;

      case "delivered":
        await emailTrackingService.recordDelivered(event.sg_message_id);
        break;
    }
  }

  res.status(200).end();
});
```

---

## Advanced Concepts

### React Email (Modern Templates)

```jsx
// npm install @react-email/components react react-dom

// emails/WelcomeEmail.tsx
import { Html, Body, Heading, Text, Button, Img } from "@react-email/components";

export function WelcomeEmail({ name, loginUrl }) {
  return (
    <Html>
      <Body style={{ fontFamily: "Arial, sans-serif", background: "#f4f4f4" }}>
        <Img src="https://myapp.com/logo.png" width="150" alt="MyApp" />
        <Heading>Welcome, {name}!</Heading>
        <Text>Thank you for joining MyApp. Get started by logging in:</Text>
        <Button href={loginUrl} style={{ background: "#007bff", color: "white" }}>
          Log In
        </Button>
      </Body>
    </Html>
  );
}

// Render to HTML
import { render } from "@react-email/render";

const html = render(<WelcomeEmail name="Alice" loginUrl="https://myapp.com/login" />);
await sendEmail({ to: user.email, subject: "Welcome!", html });
```

---

## Security

```javascript
// 1. Never include reset tokens in GET URLs that get logged
// GOOD: token in query param only (not path param — paths are often logged)
`${CLIENT_URL}/reset?token=${token}`

// 2. Rate limit email sending per user (prevent abuse)
// Max 3 verification emails per hour per email address

// 3. Unsubscribe link in EVERY marketing email (CAN-SPAM/GDPR requirement)
// One-click unsubscribe: RFC 8058, List-Unsubscribe header

// 4. Validate recipient email addresses before sending
// Use your provider's email validation API

// 5. Never log email bodies (may contain PII or tokens)

// 6. SPF, DKIM, DMARC — configure before sending any production email
```

---

## Industry Usage

- **Transactional**: Postmark (fastest, best deliverability), SendGrid, AWS SES, Resend
- **Marketing**: Mailchimp, Campaign Monitor, HubSpot
- **Self-hosted**: Postal, Haraka, Maddy

---

## Interview Preparation

**Q1: Why should email be sent asynchronously (via a queue)?**
A: Email delivery can take seconds (SMTP negotiation, spam filtering, rate limits). Sending synchronously blocks the HTTP response, degrading user experience and potentially timing out. If the email provider is down, the user request fails. Queuing decouples the user action from email delivery — the request succeeds immediately, the queue retries failed emails automatically.

**Q2: What is email bounce handling and why does it matter?**
A: A bounce occurs when an email cannot be delivered (hard bounce = permanent, e.g., invalid address; soft bounce = temporary, e.g., mailbox full). Email providers track your bounce rate — too many bounces degrades your sending reputation and can get your domain blacklisted. You must handle bounce webhooks from your provider and stop sending to bounced addresses immediately.

**Q3: What are SPF, DKIM, and DMARC?**
A: All three are DNS records that authenticate your email: SPF lists which servers are allowed to send from your domain. DKIM adds a cryptographic signature to emails so receivers can verify they weren't tampered with. DMARC tells receivers what to do when SPF/DKIM fail (none, quarantine, reject) and where to send reports. All three together prevent spoofing and drastically improve deliverability.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up Nodemailer with Ethereal SMTP and send a test email, view it in Ethereal.
2. Send a welcome email with Handlebars template (name, login URL).
3. Implement password reset email with a 1-hour expiring token.
4. Add email verification flow: token in DB, verify endpoint, mark verified.
5. Send an HTML email with a plain-text fallback.
6. Set up SendGrid and send your first transactional email via their SDK.
7. Build a generic `EmailService` class that abstracts the provider.
8. Add email rate limiting: max 5 password reset emails per hour per address.
9. Log all sent emails (to, subject, timestamp, messageId) to the database.
10. Test that emails go to the queue rather than being sent synchronously.

### Intermediate (10 Tasks)
1. Implement email delivery webhooks (bounce, unsubscribe, spam) from SendGrid.
2. Build an email template system with layouts and partials using Handlebars.
3. Send transactional emails via queue (BullMQ) with retries on failure.
4. Implement unsubscribe management with per-category opt-out.
5. Add DKIM signing to emails sent via Nodemailer.
6. Build batch email sending with rate limiting (100 emails/second max).
7. Create an email preview endpoint (GET /email/preview/:template) for devs.
8. Implement email open and click tracking using pixel and redirect.
9. Build a newsletter system with segmentation (send to users matching criteria).
10. Set up DMARC reporting and monitor your deliverability score.

### Advanced (10 Tasks)
1. Build a React Email template system with all transactional emails.
2. Implement multi-provider failover (SendGrid → SES if primary fails).
3. Build an email analytics dashboard (open rates, click rates, bounce rates).
4. Implement A/B testing for email subject lines.
5. Build a GDPR-compliant email preference center.
6. Set up dedicated IP warming schedule for a new sending domain.
7. Implement email suppression list (never send to specific addresses).
8. Build a multi-tenant email system with per-tenant sender domains.
9. Implement scheduled email campaigns with optimal send-time prediction.
10. Build automated email sequence (drip campaign) triggered by user events.

---

## Mini Project

**Email Notification System**: Build a complete notification email service:
- Welcome, verification, password-reset, order-confirmation emails
- Handlebars templates with base layout
- BullMQ queue with retries
- Bounce/unsubscribe webhook handler
- Unsubscribe preferences per user
- Email log table in DB
- Dev preview endpoint

---

## Self Assessment
1. What is the difference between transactional and marketing email?
2. Why should email sending be asynchronous?
3. What are SPF, DKIM, and DMARC?
4. What is an email bounce? How do you handle it?
5. What is the CAN-SPAM/GDPR requirement for marketing emails?
6. How does Nodemailer connect to an SMTP server?
7. What is Ethereal used for?
8. Why should you not log email bodies?
9. What is a hard bounce vs. a soft bounce?
10. What library would you use for React-based email templates?

---

## Cheat Sheet
```javascript
// Nodemailer
const transporter = nodemailer.createTransport({ host, port, auth });
await transporter.sendMail({ from, to, subject, html, text });

// SendGrid
sgMail.setApiKey(key);
await sgMail.send({ to, from, subject, html, templateId, dynamicTemplateData });

// Queue email (never send sync in request handler)
await emailQueue.add("type", data, { attempts: 3, backoff: { type: "exponential" } });
```
