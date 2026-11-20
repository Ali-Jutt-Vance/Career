# Sending Email

> [!GOALS]
> - Distinguish **transactional** email (receipts, password resets) from **marketing** email, and why they are handled differently.
> - Explain how email travels — SMTP, mail servers, DNS — and why applications use an **email provider** instead of their own mail server.
> - Configure **SPF**, **DKIM** and **DMARC** so your messages are trusted and your domain cannot easily be spoofed.
> - Send email reliably from an application: a provider API or SMTP, **background jobs**, retries, idempotency and logging.
> - Build safe templates: escaping user data, plain-text versions, and links that work.
> - Handle **bounces**, **complaints** and **unsubscribes** with a suppression list and one-click unsubscribe.
> - Know the rules: consent and unsubscribe laws, and the bulk-sender requirements of large mailbox providers.

## Why this matters

Email is still the most important channel between an application and its users. It carries the messages that must arrive: "verify your email address", "reset your password", "your order has shipped", "your invoice is attached", "someone logged in from a new device". If those messages land in the spam folder, or do not arrive at all, users cannot sign up, cannot get back into their accounts, and stop trusting the product.

Sending one email from code takes three lines. Sending email **well** is harder:

- Mailbox providers such as Gmail and Outlook decide whether your message reaches the inbox, the spam folder, or nowhere — based on your domain's **authentication** records and your **reputation**.
- Your request handler should not wait on a slow external service, and a temporary failure should not lose a password-reset email.
- Templates mix user data into HTML, which brings back the injection problems from {{ch:validation}}.
- Addresses go bad, people mark messages as spam, and laws require working unsubscribe links. Ignoring these damages your reputation until even your password resets stop arriving.

This chapter covers how email works, how to set up a domain to send it, and how to send it from an application reliably and safely.

## The simple idea

Sending email is like sending letters through the postal service. You do not build your own post office — you use an established courier (an **email provider**). Each letter needs:

- a **return address you really own**, with proof the courier checks (SPF, DKIM, DMARC — like a company seal on the envelope);
- correct content, readable by everyone (HTML **and** plain text);
- respect for the recipient: if someone writes "return to sender — no such person", you stop writing to that address; if someone says "stop sending me adverts", you stop.

Postal workers (mailbox providers) notice senders who ignore these rules and start throwing their letters away — including the important ones.

> [!ANALOGY]
> Sending email is like using a courier service: you use an established courier instead of building a post office, you prove the return address is really yours, and you stop writing to people who moved away or asked you to stop. Couriers that see you ignoring this start discarding your letters.
>
> **Where the analogy breaks:** a real courier delivers whatever you pay for. Email has no guarantee of delivery at all — the receiving mail server decides, in a few milliseconds, based on signals you cannot fully see. "Sent" in your logs only means your provider accepted the message, not that it reached the inbox.

## The proper definition and key words

**Application email** is email sent automatically by software, either as a direct result of a user's action or event (**transactional**) or as a message to many recipients for promotion or news (**marketing** or **bulk**).

Key words:

- **SMTP** (Simple Mail Transfer Protocol) — the protocol mail servers use to send and relay messages.
- **MTA** (Mail Transfer Agent) — a mail server that receives and forwards email.
- **MX record** — the DNS record naming the mail servers that **receive** email for a domain ({{ch:dns}}).
- **Email service provider** (ESP) — a service that sends email for you through an API or SMTP, such as Amazon SES, Postmark, SendGrid, Mailgun, Resend or Brevo.
- **SPF** (Sender Policy Framework) — a DNS record listing which servers may send email for a domain.
- **DKIM** (DomainKeys Identified Mail) — a digital signature added to each message, verifiable with a public key published in DNS.
- **DMARC** (Domain-based Message Authentication, Reporting and Conformance) — a DNS policy telling receivers what to do with messages that fail SPF and DKIM alignment, and where to send reports.
- **Deliverability** — the ability of your email to reach recipients' inboxes rather than spam folders or nowhere.
- **Sender reputation** — the trust mailbox providers place in your domain and sending IP addresses, based on authentication, complaints, bounces and engagement.
- **Bounce** — a message that could not be delivered: **hard** (permanent, such as a non-existent address) or **soft** (temporary, such as a full mailbox).
- **Complaint** — a recipient marking your message as spam.
- **Suppression list** — the addresses you must not send to (bounced, complained, unsubscribed).

## How email works

### Level 1 — The journey of one message

```text
  your app ──API/SMTP──▶ email provider (MTA) ──SMTP──▶ recipient's mail server ──▶ inbox / spam / rejected
                         signs with DKIM,              looks up your SPF, DKIM key and
                         sends from its IPs             DMARC policy in DNS; checks reputation
```

1. Your application hands the message to an **email provider** through an HTTPS API (most common) or SMTP.
2. The provider signs it with **DKIM**, looks up the recipient domain's **MX record**, and connects to the recipient's mail server over SMTP.
3. The receiving server checks: does the sending server appear in your **SPF** record? Is the **DKIM** signature valid? Do they **align** with the visible "From" domain, as your **DMARC** policy requires? What is this sender's **reputation**?
4. It accepts the message into the inbox or spam folder — or rejects it, producing a **bounce** that comes back to the provider.
5. The provider tells you what happened through **webhooks** (delivered, bounced, complained).

### Level 1 — Why not run your own mail server?

Technically, any server can speak SMTP. In practice, mail from a fresh server on a cloud provider's IP address is likely to be blocked or sent to spam: cloud providers often block outgoing port 25 by default, new IP addresses have no reputation, and keeping a good reputation needs constant attention to bounces, complaints, blocklists and feedback loops. Email providers do this work at scale. **Use a provider**, and spend your effort on correct authentication and good sending habits.

### Level 2 — Transactional versus marketing

| | Transactional | Marketing / bulk |
|---|---|---|
| Examples | Verify email, password reset, receipt, shipping update, security alert | Newsletter, promotion, product announcement |
| Triggered by | A user's action or an account event | A campaign sent to many people |
| Consent | Implied by the relationship — the user needs it | **Explicit consent** in many countries; always an unsubscribe link |
| Urgency | Seconds matter (a login code) | Minutes or hours are fine |
| Separation | Its own sending stream or subdomain | A separate stream (for example, `news.cornershop.example`) |

Keep them **separated** — different provider streams, and ideally different subdomains — so that complaints about a newsletter cannot damage the reputation that carries your password resets. Never put marketing content into transactional messages to get around consent rules.

## Setting up a domain to send email

### Level 2 — SPF

SPF is a DNS `TXT` record on your sending domain listing the servers allowed to send for it:

```text
cornershop.example.   TXT   "v=spf1 include:amazonses.com include:_spf.google.com -all"
```

- `include:` delegates to a provider's own list of servers (here, Amazon SES for application email, Google Workspace for staff email).
- `-all` means "everything else fails"; `~all` (soft fail) is a gentler setting often used while setting up.
- A domain must have **only one** SPF record, and evaluating it may need **at most 10 DNS lookups** (each `include` counts, and so do the includes inside it). Exceeding the limit makes SPF fail with an error.

SPF checks the **envelope sender** (the technical return address used for bounces), which providers often set to their own subdomain — which is why DKIM and DMARC alignment matter.

### Level 2 — DKIM

With DKIM, the sending server signs selected headers and the body of each message with a private key, adding a `DKIM-Signature` header. The receiving server fetches the public key from DNS:

```text
s1._domainkey.cornershop.example.   CNAME   s1.dkim.provider-example.net.
```

- `s1` is the **selector**, letting a domain have several keys (one per provider, or for rotation).
- Most providers ask you to create `CNAME` records pointing to keys they manage, so they can rotate keys without you changing DNS.
- A valid signature proves the message was sent by someone holding the domain's key and was not altered on the way.

### Level 3 — DMARC and alignment

SPF and DKIM on their own have a gap: they authenticate **some** domain — perhaps the provider's — not necessarily the one in the **From** address the reader sees. **DMARC** closes it by requiring **alignment**: at least one of SPF or DKIM must pass **for the same domain** as the visible From address (or, by default, a subdomain of it). It also states a **policy** for messages that fail:

```text
_dmarc.cornershop.example.   TXT   "v=DMARC1; p=none; rua=mailto:dmarc-reports@cornershop.example"
```

- `p=none` — take no action, just send reports. Start here.
- `p=quarantine` — treat failures as suspicious (spam folder).
- `p=reject` — refuse failing messages outright. The goal once all legitimate senders are aligned.
- `rua=` — where receivers send daily **aggregate reports** listing who sent mail using your domain and whether it passed.

The usual path: publish `p=none`, read the reports (DMARC report tools make them readable) to find every legitimate service sending as your domain — the CRM, the help desk, the invoicing tool — fix their SPF and DKIM, then move to `quarantine` and finally `reject`. At `reject`, criminals can no longer send phishing emails that appear to come exactly from your domain.

Since 2024, Google and Yahoo have required senders of large volumes (more than about 5,000 messages a day to their users) to have SPF, DKIM and a DMARC record with alignment, to offer **one-click unsubscribe** in marketing email, and to keep spam complaint rates low (below 0.3%, ideally below 0.1%). Even small senders need SPF or DKIM. These are now baseline expectations, not extras.

### Level 3 — Reputation and warming

Mailbox providers watch how recipients react. Signals that build reputation: low bounce and complaint rates, people opening and replying, consistent volumes. Signals that destroy it: sudden spikes, many unknown addresses (bought or old lists), spam complaints, and **spam traps** (addresses that never sign up for anything). New domains and dedicated IP addresses need **warming** — starting with small volumes and increasing gradually.

## Sending email from an application

### Level 2 — A provider API or SMTP

Most providers offer both an HTTPS API (with an SDK) and SMTP credentials. With **Nodemailer** and SMTP:

```ts
// fragment
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                 // the provider's SMTP endpoint
  port: 587,                                   // submission port; upgrades to TLS with STARTTLS
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const info = await transport.sendMail({
  from: '"Corner Shop" <orders@cornershop.example>',
  replyTo: "help@cornershop.example",
  to: "sara@example.com",
  subject: "Your order #1042 has shipped",
  text: "Hi Sara,\n\nYour order #1042 has shipped. Track it: https://cornershop.example/orders/1042\n",
  html: '<p>Hi Sara,</p><p>Your order #1042 has shipped. <a href="https://cornershop.example/orders/1042">Track it</a>.</p>',
});
console.log(info.messageId);
```

Or with a provider SDK — here Amazon SES ({{ch:aws-overview}}):

```ts
// fragment
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({});
await ses.send(new SendEmailCommand({
  FromEmailAddress: "Corner Shop <orders@cornershop.example>",
  Destination: { ToAddresses: ["sara@example.com"] },
  Content: { Simple: {
    Subject: { Data: "Your order #1042 has shipped" },
    Body: { Text: { Data: text }, Html: { Data: html } },
  } },
}));
```

APIs are usually preferred: they are faster than SMTP, return structured errors and message ids, and support features such as templates, tags and idempotency. Hide the provider behind a small interface in your code (`mailer.send(message)`) so you can switch providers, add a fallback, or use a fake in tests ({{ch:testing}}).

Common ports: **587** for submission with STARTTLS, **465** for submission over implicit TLS, and **25** for server-to-server relay (usually blocked for applications on cloud servers).

### Level 3 — Never send email inside the request

A provider call takes tens to hundreds of milliseconds, sometimes seconds, and sometimes fails. Sending in the request handler makes the response slow, and a temporary error either fails the user's action or silently loses the email. Instead, **queue** it ({{ch:queues}}):

```ts
// fragment
// In the request handler: record the intent, respond quickly
await db.transaction(async (tx) => {
  const order = await tx.orders.markShipped(orderId);
  await tx.outbox.insert({ type: "email.order-shipped", key: `order-shipped:${order.id}`, payload: { orderId: order.id } });
});
res.status(204).end();

// In a background worker: send with retries
worker.process("email.order-shipped", async (job) => {
  const order = await orders.findWithCustomer(job.payload.orderId);
  if (await suppression.blocks(order.customer.email, "transactional")) return;   // see below
  const message = await templates.orderShipped(order);
  await mailer.send({ ...message, idempotencyKey: job.key });                    // same key on retry
  await emailLog.record({ key: job.key, to: order.customer.id, template: "order-shipped" });
}, { attempts: 5, backoff: "exponential" });
```

- Writing the email job in the **same database transaction** as the business change (the **outbox pattern**, {{ch:event-driven-systems}}) guarantees that "order shipped" and "send shipped email" either both happen or neither does.
- **Retries** with exponential backoff handle temporary provider errors and rate limits.
- Retries can cause **duplicates** if a send succeeded but the confirmation was lost. A deterministic key (`order-shipped:1042`) lets you skip messages already sent, and some providers accept an idempotency key to deduplicate on their side.
- Very urgent messages — a login code — still go through a queue, but a fast, high-priority one.

### Level 3 — Templates and escaping

Email bodies are HTML, and they contain user data: names, addresses, order notes. Inserting that data without **escaping** lets anyone put HTML into your emails — for example, a "name" that renders as a convincing phishing link inside an email sent **from your domain**:

```ts
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function render(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => escapeHtml(data[key] ?? ""));
}

const template = `<p>Hi {{name}},</p><p>Your order {{order}} has shipped.</p>`;

console.log(render(template, { name: "Sara", order: "#1042" }));
console.log(render(template, { name: `<a href="https://evil.example">Click to claim a prize</a>`, order: "#1043" }));
```

**Output:**

```text
<p>Hi Sara,</p><p>Your order #1042 has shipped.</p>
<p>Hi &lt;a href=&quot;https://evil.example&quot;&gt;Click to claim a prize&lt;/a&gt;,</p><p>Your order #1043 has shipped.</p>
```

The attacker's "name" is shown as harmless text instead of becoming a link. Real template tools escape by default — Handlebars' `{{name}}` (but not `{{{name}}}`), and **React Email**, which builds emails from React components and escapes like React does ({{ch:react-basics}}):

```tsx
// fragment
import { Html, Body, Heading, Text, Button } from "@react-email/components";
import { render } from "@react-email/render";

function OrderShipped({ name, orderId, trackUrl }: { name: string; orderId: string; trackUrl: string }) {
  return (
    <Html lang="en">
      <Body style={{ fontFamily: "Arial, sans-serif" }}>
        <Heading>Your order {orderId} has shipped</Heading>
        <Text>Hi {name}, your parcel is on its way.</Text>
        <Button href={trackUrl} style={{ background: "#1d4ed8", color: "#ffffff", padding: "12px 20px" }}>Track your parcel</Button>
      </Body>
    </Html>
  );
}

const html = await render(<OrderShipped name="Sara" orderId="#1042" trackUrl="https://cornershop.example/orders/1042" />);
const text = await render(<OrderShipped name="Sara" orderId="#1042" trackUrl="https://cornershop.example/orders/1042" />, { plainText: true });
```

Other template rules:

- **Always include a plain-text version.** Some people and devices read only text, and spam filters treat HTML-only messages with suspicion.
- **Email HTML is old-fashioned.** Email clients support a limited, inconsistent subset of CSS. Use tables or a tool (React Email, MJML) that generates compatible markup, inline styles, and test in real clients.
- **Absolute links only**, on your own domain, over HTTPS. Avoid URL shorteners — spam filters distrust them.
- **Accessible emails**: real text instead of text in images, `alt` text, sufficient contrast, a `lang` attribute ({{ch:accessibility}}).
- **Header injection**: never put raw user input into headers such as `Subject`, `To` or `Reply-To` without rejecting line breaks — otherwise an attacker can add headers or recipients. Libraries guard against this, but validate addresses ({{ch:validation}}) anyway.
- **Links containing secrets** (password reset, magic login) must use single-use, short-lived tokens ({{ch:authentication}}), and the target page should not leak them to third parties.

### Level 3 — Developing and testing safely

Never send real email from development or test environments by accident. Options:

- A **local catcher** such as **Mailpit**, which runs an SMTP server and a web interface showing every message — nothing leaves your machine.
- A provider's **sandbox mode** or a fake mailer in automated tests that records messages so tests can assert on them.
- In staging, an **allow-list** of recipient domains (your company only).

A **preview page** that renders each template with sample data makes design review easy.

## Bounces, complaints and unsubscribes

### Level 3 — The suppression list

Your provider reports events through webhooks. **Verify the webhook signature** ({{ch:authentication}}), then update a suppression list:

```ts
type ProviderEvent =
  | { type: "delivered"; email: string }
  | { type: "bounce"; email: string; bounceType: "hard" | "soft" }
  | { type: "complaint"; email: string }
  | { type: "unsubscribe"; email: string; category: string };

type Recipient = { softBounces: number; suppressed?: "hard-bounce" | "complaint" | "repeated-soft-bounce"; optedOut: Set<string> };

const recipients = new Map<string, Recipient>();
const get = (email: string) => {
  const key = email.trim().toLowerCase();
  if (!recipients.has(key)) recipients.set(key, { softBounces: 0, optedOut: new Set() });
  return recipients.get(key)!;
};

function handle(event: ProviderEvent): void {
  const r = get(event.email);
  switch (event.type) {
    case "delivered": r.softBounces = 0; break;
    case "bounce":
      if (event.bounceType === "hard") r.suppressed = "hard-bounce";
      else if (++r.softBounces >= 3) r.suppressed = "repeated-soft-bounce";
      break;
    case "complaint": r.suppressed = "complaint"; break;
    case "unsubscribe": r.optedOut.add(event.category); break;
  }
}

function maySend(email: string, kind: "transactional" | "marketing", category: string): string {
  const r = get(email);
  if (r.suppressed) return `no (suppressed: ${r.suppressed})`;
  if (kind === "marketing" && r.optedOut.has(category)) return `no (opted out of ${category})`;
  return "yes";
}

const events: ProviderEvent[] = [
  { type: "bounce", email: "old@example.net", bounceType: "hard" },
  { type: "complaint", email: "Angry@Example.com" },
  { type: "unsubscribe", email: "sara@example.com", category: "newsletter" },
  { type: "bounce", email: "full@example.org", bounceType: "soft" },
  { type: "bounce", email: "full@example.org", bounceType: "soft" },
];
events.forEach(handle);

console.log("old@example.net   receipt:   ", maySend("old@example.net", "transactional", "orders"));
console.log("angry@example.com newsletter:", maySend("angry@example.com", "marketing", "newsletter"));
console.log("sara@example.com  newsletter:", maySend("sara@example.com", "marketing", "newsletter"));
console.log("sara@example.com  receipt:   ", maySend("sara@example.com", "transactional", "orders"));
console.log("full@example.org  receipt:   ", maySend("full@example.org", "transactional", "orders"));
handle({ type: "bounce", email: "full@example.org", bounceType: "soft" });
console.log("full@example.org  after 3rd: ", maySend("full@example.org", "transactional", "orders"));
```

**Output:**

```text
old@example.net   receipt:    no (suppressed: hard-bounce)
angry@example.com newsletter: no (suppressed: complaint)
sara@example.com  newsletter: no (opted out of newsletter)
sara@example.com  receipt:    yes
full@example.org  receipt:    yes
full@example.org  after 3rd:  no (suppressed: repeated-soft-bounce)
```

- A **hard bounce** means the address does not exist: stop sending immediately. Repeatedly sending to dead addresses is one of the strongest signals of a careless sender.
- A **complaint** means the person marked you as spam: stop all non-essential email to them.
- **Soft bounces** are temporary, but repeated ones (here, three in a row without a delivery) are treated as permanent.
- An **unsubscribe** applies to its **category** of marketing email. Sara still receives her receipt — transactional messages she needs are not marketing.
- Addresses are compared in lower case after trimming, so `Angry@Example.com` and `angry@example.com` are the same recipient.

What to do with transactional email to suppressed addresses is a product decision: a password reset to a hard-bounced address will fail anyway, so show the user a message asking them to update their email address.

### Level 3 — One-click unsubscribe

Every marketing email needs a visible unsubscribe link **and**, for large senders, the `List-Unsubscribe` headers that let mail apps show their own "Unsubscribe" button (RFC 2369 and RFC 8058). The link must work **without logging in**, so it carries a signed token:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = "test-secret-do-not-use-in-production";

function unsubscribeToken(userId: string, category: string): string {
  const payload = `${userId}.${category}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifyUnsubscribeToken(token: string): { userId: string; category: string } | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = createHmac("sha256", SECRET).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const [userId, category] = payload.split(".");
  return userId && category ? { userId, category } : null;
}

function unsubscribeHeaders(userId: string, category: string): Record<string, string> {
  const url = `https://cornershop.example/unsubscribe/${unsubscribeToken(userId, category)}`;
  return {
    "List-Unsubscribe": `<${url}>, <mailto:unsubscribe@cornershop.example?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

const headers = unsubscribeHeaders("usr_41", "newsletter");
console.log(headers);

const token = headers["List-Unsubscribe"]!.split("/unsubscribe/")[1]!.split(">")[0]!;
console.log(verifyUnsubscribeToken(token));
const forged = Buffer.from("usr_42.newsletter").toString("base64url") + "." + token.split(".")[1];
console.log(verifyUnsubscribeToken(forged));
```

**Output:**

```text
{
  'List-Unsubscribe': '<https://cornershop.example/unsubscribe/dXNyXzQxLm5ld3NsZXR0ZXI.70h3WPFMEe1-mOxtAg1vjvVd2jMaYRsxYmm9obQs_mE>, <mailto:unsubscribe@cornershop.example?subject=unsubscribe>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
}
{ userId: 'usr_41', category: 'newsletter' }
null
```

- The token contains the user id and category plus an **HMAC signature**, so nobody can unsubscribe other people by editing the URL — the forged token for `usr_42` fails.
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click` tells the mail app it may unsubscribe the user with a single `POST` to the URL, without opening a page. Your endpoint must accept that `POST` and act on it immediately.
- Opening the link in a browser (a `GET`) should show a page with a confirmation button rather than unsubscribing on the spot, because email security scanners automatically follow links in messages.
- Honour unsubscribes promptly and permanently, and offer a **preference centre** where users choose categories rather than all-or-nothing.

### Level 3 — The law, briefly

Rules differ by country, but the common ground is clear. Marketing email needs a lawful basis — usually **explicit opt-in consent** in the EU and UK (GDPR and the e-privacy rules), and in Canada (CASL); the US CAN-SPAM Act allows opt-out but requires accurate headers, a physical postal address and a working unsubscribe honoured within ten business days. Keep records of **when and how** each person consented. Never buy email lists. When in doubt, ask your company's legal or privacy team.

## From beginner to enterprise

**Level 1–2 — first emails.** A provider account, a verified domain with SPF and DKIM, Nodemailer or the provider SDK, a plain-text version with every HTML email, Mailpit in development.

**Level 3 — reliable sending.** Emails sent from background jobs with retries and idempotency keys; templates that escape data; webhooks updating a suppression list; one-click unsubscribe for marketing; DMARC at `p=none` with reports reviewed.

**Level 4 — production applications.** Separate streams and subdomains for transactional and marketing mail; DMARC moving to `quarantine` and `reject`; an outbox for guaranteed sending; email logs (without bodies) for support; monitoring of bounce and complaint rates; rate limits on user-triggered emails such as password resets.

**Level 5 — professional practice.** Multiple providers with failover for critical messages; per-locale templates; preference centres; deliverability dashboards (Google Postmaster Tools, provider statistics); dedicated IP addresses and warming for large volumes.

**Level 6 — enterprises.** Multi-tenant sending where each customer uses their own verified domain; BIMI brand logos (which require DMARC enforcement); consent records auditable for regulators; data retention and deletion policies for email logs; inbound email processing (replies parsed into support tickets).

## Real-world use cases

### Password reset that always arrives

- **Design**: user requests a reset → rate-limited per address and IP ({{ch:rate-limiting}}) → a single-use token stored hashed → a high-priority queue job sends the email through the transactional stream with SPF, DKIM and aligned DMARC → the response is the same whether or not the address exists ({{ch:authentication}}).
- **Monitoring**: time from request to provider acceptance; bounce and failure alerts; a support view showing whether the email was sent and its delivery status.

### A weekly newsletter

- **Design**: double opt-in sign-up (a confirmation email proves the address and the consent); a separate marketing subdomain and provider stream; one-click unsubscribe headers and a visible link; suppression of bounced and complained addresses; gradual volume increases for a new domain; inactive subscribers removed after several months without engagement.

## Common mistakes

### Beginner: sending email in the request handler

**Fix:** queue it; retry with backoff; respond immediately.

### Beginner: no SPF, DKIM or DMARC

**Consequence:** spam folder or rejection; your domain easy to spoof. **Fix:** set all three before sending production email.

### Beginner: HTML only, with unescaped user data

**Fix:** plain-text version always; templates that escape by default.

### Intermediate: ignoring bounces and complaints

**Consequence:** reputation falls until important email stops arriving. **Fix:** webhooks feeding a suppression list.

### Intermediate: mixing marketing and transactional email

**Fix:** separate streams and subdomains; transactional messages contain only what the user needs.

### Intermediate: real emails from development or staging

**Fix:** Mailpit or a fake mailer locally; a recipient allow-list in staging.

### Production: logging email bodies

**Consequence:** reset links and personal data in logs ({{ch:logging}}). **Fix:** log template name, recipient id, message id and status only.

### Production: no rate limit on user-triggered email

**Consequence:** attackers use your "send verification" form to flood a victim's inbox, harming your reputation. **Fix:** per-address and per-IP limits, and CAPTCHA where needed.

## Debugging and troubleshooting

- **Messages go to spam**: check the received message's headers (`Authentication-Results`) for `spf=pass`, `dkim=pass`, `dmarc=pass`; check content (link domains, image-only emails); check reputation tools and complaint rates.
- **`dmarc=fail` while SPF and DKIM pass**: they pass for a **different** domain than the visible From address — configure DKIM signing with your own domain (custom DKIM at the provider) or a custom return-path domain.
- **SPF `permerror`**: more than one SPF record, or more than 10 DNS lookups — remove unused includes or consolidate.
- **Duplicate emails**: retries without idempotency, or the same event handled by two workers — use deterministic keys.
- **Emails never arrive and no bounce**: check the provider's event log; the recipient may be on your suppression list; the provider account may still be in sandbox mode (Amazon SES starts in a sandbox that can only send to verified addresses).
- **Broken layout in some clients**: unsupported CSS — test with rendering preview tools and keep layouts simple.

## Security summary

- Authenticate your domain with **SPF, DKIM and DMARC**, and move DMARC to `reject` to stop spoofing.
- **Escape** user data in templates; reject line breaks in header values; validate addresses.
- Put only **single-use, short-lived tokens** in emailed links; never put passwords in email.
- **Verify webhook signatures** from your provider.
- **Rate-limit** user-triggered emails; use generic responses to avoid revealing which addresses have accounts.
- Keep provider API keys in a secrets manager with minimal permissions ({{ch:secrets-manager}}).
- Do not log email **bodies**; keep email logs only as long as needed.
- Make unsubscribe tokens **signed**; never allow unsubscribing other people.

## How a senior engineer thinks about this

- **"Sent" is not "delivered", and "delivered" is not "inbox".** They measure delivery and act on bounces and complaints.
- **Reputation is a shared, fragile asset.** One careless campaign can delay every password reset; streams are separated to contain the damage.
- **Email is a side effect of a business event.** It is triggered through an outbox and a queue, idempotently, so it is neither lost nor duplicated.
- **Respect earns deliverability.** Consent, easy unsubscribes and relevant content are both the law and the best technical strategy.
- **Keep providers swappable.** A thin internal interface, provider-neutral templates and suppression data you own.

## Exercises

### Exercise 1 — Read a DMARC record

**Objective:** practise the DMARC format.
**What to build:** `parseDmarc(record)` returning the policy, subdomain policy (defaulting to the main policy), percentage (default 100), aggregate report addresses, and DKIM and SPF alignment modes (`s` means strict, anything else relaxed). Throw an error if the version is not `DMARC1` or the policy is missing or invalid. Test with a starter record, a strict record with two report addresses, and a record without `p=`.

<details>
<summary>Show the solution</summary>

```ts
type Dmarc = { policy: string; subdomainPolicy: string; percent: number; reports: string[]; dkimAlignment: string; spfAlignment: string };

function parseDmarc(record: string): Dmarc {
  const tags = new Map(
    record.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const i = part.indexOf("=");
      return [part.slice(0, i).trim().toLowerCase(), part.slice(i + 1).trim()] as const;
    }),
  );
  if (tags.get("v") !== "DMARC1") throw new Error("not a DMARC record");
  const policy = tags.get("p");
  if (!policy || !["none", "quarantine", "reject"].includes(policy)) throw new Error("missing or invalid p= policy");
  const align = (v: string | undefined) => (v === "s" ? "strict" : "relaxed");
  return {
    policy,
    subdomainPolicy: tags.get("sp") ?? policy,
    percent: Number(tags.get("pct") ?? 100),
    reports: (tags.get("rua") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    dkimAlignment: align(tags.get("adkim")),
    spfAlignment: align(tags.get("aspf")),
  };
}

console.log(parseDmarc("v=DMARC1; p=none; rua=mailto:dmarc@cornershop.example"));
console.log(parseDmarc("v=DMARC1; p=reject; sp=quarantine; adkim=s; pct=50; rua=mailto:a@x.example, mailto:b@y.example"));
try {
  parseDmarc("v=DMARC1; rua=mailto:dmarc@cornershop.example");
} catch (err) {
  console.log("error:", (err as Error).message);
}
```

**Output:**

```text
{
  policy: 'none',
  subdomainPolicy: 'none',
  percent: 100,
  reports: [ 'mailto:dmarc@cornershop.example' ],
  dkimAlignment: 'relaxed',
  spfAlignment: 'relaxed'
}
{
  policy: 'reject',
  subdomainPolicy: 'quarantine',
  percent: 50,
  reports: [ 'mailto:a@x.example', 'mailto:b@y.example' ],
  dkimAlignment: 'strict',
  spfAlignment: 'relaxed'
}
error: missing or invalid p= policy
```

**Walkthrough:** the record is a list of `tag=value` pairs separated by semicolons. Splitting on the **first** `=` keeps values that contain `=` intact. The defaults follow the DMARC specification: `sp` inherits `p`, `pct` is 100, alignment is relaxed. A record without a valid `p=` is invalid, and receivers ignore it — a real mistake seen in the wild.

</details>

### Exercise 2 — Design the email-verification flow

**Objective:** combine sending, tokens and reliability.
**What to do:** describe the full flow for verifying a new user's email address, from sign-up to the verified account, including the token, the sending path, expiry, resending and abuse protection.

<details>
<summary>Show the solution</summary>

1. **Sign-up** creates the user with `email_verified = false` and, in the same transaction, an outbox job `email.verify` with the user id.
2. **Token**: the worker generates 32 random bytes, stores only their **hash** with the user id and an expiry (for example, 24 hours), and builds `https://cornershop.example/verify?token=...`.
3. **Sending**: through the transactional stream, high priority, with a plain-text version, retries with backoff, and an idempotency key `verify:{userId}:{tokenId}`.
4. **Verification**: `GET /verify` shows a page with a "Confirm" button (so link scanners do not consume the token); the `POST` hashes the token, finds an unexpired, unused match, marks the email verified and deletes the token.
5. **Resend**: "Send again" creates a new token and invalidates the old one; limited to a few per hour per user and per IP.
6. **Abuse protection**: rate limits on sign-up and resend; suppressed addresses get a clear message in the UI; generic messages that do not reveal whether other addresses exist.
7. **Restrictions until verified**: for example, no orders or no marketing until the email is confirmed.
8. **Monitoring**: verification completion rate and time to verify — a sudden drop often means emails are landing in spam.

</details>

### Exercise 3 — Review an email feature

**Objective:** practise spotting problems.
**The scenario:** a sign-up handler calls `await transporter.sendMail(...)` before responding, with HTML built by string concatenation including the user's name, no `text` part, sent from `noreply@gmail.com` through the company's SMTP server. The domain has no DMARC record. The newsletter uses the same sender and has no unsubscribe link. Bounce webhooks are not configured. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **Sending in the request** → slow sign-ups, lost emails on errors. Queue with retries.
2. **Unescaped name in HTML** → HTML injection and phishing links from your domain. Escaping templates.
3. **No plain-text part** → worse accessibility and deliverability. Always include `text`.
4. **From `@gmail.com` through another server** → fails Gmail's DMARC (`p=reject`-style protection for its own domain); messages rejected. Send from your own domain.
5. **No DMARC** → spoofable domain, and a requirement for large senders. Publish `p=none`, then tighten.
6. **Same sender for newsletter and transactional** → newsletter complaints damage sign-up email delivery. Separate streams and subdomains.
7. **No unsubscribe** → illegal in many countries and against bulk-sender rules. Visible link plus `List-Unsubscribe` headers.
8. **No bounce handling** → repeated sends to dead addresses, falling reputation. Webhooks and a suppression list.
9. **`noreply` addresses** → replies from confused customers are lost; prefer a monitored reply-to address.

</details>

### Exercise 4 — Production scenario: emails landing in spam

**Objective:** practise diagnosing deliverability.
**The scenario:** support reports that many customers using Outlook and Gmail have not received password-reset emails since last week, when marketing started a new campaign. Describe how you investigate and fix it.

<details>
<summary>Show the solution</summary>

1. **Confirm and measure**: provider statistics for the transactional stream by mailbox provider — delivery, bounce, deferral and complaint rates since last week; Google Postmaster Tools for domain reputation and spam rate.
2. **Inspect a real message**: send resets to test accounts at Gmail and Outlook; read `Authentication-Results` — SPF, DKIM, DMARC all `pass` and aligned?
3. **Check the campaign**: was it sent from the same domain, stream or IP as transactional mail? To an old or purchased list (high bounces, spam traps)? High complaint rate?
4. **Likely cause**: the campaign damaged the shared reputation. Pause or slow the campaign; clean the list (remove bounced, inactive and unconsented addresses).
5. **Separate streams**: move marketing to its own subdomain and provider stream; keep transactional on a clean domain with DMARC enforced.
6. **Short-term relief**: ensure transactional messages are minimal and clearly expected; tell users in the UI to check spam and offer resend; a fallback login method (for example, SMS or passkeys) for urgent cases.
7. **Prevent recurrence**: alerts on bounce and complaint rates per stream; a review step for large campaigns; volume ramp-up rules; a written policy that marketing never shares transactional infrastructure.

</details>

## Summary

Applications send **transactional** email (triggered by a user's action) and **marketing** email (campaigns to many people), and they should be kept **separate**. Messages travel over **SMTP** between mail servers; applications hand them to an **email provider** through an API or SMTP rather than running their own servers, because deliverability depends on reputation that providers manage.

Domains prove their messages with **SPF** (allowed servers), **DKIM** (a signature verified with a DNS-published key) and **DMARC** (alignment with the visible From domain, a policy for failures, and reports). Start DMARC at `p=none`, fix every legitimate sender, then enforce `quarantine` or `reject`. Large mailbox providers now require these, plus one-click unsubscribe and low complaint rates, from bulk senders.

Send from **background jobs** — ideally from an outbox written in the same transaction as the business change — with retries and **idempotency keys**. Build templates that **escape** user data, include a **plain-text** version, use absolute HTTPS links, and work in limited email clients; use Mailpit or fakes in development. Process provider **webhooks** (verified) into a **suppression list** covering hard bounces, repeated soft bounces, complaints and per-category unsubscribes, and add signed **one-click unsubscribe** links and headers to marketing email. Respect consent laws, rate-limit user-triggered email, and never log message bodies.

## Key terms

- **Transactional email** — An automatic message triggered by a user's action or account event, such as a receipt or password reset.
- **Marketing email** — A message sent to many recipients for promotion or news, requiring consent and an unsubscribe option.
- **SMTP** — The protocol mail servers use to send and relay email.
- **MTA** — A mail transfer agent: a server that receives and forwards email.
- **MX record** — A DNS record naming the servers that receive email for a domain.
- **Email service provider (ESP)** — A service that sends email on your behalf through an API or SMTP.
- **SPF** — A DNS record listing the servers allowed to send email for a domain.
- **DKIM** — A signature on each message, verifiable with a public key published in DNS.
- **DKIM selector** — The name identifying which DKIM key in DNS verifies a signature.
- **DMARC** — A DNS policy requiring SPF or DKIM alignment with the From domain, defining handling of failures and reporting.
- **Alignment** — The requirement that the domain authenticated by SPF or DKIM matches the visible From domain.
- **Aggregate report (DMARC)** — A daily report from receivers summarising messages sent using your domain and their authentication results.
- **Deliverability** — The ability of email to reach recipients' inboxes.
- **Sender reputation** — Mailbox providers' trust in a sending domain or IP address.
- **IP warming** — Gradually increasing sending volume from a new IP address or domain to build reputation.
- **Spam trap** — An address used to detect senders who mail people who never signed up.
- **Hard bounce** — A permanent delivery failure, such as a non-existent address.
- **Soft bounce** — A temporary delivery failure, such as a full mailbox.
- **Complaint** — A recipient marking a message as spam.
- **Suppression list** — Addresses that must not receive email because of bounces, complaints or unsubscribes.
- **One-click unsubscribe** — Unsubscribing through the `List-Unsubscribe` and `List-Unsubscribe-Post` headers with a single action.
- **Double opt-in** — Confirming a subscription by clicking a link sent to the address.
- **Outbox pattern** — Recording messages to send in the same database transaction as the change that causes them.
- **Mailpit** — A local tool that captures email sent in development and displays it in a web interface.

## What comes next

Many emails are sent on a timetable rather than in response to a click — daily summaries, renewal reminders, monthly invoices. The next chapter, {{ch:cron-jobs}}, covers scheduled jobs: cron syntax, running schedules safely when you have several servers, time zones and daylight-saving surprises, making jobs idempotent and observable, and when to use a scheduler service instead.
