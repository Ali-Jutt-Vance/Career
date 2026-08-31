# Phase 11 — Chapter 5: Pricing, Contracts, and Client Management

---

## Chapter Overview

Winning the client is only half the battle. Pricing your work correctly, setting expectations in a contract, delivering professionally, and handling difficult situations (scope creep, late payment, revision wars) determines whether freelancing is profitable and sustainable. This chapter covers the business side of software freelancing.

**Topics:**
- Hourly vs. fixed-price vs. retainer — when to use each
- How to price your work without undercharging
- Writing a simple freelance contract (what must be in it)
- Project kickoff, milestone structure, and progress updates
- Handling scope creep professionally
- Dealing with late payment and non-payment
- Asking for reviews and building long-term client relationships
- Raising your rates without losing clients

---

## Pricing Models

### Hourly vs. Fixed Price vs. Retainer

```
HOURLY RATE:
  When to use:
    - Scope is unclear or likely to change
    - Ongoing maintenance or support work
    - Consulting / architecture reviews
    - Working with established, trusted clients
  Pros: Paid for every hour, scope changes don't hurt you
  Cons: Clients may be nervous about total cost, creates pressure to track time
  
  What to charge (backend/AI engineer):
    Starting out: $15–25/hour (first 2–3 clients, for reviews)
    After 5 reviews: $30–45/hour
    After 12+ reviews: $50–80/hour
    AI/cloud specialist: $60–120/hour
    Rule: Never quote less than $15/hour regardless of desperation

FIXED PRICE:
  When to use:
    - Scope is crystal clear and well-defined
    - The deliverable is specific ("a REST API with 10 endpoints")
    - Short projects (under 2 weeks)
  Pros: Client knows exactly what they'll pay, you can earn more than hourly if efficient
  Cons: Scope creep can eat your profit
  
  How to calculate:
    Estimate honest hours × your target hourly rate × 1.3 (scope buffer)
    Example: 30 hours × $40/hour × 1.3 = $1,560
    Round up: quote $1,600 as a fixed price
    
  Always define what is NOT included to prevent scope creep:
    "This price covers the 10 endpoints listed in the requirements.
     Additional endpoints, mobile app integration, or third-party service
     integration are outside scope and will be quoted separately."

RETAINER (monthly):
  When to use:
    - Client needs ongoing support or regular new features
    - You want stable, predictable income
    - You've built trust with a client after a project
  Structure example:
    "20 hours/month retainer at $45/hour = $900/month minimum"
    "Includes: bug fixes, small features, weekly check-in call"
    "Additional hours at the same rate"
  Pros: Predictable income, strong client relationship, less time selling
  Cons: Need to carefully track hours to avoid over-delivering for free
  
  Retainers are the holy grail of freelancing.
  Goal: build 2–3 retainer clients = stable $2,000–4,000/month baseline.
```

### Raising Your Rates

```
When to raise your rate:
  After every 5 new five-star reviews
  When your schedule is more than 80% booked
  When you complete a project that produced significant value for the client
  Every 6 months as a practice

How to raise rates with existing clients:
  Give 30 days notice. Frame it as an update, not an apology.
  
  "Hi [Name], I wanted to let you know that my rate is increasing
  from $35 to $45/hour starting [date — 30 days from now].
  
  This reflects the additional expertise I've developed in [specific area]
  over the past year and aligns with current market rates for this work.
  
  I really value working with you and hope to continue. My schedule is
  filling up, but I've reserved [hours/week] for your projects. Let me
  know if you'd like to lock in current pricing before [date]."
  
  What happens:
    70% of good clients stay — they value the relationship
    30% leave — they were price-sensitive anyway
    Those who leave make room for higher-paying new clients

How to raise rates with new clients:
  Simply quote your new rate. No explanation needed.
  If they push back: "My rate reflects the quality and reliability
  I deliver. I'm happy to share examples of past results."
  Never apologize for your rate.
```

---

## Freelance Contracts

### What Must Be in Every Contract

```
You need a written agreement for EVERY project over $100.
Upwork provides some protection, but a contract defines expectations.
For direct clients (off-platform), a contract is non-negotiable.

Minimum contract sections:

1. SCOPE OF WORK
   Exact deliverables — list every feature, endpoint, screen.
   "This contract covers: [list]. It does NOT cover: [list]."
   
2. PAYMENT TERMS
   Amount (total or rate)
   Payment schedule (see milestone section below)
   Late payment clause: "Invoices unpaid after 7 days accrue 1.5% monthly interest"
   Payment method: Payoneer / Wise / bank transfer
   
3. REVISION POLICY
   "This contract includes [2] rounds of revisions. Additional revisions
    are billed at $[rate]/hour."
   Without this, clients request unlimited changes.
   
4. TIMELINE AND MILESTONES
   Start date, end date
   Milestone dates (when partial deliverables are due)
   
5. KILL FEE (project cancellation)
   If client cancels mid-project, they pay for completed work:
   "If client terminates the project, all completed milestones are
    invoiced and due within 7 days. Work in progress is billed at
    hourly rate for hours logged."
    
6. INTELLECTUAL PROPERTY
   "Full ownership of the code transfers to the client upon receipt
    of final payment. Developer retains the right to reference this
    project in their portfolio (without revealing proprietary business logic)."
    
7. CONFIDENTIALITY (optional, but recommended)
   "Developer agrees not to disclose client's business information,
    user data, or proprietary processes."

Free contract generator: Bonsai, HelloSign, AND CO, or Notion template.
For large projects (>$1,000): use a real freelance contract from a template.
For small Upwork/Fiverr jobs: platform protections cover you.
```

### Payment Milestone Structure

```
NEVER do work before receiving any payment (except tiny $50 jobs).
Never release final deliverables before final payment.

For fixed-price projects:
  Small project ($50–300):
    50% upfront → 50% on delivery
    
  Medium project ($300–1,500):
    40% upfront → 30% at midpoint milestone → 30% on final delivery
    
  Large project ($1,500+):
    30% upfront → 30% at 50% completion → 20% at testing → 20% on delivery

For Upwork: use Milestones feature — client deposits into escrow before work starts.
For Fiverr: payment held in escrow until you deliver.
For direct clients: invoice upfront payment before starting, use Payoneer/Wise.

Why upfront payment matters:
  Protects you if the client disappears
  Shows the client is serious (ghosts don't pay deposits)
  Gives you cash flow during the project
  Filters out time-wasters immediately
```

---

## Scope Creep Management

```
Scope creep = the client gradually adds requirements beyond the original agreement.
  "Can you also add this small feature?"
  "Can you quickly change the design?"
  "Can you integrate with this other service too?"
  
  Each "small" addition can turn a 2-week project into a 6-week project
  at the same price. This is how freelancers burn out and hate clients.

How to handle it professionally:

The moment a new request comes in outside the original scope:
  1. Acknowledge the request positively
  2. Confirm it's outside the current scope
  3. Offer to quote it separately

Script:
  "Happy to add that! That's outside the current project scope.
   I can put together a quick quote for it — it looks like about
   [estimate] of additional work. Want me to include it as a change order
   to this project, or should we save it for a follow-up engagement?"

A "change order" is a mini-contract addendum:
  "Change Order #1: Add user notification system (email + in-app)
   Additional cost: $300 | Timeline: +3 business days"
   
   Client signs → you do the work → you invoice the extra.
   
What NEVER to do:
  ✗ Do the extra work for free "to keep the client happy" (they'll keep asking)
  ✗ Argue about whether it was in scope (reference the original agreement)
  ✗ Resent the client silently while doing free work

Prevention is better than treatment:
  Write more detailed scope than you think is necessary
  When the client says "can you also handle X?" during scoping,
  add it explicitly to the scope OR note it as out of scope
  Start every project with: "Here's exactly what's included and what's not."
```

---

## Asking for Reviews

```
5-star reviews are currency. One great review = 10 mediocre proposals.
You must ask for reviews — most happy clients don't leave them unprompted.

When to ask:
  After the client has confirmed the work is good and paid the final invoice.
  
Script (Upwork/Fiverr):
  "It's been a pleasure working on this project with you. If you're satisfied
  with the work, I'd genuinely appreciate a review on [platform] — it really
  helps me grow my freelancing practice. I'll be leaving a 5-star review for
  you as well as a great client to work with."

For direct clients (no platform):
  "Would you be willing to write a short testimonial about our project?
  Even 2–3 sentences about the problem we solved and the outcome would
  be incredibly helpful for my portfolio."

What to do with testimonials:
  Add to your Upwork overview
  Add to your personal website
  Add to your LinkedIn profile (as a recommendation or featured section)
  Use in future proposals: "A recent client said: '...'"
```

---

## Building Long-Term Client Relationships

```
The most valuable freelancing secret: repeat clients.
Getting a new client costs 5–10 hours of proposals and interviews.
Keeping a client costs 10 minutes of a good email.

After project completion:
  1. Send a professional closing message:
     "The project is complete and deployed. Here's a summary of what was
      built, how to manage it, and what I'd recommend as next steps.
      It's been a pleasure — reach out anytime if you need support."
  
  2. Check in after 30 days:
     "Hi [Name], just checking in — how is [the system] working for you?
      Any performance questions or small improvements I can help with?"
  
  3. Reach out when you have relevant news:
     "Hi [Name], I just completed an AI chatbot integration for another
      client similar to your platform. Thought you might be interested —
      happy to walk you through it if you want."
  
  4. Offer a retainer:
     After 2 successful projects: "I work with several clients on a monthly
      retainer basis for ongoing support and new features. If that might be
      useful, I'd love to discuss what that could look like for your project."

Relationship metrics to track:
  Number of clients who returned for a second project
  Number of referrals received from past clients
  Average project value per client over their lifetime
  Goal: 3+ returning clients generating 60% of your income
```

---

## Cheat Sheet

```
Pricing model:
  Hourly:   unclear scope, ongoing work, consulting
  Fixed:    clear scope, short project — quote × 1.3 buffer
  Retainer: ongoing client, predictable income goal

Rate progression:
  First 3 clients: $15–25/hour (reviews are the ROI)
  After 5 reviews: $30–45/hour
  After 12 reviews: $50–80/hour
  AI/Cloud niche: $60–120/hour

Contract must-haves:
  Scope (what's included AND what's not)
  Payment terms + late payment clause
  Revision limit (2 rounds, extras billed hourly)
  Milestone schedule
  Kill fee (client cancellation clause)
  IP transfer on final payment

Payment milestones:
  $50–300:    50% up / 50% delivery
  $300–1500:  40% up / 30% midpoint / 30% delivery
  $1500+:     30% up / 30% midpoint / 20% testing / 20% delivery

Scope creep script:
  "Happy to add that! That's outside the current scope.
   I can quote it as a change order — looks like ~[time] of additional work.
   Should I add it to this project or save for a follow-up?"

Review request:
  Ask immediately after final payment + positive feedback.
  "I'd genuinely appreciate a review — it really helps me grow."

Long-term relationship:
  Closing message → 30-day check-in → relevant updates → retainer offer
  Retainer goal: 2–3 clients × $900–2,000/month = stable base income
```
