# Phase 4 — Chapter 7: Forms

---

## Chapter Overview

Forms are the primary interface for user input — login, registration, checkout, search, settings. Production React form handling requires controlled inputs, client-side validation, server-side validation error display, accessibility, and submission state management.

**Libraries covered:**
- Native HTML forms with React
- `react-hook-form` — performance-first, uncontrolled forms
- Zod — TypeScript schema validation
- `react-hook-form` + Zod integration with `@hookform/resolvers`

---

## Beginner Theory

### Controlled vs Uncontrolled Inputs

```typescript
// Controlled: React controls value via state
function ControlledInput() {
  const [value, setValue] = useState("");
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// Uncontrolled: DOM controls value, read via ref
function UncontrolledInput() {
  const ref = useRef<HTMLInputElement>(null);
  const handleSubmit = () => console.log(ref.current?.value);
  return <input ref={ref} defaultValue="" />;
}

// react-hook-form uses uncontrolled inputs internally — better performance
// (no re-render on every keystroke)
```

---

## Basic Examples

### react-hook-form + Zod

```typescript
// schemas/userSchema.ts
import { z } from "zod";

export const registerSchema = z.object({
  name:            z.string().min(2, "At least 2 characters").max(100),
  email:           z.string().email("Invalid email"),
  password:        z.string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
  role:            z.enum(["user", "admin"]).default("user"),
  agreedToTerms:   z.literal(true, { errorMap: () => ({ message: "You must agree to terms" }) })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path:    ["confirmPassword"]
});

export type RegisterInput = z.infer<typeof registerSchema>;

// components/RegisterForm.tsx
"use client";
import { useForm }       from "react-hook-form";
import { zodResolver }   from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/schemas/userSchema";

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, isValid },
    setError,
    reset,
    watch
  } = useForm<RegisterInput>({
    resolver:      zodResolver(registerSchema),
    defaultValues: { role: "user" },
    mode:          "onBlur"  // validate on blur (not on change — less noisy)
  });

  async function onSubmit(data: RegisterInput) {
    try {
      await authApi.register(data);
      reset();
      // redirect or show success
    } catch (err: any) {
      // Map server errors to form fields
      if (err.status === 409) {
        setError("email", { message: "Email already in use" });
      } else {
        setError("root", { message: err.message });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {errors.root && (
        <div role="alert" className="error-banner">{errors.root.message}</div>
      )}

      <div className="field">
        <label htmlFor="name">Full Name</label>
        <input
          {...register("name")}
          id="name"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" role="alert" className="error">{errors.name.message}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
        />
        {errors.email && <p role="alert" className="error">{errors.email.message}</p>}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          {...register("password")}
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
        />
        {errors.password && <p role="alert" className="error">{errors.password.message}</p>}
        <PasswordStrength value={watch("password")} />
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          {...register("confirmPassword")}
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
        />
        {errors.confirmPassword && <p role="alert" className="error">{errors.confirmPassword.message}</p>}
      </div>

      <div className="field">
        <label htmlFor="role">Role</label>
        <select {...register("role")} id="role">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <label className="checkbox">
        <input {...register("agreedToTerms")} type="checkbox" id="terms" />
        I agree to the Terms of Service
        {errors.agreedToTerms && <span className="error">{errors.agreedToTerms.message}</span>}
      </label>

      <button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
```

---

## Intermediate Concepts

### Dynamic Field Arrays

```typescript
import { useFieldArray, useForm } from "react-hook-form";
import { z }                      from "zod";
import { zodResolver }            from "@hookform/resolvers/zod";

const schema = z.object({
  name:  z.string().min(1),
  tags:  z.array(z.object({ value: z.string().min(1, "Tag cannot be empty") }))
           .min(1, "Add at least one tag")
});

type FormValues = z.infer<typeof schema>;

function TagsForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", tags: [{ value: "" }] }
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "tags"
  });

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <input {...register("name")} placeholder="Name" />
      {errors.name && <p>{errors.name.message}</p>}

      <h3>Tags</h3>
      {errors.tags?.root && <p>{errors.tags.root.message}</p>}

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <input
            {...register(`tags.${index}.value`)}
            placeholder={`Tag ${index + 1}`}
          />
          {errors.tags?.[index]?.value && (
            <p>{errors.tags[index].value?.message}</p>
          )}
          <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0}>↑</button>
          <button type="button" onClick={() => remove(index)}>×</button>
        </div>
      ))}

      <button type="button" onClick={() => append({ value: "" })}>Add Tag</button>
      <button type="submit">Save</button>
    </form>
  );
}
```

### Multi-Step Form

```typescript
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver }                           from "@hookform/resolvers/zod";
import { z }                                     from "zod";
import { useState }                              from "react";

// Step schemas
const step1Schema = z.object({
  firstName: z.string().min(2),
  lastName:  z.string().min(2),
  email:     z.string().email()
});

const step2Schema = z.object({
  company:  z.string().min(1),
  jobTitle: z.string().min(1),
  phone:    z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone")
});

const fullSchema = step1Schema.merge(step2Schema);
type FullForm = z.infer<typeof fullSchema>;

const STEPS = [
  { title: "Personal Info",    schema: step1Schema, fields: ["firstName", "lastName", "email"] },
  { title: "Company Details",  schema: step2Schema, fields: ["company", "jobTitle", "phone"] }
];

function MultiStepForm() {
  const [step, setStep] = useState(0);

  const methods = useForm<FullForm>({
    resolver:      zodResolver(STEPS[step].schema),
    mode:          "onBlur",
    defaultValues: { firstName: "", lastName: "", email: "", company: "", jobTitle: "", phone: "" }
  });

  const { handleSubmit, trigger } = methods;

  async function nextStep() {
    const fields = STEPS[step].fields as (keyof FullForm)[];
    const valid  = await trigger(fields);
    if (valid) setStep(s => s + 1);
  }

  async function onSubmit(data: FullForm) {
    await api.createUser(data);
  }

  return (
    <FormProvider {...methods}>
      {/* Progress indicator */}
      <div role="progressbar" aria-valuenow={step + 1} aria-valuemax={STEPS.length}>
        Step {step + 1} of {STEPS.length}: {STEPS[step].title}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 0 && <Step1 />}
        {step === 1 && <Step2 />}

        <div>
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={nextStep}>Next</button>
          ) : (
            <button type="submit">Submit</button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

function Step1() {
  const { register, formState: { errors } } = useFormContext<FullForm>();
  return (
    <div>
      <input {...register("firstName")} placeholder="First Name" />
      {errors.firstName && <p>{errors.firstName.message}</p>}
      <input {...register("lastName")} placeholder="Last Name" />
      <input {...register("email")} type="email" placeholder="Email" />
    </div>
  );
}
```

---

## Interview Preparation

**Q1: Why use react-hook-form instead of controlled inputs with useState?**
A: With controlled inputs, every keystroke triggers a re-render of the entire form (and all its children). On a complex form with 20 fields, that's 20 re-renders per second while typing. `react-hook-form` uses uncontrolled inputs (DOM owns the value, React only reads it on submit/validate). This means zero re-renders while typing — only re-renders when validation state changes. It's also less code: no `useState` per field, no `onChange` handlers. The integration with Zod via `@hookform/resolvers` means full TypeScript type safety from schema to form data.

**Q2: What is the difference between `mode: "onBlur"`, `"onChange"`, and `"onSubmit"` in react-hook-form?**
A: Controls when validation runs. `"onSubmit"` (default): validate only on submit — good UX since users aren't shown errors before they've had a chance to fill the field. `"onBlur"`: validate when the user leaves a field — the sweet spot for most forms. `"onChange"`: validate on every keystroke — useful for password strength meters but can be noisy for error messages. A good pattern: use `"onBlur"` and then switch to `"onChange"` after the first submit attempt so errors are corrected in real-time.

**Q3: How do you map server-side validation errors back to form fields?**
A: Use `setError` from react-hook-form. After a failed API call, inspect the error response. If it's a field-specific error (e.g., "email already exists"), call `setError("email", { message: "Email already in use" })`. For non-field errors, use `setError("root", { message: "Server error" })` and display `errors.root.message` at the top of the form. Always validate on both client and server — client validation is UX convenience, server validation is the security boundary.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Build a login form with email and password using react-hook-form.
2. Add Zod validation schema to the login form.
3. Show inline error messages below each field.
4. Disable the submit button while submitting.
5. Reset the form after successful submission.
6. Add `aria-invalid` and `aria-describedby` for accessibility.
7. Build a search form with a single input.
8. Build a contact form with name, email, message, and submit.
9. Add `mode: "onBlur"` validation.
10. Show a loading spinner on the submit button while submitting.

### Intermediate (10 Tasks)
1. Build a registration form with password + confirm password (refine validation).
2. Build a dynamic field array (add/remove phone numbers).
3. Build a multi-step form (2+ steps) with validation per step.
4. Add password strength indicator.
5. Implement server error mapping with `setError`.
6. Build a file upload input with size/type validation.
7. Build a settings form with pre-populated data from an API.
8. Add a dependent select (select country → populate state/province options).
9. Implement dirty state detection (`isDirty`) for unsaved changes warning.
10. Test the form with React Testing Library.

### Advanced (10 Tasks)
1. Build a fully accessible form (screen reader test with NVDA/VoiceOver).
2. Build a reusable `FormField` wrapper component (label + input + error).
3. Implement auto-save (save form on change, debounced).
4. Build a rich text editor with Tiptap integrated into react-hook-form.
5. Implement conditional fields (show field B only when field A has value X).
6. Build a checkout form with address autocomplete.
7. Add recaptcha to a public form.
8. Build a JSON schema-driven form (schema → form fields automatically).
9. Add internationalized validation messages with i18next.
10. Implement form analytics (field-level timing and error tracking).

---

## Self Assessment
1. What is the difference between controlled and uncontrolled inputs?
2. What does `register()` do in react-hook-form?
3. What is `handleSubmit` used for?
4. What is `formState.errors`?
5. What is Zod used for?
6. What is `zodResolver`?
7. What is `setError` used for?
8. What is `useFieldArray` used for?
9. What is `FormProvider` and `useFormContext` used for?
10. What is `isDirty` in form state?

---

## Cheat Sheet

```typescript
// Setup
import { useForm }     from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z }           from "zod";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors, isSubmitting }, setError, reset } =
  useForm<FormData>({ resolver: zodResolver(schema), mode: "onBlur" });

// Form
<form onSubmit={handleSubmit(async data => { try { await api.post(data); reset(); } catch { setError("root", { message: "Failed" }); } })}>
  <input {...register("email")} type="email" aria-invalid={!!errors.email} />
  {errors.email && <p role="alert">{errors.email.message}</p>}
  <button disabled={isSubmitting}>Submit</button>
</form>

// Field array
const { fields, append, remove } = useFieldArray({ control, name: "items" });
{fields.map((f, i) => <input key={f.id} {...register(`items.${i}.name`)} />)}
<button onClick={() => append({ name: "" })}>Add</button>

// Server error mapping
} catch (err) {
  if (err.status === 409) setError("email", { message: "Already exists" });
  else                    setError("root",  { message: err.message });
}
```
