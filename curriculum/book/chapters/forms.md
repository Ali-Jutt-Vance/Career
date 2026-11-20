# Forms

> [!GOALS]
> - Explain why forms are one of the hardest and most valuable parts of front-end work, and what makes a form good for users.
> - Describe a form's life cycle: values, touched and dirty fields, validation, submission and server responses.
> - Define validation rules once as a **schema** with Zod, and use the same schema on the client and the server.
> - Build forms in React with **React Hook Form**, connect them to a schema, and know when plain React or React 19 actions are enough.
> - Show errors accessibly: inline messages linked to fields, `aria-invalid`, focus management and error summaries.
> - Handle real-world needs: server-side errors, asynchronous checks, dynamic lists of fields, multi-step flows, file inputs, drafts and double submissions.
> - Keep forms secure: the server validates everything, and forms resist abuse.

## Why this matters

Almost everything valuable that users do in an application passes through a form: signing up, logging in, searching, checking out, booking an appointment, filing a complaint, uploading documents. A form is where a visitor becomes a customer — or gives up.

Forms are also where many concerns meet at once:

- **State**: many values changing as the user types ({{ch:react-basics}}, {{ch:state-management}}).
- **Validation**: rules about what is acceptable, which must be enforced on the client for helpfulness and on the server for safety ({{ch:validation}}).
- **Accessibility**: labels, error messages and focus that work for keyboard and screen-reader users ({{ch:html}}, {{ch:accessibility}}).
- **Networking**: submitting, handling slow responses and failures, preventing duplicates ({{ch:browser-and-dom}}).
- **Security**: everything a user submits is untrusted input ({{ch:application-security}}).

A form that rejects a valid phone number because the user typed a space, that shows "Invalid input" without saying which field or why, that loses everything after one error, or that charges a card twice because the button was clicked twice — each of these loses real money and trust. This chapter teaches how professionals build forms that are pleasant, accessible, robust and secure.

## The simple idea

Think of filling in a paper form at a bank, with a helpful clerk beside you. As you write, the clerk glances over: "That account number needs 14 digits", "You forgot to sign here". They do not shout at you before you have written anything, and they do not wait until you have queued for twenty minutes to tell you everything was wrong. When you hand it in, the bank **still checks everything** in the back office — the clerk's quick glance is a courtesy, not the bank's security.

Good digital forms work the same way: **helpful checks while you fill in, clear explanations next to each problem, and authoritative checks on the server after you submit.**

> [!ANALOGY]
> A good form is like a bank form filled in beside a helpful clerk who points out problems at the right moment — while the back office still checks everything when the form is submitted.
>
> **Where the analogy breaks:** a clerk can see you hesitating and offer help. A digital form only knows what you type, click and focus. It must decide by rules **when** to show a message (after you leave a field? as you type? on submit?) — and those timing rules make a large difference to whether a form feels helpful or hostile.

## The proper definition and key words

A **form** is a set of input controls that collects data from a user and submits it for processing ({{ch:html}}). In application code, "form handling" covers everything from the first keystroke to the server's response.

The key words:

- **Field** — one input in a form: a text box, checkbox, select, file input.
- **Value** — what a field currently contains.
- **Touched** — whether the user has interacted with a field and left it (blurred it).
- **Dirty** — whether a field's value differs from its initial value.
- **Validation** — checking values against rules.
- **Schema** — a declarative description of the expected shape and rules of data, from which validation is performed.
- **Client-side validation** — checks in the browser, for fast feedback.
- **Server-side validation** — checks on the server, for correctness and security. Always required.
- **Submission** — sending the form's data for processing.
- **Field error** — a problem with one field ("Email is required"). **Form-level error** — a problem with the form as a whole ("Your session expired, please log in again").

## How it works inside: a form's life cycle

Every form, whatever library you use, goes through the same stages:

```text
   INITIAL  ──user types──▶ EDITING ──user leaves a field──▶ field TOUCHED
   values                    (dirty fields)                      │
                                                                 ▼
                                                      validate that field
                                                      (show error if any)
                                                                 │
                                     user presses Submit         ▼
                                  ──────────────────────▶ VALIDATE ALL
                                                             │      │
                                                     invalid │      │ valid
                                                             ▼      ▼
                                       show errors, focus first   SUBMITTING
                                       problem; stay on form      (disable, show progress)
                                                                     │
                                                       ┌─────────────┴────────────┐
                                                       ▼                          ▼
                                               SERVER REJECTS               SUCCESS
                                           (field or form errors        (confirm, reset or
                                            mapped back to fields)       navigate away)
```

Understanding these stages explains most form decisions:

- **When to validate.** Validating a field on every keystroke from the first character shows "invalid email" while the user is still typing — hostile. A common, good default: **validate a field when the user leaves it** (on blur), and once a field has shown an error, **re-validate it as they type**, so the error disappears the moment it is fixed. On submit, validate everything.
- **Touched versus dirty.** Showing errors only for touched fields (or after a submit attempt) prevents a wall of red on a fresh form. Dirty state tells you whether there are unsaved changes ("You have unsaved changes — leave anyway?").
- **Submitting state.** While submitting, the submit button is disabled and shows progress, preventing double submission.
- **Server errors.** The server may reject data the client accepted — the email is already registered, the coupon expired, the stock ran out. These must come back into the form, next to the right field when possible.

## Designing forms that people can complete

Before code, some design principles that matter more than any library:

- **Ask for less.** Every field you remove increases completion. Do you need a fax number? Both "first name" and "last name"? A separate "confirm email" field?
- **One column, logical order.** Group related fields with `fieldset`/`legend` ({{ch:html}}), in the order people think: name, then contact, then address.
- **Visible labels above fields**, never placeholders as labels.
- **Accept what people type.** Strip spaces and dashes from phone and card numbers; accept upper or lower case in postcodes; trim surrounding spaces. Normalise, then validate — do not force users to guess your preferred format.
- **Explain formats before errors happen**: a hint under the field ("For example 03001234567").
- **Write error messages that say how to fix the problem.** "Please enter a mobile number like 03001234567" beats "Invalid input". Never blame the user.
- **Mark optional fields** rather than required ones, if most are required — or mark both clearly.
- **Use the right input types and `autocomplete`** so phones show the right keyboard and browsers can fill in saved details ({{ch:html}}).
- **Do not clear the form on error.** Keep everything the user typed (except, by convention, password fields).

## Schemas: rules written once

### Level 2 — The problem with scattered validation

Without a plan, validation rules end up written several times: some HTML attributes, some JavaScript checks in the component, and a different set of checks on the server. They drift apart. The client accepts "+92 300 1234567" but the server rejects it; the server requires a city but the client never asked for one. The user sees a confusing error after submitting.

The professional solution is to write the rules **once**, as a **schema**, and use that schema everywhere.

### Level 3 — Zod

**Zod** is the most widely used schema library in the TypeScript world. A schema describes the expected data; Zod checks values against it and, as a bonus, **produces the TypeScript type** automatically ({{ch:typescript-advanced}}).

```ts
import { z } from "zod";

const OrderForm = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.email("Please enter a valid email address"),
  quantity: z.coerce.number().int("Whole boxes only").min(1, "At least 1 box").max(10, "At most 10 boxes"),
  phone: z.string().regex(/^(\+92|0)3\d{9}$/, "Use the format 03001234567"),
});

type OrderFormValues = z.infer<typeof OrderForm>;

const bad = OrderForm.safeParse({ name: " A ", email: "sara@", quantity: "12", phone: "12345" });
console.log(bad.success);
if (!bad.success) console.log(z.flattenError(bad.error));

const good = OrderForm.safeParse({ name: "  Sara Ahmed ", email: "sara@example.com", quantity: "2", phone: "03001234567" });
console.log(good);
```

**Output:**

```text
false
{
  formErrors: [],
  fieldErrors: {
    name: [ 'Please enter your full name' ],
    email: [ 'Please enter a valid email address' ],
    quantity: [ 'At most 10 boxes' ],
    phone: [ 'Use the format 03001234567' ]
  }
}
{
  success: true,
  data: {
    name: 'Sara Ahmed',
    email: 'sara@example.com',
    quantity: 2,
    phone: '03001234567'
  }
}
```

Walk through it:

- `z.object({...})` describes an object with these fields. Each field has its own schema.
- `z.string().trim().min(2, "...")` — a string, **trimmed** of surrounding spaces, at least two characters, with a custom message. Notice that `" A "` failed (it is one character after trimming) and that `"  Sara Ahmed "` came out trimmed in `data`: schemas can **transform** values as well as check them.
- `z.email("...")` — a string in email format (in older Zod versions this was written `z.string().email()`; you will see both).
- `z.coerce.number()` — **converts** the input to a number first. Form fields always produce **strings** (`"12"`), so coercion is needed for numeric fields. Then `.int()`, `.min()` and `.max()` check it.
- `.regex(...)` — a pattern; here a Pakistani mobile number ({{ch:clean-code}}).
- `z.infer<typeof OrderForm>` produces the TypeScript type `{ name: string; email: string; quantity: number; phone: string }`. Types and runtime checks come from the same source and cannot disagree.
- `safeParse` returns `{ success: true, data }` or `{ success: false, error }` — the `Result` shape from {{ch:functional-programming}} — instead of throwing. (`parse` throws instead.)
- `z.flattenError(error)` turns the error into `fieldErrors` keyed by field name — exactly the structure a form needs to show messages next to fields.

### Level 3 — Rules that involve several fields

Some rules relate fields to each other: "confirm password must match", "delivery date must be after today", "a company name is required if 'business account' is ticked". Zod handles these with `refine`, attaching the error to the right field with `path`:

```ts
import { z } from "zod";

const SignUp = z
  .object({
    password: z.string().min(12, "At least 12 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

const result = SignUp.safeParse({ password: "correct horse battery", confirm: "correct horse" });
if (!result.success) console.log(z.flattenError(result.error));
```

**Output:**

```text
{
  formErrors: [],
  fieldErrors: { confirm: [ 'Passwords do not match' ] }
}
```

`refine` runs only after the individual fields are valid, receives the whole object, and attaches its message to `confirm`, where the user will see it.

### Level 4 — One schema, two places

The key professional practice: **put the schema in a shared module** that both the front end and the back end import.

```text
   shared/schemas/order.ts      ← the single source of rules
        │                 │
        ▼                 ▼
   browser form       server endpoint
   (fast feedback)    (authoritative check: never skipped)
```

In a monorepo or a full-stack framework such as Next.js ({{ch:nextjs}}), this is a simple import. When the front end and back end are separate projects, teams publish the schemas as a shared package, or generate them from an API specification ({{ch:api-documentation}}). Either way, client and server agree by construction. The server still runs the check — always — because the client can be bypassed ({{ch:validation}}).

Other libraries with the same role include Valibot, ArkType and Yup; the ideas are identical.

## Forms in React

### Level 3 — Three approaches

You have already seen two ways to build forms in React ({{ch:react-basics}}):

1. **Controlled inputs** — each value in React state. Full control, but every keystroke re-renders the form, and a large form means a lot of state and handlers to write.
2. **Uncontrolled inputs read with `FormData`** on submit — little code and few re-renders, but no per-field state for live validation.

And React 19 added **actions** with `useActionState` ({{ch:react-advanced}}), which handle submission, pending state and results neatly, especially with server functions.

For anything beyond simple forms, most teams use a **form library**. The most widely used for React is **React Hook Form**. It keeps values in the DOM and in its own store (uncontrolled by default, so typing does not re-render the whole form), tracks touched/dirty/errors for every field, and connects to schemas such as Zod.

### Level 3 — React Hook Form with Zod

```tsx
// fragment
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const DeliveryForm = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  phone: z
    .string()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+92|0)3\d{9}$/, "Use the format 03001234567")),
  city: z.enum(["lahore", "karachi", "islamabad"], { message: "Please choose a city" }),
  address: z.string().trim().min(10, "Please enter your full street address"),
});

type DeliveryInput = z.input<typeof DeliveryForm>;
type DeliveryValues = z.output<typeof DeliveryForm>;

export function DeliveryDetails({ onSave }: { onSave: (values: DeliveryValues) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryInput, unknown, DeliveryValues>({
    resolver: zodResolver(DeliveryForm),
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <div>
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
        {errors.name && <p id="name-error" className="error">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="phone">Mobile number</label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby="phone-hint phone-error"
          {...register("phone")}
        />
        <p id="phone-hint">For example 0300 1234567</p>
        {errors.phone && <p id="phone-error" className="error">{errors.phone.message}</p>}
      </div>

      <div>
        <label htmlFor="city">City</label>
        <select id="city" defaultValue="" aria-invalid={errors.city ? true : undefined} {...register("city")}>
          <option value="" disabled>Choose a city</option>
          <option value="lahore">Lahore</option>
          <option value="karachi">Karachi</option>
          <option value="islamabad">Islamabad</option>
        </select>
        {errors.city && <p className="error">{errors.city.message}</p>}
      </div>

      <div>
        <label htmlFor="address">Street address</label>
        <textarea id="address" rows={3} autoComplete="street-address" {...register("address")} />
        {errors.address && <p className="error">{errors.address.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save delivery details"}
      </button>
    </form>
  );
}
```

Walk through the important parts:

- **The schema** defines every rule, including **normalisation**: the phone schema first **removes spaces and dashes** (`transform`), then checks the cleaned value (`pipe`). Users can type "0300-123 4567" and it is accepted and stored as "03001234567" — accept what people type ({{ch:clean-code}}).
- Because `transform` changes the data, the schema's **input** type (what the fields contain) can differ from its **output** type (what you receive after validation). `z.input` and `z.output` name both, and `useForm<Input, Context, Output>` tells React Hook Form about each.
- **`useForm({ resolver: zodResolver(schema) })`** makes the library validate with Zod. **`mode: "onTouched"`** validates a field when it is first left, then re-validates it on every change — the friendly timing described earlier.
- **`register("name")`** returns the props an input needs — `name`, `ref`, `onChange`, `onBlur` — and the spread `{...register("name")}` attaches them. The field's value lives in the DOM; React Hook Form reads it when needed.
- **`handleSubmit(onSave)`** returns a submit handler that prevents the default page reload, validates everything, focuses the first invalid field if there are errors, and otherwise calls `onSave` with the **validated, transformed** values.
- **`formState.errors`** holds the current error for each field; **`isSubmitting`** is true while `onSave`'s promise is pending — used to disable the button and prevent double submission.
- **`noValidate`** on the form turns off the browser's built-in validation bubbles, because the schema now provides consistent, custom messages. (Keep `type="email"`, `type="tel"` and `autocomplete` for their keyboard and auto-fill benefits.)
- **Accessibility**: each error has an `id` and is linked to its field with **`aria-describedby`**, and the field is marked **`aria-invalid`**, so screen readers announce "Mobile number, invalid entry, Use the format 03001234567". The hint and the error can both be referenced. (Using `undefined` rather than `false` removes the attribute entirely when there is no error.)

### Level 4 — Why React Hook Form, and when not

React Hook Form's main advantages are **performance** (typing in one field does not re-render the whole form), **less code** for state, errors and touched tracking, and **schema integration**. For a three-field newsletter form, it is unnecessary: an uncontrolled form with `FormData` and a schema check, or a React 19 action, is simpler. For a long checkout, an insurance application or an admin editor with dozens of fields, a form library saves a great deal of code and bugs.

## Showing errors well

### Level 3 — Inline errors

- Place each error **directly below its field**, in text — not only as a red border (colour alone fails colour-blind users and screen readers — {{ch:css}}).
- Link it with `aria-describedby` and mark the field `aria-invalid`.
- Say **how to fix it**: "Please enter at least 10 characters, including the street name".
- Remove the error **as soon as** the field becomes valid.

### Level 4 — Focus and summaries on submit

When a submit fails validation:

- **Move focus to the first invalid field** (React Hook Form does this by default), so keyboard and screen-reader users land on the problem.
- For long forms, add an **error summary** at the top: a box listing each problem as a link to its field, announced with `role="alert"` — a pattern used by many government design systems because it works for everyone:

```tsx
// fragment
function ErrorSummary({ errors }: { errors: Record<string, { message?: string } | undefined> }) {
  const entries = Object.entries(errors).filter(([, e]) => e?.message);
  if (entries.length === 0) return null;
  return (
    <div role="alert" className="error-summary" tabIndex={-1}>
      <h2>There is a problem</h2>
      <ul>
        {entries.map(([field, e]) => (
          <li key={field}>
            <a href={`#${field}`}>{e!.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Each link jumps to the field with that `id`. `tabIndex={-1}` allows the summary itself to receive focus programmatically.

### Level 4 — Server errors

The server may reject a submission for reasons the client cannot know. Design your API to return errors in a structure the form can use ({{ch:rest-apis}}, {{ch:error-handling}}), for example:

```json
{
  "message": "Some details need attention",
  "fieldErrors": { "email": ["This email address is already registered"] }
}
```

and map them back into the form:

```tsx
// fragment
const { setError } = useForm<SignUpValues>();

async function onSubmit(values: SignUpValues) {
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (response.status === 422) {
    const body: { fieldErrors?: Record<string, string[]> } = await response.json();
    for (const [field, messages] of Object.entries(body.fieldErrors ?? {})) {
      setError(field as keyof SignUpValues, { type: "server", message: messages[0] });
    }
    return;
  }
  if (!response.ok) {
    setError("root.server", { type: "server", message: "Something went wrong. Please try again." });
    return;
  }
  // success: navigate or show confirmation
}
```

- `setError(field, ...)` shows a server error exactly like a client-side one, next to the field.
- `root.server` is React Hook Form's place for **form-level** errors, displayed at the top of the form.
- HTTP status **422 Unprocessable Content** is a common choice for "your data failed validation"; 400 is also common ({{ch:rest-apis}}).
- Never show raw server error text (stack traces, SQL) to users ({{ch:error-handling}}).

## Real-world patterns

### Level 4 — Asynchronous checks

Some rules need the server: "Is this username available?", "Is this coupon valid?". Run these checks **when the user pauses or leaves the field**, not on every keystroke, and treat the result as a hint — the final check still happens on submit, because availability can change in between.

```ts
import { z } from "zod";

const takenUsernames = new Set(["sara", "admin", "bilal"]);
async function isUsernameAvailable(name: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 10)); // simulate a network request
  return !takenUsernames.has(name.toLowerCase());
}

const Username = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .regex(/^[a-z0-9_]+$/i, "Letters, numbers and underscores only")
  .refine(isUsernameAvailable, {
    message: "That username is taken",
    when: (payload) => payload.issues.length === 0, // only ask the server if the basic checks passed
  });

for (const candidate of ["Sara", "sara_ahmed", "x!"]) {
  const result = await Username.safeParseAsync(candidate);
  console.log(candidate, "->", result.success ? "available" : result.error.issues[0]!.message);
}
```

**Output:**

```text
Sara -> That username is taken
sara_ahmed -> available
x! -> At least 3 characters
```

- An **async refinement** calls the server-side check; schemas with async rules use `safeParseAsync`.
- Cheap rules run first. By default, Zod (version 4) still runs a refinement even when earlier checks on the same value have failed — which here would send a pointless request to the server for "x!". The **`when`** option makes the refinement run only if there are no issues so far, so "x!" fails on its length without any request. (Zod reports every failed check; the example prints only the first.)
- In a real form, debounce the check ({{ch:browser-and-dom}}) and show "Checking…" while it runs.

### Level 4 — Dynamic lists of fields

Forms often contain repeating groups: several passengers, several order lines, several phone numbers. React Hook Form's `useFieldArray` manages adding, removing and reordering them, with stable keys:

```tsx
// fragment
import { useFieldArray, useForm } from "react-hook-form";

type Guest = { name: string; meal: "standard" | "vegetarian" };
type BookingValues = { guests: Guest[] };

export function GuestList() {
  const { register, control } = useForm<BookingValues>({
    defaultValues: { guests: [{ name: "", meal: "standard" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "guests" });

  return (
    <fieldset>
      <legend>Guests</legend>
      {fields.map((field, index) => (
        <div key={field.id}>
          <label htmlFor={`guest-${index}-name`}>Guest {index + 1} name</label>
          <input id={`guest-${index}-name`} {...register(`guests.${index}.name` as const)} />
          <label htmlFor={`guest-${index}-meal`}>Meal</label>
          <select id={`guest-${index}-meal`} {...register(`guests.${index}.meal` as const)}>
            <option value="standard">Standard</option>
            <option value="vegetarian">Vegetarian</option>
          </select>
          <button type="button" onClick={() => remove(index)} aria-label={`Remove guest ${index + 1}`}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: "", meal: "standard" })}>
        Add another guest
      </button>
    </fieldset>
  );
}
```

- `fields` has an automatically generated, stable **`id`** for each row — use it as the `key`, never the index ({{ch:react-basics}}): removing guest 1 must not move guest 2's typed name into guest 1's row.
- Field names use **paths**: `guests.0.name`, `guests.1.meal`. The schema for this form would be `z.object({ guests: z.array(GuestSchema).min(1) })`.
- Every "Add" and "Remove" button has `type="button"`, so it does not submit the form ({{ch:html}}).

### Level 4 — Multi-step forms

Long processes — insurance applications, onboarding, checkout — are often split into steps. Guidelines:

- Keep **all** values in **one** form state (one `useForm`, or a store) across steps, so going back does not lose data.
- **Validate each step** before moving on (with a schema per step, or `trigger(["field1", "field2"])` in React Hook Form), and validate everything again on the final submit — and on the server.
- Show **progress** ("Step 2 of 4") and let users go back.
- Put the current step in the **URL** if users might refresh or share ({{ch:state-management}}).
- Consider **saving drafts** for long forms — locally, or on the server for logged-in users — so a closed tab does not lose twenty minutes of work.
- Move focus to the new step's heading after navigating, so screen-reader users know the page changed.

### Level 4 — File inputs

```tsx
// fragment
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];

const PrescriptionUpload = z.object({
  file: z
    .instanceof(FileList)
    .refine((list) => list.length === 1, "Please choose one file")
    .refine((list) => (list[0]?.size ?? 0) <= MAX_BYTES, "The file must be 5 MB or smaller")
    .refine((list) => ALLOWED.includes(list[0]?.type ?? ""), "Please upload a JPG, PNG or PDF"),
});

// <input id="file" type="file" accept=".jpg,.jpeg,.png,.pdf" {...register("file")} />
```

- The browser gives file inputs a `FileList`; you can check count, size and the declared type before uploading, for quick feedback.
- `accept` filters the file picker but does **not** enforce anything — users can choose any file.
- These checks are courtesy only. The **server** must check size and real content type, and store files safely ({{ch:file-uploads}}).
- Files are sent with `FormData` and `multipart/form-data`, not JSON.

### Level 4 — Unsaved changes

When a user has edited a form (it is **dirty**) and tries to leave, warn them. In the browser, the `beforeunload` event triggers the "Leave site? Changes you made may not be saved" dialog; routers provide hooks for in-app navigation. Use this only when there really are unsaved changes, or users learn to ignore it.

## From beginner to enterprise

**Level 3 — first forms.** Semantic HTML, labels, input types, a controlled or `FormData`-based form, a submit handler with `preventDefault`, a disabled button while submitting.

**Level 4 — application forms.** Zod schemas; React Hook Form for larger forms; friendly validation timing; inline, accessible errors; server errors mapped to fields; normalised inputs; dynamic field arrays.

**Level 5 — professional practice.** Schemas shared between client and server; consistent error-response format from the API; a design-system set of field components (label, hint, error and input wired together once — {{ch:tailwind}}); form tests with Testing Library ({{ch:react-advanced}}); analytics on where users abandon forms.

**Level 6 — large organisations.** Forms generated from schemas or configuration for many products; localised error messages; strict accessibility compliance; server-driven validation rules that change without front-end releases; fraud and abuse protection (rate limiting, bot detection) on public forms.

## Real-world use cases

### Checkout conversion

- **Problem:** many customers abandon the delivery-details step on phones.
- **Findings:** phone numbers with spaces rejected; errors shown only after submit, at the top of the page; the "City" select defaulting to Lahore so many orders went to the wrong city; no `autocomplete`.
- **Fixes:** normalise phone input in the schema; validate on blur with inline errors; an empty "Choose a city" default that must be chosen; `autocomplete` attributes; fewer fields.
- **Lesson:** most form problems are design and validation-timing problems, not library problems.

### Registration with a unique email

- **Requirement:** an email can be registered only once.
- **Design:** the client checks format; an optional debounced "is this email registered?" hint; the server checks uniqueness with a **database unique constraint** ({{ch:database-design}}) and returns a field error mapped to the email field.
- **Security consideration:** a public "is this email registered?" endpoint lets attackers discover which emails have accounts (**account enumeration**). Many sites therefore show a neutral message ("If this address is new, you'll receive a confirmation email") and rate-limit the endpoint ({{ch:authentication}}).

## Common mistakes

### Beginner: placeholder instead of label

**Consequence:** the hint vanishes as the user types; screen readers may not announce it. **Fix:** a visible `<label>` for every field.

### Beginner: validating on every keystroke from the start

"Invalid email" appears after the first letter. **Fix:** validate on blur, then on change once an error is visible.

### Beginner: unhelpful messages

"Invalid input", "Error 422". **Fix:** say what is wrong and how to fix it.

### Intermediate: rules duplicated on client and server

They drift; users are rejected after submitting. **Fix:** one shared schema.

### Intermediate: numbers left as strings

`"2" + 1` becomes `"21"`. **Fix:** coerce numeric fields in the schema ({{ch:types-of-data}}).

### Intermediate: index keys in dynamic fields

Removing a row shifts typed values into the wrong rows. **Fix:** stable ids (`field.id`).

### Production: double submissions

A second click places a second order. **Fix:** disable while submitting **and** make the server idempotent ({{ch:browser-and-dom}}, {{ch:rest-apis}}).

### Production: trusting client validation

Requests sent directly to the API bypass all browser checks. **Fix:** validate everything on the server, always.

## Debugging and troubleshooting

- **A field's value is missing on submit:** with `register`, the field name was misspelled or `register` was not spread onto the input; with `FormData`, the `name` attribute is missing; disabled fields are not submitted ({{ch:html}}).
- **Validation never runs or errors never show:** the resolver is not connected, or the `mode` validates only on submit; check `formState.errors` in React Developer Tools.
- **A numeric rule always fails:** the value is a string; use `z.coerce.number()` or React Hook Form's `valueAsNumber` option.
- **The form submits and reloads the page:** the submit handler is not wrapped in `handleSubmit`, or `preventDefault` is missing.
- **A "Remove" button submits the form:** missing `type="button"`.
- **Errors are not read by screen readers:** missing `aria-describedby` and `aria-invalid`; test with a screen reader (NVDA on Windows, VoiceOver on macOS and iOS — {{ch:accessibility}}).
- **Server field errors do not appear:** the API's error format does not match what the mapping code expects; log the response body and agree on one format.

## Security

- **Server-side validation is mandatory.** Client checks are for users; servers must reject anything invalid, regardless of what the client did ({{ch:validation}}).
- **Allow-list fields on the server.** Accept only the fields the operation needs; ignore or reject extra ones such as `isAdmin` or `price` (mass assignment — {{ch:application-security}}).
- **Never trust hidden fields or client-side prices.** Look them up on the server.
- **Protect state-changing forms** against cross-site request forgery when using cookie sessions ({{ch:sessions}}).
- **Rate-limit** login, sign-up, password reset and contact forms, and consider bot protection on public forms ({{ch:rate-limiting}}).
- **Avoid account enumeration** in login, sign-up and "forgot password" messages ({{ch:authentication}}).
- **Use the right `autocomplete` values** for passwords (`current-password`, `new-password`) so password managers work — strong, unique passwords are a security feature.
- **Do not log full form submissions** if they contain personal or sensitive data ({{ch:logging}}).

## Performance

- Uncontrolled inputs (or React Hook Form's default mode) avoid re-rendering the whole form on each keystroke.
- Subscribe narrowly: watch only the fields whose values affect other parts of the UI.
- Debounce asynchronous validation.
- Split very long forms into steps or sections; render large dynamic lists efficiently.
- Validate expensive rules only on blur or submit.

## How a senior engineer thinks about this

- **The form serves the user's task.** They push back on unnecessary fields and confusing flows before writing code.
- **One schema, enforced twice.** The client uses it for help; the server uses it for truth.
- **Normalise, then validate.** Accept reasonable input formats instead of rejecting users.
- **Errors are part of the design.** Timing, wording, placement and focus are planned, not left to defaults.
- **Accessible by construction.** A shared field component wires label, hint, error, `aria-describedby` and `aria-invalid` once, so every form is accessible.
- **Expect failure**: slow networks, server rejections, double clicks, closed tabs.

## Exercises

### Exercise 1 — A schema for a booking

**Objective:** practise Zod schemas, coercion and cross-field rules.
**What to build:** a schema for a clinic appointment form with: `patientName` (trimmed, at least 2 characters), `phone` (spaces and dashes removed, then Pakistani mobile format), `visitDate` (a date string `YYYY-MM-DD`, not in the past relative to a given "today"), `isFollowUp` (boolean from a checkbox value `"on"` or absent), and `previousVisitId` (required only when `isFollowUp` is true). Test it with one valid and one invalid input.

<details>
<summary>Show the solution</summary>

```ts
import { z } from "zod";

function bookingSchema(today: string) {
  return z
    .object({
      patientName: z.string().trim().min(2, "Please enter the patient's name"),
      phone: z
        .string()
        .transform((s) => s.replace(/[\s-]/g, ""))
        .pipe(z.string().regex(/^(\+92|0)3\d{9}$/, "Use the format 03001234567")),
      visitDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
        .refine((d) => d >= today, "The date cannot be in the past"),
      isFollowUp: z
        .string()
        .optional()
        .transform((v) => v === "on"),
      previousVisitId: z.string().trim().optional(),
    })
    .refine((data) => !data.isFollowUp || (data.previousVisitId ?? "").length > 0, {
      message: "Please enter the previous visit number",
      path: ["previousVisitId"],
    });
}

const schema = bookingSchema("2026-05-10");

const ok = schema.safeParse({ patientName: "Hina Raza", phone: "0321-555 1234", visitDate: "2026-05-12" });
console.log(ok.success && ok.data);

const bad = schema.safeParse({ patientName: "H", phone: "12345", visitDate: "2026-05-01", isFollowUp: "on" });
if (!bad.success) console.log(z.flattenError(bad.error).fieldErrors);
```

**Output:**

```text
{
  patientName: 'Hina Raza',
  phone: '03215551234',
  visitDate: '2026-05-12',
  isFollowUp: false
}
{
  patientName: [ "Please enter the patient's name" ],
  phone: [ 'Use the format 03001234567' ],
  visitDate: [ 'The date cannot be in the past' ],
  previousVisitId: [ 'Please enter the previous visit number' ]
}
```

**Walkthrough:**
- The schema is built by a function that takes **today**, so the "not in the past" rule is testable on any date ({{ch:functional-programming}}).
- Dates in `YYYY-MM-DD` form compare correctly as **strings**, because the format is fixed-width and goes from largest unit to smallest.
- A checkbox submits `"on"` when ticked and nothing when not ({{ch:html}}); the transform turns that into a boolean.
- The follow-up rule is a **cross-field refinement** attached to `previousVisitId` with `path`. In Zod version 4 it runs alongside the field checks, so the invalid example reports **all four** problems at once — useful for an error summary. (If a refinement needs the other fields to be valid first — for example, it calls a server — guard it with the `when` option shown in the username example.)

</details>

### Exercise 2 — Accessible field component

**Objective:** practise building accessibility into a reusable component.
**What to build:** a `TextField` React component that takes `id`, `label`, optional `hint`, optional `error`, and input props (including React Hook Form's `register` result), and renders the label, input, hint and error with correct `aria-describedby` and `aria-invalid`. Render it to static HTML twice — with and without an error — to check the output.

<details>
<summary>Show the solution</summary>

```tsx
import type { InputHTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

function TextField({ id, label, hint, error, ...inputProps }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <p id={hintId} className="hint">{hint}</p>}
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...inputProps} />
      {error && <p id={errorId} className="error">{error}</p>}
    </div>
  );
}

console.log(renderToStaticMarkup(<TextField id="email" label="Email" type="email" hint="We'll send your receipt here" />));
console.log(renderToStaticMarkup(<TextField id="email" label="Email" type="email" error="Please enter a valid email address" />));
```

**Output:**

```text
<div class="field"><label for="email">Email</label><p id="email-hint" class="hint">We&#x27;ll send your receipt here</p><input id="email" aria-describedby="email-hint" type="email"/></div>
<div class="field"><label for="email">Email</label><input id="email" aria-invalid="true" aria-describedby="email-error" type="email"/><p id="email-error" class="error">Please enter a valid email address</p></div>
```

(The second example has no hint, so only the error is referenced.)

**Walkthrough:** the component computes the `aria-describedby` list from whatever is present — hint, error or both — and omits the attribute when there is neither. `aria-invalid` appears only when there is an error. Every form built with this component gets accessible labels and errors automatically; with React Hook Form, you would pass `{...register("email")}` as props and `error={errors.email?.message}`. Notice also that React escaped the apostrophe in the hint (`&#x27;`) — JSX escaping in action ({{ch:react-basics}}).

</details>

### Exercise 3 — Debug the form

**Objective:** practise diagnosing form problems.
**The scenario:** users of this form report: the quantity "2" is rejected with the message "Invalid input: expected number, received string"; the "Apply coupon" button submits the order; screen-reader users cannot tell which field has an error.

```tsx
// fragment
const Schema = z.object({ quantity: z.number().min(1, "must be at least 1"), coupon: z.string().optional() });

function OrderForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(Schema) });
  return (
    <form onSubmit={handleSubmit(placeOrder)}>
      <input placeholder="Quantity" {...register("quantity")} />
      {errors.quantity && <span style={{ color: "red" }}>{String(errors.quantity.message)}</span>}
      <input placeholder="Coupon" {...register("coupon")} />
      <button onClick={applyCoupon}>Apply coupon</button>
      <button type="submit">Place order</button>
    </form>
  );
}
```

<details>
<summary>Show the solution</summary>

1. **Quantity rejected:** input values are always **strings**; `z.number()` receives `"2"` and fails its type check before the `min(1)` rule is even considered — which is exactly what the message says. Fix: `z.coerce.number().int().min(1, ...)`, or `register("quantity", { valueAsNumber: true })`, and `type="number"` on the input.
2. **"Apply coupon" submits:** a `<button>` inside a form defaults to `type="submit"`. Fix: `type="button"`.
3. **Errors not accessible:** no labels (placeholders only), error shown only in red text with no link to the field. Fix: visible `<label>`s; `aria-invalid` and `aria-describedby` pointing to an error element with an `id`; use the `TextField` component from Exercise 2.

Also consider `noValidate` plus `inputMode="numeric"` for the quantity, and validating the coupon on the server when "Apply" is pressed.

</details>

### Exercise 4 — Production scenario: a long application form

**Objective:** plan a complex form professionally.
**The scenario:** a microfinance company needs an online loan application: personal details, address, employment and income (several income sources), uploaded documents (CNIC front and back, bank statement), and consent checkboxes. Applicants are mostly on phones with unreliable connections. Describe your design and technical plan.

<details>
<summary>Show the solution</summary>

**Design**
- **Four steps** with a progress indicator: Personal → Address → Income → Documents & consent; a review page before submission.
- Minimal fields; hints with examples for CNIC and phone formats; normalise spaces and dashes.
- `autocomplete` and correct input types for phone keyboards ({{ch:html}}).
- Large touch targets; one column ({{ch:css}}).

**State and validation**
- One React Hook Form instance for the whole application (or one per step feeding a shared store), so going back keeps values.
- A **Zod schema per step**, composed into a full schema; the same schemas imported by the **server**, which validates again on submission.
- `mode: "onTouched"`; inline accessible errors via a shared field component; an error summary on each step's "Next".
- `useFieldArray` for income sources, with stable ids.
- Step in the URL so refresh keeps the position.

**Unreliable connections**
- **Autosave drafts** on each step to the server (for logged-in applicants) and to `localStorage` as a fallback, with a clear "Saved" indicator; restore on return.
- Upload documents **as soon as** they are chosen, one by one, with progress and retry, rather than in one huge final request; the final submit references uploaded file ids ({{ch:file-uploads}}).
- Disable the final submit while sending; use an **idempotency key** so a retried submission does not create two applications ({{ch:rest-apis}}).

**Security and compliance**
- Server validates everything, including file type, size and content.
- Consent checkboxes unticked by default, with the exact text and time of consent recorded.
- Sensitive data never logged; HTTPS only; documents stored privately with access control ({{ch:s3}}).
- Rate limiting and bot protection on the submission endpoint.

**Quality**
- Tests for each step's rules (schema unit tests) and an end-to-end test of the whole flow ({{ch:testing}}).
- Manual testing with a screen reader and on a slow mobile network.
- Analytics on step abandonment to find where applicants struggle.

</details>

## Summary

Forms are where users accomplish their goals, and where state, validation, accessibility, networking and security meet. Every form follows the same life cycle: values change, fields become touched and dirty, validation runs, submission happens, and the server responds — possibly with errors that must return to the right fields.

Design for completion: fewer fields, visible labels, hints, accepting what people type, and messages that explain how to fix problems. Write rules once as a **schema** — Zod gives you runtime checks, transformations, cross-field refinements and TypeScript types from one definition — and use the same schema on the client and the server. In React, simple forms can use `FormData` or React 19 actions; larger forms benefit from **React Hook Form**, which keeps inputs uncontrolled for performance, tracks touched, dirty and error state, and connects to schemas through a resolver. Validate on blur then on change, show inline errors linked with `aria-describedby` and `aria-invalid`, focus the first problem, and summarise errors on long forms. Map server errors back to fields, handle asynchronous checks, dynamic field lists, multi-step flows, file inputs, drafts and unsaved changes deliberately — and remember that the server always has the final word on validity and security.

## Key terms

- **Form (application)** — A set of input fields that collects data from a user and submits it for processing.
- **Field** — One input in a form, such as a text box, select, checkbox or file input.
- **Touched (field)** — A field the user has interacted with and then left.
- **Dirty (field)** — A field whose current value differs from its initial value.
- **Validation** — Checking data against rules about what is acceptable.
- **Schema** — A declarative description of the expected shape of data and the rules it must satisfy.
- **Zod** — A TypeScript-first library for defining schemas, validating data and inferring types.
- **Coercion** — Converting a value to another type before validating it, such as a numeric string to a number.
- **Transformation (schema)** — A step in a schema that changes a value, for example trimming or removing spaces.
- **Refinement** — A custom validation rule added to a schema, often involving several fields.
- **safeParse** — A Zod method that validates data and returns a success or failure result instead of throwing.
- **Field error** — A validation problem attached to a specific field.
- **Form-level error** — A problem that applies to the whole form rather than one field.
- **React Hook Form** — A React library for managing form values, validation and submission with minimal re-rendering.
- **register** — The React Hook Form function that connects an input to the form state.
- **Resolver** — An adapter that lets React Hook Form validate with a schema library such as Zod.
- **Validation mode** — The rule deciding when fields are validated, such as on blur, on change or on submit.
- **aria-invalid** — An attribute that tells assistive technology a field's value is invalid.
- **aria-describedby** — An attribute that links a field to elements describing it, such as hints and error messages.
- **Error summary** — A list of all form errors at the top of a form, each linking to its field.
- **Field array** — A repeating group of fields that users can add to and remove from.
- **Multi-step form** — A long form divided into several steps completed in sequence.
- **Draft autosave** — Saving a form's values automatically so work is not lost if the user leaves.
- **Account enumeration** — Discovering which accounts exist by observing differences in a system's responses.
- **Idempotency key** — A unique identifier sent with a request so the server can recognise and ignore duplicates.

## What comes next

So far you have built React applications that run entirely in the browser and fetch data after they load. Production web applications usually need more: pages that load fast and are visible to search engines, routing between many pages, data loaded on the server, and back-end logic in the same project. The next chapter, {{ch:nextjs}}, introduces the most widely used React framework, which provides all of this — server rendering, the App Router, React Server Components, server actions and caching.
