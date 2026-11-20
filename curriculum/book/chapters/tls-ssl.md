# TLS and HTTPS

> [!GOALS]
> - Explain what TLS protects — confidentiality, integrity and server authenticity — and what it does not.
> - Understand the building blocks: symmetric and asymmetric encryption, digital signatures and key exchange.
> - Follow a **TLS handshake** and the role of **certificates**, **certificate authorities** and the **chain of trust**.
> - Recognise and fix the common certificate errors: untrusted issuer, name mismatch, expiry, missing intermediates.
> - Obtain and **renew certificates automatically**, and configure HTTPS well (TLS versions, HSTS, redirects).
> - Know where TLS terminates in real architectures, and when to use **mutual TLS** between services.

## Why this matters

Without encryption, everything sent over a network can be read and changed by anyone on the path: the café's Wi-Fi, a compromised router, an internet provider. Passwords, session cookies, card details, personal data and API tokens would all travel as plain text — and an attacker could alter pages or downloads in transit.

**TLS** (Transport Layer Security, the successor to SSL) encrypts and authenticates connections. HTTPS is HTTP over TLS, and today it is simply required: browsers mark plain HTTP as "not secure", many features work only over HTTPS, search engines prefer it, and regulations expect encryption in transit. Inside systems, TLS protects traffic between services, to databases and to caches ({{ch:postgresql}}, {{ch:redis}}).

Back-end engineers meet TLS constantly: configuring a load balancer or reverse proxy, debugging "certificate has expired" at 3 a.m., connecting to a database that requires TLS, setting up a staging domain, or calling a partner API with a private certificate authority. This chapter explains what TLS does, how certificates and trust work, and how to run HTTPS without outages. The examples create a real certificate authority and real certificates in code and connect to a real TLS server, so every success and error shown actually happened.

## The simple idea

Imagine sending a letter in a locked box. TLS gives you two things. First, a way for you and the recipient to agree on a key for the box, even though anyone can watch you agree — so only the two of you can open it. Second, a way to be sure the recipient is who they claim to be: they show an ID card (a **certificate**) issued by an authority you trust, like a passport issued by a government. If the ID was issued by an authority you do not recognise, belongs to someone else, or has expired, you do not hand over the box.

> [!ANALOGY]
> TLS is like a locked box plus a passport check: both sides agree on a secret key while strangers watch, and the server proves its identity with a certificate issued by an authority your computer already trusts.
>
> **Where the analogy breaks:** a passport proves who a person is. A certificate proves only that the server controls a **domain name** — not that the company behind it is honest. A phishing site at `c0rnershop.example` can have a perfectly valid certificate for its own name. TLS secures the connection to the name you asked for; it cannot tell you whether you asked for the right one.

## The proper definition and key words

**TLS** is a cryptographic protocol that provides an encrypted, integrity-protected channel between two parties, with the server (and optionally the client) authenticated by **X.509 certificates**.

Key words:

- **Symmetric encryption** — the same key encrypts and decrypts (fast; AES, ChaCha20).
- **Asymmetric (public-key) cryptography** — a key pair: what one key does, only the other can undo. Used for key exchange and signatures (RSA, ECDSA, Ed25519).
- **Digital signature** — data signed with a private key, verifiable by anyone with the public key.
- **Key exchange** — agreeing on a shared secret over an open channel (ECDHE).
- **Certificate** — a signed document binding a public key to names (domains), with a validity period and an issuer.
- **Certificate authority (CA)** — an organisation that signs certificates after verifying control of the domain.
- **Chain of trust** — leaf certificate → intermediate CA → **root CA**, whose certificate is in the operating system's or browser's **trust store**.
- **SAN (subject alternative name)** — the list of names a certificate is valid for.
- **TLS termination** — the point where TLS is decrypted (load balancer, proxy or application).
- **HSTS** — a header telling browsers to use only HTTPS for a domain.
- **mTLS** (mutual TLS) — both sides present certificates.

## The building blocks

### Level 2 — Signatures: the foundation of certificates

Certificates work because of **digital signatures**. A CA signs a statement ("this public key belongs to `shop.local`") with its private key; anyone holding the CA's public key can check that the statement is genuine and unaltered:

```ts
import { generateKeyPairSync, sign, verify, createHash } from "node:crypto";

// What certificates rely on: a signature made with a private key, checked with the public key
const { privateKey, publicKey } = generateKeyPairSync("ed25519");

const statement = Buffer.from("The key for shop.local belongs to Corner Shop Ltd. Valid until 2027-02-18.");
const signature = sign(null, statement, privateKey);

console.log("signature length:", signature.length, "bytes");
console.log("genuine statement verifies: ", verify(null, statement, publicKey, signature));
const forged = Buffer.from(statement.toString().replace("Corner Shop Ltd", "Evil Corp"));
console.log("altered statement verifies: ", verify(null, forged, publicKey, signature));

// Fingerprints identify a certificate or key compactly
console.log("sha256 fingerprint of the statement:", createHash("sha256").update(statement).digest("hex").slice(0, 16) + "…");
```

**Output:**

```text
signature length: 64 bytes
genuine statement verifies:  true
altered statement verifies:  false
sha256 fingerprint of the statement: 4da259681e1b4dda…
```

- `sign` uses the **private key**; `verify` needs only the **public key** — which can be given to everyone.
- Changing a single word ("Evil Corp") breaks the signature. Nobody without the private key can produce a valid signature for altered content.
- A **hash** (SHA-256) gives a short, unique **fingerprint** of data, which is what signatures actually cover and how certificates are identified.

### Level 2 — The TLS 1.3 handshake

```text
  client                                                          server
    │── ClientHello: TLS versions, cipher suites, key share, SNI ────▶│
    │◀─ ServerHello: chosen cipher, key share ──────────────────────│
    │◀─ (encrypted from here) Certificate chain, CertificateVerify, Finished
    │   client checks: chain to a trusted root? name matches? valid dates?
    │── Finished ───────────────────────────────────────────────────▶│
    │══════════ encrypted application data (HTTP) ══════════════════│
```

1. The client offers supported versions and algorithms, a **key share** for the key exchange, and **SNI** — the server name it wants, so one IP address can serve many certificates.
2. The server picks the algorithms and sends its key share. Both sides now compute the same **session keys** with ECDHE — a key exchange that an eavesdropper cannot reproduce, giving **forward secrecy** (recording traffic today and stealing the server's key later does not decrypt it).
3. The server sends its **certificate chain** and signs the handshake with its private key, proving it owns the certificate's key.
4. The client verifies the chain, the name and the dates. If anything fails, it aborts.
5. Application data flows, encrypted with fast symmetric ciphers (AES-GCM or ChaCha20-Poly1305), and integrity-protected.

TLS 1.3 needs **one round trip** before data (TLS 1.2 needed two); resumed connections can send data even sooner. Use TLS 1.2 or 1.3 only — older versions (SSL 3, TLS 1.0, 1.1) are broken and disabled by modern clients.

## Certificates and trust

### Level 3 — A real handshake, and the classic failures

This example creates a private certificate authority, a valid server certificate for `shop.local` and an expired one, then connects to a real HTTPS server in four ways:

```ts
import forge from "node-forge";
import { createServer } from "node:https";
import { connect, type TLSSocket } from "node:tls";
import type { AddressInfo } from "node:net";

const pki = forge.pki;
const pem = { cert: (c: forge.pki.Certificate) => pki.certificateToPem(c), key: (k: forge.pki.rsa.PrivateKey) => pki.privateKeyToPem(k) };

// 1. A private certificate authority (in real life: Let's Encrypt or another public CA)
function makeCert(opts: { cn: string; issuer?: { cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey }; isCa?: boolean; altNames?: string[]; days: [number, number] }) {
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = String(Math.floor(Math.random() * 1e9));
  cert.validity.notBefore = new Date(Date.now() + opts.days[0] * 86_400_000);
  cert.validity.notAfter = new Date(Date.now() + opts.days[1] * 86_400_000);
  cert.setSubject([{ name: "commonName", value: opts.cn }]);
  cert.setIssuer(opts.issuer ? opts.issuer.cert.subject.attributes : [{ name: "commonName", value: opts.cn }]);
  cert.setExtensions(opts.isCa
    ? [{ name: "basicConstraints", cA: true }, { name: "keyUsage", keyCertSign: true }]
    : [{ name: "subjectAltName", altNames: (opts.altNames ?? []).map((value) => ({ type: 2, value })) }]);
  cert.sign(opts.issuer ? opts.issuer.key : keys.privateKey, forge.md.sha256.create());
  return { cert, key: keys.privateKey };
}

const ca = makeCert({ cn: "Corner Shop Test CA", isCa: true, days: [-1, 365] });
const good = makeCert({ cn: "shop.local", issuer: ca, altNames: ["shop.local"], days: [-1, 90] });
const expired = makeCert({ cn: "shop.local", issuer: ca, altNames: ["shop.local"], days: [-100, -10] });

async function serve(leaf: { cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey }) {
  const server = createServer({ cert: pem.cert(leaf.cert), key: pem.key(leaf.key) }, (_req, res) => res.end("hello over TLS"));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return server;
}

async function tryConnect(label: string, port: number, servername: string, trustCa: boolean) {
  await new Promise<void>((resolve) => {
    const socket: TLSSocket = connect({ host: "127.0.0.1", port, servername, ca: trustCa ? [pem.cert(ca.cert)] : undefined }, () => {
      const peer = socket.getPeerCertificate();
      console.log(`${label}: OK — ${socket.getProtocol()}, server certificate for ${peer.subject.CN} issued by ${peer.issuer.CN}`);
      socket.end(); resolve();
    });
    socket.on("error", (err: NodeJS.ErrnoException) => { console.log(`${label}: refused — ${err.code}`); resolve(); });
  });
}

const s1 = await serve(good);
const p1 = (s1.address() as AddressInfo).port;
await tryConnect("trusted CA, right name ", p1, "shop.local", true);
await tryConnect("CA not trusted        ", p1, "shop.local", false);
await tryConnect("wrong host name       ", p1, "admin.shop.local", true);
s1.close();

const s2 = await serve(expired);
await tryConnect("expired certificate   ", (s2.address() as AddressInfo).port, "shop.local", true);
s2.close();
```

**Output:**

```text
trusted CA, right name : OK — TLSv1.3, server certificate for shop.local issued by Corner Shop Test CA
CA not trusted        : refused — UNABLE_TO_VERIFY_LEAF_SIGNATURE
wrong host name       : refused — ERR_TLS_CERT_ALTNAME_INVALID
expired certificate   : refused — CERT_HAS_EXPIRED
```

- **Trusted CA, right name**: the client was told to trust the private CA (`ca: [...]`); the server's certificate was signed by it, lists `shop.local` in its SAN, and is within its validity dates — the connection uses **TLS 1.3**.
- **CA not trusted**: without that `ca` option, the client uses the system's trust store, which does not contain our private CA — so the certificate's signature cannot be traced to a trusted root.
- **Wrong host name**: the client asked for `admin.shop.local`, but the certificate is valid only for `shop.local`.
- **Expired certificate**: signed by the trusted CA, for the right name — but its validity ended ten days ago.
- These are the three questions every TLS client asks: **is it signed by someone I trust, is it for the name I asked for, and is it valid today?** Public websites get certificates from CAs already in every trust store; private CAs are used for internal services and test environments.
- Key generation makes this example take a few seconds; the certificate details are random each run, but the outcomes are always the same.

**Never disable verification** to make an error go away (`rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `curl -k`). It turns TLS into encryption with an unknown party — exactly what an attacker in the middle would want. Fix the trust instead: add the right CA, use the right name, renew the certificate.

### Level 3 — Chains and intermediates

Public CAs do not sign websites' certificates with their root keys, which are kept offline. A root signs an **intermediate** CA, which signs **leaf** certificates. The server must send its leaf **and** the intermediate(s) (the "full chain"); the client already has the root. A server configured with only the leaf certificate works in some browsers (which fetch or cache intermediates) and fails in others and in API clients — a classic "works on my machine" TLS bug. Check with `openssl s_client -connect cornershop.example:443 -servername cornershop.example -showcerts` or an online TLS checker.

### Level 3 — Types of certificate

- **Domain validated (DV)** — the CA verifies control of the domain (an HTTP file or a DNS record). Free and automatic from **Let's Encrypt** and other ACME CAs, and what nearly all sites use.
- **Wildcard** — `*.cornershop.example` covers one level of subdomains; issued through DNS validation.
- **Multi-domain (SAN)** — several names in one certificate.
- **Organisation/extended validation** — extra identity checks; browsers no longer display them prominently.

## Running HTTPS

### Level 3 — Automatic issuance and renewal

Certificates expire — public ones after at most about a year, Let's Encrypt's after 90 days, and the industry is moving to even shorter lifetimes. Expired certificates are one of the most common causes of complete outages, so **renewal must be automatic**:

- **Managed certificates**: cloud load balancers and CDNs issue and renew certificates for you (AWS Certificate Manager, Cloudflare, Google-managed certificates) ({{ch:cloudfront}}, {{ch:elb}}).
- **ACME clients**: Certbot, acme.sh, Caddy (automatic HTTPS built in), Traefik and cert-manager in Kubernetes obtain and renew Let's Encrypt certificates, proving domain control with HTTP-01 or DNS-01 challenges ({{ch:dns}}).
- **Monitoring**: alert when any certificate expires within, say, 14 days — including those on internal services and third-party endpoints you depend on ({{ch:monitoring}}).

### Level 3 — Configuring HTTPS well

```nginx
# fragment
server {
    listen 443 ssl;
    http2 on;
    server_name cornershop.example;

    ssl_certificate     /etc/letsencrypt/live/cornershop.example/fullchain.pem;   # leaf + intermediates
    ssl_certificate_key /etc/letsencrypt/live/cornershop.example/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    location / { proxy_pass http://127.0.0.1:3000; }
}
server {
    listen 80;
    server_name cornershop.example;
    return 301 https://$host$request_uri;          # redirect plain HTTP to HTTPS
}
```

- Serve the **full chain**; allow **TLS 1.2 and 1.3** only; rely on the server's modern default cipher suites (Mozilla's SSL Configuration Generator gives current recommendations).
- **Redirect HTTP to HTTPS**, and send **HSTS** (`Strict-Transport-Security`) so browsers never try plain HTTP again for that domain — preventing downgrade attacks. Start with a short `max-age` and increase it once everything works on HTTPS ({{ch:application-security}}).
- **Cookies** must be `Secure` so they are never sent over plain HTTP ({{ch:sessions}}).
- **Private keys** must be readable only by the server process (`600`), never committed to repositories, and replaced if exposed ({{ch:linux}}).

### Level 4 — Where TLS terminates

In most architectures, TLS is decrypted at the edge:

```text
 browser ══TLS══▶ CDN ══TLS══▶ load balancer ──(HTTP or TLS)──▶ app servers ──TLS──▶ database
```

- **Termination at the load balancer or reverse proxy** is common and convenient: certificates live in one place, and the proxy handles HTTP/2, compression and headers ({{ch:nginx-reverse-proxy}}).
- Traffic **behind** the terminator travels on a private network — but "private" is not "safe" from compromised hosts or misconfigured networks. Re-encrypting to the application (**end-to-end TLS**) or using a service mesh for internal TLS is increasingly the norm, and required in many regulated environments.
- The application learns the original scheme and client from headers (`X-Forwarded-Proto`, `X-Forwarded-For`), trusted only from its own proxies — for example, to build correct `https://` redirect URLs.

### Level 4 — Mutual TLS

In **mTLS**, the client also presents a certificate, and the server verifies it against a CA it trusts. It authenticates **machines**: service-to-service calls inside a platform, partners calling an API, devices connecting to an IoT backend. Service meshes (Istio, Linkerd) issue short-lived certificates to every service and enforce mTLS automatically, so every internal call is encrypted and its caller identified ({{ch:microservices}}). mTLS complements, rather than replaces, application-level authorisation.

## From beginner to enterprise

**Level 1–2 — basics.** Why HTTPS is required; what a certificate proves; reading browser certificate warnings; never disabling verification.

**Level 3 — running HTTPS.** Managed or ACME certificates with automatic renewal; full chains; TLS 1.2/1.3; HTTP-to-HTTPS redirects; HSTS; secure cookies; TLS to databases and caches.

**Level 4 — production.** Certificate expiry monitoring everywhere; TLS termination design and internal re-encryption; private CAs for internal services; mTLS for partners or services; key protection and rotation procedures.

**Level 5 — senior practice.** Service meshes with automatic mTLS; certificate inventories; responding to CA incidents and key compromises; compliance requirements for encryption in transit.

**Level 6 — enterprises.** Organisation-wide PKI (public key infrastructure) with hardware security modules, short-lived certificates issued automatically, crypto-agility planning (including post-quantum key exchange, already being deployed in modern TLS stacks).

## Real-world use cases

### Moving the shop to HTTPS everywhere

- **Steps**: managed certificate on the load balancer for the apex and `www`; HTTP-to-HTTPS redirect; `Secure` cookies; HSTS starting at one day, raised to one year after a week without problems; mixed-content fixes (images and scripts loaded over `http://`); expiry alerts for every certificate.

### A partner API with mutual TLS

- **Design**: the partner receives a client certificate issued by your private CA; the API gateway requires and verifies client certificates, maps the certificate's subject to the partner's identity, and applies per-partner rate limits; certificates are short-lived and renewed through an automated process; revocation is handled by removing the partner's mapping and blocking the certificate serial.

## Common mistakes

### Beginner: disabling certificate verification

**Fix:** trust the right CA; fix names and expiry.

### Beginner: manual certificate renewal

**Consequence:** outages when someone forgets. **Fix:** automation plus monitoring.

### Intermediate: serving only the leaf certificate

**Consequence:** failures in some clients. **Fix:** full chain.

### Intermediate: no HTTP-to-HTTPS redirect or HSTS

**Fix:** redirect and HSTS.

### Intermediate: private keys in repositories or world-readable files

**Fix:** secrets management, `600` permissions, rotation after exposure.

### Production: plain-text traffic to databases across networks

**Fix:** require TLS on database and cache connections.

### Production: forgetting internal and third-party certificates

**Consequence:** an internal service or a partner's endpoint expires unnoticed. **Fix:** inventory and monitor all certificates you depend on.

## Debugging and troubleshooting

- **`CERT_HAS_EXPIRED`**: renew — and fix the automation that failed.
- **`ERR_TLS_CERT_ALTNAME_INVALID` / "hostname mismatch"**: the name requested is not in the certificate's SAN list — wrong certificate selected (check SNI), or a name missing from the certificate.
- **`UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `unable to get local issuer certificate`**: missing intermediate on the server, or a private CA the client does not trust (add it via `NODE_EXTRA_CA_CERTS` or the client's `ca` option).
- **`SELF_SIGNED_CERT_IN_CHAIN`**: often a corporate proxy inspecting TLS — configure the proxy's CA deliberately rather than disabling checks.
- **Handshake failures**: protocol or cipher mismatch (an old client against a TLS-1.2-only server) — check with `openssl s_client -tls1_2` / `-tls1_3`.
- **Inspect a server**: `openssl s_client -connect host:443 -servername host` shows the chain, protocol and verification result; `curl -v https://host` shows the handshake summary.

## Security summary

- **HTTPS everywhere**, with redirects and HSTS; TLS 1.2+ only.
- **Verify certificates** in every client; never disable verification in production code.
- **Automate certificate lifecycle** and monitor expiry.
- **Protect private keys**: minimal access, never in source control, rotate on exposure.
- **Encrypt internal traffic** too — databases, caches, service-to-service — especially across networks you do not fully control.
- **mTLS** for strong machine identity where appropriate; CAA records to limit which CAs may issue for your domains ({{ch:dns}}).
- Remember TLS's limit: it authenticates **names**, not intentions — phishing defences live elsewhere.

## How a senior engineer thinks about this

- **Trust is the point.** Encryption without verified identity is encryption with a possible attacker.
- **Certificates are operational dependencies.** Inventory, automation and expiry alerts prevent self-inflicted outages.
- **Terminate deliberately.** Decide where TLS ends, and encrypt beyond it where the risk warrants.
- **Defaults are good; overrides are suspicious.** Modern TLS libraries choose well — the dangerous code is the code that turns checks off.
- **Plan for change.** Shorter certificate lifetimes and new algorithms are coming; automation makes them routine.

## Exercises

### Exercise 1 — Diagnose the error

**Objective:** practise reading TLS errors.
**What to do:** for each situation, give the likely cause and fix: (1) the site works in Chrome but `curl` and the Node.js API client fail with "unable to verify the first certificate"; (2) `https://www.cornershop.example` works but `https://cornershop.example` shows a name mismatch; (3) on the morning of the 1st, every API call fails with "certificate has expired"; (4) internal calls to `https://orders.internal` fail with "self-signed certificate in certificate chain".

<details>
<summary>Show the solution</summary>

1. **Missing intermediate certificate** — browsers often compensate, other clients do not. Configure the full chain (`fullchain.pem`).
2. **The certificate covers only `www`** — issue one that includes both names in its SAN (or redirect the apex correctly with its own certificate).
3. **Renewal failed and nobody noticed** — renew immediately; fix the automation (DNS challenge credentials, a stopped renewal timer); add expiry monitoring with a two-week warning.
4. **Internal services use a private CA** the client does not trust — distribute the CA certificate to clients (`NODE_EXTRA_CA_CERTS`, container trust stores) or use a service mesh; do not disable verification.

</details>

### Exercise 2 — Design TLS for a system

**Objective:** practise architectural decisions.
**What to do:** the shop has a CDN, an application load balancer, API containers, PostgreSQL and Redis in private subnets, and a partner integration. Decide where certificates live, how they are renewed, and where traffic is encrypted.

<details>
<summary>Show the solution</summary>

- **Browser → CDN**: managed certificate on the CDN (auto-renewed) for `cornershop.example` and `www`; HSTS; HTTP redirects.
- **CDN → load balancer**: TLS with a managed certificate on the load balancer for its origin name; the load balancer accepts traffic only from the CDN.
- **Load balancer → API containers**: TLS re-encryption with certificates from a private CA or the platform's service mesh, if policy requires encryption on internal networks; otherwise HTTP on a locked-down private network, documented as a risk decision.
- **API → PostgreSQL and Redis**: TLS required (`sslmode=verify-full` for PostgreSQL; TLS-enabled Redis), using the provider's CA certificates.
- **Partner → API**: mTLS at the gateway with client certificates from a private CA, plus per-partner authorisation and rate limits.
- **Operations**: an inventory of all certificates; expiry alerts at 14 and 7 days; private keys in a secrets manager; CAA records allowing only the chosen public CA.

</details>

### Exercise 3 — Production scenario: the private key in the repository

**Objective:** practise incident response.
**The scenario:** a developer notices that `server.key`, the private key for `api.cornershop.example`, was committed to a public GitHub repository three weeks ago. What do you do?

<details>
<summary>Show the solution</summary>

1. **Treat the key as compromised**: anyone could impersonate `api.cornershop.example` (with network position) or decrypt traffic captured with older, non-forward-secret configurations.
2. **Issue a new certificate with a new key pair** and deploy it everywhere the old one was used.
3. **Revoke the old certificate** with the CA.
4. **Remove the key from the repository and its history** (rewrite history or treat the repository as public forever — the key is already out; removal mainly prevents further spread).
5. **Check for misuse**: unexpected certificates issued for your domain (Certificate Transparency logs, {{ch:dns}} CAA records), suspicious DNS changes.
6. **Prevent recurrence**: secrets scanning in CI and on pushes; `.gitignore` for key files; keys stored only in a secrets manager or managed by the certificate service; a blameless review ({{ch:secrets-manager}}).

</details>

## Summary

**TLS** gives connections **confidentiality**, **integrity** and **server authentication**. It combines **asymmetric cryptography** — key exchange (ECDHE, giving forward secrecy) and **digital signatures** — with fast **symmetric encryption** for the data. In the **TLS 1.3 handshake**, the client sends versions, a key share and **SNI**; the server answers with its key share and certificate chain, proving ownership of its key; and the client verifies the certificate before any application data flows, all within one round trip.

A **certificate** binds a public key to names (the **SAN** list) for a validity period, signed by a **certificate authority**; clients trust it through a **chain** from the leaf through **intermediates** to a **root** in their trust store. Every client asks three questions — trusted issuer, matching name, valid dates — and the classic failures (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `ERR_TLS_CERT_ALTNAME_INVALID`, `CERT_HAS_EXPIRED`) answer "no" to one of them. Fix trust; never disable verification.

Run HTTPS with **automatically issued and renewed** certificates (managed services or ACME clients such as Certbot and cert-manager) and expiry monitoring; serve the **full chain**; allow TLS 1.2 and 1.3; redirect HTTP; send **HSTS**; mark cookies `Secure`; protect private keys. Decide where TLS **terminates** and encrypt internal traffic where risk requires, and use **mutual TLS** for strong machine-to-machine identity. TLS authenticates names, not intentions.

## Key terms

- **TLS (Transport Layer Security)** — The protocol that encrypts and authenticates network connections; the successor to SSL.
- **HTTPS** — HTTP carried over TLS.
- **Symmetric encryption** — Encryption using one shared key for both encryption and decryption.
- **Asymmetric cryptography** — Cryptography using key pairs of private and public keys.
- **Digital signature** — A value created with a private key that proves data's origin and integrity.
- **Hash (cryptographic)** — A fixed-size fingerprint of data that changes completely if the data changes.
- **Key exchange (ECDHE)** — Agreeing on a shared secret over a public channel.
- **Forward secrecy** — The property that captured traffic cannot be decrypted later even if the server's key is stolen.
- **TLS handshake** — The exchange establishing keys and verifying identity before encrypted data flows.
- **SNI (Server Name Indication)** — The hostname a client sends in the handshake to select the right certificate.
- **Certificate (X.509)** — A signed document binding a public key to names, with validity dates and an issuer.
- **SAN (subject alternative name)** — The list of names a certificate is valid for.
- **Certificate authority (CA)** — An entity that issues and signs certificates.
- **Root certificate** — A CA certificate trusted directly by operating systems and browsers.
- **Intermediate certificate** — A CA certificate between the root and the leaf in a chain.
- **Chain of trust** — The sequence of signatures linking a leaf certificate to a trusted root.
- **Trust store** — The set of root certificates a system trusts.
- **Domain validation** — Proving control of a domain to obtain a certificate.
- **ACME** — The protocol used by Let's Encrypt and others to issue certificates automatically.
- **Let's Encrypt** — A free, automated public certificate authority.
- **Wildcard certificate** — A certificate covering all names at one subdomain level, such as `*.example.com`.
- **TLS termination** — Decrypting TLS at a proxy, load balancer or application.
- **HSTS** — A header instructing browsers to use only HTTPS for a domain.
- **Mutual TLS (mTLS)** — TLS in which both client and server present certificates.
- **Private CA** — A certificate authority run by an organisation for internal use.
- **Certificate revocation** — Declaring a certificate invalid before its expiry.

## What comes next

With networking, DNS and TLS in place, the next step is how applications themselves are packaged and run. The next chapter, {{ch:docker}}, introduces containers: images and layers, writing good Dockerfiles, running and debugging containers, networking and volumes, multi-stage builds, security, and why containers became the standard unit of deployment.
