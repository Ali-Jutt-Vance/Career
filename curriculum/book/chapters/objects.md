# Objects: Describing Real Things in Code

> [!GOALS]
> - What an object is, and why programs need named groups of values.
> - How to create objects, and read, add, change and delete their properties.
> - When to use dot notation and when to use square brackets.
> - How to safely read properties that might not exist, using optional chaining (`?.`).
> - How to build realistic data: objects inside objects, arrays inside objects, arrays of objects.
> - How to loop over an object's keys, values and entries.
> - Object destructuring and spread — including how to pass one object instead of many parameters.
> - Why objects, like arrays, are shared by reference, and how to copy them properly (shallow and deep copies).
> - What JSON really is, and how to convert between objects and JSON text.
> - How objects make excellent lookup tables, and when a `Map` is a better choice.

## Why this matters

Think about everything a shop knows about one customer: a name, an email, a phone number, a delivery address, whether they are a member, and their past orders. Or everything it knows about one product: a title, a price, a stock count, a category, some photos, some sizes.

With only single variables and arrays, you might try this:

```js
const customer = ["Sara Khan", "sara@example.com", "0300-1234567", true];
```

But what is `customer[2]`? You would have to remember that "index 2 is the phone number". Add a new field in the middle and every index changes. Read this code six months later and it means nothing.

What you really want is to say `customer.phone`. That is what **objects** give you: a way to group related values under **names**. Objects are how JavaScript programs describe real things — customers, orders, products, settings, API responses. Together with arrays, they form the shape of almost all data your programs will handle, and the JSON that travels across the web ({{ch:how-the-web-works}}) is simply objects and arrays written as text.

## The simple idea

An object is like a **form that has been filled in**. Each line on the form has a label and an answer:

```text
  Customer record
  ----------------------------
  name:       Sara Khan
  email:      sara@example.com
  phone:      0300-1234567
  isMember:   yes
```

You find information by its **label**, not by its position. The order of the lines does not matter — "email" is "email" whether it is the second line or the fifth.

> [!ANALOGY]
> An object is like a labelled set of drawers in a filing cabinet. Each drawer has a name on the front — "name", "email", "phone" — and holds one thing. You open a drawer by its name. You can add a new drawer with a new label, or remove one.
>
> **Where the analogy breaks:** a drawer can only hold paper. An object's "drawer" can hold anything — a number, a piece of text, a whole list, even another complete set of drawers, or a function that does work. And, as with arrays, two different variable names can refer to the *same* cabinet, so a change made through one is visible through the other.

## The proper definition and key words

- An **object** is a collection of named values.
- Each named value is a **property**. A property has a **key** (its name) and a **value**.
- Keys are strings (or, rarely, symbols). Values can be anything: numbers, strings, booleans, arrays, other objects, functions.
- A property whose value is a function is called a **method** — like the string and array methods you have been using.
- An **object literal** is an object written directly in code with curly braces.

> [!RECAP]
> In {{ch:types-of-data}} you learned that JavaScript has seven primitive types and one non-primitive type, **object**. Arrays are a special kind of object. In {{ch:arrays}} you saw that arrays are handled **by reference**: assigning one to another variable shares it rather than copying it. Everything you learned there about references applies to objects too.

## Creating objects and reading properties

### Level 1 — Object literals

You create an object with **curly braces**, listing properties as `key: value`, separated by commas:

```js
const customer = {
  name: "Sara Khan",
  email: "sara@example.com",
  phone: "0300-1234567",
  isMember: true,
  loyaltyPoints: 1250,
};

console.log(customer);
console.log(customer.name);
console.log(customer.loyaltyPoints);
```

**Output:**

```text
{
  name: 'Sara Khan',
  email: 'sara@example.com',
  phone: '0300-1234567',
  isMember: true,
  loyaltyPoints: 1250
}
Sara Khan
1250
```

Walkthrough:

- The curly braces create a new object. Inside, each line is one property: the key, a colon, the value, and a comma.
- Keys do not need quote marks when they are valid names (letters, digits, `_`, `$`, not starting with a digit). Values follow all the normal rules — strings in quotes, numbers without.
- `customer.name` reads the property whose key is `name`. This is called **dot notation**.
- The trailing comma after the last property is allowed, and recommended, as with arrays.

Notice that the phone number is a **string**, not a number. Phone numbers, postcodes, ID card numbers and account numbers are **labels made of digits**, not quantities. You never add two phone numbers together, and storing them as numbers would remove the leading zero (`0300…` would become `300…`). If you would never do arithmetic on it, it should usually be a string.

### Level 2 — Missing properties

Reading a property that does not exist gives `undefined` — no error:

```js
const customer = { name: "Sara Khan" };
console.log(customer.email);
```

**Output:**

```text
undefined
```

But reading a property **of** something that is `undefined` or `null` **is** an error — one of the most common runtime errors in all of JavaScript:

```js
const customer = { name: "Sara Khan" };
console.log(customer.address.city);
```

**Output:**

```text
TypeError: Cannot read properties of undefined (reading 'city')
```

`customer.address` is `undefined` (there is no address), and asking `undefined` for its `city` crashes the program. You met this error in {{ch:from-code-to-running-program}}; now you know exactly where it comes from.

### Optional chaining: `?.`

When a value might be missing, use **optional chaining**, written `?.`. It means: "if the thing on the left is `null` or `undefined`, stop and give `undefined`; otherwise, continue normally".

```js
const customer = { name: "Sara Khan" };

console.log(customer.address?.city);
console.log(customer.address?.city ?? "No city on file");
```

**Output:**

```text
undefined
No city on file
```

- `customer.address?.city` — `address` is `undefined`, so the whole expression stops there and gives `undefined`, instead of crashing.
- Combined with `??` from {{ch:operators-and-decisions}}, it provides a default for display.

Optional chaining also works for array elements and method calls: `orders?.[0]` and `customer.getDiscount?.()`.

> [!WARNING]
> Use `?.` where a value is **legitimately optional** — a customer may not have entered an address yet. Do not sprinkle it everywhere to make errors disappear. If a value *must* exist, and it is missing, that is a real bug, and hiding it with `?.` just moves the failure somewhere harder to diagnose. A crash with a clear message is often better than silently continuing with `undefined`.

## Changing objects

### Adding, updating and deleting properties

Objects can be changed after they are created — even when the variable is `const` (because `const` stops reassigning the variable, not changing the object, exactly as with arrays):

```js
const product = {
  title: "Cotton shirt",
  pricePaisa: 129950,
};

product.pricePaisa = 119950;      // update an existing property
product.stock = 42;               // add a new property
delete product.title;             // remove a property

console.log(product);
```

**Output:**

```text
{ pricePaisa: 119950, stock: 42 }
```

- Assigning to a property that exists **updates** it.
- Assigning to a property that does not exist **adds** it.
- `delete` removes a property entirely.

### Dot notation and bracket notation

There is a second way to access properties: **square brackets with the key as a string**.

```js
const product = { title: "Cotton shirt", pricePaisa: 129950 };

console.log(product.title);
console.log(product["title"]);
```

Both print `Cotton shirt`. So why have two ways? Bracket notation is needed in two situations:

**1. When the key is in a variable** (decided while the program runs):

```js
const product = { title: "Cotton shirt", pricePaisa: 129950, stock: 42 };
const fieldToShow = "stock";

console.log(product[fieldToShow]);
console.log(product.fieldToShow);
```

**Output:**

```text
42
undefined
```

- `product[fieldToShow]` evaluates the variable first — `"stock"` — and reads the `stock` property.
- `product.fieldToShow` reads a property literally named `"fieldToShow"`, which does not exist. Dot notation always uses the exact word written after the dot.

**2. When the key is not a valid name** — for example, it contains a space or a dash, or starts with a digit:

```js
const headers = {
  "content-type": "application/json",
  "x-request-id": "a91c3e",
};

console.log(headers["content-type"]);
```

**Output:**

```text
application/json
```

`headers.content-type` would be read as `headers.content` minus `type`. Keys like these are common when working with HTTP headers ({{ch:how-the-web-works}}) and with data from other systems; such keys must be written in quotes when creating the object, too.

> **Rule of thumb:** use dot notation for normal, fixed property names; use brackets when the key comes from a variable or is not a valid name.

### Shorthand and computed keys

Two shortcuts appear constantly in modern code.

**Property shorthand.** When a variable has the same name as the key you want, you can write it once:

```js
const name = "Sara Khan";
const email = "sara@example.com";

const customer = { name, email };      // same as { name: name, email: email }
console.log(customer);
```

**Output:**

```text
{ name: 'Sara Khan', email: 'sara@example.com' }
```

**Computed keys.** Put an expression in square brackets on the left of the colon, and its value becomes the key:

```js
const field = "city";
const filter = { [field]: "Lahore" };
console.log(filter);
```

**Output:**

```text
{ city: 'Lahore' }
```

You also saw earlier, in {{ch:operators-and-decisions}}, the debugging trick `console.log({ total, isMember })` — that is property shorthand, creating an object whose keys are the variable names, so each value prints with its label.

## Building realistic data: nesting

### Level 3 — Objects and arrays inside objects

Property values can be anything — including arrays and other objects. Real data is almost always **nested** like this:

```js
const order = {
  id: "ORD-5521",
  status: "shipped",
  customer: {
    name: "Sara Khan",
    email: "sara@example.com",
  },
  deliveryAddress: {
    street: "12 Main Boulevard",
    city: "Lahore",
    postcode: "54000",
  },
  items: [
    { name: "Cotton shirt", pricePaisa: 129950, quantity: 2 },
    { name: "Cap", pricePaisa: 49900, quantity: 1 },
  ],
  giftWrapped: false,
};

console.log(order.customer.name);
console.log(order.deliveryAddress.city);
console.log(order.items.length);
console.log(order.items[0].name);
console.log(order.items[1].pricePaisa * order.items[1].quantity);
```

**Output:**

```text
Sara Khan
Lahore
2
Cotton shirt
49900
```

Reading nested data means following the path one step at a time, left to right:

```text
  order.items[0].name

  order               the whole order object
  order.items         its "items" property: an array
  order.items[0]      the first element of that array: an object
  order.items[0].name its "name" property: "Cotton shirt"
```

Each dot or bracket takes one step deeper. When a path does not work, print each step separately to find where it goes wrong.

This one `order` value contains everything about an order in one place, organised the way people think about it. It is exactly the kind of data a backend returns from an API, and a frontend displays. Working with nested objects and arrays fluently — reading them, transforming them with `map` and `filter` ({{ch:arrays}}), building new ones — is a daily skill.

### Methods: functions inside objects

A property's value can be a function. Such a property is a **method**:

```js
const basket = {
  items: [
    { name: "Cotton shirt", pricePaisa: 129950, quantity: 2 },
    { name: "Cap", pricePaisa: 49900, quantity: 1 },
  ],
  totalPaisa() {
    return this.items.reduce((sum, item) => sum + item.pricePaisa * item.quantity, 0);
  },
};

console.log(basket.totalPaisa());
```

**Output:**

```text
309800
```

- `totalPaisa() { ... }` is a short way of writing a property whose value is a function.
- Inside the method, **`this`** refers to the object the method was called on — here, `basket` — so `this.items` is the basket's items.

`this` is powerful but has surprising rules, and it is the main subject of {{ch:this-prototypes-classes}}. For now, it is enough to recognise methods when you see them. In practice, much modern JavaScript keeps **data** in plain objects and **logic** in separate functions (`calculateBasketTotal(basket)`), which avoids `this` entirely; you will see both styles in real code.

## Looping over objects

Arrays have a natural order to loop through. Objects are looped over through their **keys**, using three built-in functions that turn an object into an array — after which every array tool from {{ch:arrays}} is available:

```js
const stockByWarehouse = {
  lahore: 120,
  karachi: 85,
  islamabad: 40,
};

console.log(Object.keys(stockByWarehouse));
console.log(Object.values(stockByWarehouse));
console.log(Object.entries(stockByWarehouse));
```

**Output:**

```text
[ 'lahore', 'karachi', 'islamabad' ]
[ 120, 85, 40 ]
[ [ 'lahore', 120 ], [ 'karachi', 85 ], [ 'islamabad', 40 ] ]
```

- `Object.keys` gives an array of the keys.
- `Object.values` gives an array of the values.
- `Object.entries` gives an array of `[key, value]` pairs — small two-element arrays.

`Object.entries` combines beautifully with `for...of` and array destructuring:

```js
const stockByWarehouse = { lahore: 120, karachi: 85, islamabad: 40 };

for (const [city, count] of Object.entries(stockByWarehouse)) {
  console.log(`${city}: ${count} units`);
}

const totalStock = Object.values(stockByWarehouse).reduce((sum, n) => sum + n, 0);
console.log("Total:", totalStock);
```

**Output:**

```text
lahore: 120 units
karachi: 85 units
islamabad: 40 units
Total: 245
```

Each entry is a two-element array, so `[city, count]` destructures it into two variables — the destructuring you learned in {{ch:arrays}}.

To turn entries back into an object, use `Object.fromEntries`. This lets you transform an object's values with `map`:

```js
const pricesPaisa = { shirt: 129950, cap: 49900 };
const pricesRupees = Object.fromEntries(
  Object.entries(pricesPaisa).map(([item, paisa]) => [item, paisa / 100]),
);
console.log(pricesRupees);
```

**Output:**

```text
{ shirt: 1299.5, cap: 499 }
```

> [!NOTE]
> You may also see the older **`for...in`** loop: `for (const key in object) { ... }`. It works, but it also visits certain inherited properties in some situations (you will understand why in {{ch:this-prototypes-classes}}), so modern code usually prefers `Object.keys`/`Object.entries` with `for...of`. Do not confuse `for...in` (keys of an object) with `for...of` (items of an iterable such as an array).

### Checking whether a property exists

Because a property can exist with the value `undefined`, "is the value undefined?" and "does the property exist?" are slightly different questions. To ask the second:

```js
const settings = { theme: "dark", fontSize: undefined };

console.log("theme" in settings);
console.log("language" in settings);
console.log(Object.hasOwn(settings, "fontSize"));
```

**Output:**

```text
true
false
true
```

`"key" in object` and `Object.hasOwn(object, "key")` both answer "does this property exist?". `Object.hasOwn` is the more precise one (it ignores inherited properties), and is generally preferred.

## Object destructuring

Destructuring, which you met with arrays, works with objects too — and it is even more common. Instead of positions, you unpack by **key name**:

```js
const customer = {
  name: "Sara Khan",
  email: "sara@example.com",
  isMember: true,
};

const { name, isMember } = customer;
console.log(name, isMember);
```

**Output:**

```text
Sara Khan true
```

`const { name, isMember } = customer;` means: "create a variable `name` from `customer.name`, and `isMember` from `customer.isMember`". The curly braces on the **left** of `=` describe the shape to unpack. The variable names must match the keys — order does not matter.

You can **rename**, give **defaults**, collect the **rest**, and reach into **nested** objects:

```js
const order = {
  id: "ORD-5521",
  status: "shipped",
  deliveryAddress: { city: "Lahore", postcode: "54000" },
  notes: undefined,
};

const {
  id: orderId,
  notes = "No notes",
  deliveryAddress: { city },
  ...rest
} = order;

console.log(orderId);
console.log(notes);
console.log(city);
console.log(rest);
```

**Output:**

```text
ORD-5521
No notes
Lahore
{ status: 'shipped' }
```

- `id: orderId` — take the `id` property, but put it in a variable called `orderId`. (Read the colon as "becomes the variable".)
- `notes = "No notes"` — use the default when the value is `undefined`.
- `deliveryAddress: { city }` — reach into the nested object and take its `city`. (This creates `city`, but not a `deliveryAddress` variable.)
- `...rest` — collect every property **not** already unpacked into a new object.

### Destructuring in parameters: one object instead of many arguments

Here is the payoff promised in {{ch:functions}}. A function with many positional parameters is easy to call wrongly — you saw exactly that in the debugging exercise there. Instead, a function can take **one object** and destructure it in its parameter list:

```js
function createOrderLine({ name, pricePaisa, quantity = 1, giftWrap = false }) {
  const totalPaisa = pricePaisa * quantity;
  return `${quantity} x ${name}${giftWrap ? " (gift wrapped)" : ""}: ${totalPaisa} paisa`;
}

console.log(createOrderLine({ name: "Cap", pricePaisa: 49900 }));
console.log(createOrderLine({ quantity: 2, pricePaisa: 129950, name: "Cotton shirt", giftWrap: true }));
```

**Output:**

```text
1 x Cap: 49900 paisa
2 x Cotton shirt (gift wrapped): 259900 paisa
```

Compare the calls with a version taking four positional parameters, `createOrderLine("Cap", 49900, 1, false)`. With an object:

- **Each argument is labelled**, so the call explains itself, and you cannot mix up the order — the second call passes them in a different order and still works.
- **Optional values can be left out** entirely, with defaults filling them in.
- **New options can be added later** without breaking existing callers.

This "options object" pattern is used throughout professional JavaScript and in almost every library you will meet.

## Copying and sharing objects

### References, again

Objects are handled by reference, just like arrays:

```js
const original = { name: "Sara", city: "Lahore" };
const other = original;

other.city = "Karachi";

console.log(original.city);
console.log(original === other);
console.log({ a: 1 } === { a: 1 });
```

**Output:**

```text
Karachi
true
false
```

- `const other = original;` makes a second name for the **same** object. Changing `other.city` changes the one shared object.
- `===` on objects asks "same object?", so two separately created objects with identical contents are not equal.

### Shallow copies with spread

The **spread operator** works on objects, copying their properties into a new object:

```js
const original = { name: "Sara", city: "Lahore" };
const copy = { ...original };

copy.city = "Karachi";
console.log(original.city, copy.city);
```

**Output:**

```text
Lahore Karachi
```

Spread is also the standard way to **update an object without mutating it** — create a new object with everything from the old one, plus your changes. Later properties win:

```js
const product = { title: "Cotton shirt", pricePaisa: 129950, stock: 42 };
const discounted = { ...product, pricePaisa: 99950 };

console.log(product.pricePaisa);
console.log(discounted);
```

**Output:**

```text
129950
{ title: 'Cotton shirt', pricePaisa: 99950, stock: 42 }
```

And to **merge** objects — for example, applying a user's settings on top of defaults:

```js
const defaults = { theme: "light", fontSize: 16, language: "en" };
const userChoices = { theme: "dark" };

const settings = { ...defaults, ...userChoices };
console.log(settings);
```

**Output:**

```text
{ theme: 'dark', fontSize: 16, language: 'en' }
```

The order matters: properties from `userChoices` come later, so they overwrite the defaults.

### The shallow copy trap

Spread makes a **shallow** copy (as with arrays): it copies the top-level properties, but nested objects and arrays are still **shared**:

```js
const original = {
  name: "Sara",
  address: { city: "Lahore" },
};

const copy = { ...original };
copy.name = "Ayesha";
copy.address.city = "Karachi";

console.log(original.name);
console.log(original.address.city);
```

**Output:**

```text
Sara
Karachi
```

```text
   original ---> { name: "Sara",   address: ---+
                                               +---> { city: "Karachi" }
   copy     ---> { name: "Ayesha", address: ---+       (one shared object)
```

`name` was copied, so changing it in `copy` did not affect `original`. But `address` is an object, so the copy received a reference to the **same** address object. Changing `copy.address.city` changed the address that both share.

There are two ways to deal with this:

**1. Copy each level you change**, with nested spreads:

```js
const updated = {
  ...original,
  address: { ...original.address, city: "Karachi" },
};
```

This creates a new top-level object **and** a new address object, so nothing shared is mutated. This pattern is used heavily in frontend code, and you will see it constantly in React ({{ch:react-basics}}) and state management ({{ch:state-management}}).

**2. Make a deep copy** with the built-in `structuredClone`, which copies every level:

```js
const deepCopy = structuredClone(original);
deepCopy.address.city = "Multan";
console.log(original.address.city);
```

**Output:**

```text
Karachi
```

(It still shows Karachi because of the earlier change — but `original` was not affected by changing `deepCopy`.) `structuredClone` copies nested objects, arrays, dates and more. It cannot copy functions. Use it when you genuinely need a fully independent copy; for ordinary updates, the nested-spread pattern is lighter and clearer about what changed.

### Freezing objects

If an object should never change — a set of fixed settings, for example — `Object.freeze` makes it read-only:

```js
const VAT = Object.freeze({ standardRate: 0.18, reducedRate: 0.05 });
VAT.standardRate = 0.2;
console.log(VAT.standardRate);
```

**Output:**

```text
0.18
```

The assignment is silently ignored (or, in strict mode — which applies inside modules and classes — it throws an error). Freezing is also shallow: nested objects inside a frozen object can still be changed.

## JSON: objects as text

### Level 4 — What JSON really is

In {{ch:how-the-web-works}} you met **JSON**, the text format used by almost every API. Now you can see exactly what it is: **JavaScript object and array literal syntax, written as text**, with a few stricter rules:

| JSON rule | JavaScript object literal |
|---|---|
| Keys **must** be in double quotes: `"name"` | Quotes optional for valid names |
| Strings **must** use double quotes | Double, single or backticks |
| No trailing commas | Trailing commas allowed |
| No comments | Comments allowed |
| Values: string, number, `true`/`false`, `null`, object, array | Any value, including functions, `undefined`, dates |

### Converting: `JSON.stringify` and `JSON.parse`

Because JSON is **text**, it can travel over a network, be saved in a file, or stored in a database column. JavaScript has two built-in functions to convert between objects and JSON text:

```js
const order = {
  id: "ORD-5521",
  totalPaisa: 309800,
  items: ["Cotton shirt", "Cap"],
  giftWrapped: false,
};

const text = JSON.stringify(order);
console.log(text);
console.log(typeof text);

const backAgain = JSON.parse(text);
console.log(backAgain.items[1]);
console.log(backAgain === order);
```

**Output:**

```text
{"id":"ORD-5521","totalPaisa":309800,"items":["Cotton shirt","Cap"],"giftWrapped":false}
string
Cap
false
```

Walkthrough:

- `JSON.stringify(order)` turns the object into a JSON **string** — one long line of text. This is called **serialising**: turning data in memory into a form that can be stored or sent.
- `JSON.parse(text)` turns JSON text back into a JavaScript object — **deserialising** (or **parsing**).
- The result of parsing is a **new** object with the same contents, so it is not `===` to the original.

For readable output — in logs or files — `JSON.stringify` can indent:

```js
console.log(JSON.stringify({ id: "ORD-5521", items: ["Cap"] }, null, 2));
```

**Output:**

```text
{
  "id": "ORD-5521",
  "items": [
    "Cap"
  ]
}
```

The `2` means "indent by two spaces"; the `null` in the middle is an option you will rarely need.

Every request and response body your backend sends and receives as JSON passes through exactly these two steps. Frameworks usually call them for you — but when something arrives in the wrong shape, knowing what happens underneath is how you debug it.

### What JSON loses

JSON can only represent the value types in the table above. Others are changed or dropped when you stringify:

```js
const data = {
  name: "Sara",
  greet() { return "hi"; },
  middleName: undefined,
  createdAt: new Date("2026-11-19T10:00:00Z"),
  big: 10n,
};

console.log(JSON.stringify({ name: data.name, greet: data.greet, middleName: data.middleName, createdAt: data.createdAt }));
```

**Output:**

```text
{"name":"Sara","createdAt":"2026-11-19T10:00:00.000Z"}
```

- **Functions** (`greet`) are dropped.
- **`undefined`** properties (`middleName`) are dropped.
- **Dates** become **strings**. When you parse the JSON back, `createdAt` is a plain string, not a date — a very common surprise. (Dates are created with `new Date(...)`; you will work with them properly later in the book.)
- **BigInt** values cause an error: `JSON.stringify(data)` with `big` included throws `TypeError: Do not know how to serialize a BigInt` — which is why large IDs are sent as strings, as you learned in {{ch:types-of-data}}.

### Parsing can fail

`JSON.parse` requires **valid** JSON. Text that breaks the rules causes an error:

```js
JSON.parse("{ name: 'Sara' }");
```

**Output:**

```text
SyntaxError: Expected property name or '}' in JSON at position 2 (line 1 column 3)
```

The keys are not in double quotes, and the string uses single quotes — valid JavaScript, invalid JSON. Data from outside your program can always be malformed, so real code wraps `JSON.parse` in error handling, which you will learn in {{ch:errors-and-debugging}}.

## Objects as lookup tables

### Level 5 — Replacing chains of decisions with data

Objects are excellent **lookup tables**: a quick way to go from a key to a value. In {{ch:operators-and-decisions}} you wrote a `switch` to turn an order status into a message. Here is the same logic as data:

```js
const STATUS_MESSAGES = {
  pending: "We have received your order.",
  shipped: "Your order is on its way.",
  delivered: "Your order has been delivered.",
};

function statusMessage(status) {
  return STATUS_MESSAGES[status] ?? "Unknown status — please contact support.";
}

console.log(statusMessage("shipped"));
console.log(statusMessage("lost"));
```

**Output:**

```text
Your order is on its way.
Unknown status — please contact support.
```

- The messages are stored as **data**, keyed by status.
- `STATUS_MESSAGES[status]` uses bracket notation, because the key is in a variable.
- `??` supplies the default when the status is not in the table.

Benefits over a `switch`: the mapping is easy to read at a glance, easy to extend (add a line), cannot fall through, and can even be loaded from a file or database so non-programmers can change messages.

Lookup tables are also how you **group and count** data — a technique used constantly in reports and dashboards:

```js
const orders = [
  { id: 1, city: "Lahore" },
  { id: 2, city: "Karachi" },
  { id: 3, city: "Lahore" },
  { id: 4, city: "Multan" },
  { id: 5, city: "Lahore" },
];

const ordersPerCity = {};
for (const order of orders) {
  ordersPerCity[order.city] = (ordersPerCity[order.city] ?? 0) + 1;
}

console.log(ordersPerCity);
```

**Output:**

```text
{ Lahore: 3, Karachi: 1, Multan: 1 }
```

For each order, the count for its city is read (or `0` if this city has not been seen yet), increased by one, and stored back. One pass through the orders produces the whole summary.

Lookups by key are fast whatever the size of the object — unlike searching an array element by element with `find` or `includes`. You will learn why in {{ch:arrays-strings-hash-maps}}; it is one of the most useful performance techniques in everyday programming.

### `Map`: a dedicated lookup structure

JavaScript also has a built-in **`Map`**, a collection designed purely for key–value lookups:

```js
const stock = new Map();
stock.set("SKU-881", 42);
stock.set("SKU-012", 0);

console.log(stock.get("SKU-881"));
console.log(stock.has("SKU-999"));
console.log(stock.size);
```

**Output:**

```text
42
false
2
```

How does it differ from a plain object?

| | Plain object | `Map` |
|---|---|---|
| Keys | Strings (and symbols) | Any value — numbers, objects, etc. |
| Size | `Object.keys(obj).length` | `.size` |
| Typical use | Records with fixed, known fields; JSON data | Lookups where keys are added and removed while running |
| Converts to JSON directly | Yes | No (convert to an object or array first) |

A useful rule: use **objects for records** (a customer, an order — fixed fields known in advance) and simple lookup tables; use a **`Map`** for collections that grow and shrink as the program runs, especially with non-string keys.

## From beginner to enterprise: objects at every level

**Level 3 — A small program.** Objects describe single things — a product, a settings group — and are read with dot notation.

**Level 4 — A real application.** All data arriving from APIs and databases is objects and arrays, usually parsed from JSON. The application reads nested paths, uses optional chaining for genuinely optional fields, transforms data with `map` and `filter`, and builds response objects to send back. Functions take options objects rather than long parameter lists.

**Level 5 — Professional engineering.** Teams treat objects received from elsewhere as **read-only** and create updated copies with spread, which makes code predictable and is required by frontend frameworks. The **shape** of each kind of object — which fields, which types — is written down, often in TypeScript ({{ch:typescript-basics}}), and incoming data is checked against it ({{ch:validation}}), because JSON from outside can have any shape at all. Developers think about what to send: never the whole database record when the client needs three fields — and never fields such as password hashes.

**Level 6 — Enterprise.** Object shapes become **contracts** between teams and services, defined in shared schemas and versioned, so that changing a field name in one service does not silently break another ({{ch:api-versioning}}). Large systems may represent the same thing differently in different places — a "customer" in the billing service is not the same object as a "customer" in the delivery service — and mapping carefully between these representations is a core part of system design ({{ch:software-architecture}}).

## Real-world use cases

### Beginner level — A contact card

**Situation:** a learner stores a friend's contact details.

**Solution:** one object with `name`, `phone` (as a string) and `email`, printed with a template literal.

**Lesson:** named properties are self-explanatory; positions are not.

### Intermediate level — Shaping an API response

**Business problem:** a shop's "order details" page needs the order number, status, item names and total — but the backend's order record from the database has thirty fields, including internal notes and the customer's payment token.

**Solution:** the backend builds a new, smaller object containing only what the page needs, and returns that as JSON.

**Reasoning:** sending less data is faster, and — far more importantly — never sending internal or sensitive fields prevents data leaks. Returning a database record "as is" is one of the most common ways APIs accidentally expose private data.

### Advanced level — A settings system with defaults

**Business problem:** a SaaS product lets each company customise dozens of settings — some per company, some per user.

**Solution:** settings are layered with object spread — product defaults, then company settings, then user settings — so that each layer overrides only what it specifies: `{ ...productDefaults, ...companySettings, ...userSettings }`.

**Failure scenario:** a nested settings group, such as `notifications`, is replaced wholesale by a user's partial setting, losing the company's other notification choices — the shallow-merge problem. The solution is to merge nested groups level by level (or with a careful deep-merge function), and to test merges explicitly.

### Enterprise level — Prototype pollution

**Business problem (illustrative, but a real class of vulnerability):** a web application merges JSON from incoming requests into its configuration objects using a home-made "deep merge" function.

**What can go wrong:** an attacker sends JSON containing a key named `__proto__`. Because of how JavaScript objects inherit properties ({{ch:this-prototypes-classes}}), a careless merge can write properties onto the shared base of **every** object in the program — for example, making `isAdmin` appear `true` on objects that never had it. This is called **prototype pollution**, and it has affected widely used libraries.

**Prevention:** never merge untrusted input directly into objects; validate input against an expected shape first; use well-maintained libraries rather than hand-written deep merges; and for lookup tables built from user-supplied keys, prefer `Map`. {{ch:application-security}} covers this further.

## Common mistakes

### Beginner mistake — Dot notation with a variable key

**What it looks like:** `product.field` when `field` is a variable holding `"stock"`.

**What happens:** it reads a property literally named `"field"`, giving `undefined`.

**How to fix it:** `product[field]`.

### Beginner mistake — Reading a property of `undefined`

**What it looks like:** `TypeError: Cannot read properties of undefined (reading 'city')`.

**Why it happens:** a part of the path is missing — often because the data did not have the shape you assumed.

**How to fix it:** print each step of the path to find which part is missing. If the part is genuinely optional, use `?.`; if it should always exist, find out why it does not.

### Beginner mistake — Storing labels made of digits as numbers

**What it looks like:** `phone: 03001234567` — which, as a number, loses its leading zero.

**How to fix it:** phone numbers, postcodes and IDs are strings.

### Intermediate mistake — Accidentally mutating shared objects

**What it looks like:** a function that "returns a discounted product" but changes the original product's price everywhere.

**How to fix and prevent it:** return a new object: `return { ...product, pricePaisa: newPrice };`.

### Intermediate mistake — Shallow copy surprises

**What it looks like:** changing a nested property of a "copy" changes the original.

**How to fix it:** copy each level you change (nested spread), or use `structuredClone` for a full deep copy.

### Intermediate mistake — Expecting dates back from JSON

**What it looks like:** `order.createdAt.getFullYear is not a function` after parsing JSON.

**Why it happens:** dates become strings in JSON.

**How to fix it:** convert date strings back into dates explicitly after parsing (and validate them).

### Production mistake — Returning whole database records from an API

**What it looks like:** an endpoint that returns the user object straight from the database, including the password hash, internal flags or other customers' data in nested fields.

**What happens:** private data leaks to anyone who calls the API — sometimes for months before anyone notices.

**How to prevent it:** always build response objects deliberately, choosing exactly which fields to include.

### Enterprise mistake — Merging untrusted input into objects

**What it looks like:** `Object.assign(config, req.body)` or a custom deep merge of request data.

**What happens:** attackers can overwrite internal settings, or pollute prototypes.

**How to prevent it:** validate against an expected shape and copy only known, allowed fields.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| `undefined` reading a property | Misspelt key (keys are case-sensitive), dot notation with a variable, or the property was never set |
| `TypeError: Cannot read properties of undefined (reading 'x')` | Something earlier in the path is missing |
| An object changed "by itself" | It is shared by reference, and other code mutated it |
| Changing a copy changes the original's nested data | Shallow copy |
| `{a:1} === {a:1}` is false | `===` compares identity, not contents |
| `[object Object]` printed | An object was joined into a string with `+` or a template literal; use `JSON.stringify(obj)` or `console.log(obj)` |
| `SyntaxError ... in JSON at position N` | Invalid JSON: single quotes, unquoted keys, trailing commas, or not JSON at all (often an HTML error page) |
| A property missing after a JSON round trip | It was `undefined` or a function — JSON drops both |

> [!TIP]
> In Node.js, `console.log` shows nested objects only a few levels deep, replacing deeper levels with `[Object]`. To see everything, use `console.dir(value, { depth: null })`, or print `JSON.stringify(value, null, 2)`. In a browser console, you can click to expand objects — but beware that the browser may show the object's **current** contents, not its contents at the moment it was logged. If an object is changing, logging `JSON.stringify(value)` captures a true snapshot.

## How a senior engineer thinks about objects

> [!SENIOR]
> Experienced engineers think about objects as **shapes of data** with owners:
>
> - **What is the shape?** Which fields, of which types, required or optional? They write it down — in TypeScript, in a schema, in documentation — because unwritten shapes drift.
> - **Where did this object come from?** Data from users, other services or JSON files is untrusted until checked against the expected shape.
> - **Who owns it, and can I change it?** Objects they did not create are treated as read-only. Updates produce new objects.
> - **What leaves the system?** Response objects are built deliberately, never dumped from the database.
> - **Record or lookup?** Fixed fields known in advance — an object. A growing collection keyed by IDs — a `Map`, or an object used carefully as a dictionary.
> - **Is this nesting reasonable?** Deeply nested data is hard to update immutably and hard to read. Sometimes flattening the shape is the real fix.

## Exercises

### Exercise 1 — A product card

**Objective:** practise creating objects, nesting and reading paths.

**What to build:** an object `product` with a `title`, a `pricePaisa`, a `stock` count, a `category` object (with `name` and `slug`), and an array of `sizes`. Print a line such as:

```text
Cotton shirt (Men's clothing) — Rs 1299.50 — sizes: S, M, L — 42 in stock
```

<details>
<summary>Show the solution</summary>

```js
const product = {
  title: "Cotton shirt",
  pricePaisa: 129950,
  stock: 42,
  category: { name: "Men's clothing", slug: "mens-clothing" },
  sizes: ["S", "M", "L"],
};

const price = (product.pricePaisa / 100).toFixed(2);
console.log(
  `${product.title} (${product.category.name}) — Rs ${price} — sizes: ${product.sizes.join(", ")} — ${product.stock} in stock`,
);
```

**Output:**

```text
Cotton shirt (Men's clothing) — Rs 1299.50 — sizes: S, M, L — 42 in stock
```

Walkthrough:

- `product.category.name` follows the path into the nested object.
- `product.sizes.join(", ")` turns the sizes array into text, using the array method from {{ch:arrays}}.
- The price is converted from paisa only for display.
- The `slug` (a URL-friendly version of the name, like `mens-clothing`) is not shown here, but real products often carry one for building web addresses — an example of data stored for other uses.

**Common wrong approach:** writing `${product.sizes}` directly. That converts the array to text with commas but no spaces (`S,M,L`) — acceptable, but `join` gives you control over the separator.

</details>

### Exercise 2 — Update without mutating

**Objective:** practise spread and nested updates.

**Starting point:**

```js
const customer = {
  name: "Sara Khan",
  address: { city: "Lahore", postcode: "54000" },
  isMember: false,
};
```

**What to build:** a function `moveCustomer(customer, newCity, newPostcode)` that returns a **new** customer object with the new address, and a function `makeMember(customer)` that returns a new customer with `isMember: true`. Prove the original is unchanged.

<details>
<summary>Show the solution</summary>

```js
function moveCustomer(customer, newCity, newPostcode) {
  return {
    ...customer,
    address: { ...customer.address, city: newCity, postcode: newPostcode },
  };
}

function makeMember(customer) {
  return { ...customer, isMember: true };
}

const customer = {
  name: "Sara Khan",
  address: { city: "Lahore", postcode: "54000" },
  isMember: false,
};

const updated = makeMember(moveCustomer(customer, "Karachi", "74000"));

console.log(updated);
console.log(customer);
console.log(updated.address === customer.address);
```

**Output:**

```text
{
  name: 'Sara Khan',
  address: { city: 'Karachi', postcode: '74000' },
  isMember: true
}
{
  name: 'Sara Khan',
  address: { city: 'Lahore', postcode: '54000' },
  isMember: false
}
false
```

Walkthrough:

- `moveCustomer` spreads the customer into a new object, and replaces `address` with a **new** address object built from the old one plus the changes. Because the address is newly created, the original's address is untouched.
- `makeMember` spreads and overrides one top-level property.
- Calling one function on the result of the other combines both updates.
- The final line confirms the address objects are different objects.

**Common wrong approach:** `return { ...customer, address: customer.address }` followed by `result.address.city = newCity`. The new customer object shares the original's address, so the "copy" changes the original — the shallow copy trap.

</details>

### Exercise 3 — Count and group

**Objective:** practise lookup tables and `Object.entries`.

**Starting point:**

```js
const orders = [
  { id: 1, status: "delivered", totalPaisa: 250000 },
  { id: 2, status: "pending", totalPaisa: 99900 },
  { id: 3, status: "delivered", totalPaisa: 129950 },
  { id: 4, status: "cancelled", totalPaisa: 49900 },
  { id: 5, status: "delivered", totalPaisa: 75000 },
];
```

**What to build:** an object giving, for each status, the number of orders and their total value; then print one line per status.

<details>
<summary>Show the solution</summary>

```js
const summary = {};

for (const order of orders) {
  const current = summary[order.status] ?? { count: 0, totalPaisa: 0 };
  summary[order.status] = {
    count: current.count + 1,
    totalPaisa: current.totalPaisa + order.totalPaisa,
  };
}

for (const [status, { count, totalPaisa }] of Object.entries(summary)) {
  console.log(`${status}: ${count} orders, Rs ${(totalPaisa / 100).toFixed(2)}`);
}
```

**Output:**

```text
delivered: 3 orders, Rs 4549.50
pending: 1 orders, Rs 999.00
cancelled: 1 orders, Rs 499.00
```

Walkthrough:

- For each order, the current summary for its status is read — or a fresh `{ count: 0, totalPaisa: 0 }` if this status has not been seen yet (`??` supplies the default).
- A new summary object for that status is stored, with the count and total increased.
- The second loop uses `Object.entries` and **nested destructuring**: `[status, { count, totalPaisa }]` unpacks each entry's key, and then the `count` and `totalPaisa` of its value.

Delivered: 250,000 + 129,950 + 75,000 = 454,950 paisa = Rs 4,549.50.

**Common wrong approach:** writing `summary[order.status].count++` without first creating the entry — the first time a status appears, `summary[order.status]` is `undefined`, and the code crashes with "Cannot read properties of undefined".

(A small improvement worth noticing: "1 orders" should read "1 order". A real interface would choose the word with a ternary, as you did in {{ch:operators-and-decisions}}.)

</details>

### Exercise 4 — The leaking API (debugging scenario)

**Objective:** practise thinking about what objects contain and expose.

**The scenario:** a backend function builds the response for a "my profile" page:

```js
function buildProfileResponse(userRecord) {
  userRecord.lastViewedAt = "2026-11-19T10:00:00Z";
  return userRecord;
}

const userRecord = {
  id: "u_381",
  name: "Sara Khan",
  email: "sara@example.com",
  passwordHash: "$2b$12$Qm1x...",
  isAdmin: false,
  internalNotes: "Requested refund twice",
};

const response = buildProfileResponse(userRecord);
console.log(JSON.stringify(response));
```

**What to do:** identify every problem with this function, and rewrite it.

<details>
<summary>Show the solution</summary>

**Problems:**

1. **Sensitive data is exposed.** The response includes `passwordHash` and `internalNotes`. Anyone viewing their profile — or anyone who steals a session — receives the password hash (useful to attackers) and staff notes never meant for customers. This is a real and common category of security incident.
2. **The input is mutated.** `userRecord.lastViewedAt = ...` changes the caller's object. If that object came from a cache or is used elsewhere, the change leaks into other code — a side effect hidden inside a function named "build response".
3. **The response shape is accidental.** Whatever fields happen to be in the database record become the API's contract. Adding a column to the database later silently changes — and possibly leaks through — the API.

**Rewritten:**

```js
function buildProfileResponse(userRecord, viewedAt) {
  return {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    lastViewedAt: viewedAt,
  };
}

const response = buildProfileResponse(userRecord, "2026-11-19T10:00:00Z");
console.log(JSON.stringify(response));
```

**Output:**

```text
{"id":"u_381","name":"Sara Khan","email":"sara@example.com","lastViewedAt":"2026-11-19T10:00:00Z"}
```

Walkthrough of the fix:

- The response object is built **deliberately**, listing exactly the fields the page needs. Nothing else can leak, and new database columns do not change the API by accident.
- The function no longer mutates its input; it is now pure — the time is passed in rather than written onto the record.
- `isAdmin` is left out too: the profile page does not need it, and hiding role information reduces what an attacker learns.

**Lesson:** an object is not just "some data". Every object that leaves your system is a promise and a potential leak. Build response objects on purpose.

</details>

## Summary

An **object** groups named values called **properties**, each with a **key** and a **value**; a property holding a function is a **method**. Create objects with **object literals** in curly braces. Read properties with **dot notation**, or **bracket notation** when the key is in a variable or not a valid name. Missing properties give `undefined`; reading a property *of* `undefined` throws a `TypeError`, which **optional chaining** (`?.`) avoids for genuinely optional data.

Objects can be changed even when `const`: assign to add or update, `delete` to remove. **Shorthand properties** and **computed keys** are common shortcuts. Real data nests objects and arrays; read nested paths one step at a time. Loop with `Object.keys`, `Object.values` and `Object.entries`; rebuild with `Object.fromEntries`; check existence with `in` or `Object.hasOwn`.

**Object destructuring** unpacks properties by name, with renaming, defaults, nesting and rest — and lets functions take one **options object** instead of many positional parameters. Objects are shared **by reference**. **Spread** makes **shallow** copies and immutable updates (`{ ...obj, field: newValue }`); nested data needs nested spreads or **`structuredClone`**. **`Object.freeze`** prevents changes.

**JSON** is object and array syntax as text: `JSON.stringify` **serialises**, `JSON.parse` **parses**. JSON drops functions and `undefined`, turns dates into strings, cannot hold BigInt, and parsing can fail. Objects make fast **lookup tables** for replacing `switch` statements and for grouping and counting; **`Map`** is the dedicated structure for growing key–value collections. Build response objects deliberately — never expose whole records.

## Key terms

- **Object** — A collection of named values (properties) stored as a single value.
- **Property** — A named value in an object, made of a key and a value.
- **Key** — The name of a property.
- **Object literal** — An object written directly in code with curly braces.
- **Dot notation** — Reading or writing a property with a dot and its exact name, such as `customer.name`.
- **Bracket notation** — Reading or writing a property with square brackets and a key string or expression, such as `product[field]`.
- **Optional chaining (`?.`)** — Syntax that stops and returns `undefined` if the value before it is `null` or `undefined`, instead of throwing an error.
- **`delete`** — An operator that removes a property from an object.
- **Property shorthand** — Writing `{ name }` instead of `{ name: name }` when a variable has the same name as the key.
- **Computed key** — A property key written as an expression in square brackets, such as `{ [field]: value }`.
- **Nesting** — Placing objects and arrays inside other objects and arrays.
- **`this`** — A special keyword that, inside a method, usually refers to the object the method was called on.
- **`Object.keys` / `Object.values` / `Object.entries`** — Functions that return an object's keys, values, or `[key, value]` pairs as arrays.
- **`Object.fromEntries`** — A function that builds an object from an array of `[key, value]` pairs.
- **`Object.hasOwn`** — A function that checks whether an object has a property of its own with a given key.
- **Object destructuring** — Syntax that unpacks properties of an object into variables by key name.
- **Options object** — A single object parameter with named fields, used instead of many positional parameters.
- **Immutable update** — Changing data by creating a new object or array with the changes, rather than modifying the original.
- **`structuredClone`** — A built-in function that makes a deep copy of a value.
- **`Object.freeze`** — A function that makes an object's own properties read-only.
- **Serialising** — Turning data in memory into a form, such as JSON text, that can be stored or sent.
- **Deserialising (parsing)** — Turning stored or received text, such as JSON, back into data in memory.
- **`JSON.stringify`** — A function that converts a value into a JSON string.
- **`JSON.parse`** — A function that converts a JSON string into a JavaScript value.
- **Lookup table** — A structure, such as an object or Map, used to find a value quickly by its key.
- **`Map`** — A built-in collection of key–value pairs that accepts keys of any type and tracks its size.
- **Prototype pollution** — A security vulnerability in which attacker-controlled keys such as `__proto__` modify the shared base of all objects.
- **Slug** — A URL-friendly version of a name, such as `mens-clothing`.

## What comes next

You now know all the basic building blocks of JavaScript data: primitives, arrays and objects, and how to make decisions, repeat work and organise logic in functions.

But some questions are still open. Why can a function use a variable created outside it? Why does `let` behave differently from `var`? Why did `console.log(price)` before `const price = ...` say "Cannot access before initialization" rather than "not defined"? And how can a function "remember" values after it has finished running? In the next chapter, **Scope, Hoisting and Closures: How JavaScript Finds Your Variables**, you will learn exactly how JavaScript decides which variable a name refers to — knowledge that turns some of the language's most confusing behaviours into simple, predictable rules.
