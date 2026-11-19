# From Code to a Running Program

> [!GOALS]
> - What a programming language is, and why we need one at all.
> - The difference between machine code, assembly language and high-level languages.
> - How code is translated for the CPU: compilers, interpreters, and the modern mix called just-in-time compilation.
> - What a JavaScript **engine** is and what a **runtime** is — and why JavaScript in a browser and JavaScript in Node.js can do different things.
> - What syntax and semantics are, and the difference between an error found before a program runs and an error found while it runs.
> - What libraries, frameworks and language versions are.
> - How to run your very first line of JavaScript, using only the web browser you already have.

## Why this matters

In the previous chapter you learned that a CPU only understands tiny numbered instructions: add these two numbers, copy this value, jump to that instruction. Yet programmers write things like this:

```js
if (basketTotal > 5000) {
  applyFreeDelivery();
}
```

Something must turn that readable text into the numbered instructions a processor can execute. Understanding *what* does the turning, and *when*, explains many things beginners find mysterious:

- why some errors appear the moment you start a program and others only appear later, while it is running;
- why the same JavaScript code works in a web browser but fails on a server with "document is not defined";
- why people say JavaScript is "slow" or "fast", and why both are partly true;
- why programmers talk about "Node 22", "ES2024" or "TypeScript compiles to JavaScript";
- what the difference is between a language, a library and a framework — words used constantly in job adverts.

This chapter follows the full journey from code you type to a program that runs. At the end, you will run your first line of JavaScript.

## The simple idea

People and CPUs speak very different languages.

People think in ideas: "If the basket total is more than 5,000 rupees, give free delivery."

A CPU only understands numbered instructions: "Copy the value at memory address 4,812 into register 1. Compare register 1 with 5,000. If it is not greater, jump to instruction 9,104."

A **programming language** sits in between. It is a precise, limited language that humans can read and write comfortably, but that is strict enough to be translated, automatically and without any guessing, into the CPU's instructions.

> [!ANALOGY]
> Imagine you need to give instructions to a worker who speaks only a language you do not know. You write your instructions in English, using a strict, simple style. A professional translator converts them, word for word and with no guessing, into the worker's language.
>
> The strict English is the **programming language**. The translator is a **compiler** or **interpreter**. The worker is the **CPU**.
>
> **Where the analogy breaks:** a human translator can guess what you *meant* when you write something unclear. A programming-language translator never guesses. If you write something that does not follow the language's rules exactly — even one missing bracket — it stops and reports an error. And if you write something that follows the rules but means the wrong thing, it translates the wrong thing perfectly.

## The proper definition and key words

A **programming language** is a formal language — a language with exact rules — for writing instructions that a computer can carry out after they have been translated.

Some words you will use all the time:

- **Code** or **source code** — the text you write in a programming language. It is stored in ordinary text files, such as `shop.js`.
- **Syntax** — the grammar rules of a language: which words, symbols and arrangements are allowed. In JavaScript, a block of code goes inside curly braces `{ }`; text goes inside quote marks.
- **Semantics** — what a piece of correctly written code *means*: what will actually happen when it runs.
- **Execute** or **run** — to carry out the instructions in a program.
- **Machine code** — the numbered instructions a specific CPU understands directly.

A sentence can have correct grammar and still make no sense. "The bread drove the sky to school" is grammatically fine but meaningless. Code is the same: it can follow the syntax rules perfectly and still do the wrong thing. Both kinds of problem appear in this chapter.

## The ladder of languages

Programming languages are often described as "low-level" or "high-level". Low-level means close to the hardware. High-level means close to human thinking.

```text
  HIGH-LEVEL     JavaScript, Python, Java, C#, Go     "if total > 5000 ..."
  (close to          |
   people)           |  translated by a compiler or interpreter
                     v
  LOW-LEVEL      Assembly language                    "CMP R1, 5000"
                     |
                     |  translated by an assembler
                     v
  LOWEST         Machine code                         10110000 01100001 ...
  (close to
   hardware)
```

Read the diagram from top to bottom. Each step down is closer to what the CPU really runs, and further from how people think.

### Level 1 — Machine code

At the bottom is **machine code**: the raw numbers that a CPU executes. Each kind of CPU has its own set of instructions, called its **instruction set**. The processors in most laptops and servers use an instruction set called **x86-64**; most phones, newer Apple computers and many cloud servers use one called **ARM**. Machine code written for one will not run on the other.

The earliest computers in the 1940s and 1950s were programmed in machine code, sometimes by setting switches by hand. It was slow, error-prone, and almost impossible to read. A single wrong digit could break everything, and finding it meant checking thousands of numbers.

### Level 2 — Assembly language

The next step up is **assembly language**. Instead of writing numbers, the programmer writes short words for each instruction:

```text
MOV  R1, [4812]     ; copy the value at address 4812 into register R1
CMP  R1, 5000       ; compare R1 with 5000
JLE  9104           ; if R1 is less than or equal, jump to instruction 9104
```

Each line is still one CPU instruction, but now `MOV` (move), `CMP` (compare) and `JLE` (jump if less or equal) replace raw numbers. A small program called an **assembler** turns each word back into its machine-code number.

Assembly is easier than machine code, but it is still tied to one kind of CPU, and you must manage every register and memory address yourself. A simple task can take hundreds of lines. Today, assembly is used only in special cases, such as tiny devices with very little memory or very performance-critical parts of operating systems.

### Level 3 — High-level languages

**High-level languages** let you write instructions in terms of *ideas* rather than hardware: values, names, decisions, repetitions, lists. Compare the assembly above with the same idea in JavaScript:

```js
if (basketTotal > 5000) {
  applyFreeDelivery();
}
```

You do not choose registers. You do not know or care which memory address `basketTotal` lives at. You say what you mean, and a translator works out the hardware details.

High-level languages have three huge advantages:

1. **Readable.** Other people — including you, six months later — can understand the code.
2. **Portable.** The same code can run on different kinds of CPU, because the translator handles the differences.
3. **Productive.** One line of high-level code can stand for dozens or hundreds of machine instructions.

The cost is that you give up some direct control over the hardware. For almost all software — websites, business systems, mobile apps — that is an excellent trade.

There are hundreds of high-level languages. A few you will hear about constantly:

| Language | Where it is commonly used |
|---|---|
| **JavaScript** | Web pages in the browser, and servers through Node.js |
| **TypeScript** | JavaScript with added type checking (Part II teaches it) |
| **Python** | Data analysis, AI and machine learning, scripting, servers |
| **Java** and **Kotlin** | Large business systems, Android apps |
| **C#** | Business systems, Windows software, games (the Unity engine) |
| **Go** | Cloud tools and fast network servers |
| **C** and **C++** | Operating systems, games, browsers, databases — where speed and control matter most |
| **Rust** | Systems software that needs C-like speed with stronger safety |
| **SQL** | Asking databases for data (Part VIII) |

> [!WARNING]
> **Java and JavaScript are completely different languages.** The similar names come from a marketing decision in 1995, when Java was fashionable. They have different rules, different uses and different histories. Mixing them up in an interview or CV gives a poor impression, so keep them clearly separate in your mind.

## How code is translated

There are two classic ways to translate high-level code into something a CPU can run, plus a modern combination of both. Understanding them explains a great deal about how languages behave.

### Approach 1 — Compiling ahead of time

A **compiler** is a program that reads all of your source code and translates the whole thing into machine code *before* the program runs. The result is a separate file — called an **executable** or **binary** — that the CPU can run directly.

```text
   source code  ------>  COMPILER  ------>  executable file  ------>  CPU runs it
   (shop.c)          (runs once, before)       (shop.exe)          (any time later)
```

Read the diagram left to right. The compiler works once, at the start. After that, you only need the executable; you can run it a thousand times without compiling again.

Languages usually compiled this way include C, C++, Go and Rust.

**Advantages:**

- **Fast to run.** All the translation work is finished before the program starts, and the compiler has time to optimise — rearrange the machine code so it runs faster.
- **Many errors are caught early.** The compiler reads the entire program, so it can refuse to compile code with certain mistakes. You find them before any user does.

**Disadvantages:**

- **A waiting step.** Every time you change the code, you must compile again before running it. For large programs, this can take minutes.
- **Tied to one platform.** An executable compiled for Windows on an x86-64 CPU will not run on a Mac with an ARM CPU. You must compile a separate version for each.

### Approach 2 — Interpreting

An **interpreter** is a program that reads your source code and carries it out directly, piece by piece, *while* the program runs. There is no separate executable file.

```text
   source code  ------>  INTERPRETER  ------>  results
   (shop.js)          (reads and runs each
                       piece, every time)
```

The interpreter is like a live translator at a meeting, translating each sentence as it is spoken, rather than translating a whole book in advance.

**Advantages:**

- **No waiting step.** Change the code and run it immediately. This makes experimenting fast and pleasant.
- **Portable.** The same source code runs anywhere that has the interpreter installed.

**Disadvantages:**

- **Slower to run.** The translating happens again every time the code runs, which costs time.
- **Some errors are found late.** Because code is translated as it goes, a mistake in a part of the program that runs rarely may not be discovered until that part finally runs — perhaps in front of a real user, weeks later.

### Approach 3 — Just-in-time compilation (the modern mix)

Modern JavaScript — and also Java, C# and others — use a clever combination called **just-in-time (JIT) compilation**.

The idea: start running the code quickly, like an interpreter, but **watch which parts run often**. Those frequently used parts — called **hot** code — are then compiled into fast machine code *while the program is running*, and the fast version is used from then on.

```text
  source code
      |
      v
  PARSE into a structure the engine can work with
      |
      v
  INTERPRET quickly  ----(this function runs a lot: it is "hot")----+
      |                                                             |
      |                                                             v
      |                                         COMPILE the hot part into
      |                                         optimised machine code
      |                                                             |
      +<------------------ use the fast version from now on --------+
```

Read the diagram from the top. The code is first parsed (more on that soon) and interpreted, so the program starts quickly. On the right-hand path, code that runs often is compiled into fast machine code, and later runs use that fast version.

This gives most of the speed of compiling with most of the convenience of interpreting. It is a large part of why JavaScript, once considered slow, is now fast enough to run huge applications.

> [!INSIDE]
> A JIT compiler makes *guesses* to produce fast code. For example, if a function has been called a thousand times and has always been given numbers, the compiler produces machine code that assumes numbers. If the function is suddenly given text instead, the guess was wrong; the engine throws away the fast version (this is called **deoptimisation**) and falls back to the slower path. This is one reason experienced JavaScript developers keep the kinds of values passed to a function consistent. You will see why in {{ch:advanced-javascript}}.

### Comparing the three approaches

| | Compiled ahead of time | Interpreted | Just-in-time (JIT) |
|---|---|---|---|
| When translation happens | Once, before running | Continuously, while running | Starts interpreted, hot code compiled while running |
| Speed when running | Fastest | Slowest | Close to compiled for hot code |
| Start-up | Instant (already compiled) | Instant | Fast, then speeds up |
| Waiting step after each change | Yes | No | No |
| Typical examples | C, C++, Go, Rust | Older JavaScript, simple scripts | Modern JavaScript, Java, C# |

> [!NOTE]
> These categories are not as strict as the table suggests. "Compiled" and "interpreted" describe *how a particular tool runs a language*, not something permanently built into the language. Python is usually interpreted, but tools exist that compile it. JavaScript is usually JIT-compiled. When people call a language "compiled" or "interpreted", they mean how it is *normally* run.

## Inside a JavaScript engine

Since JavaScript is your first language, let us look more closely at what runs it.

A **JavaScript engine** is the program that takes JavaScript source code and executes it. The most widely used engine is **V8**, created by Google. V8 runs JavaScript inside the Google Chrome and Microsoft Edge browsers, and it is also the engine inside **Node.js**. Firefox uses a different engine called SpiderMonkey, and Safari uses one called JavaScriptCore. They all follow the same language rules, so the same code works in each.

When an engine receives your code, it goes through these stages:

```text
  your code (text)
      |
      v
  1. TOKENISE  -- split the text into meaningful pieces
      |
      v
  2. PARSE     -- check the grammar and build a tree describing the code
      |
      v
  3. COMPILE TO BYTECODE  -- a compact, simple instruction format
      |
      v
  4. INTERPRET the bytecode, and JIT-compile hot parts to machine code
      |
      v
  5. RUN on the CPU
```

Let us take a tiny piece of code and follow it through:

```js
let total = 40 + 2;
```

**Stage 1 — Tokenising.** The engine reads the characters and groups them into **tokens**: the smallest meaningful pieces. Our line becomes:

```text
  let     total     =     40     +     2     ;
  word    name     sign  number sign number  end
```

Spaces are ignored; they just separate tokens.

**Stage 2 — Parsing.** The engine checks that the tokens follow the grammar of JavaScript and builds a tree that describes what the code means. This tree is called an **abstract syntax tree** (AST). For our line, it looks roughly like this:

```text
        create a variable
        /               \
    name: total      starting value
                          |
                       addition
                       /      \
                     40        2
```

The tree says: create a variable named `total`, and its starting value is the result of adding 40 and 2. If the tokens break the grammar — for example, `let total = 40 + ;` with nothing after the plus sign — parsing fails here, and you get a **syntax error** before *any* of the program runs.

**Stage 3 — Bytecode.** The engine turns the tree into **bytecode**: a list of simple instructions for the engine's own internal "virtual" processor. Bytecode is lower-level than JavaScript but not tied to any real CPU.

**Stage 4 — Interpreting and JIT compiling.** The engine's interpreter runs the bytecode. If a part runs often, the JIT compiler turns it into real machine code for your CPU.

**Stage 5 — Running.** The CPU executes machine instructions. After this line, somewhere in memory there is a value 42, and the engine remembers that the name `total` refers to it.

All of this happens in a few thousandths of a second. You will never need to perform these stages yourself, but knowing they exist explains why a single missing bracket stops a whole file from running: the parser cannot build the tree, so nothing gets as far as running.

## Engine versus runtime

Here is a distinction that confuses many developers, even some with experience. It is worth getting clear now.

The **engine** only understands the JavaScript *language*: values, variables, calculations, decisions, functions. On its own, an engine cannot do anything useful in the outside world. It cannot show a button, read a file, wait one second or talk to the internet. The language itself has no instructions for any of that.

A **runtime** (or runtime environment) is the engine **plus** a collection of extra abilities that connect your code to the outside world. Different runtimes provide different abilities.

```text
  +------------------------------------+   +------------------------------------+
  |        BROWSER (a runtime)         |   |        NODE.JS (a runtime)         |
  |                                    |   |                                    |
  |   +----------------------------+   |   |   +----------------------------+   |
  |   |  JavaScript ENGINE (V8)    |   |   |   |  JavaScript ENGINE (V8)    |   |
  |   |  the language itself       |   |   |   |  the language itself       |   |
  |   +----------------------------+   |   |   +----------------------------+   |
  |                                    |   |                                    |
  |   Extra abilities:                 |   |   Extra abilities:                 |
  |   - the web page (document)        |   |   - files on the disk (fs)         |
  |   - clicks and key presses         |   |   - running a web server (http)    |
  |   - timers                         |   |   - timers                         |
  |   - fetching data from servers     |   |   - processes, environment         |
  |   - storage in the browser         |   |   - fetching data from servers     |
  +------------------------------------+   +------------------------------------+
```

Look at the two boxes side by side. Both contain the very same engine — V8 — so the core JavaScript language works identically in both. The difference is in the extra abilities listed underneath:

- The **browser** gives JavaScript access to the web page, the user's clicks, and the browser's storage. It deliberately does **not** let a web page read files on your disk — imagine if any website could read your documents.
- **Node.js** gives JavaScript access to files, network servers and the operating system. It has **no** web page, because it is not running inside a browser at all.

> [!ANALOGY]
> The engine is a skilled chef. The runtime is the kitchen the chef works in. The same chef can cook in a restaurant kitchen (with a large oven and a pizza stone) or on a food truck (with a grill and a deep fryer). The chef's skills are the same in both, but what they can actually make depends on the equipment available.
>
> **Where the analogy breaks:** a chef can improvise with whatever equipment is around. Code cannot. If your code reaches for equipment the runtime does not have — say, the web page, while running in Node.js — it does not improvise; it stops with an error.

This explains the confusing error from the start of the chapter. Code written for a browser often uses `document` to change the web page. If you run that code in Node.js, there is no web page and no `document`, so you get:

```text
ReferenceError: document is not defined
```

The language is the same; the runtime is different. You will meet Node.js properly in {{ch:nodejs}}, and the browser's abilities in {{ch:browser-and-dom}}.

> [!SENIOR]
> When an experienced developer reads a piece of JavaScript, one of their first silent questions is: "Which runtime is this for?" Browser code, server code, and code that must run in both are written differently. Many bugs in real projects come from code that quietly assumes the wrong runtime — for example, a shared helper that uses a browser-only feature and crashes when the server uses it.

## When errors appear: before running and while running

Now you can understand why errors come at different times. There are two main kinds.

### Syntax errors — found before anything runs

A **syntax error** means the code breaks the grammar of the language. The engine finds it during parsing, before any of the program runs. Nothing in the file runs at all — not even the lines before the mistake.

```js
console.log("Before the mistake");
let price = 100 +;
```

**Output:**

```text
SyntaxError: Unexpected token ';'
```

Walkthrough:

- Line 1 is perfectly valid. It would print a message.
- Line 2 has a plus sign with nothing after it. The parser expects a value after `+` and finds `;` instead — an "unexpected token".
- Because parsing fails, the engine never builds the tree, so **line 1 never runs either**. You do not see "Before the mistake". This surprises beginners, who expect the program to run until it reaches the broken line.

### Runtime errors — found while running

A **runtime error** happens when the code is grammatically correct but something goes wrong while it is actually running. The program runs normally up to the problem and then stops.

```js
console.log("Before the mistake");
let customer = undefined;
console.log(customer.name);
console.log("After the mistake");
```

**Output:**

```text
Before the mistake
TypeError: Cannot read properties of undefined (reading 'name')
```

Walkthrough:

- Line 1 runs and prints its message, because the whole file parsed successfully.
- Line 2 creates a name `customer` holding a special value meaning "nothing here" (you will learn exactly what `undefined` is in {{ch:types-of-data}}).
- Line 3 asks for the `name` of that customer. There is no customer, so there is no name to read. This is perfectly valid grammar — the problem only appears when the line actually runs and the value turns out to be empty.
- The program stops at line 3, so line 4 never runs.

You do not need to understand every word in these examples yet. What matters is the difference in timing: **syntax errors stop everything before it starts; runtime errors stop the program partway through.**

### Logic errors — the program runs, but does the wrong thing

There is a third, sneakier kind. A **logic error** is when the code runs without any error message but produces the wrong result — because the instructions themselves are wrong.

```js
let price = 1000;
let discount = 10;            // meant to be 10 percent
let finalPrice = price - discount;
console.log(finalPrice);
```

**Output:**

```text
990
```

The programmer meant a 10 percent discount, which should give 900. The code subtracted 10 rupees instead. The engine did exactly what it was told; what it was told was wrong. No translator can catch this, because it cannot know what you *meant*. Logic errors are caught by careful thinking and by **testing** — writing checks that compare the program's results with the correct answers. {{ch:testing}} is devoted to this.

### Why compiled languages and type checkers help

Compiled languages and tools like **TypeScript** can catch some mistakes that JavaScript only discovers at runtime. TypeScript reads your whole program before it runs and checks, for example, that you never try to read a `name` from something that might be empty. It turns some runtime errors into earlier errors that you see in your editor while typing.

This is one of the main reasons professional teams use TypeScript, and why this book teaches it at the end of Part II ({{ch:typescript-basics}}). The general principle is worth remembering: **the earlier a mistake is found, the cheaper it is to fix.** A mistake found while typing costs seconds. The same mistake found by a customer can cost money, trust and a late night.

## Languages change: versions and standards

Programming languages are not fixed. They gain new features over time, and so do runtimes.

JavaScript's official rules are published as a standard called **ECMAScript** (often shortened to ES). A new edition is published every year, named by year: ES2015, ES2016, and so on up to the present. ES2015 (also called ES6) was a particularly big update, and much of the "modern JavaScript" you will learn — such as `let`, `const` and classes — arrived then.

Runtimes have their own version numbers. Node.js releases a new major version regularly, and every second major version becomes an **LTS** (Long-Term Support) version — one that receives fixes for a long period and is recommended for real applications. Browsers update themselves automatically every few weeks.

Why this matters in practice:

- **A new feature may not be available everywhere.** Code using the newest syntax may fail in an old browser or an old version of Node.js. Professional teams decide which versions they support and check against them.
- **Tutorials go out of date.** Older material online often uses patterns that are no longer recommended. This book teaches modern JavaScript, and points out older patterns you will still meet in existing codebases.
- **Servers must match.** A program that works on your laptop with Node 22 may fail on a server running Node 16. Writing down the exact version a project needs is a basic professional habit, covered in {{ch:modules-and-npm}}.

## Libraries, frameworks and the standard library

One more set of words you will meet constantly, and that job adverts use all the time.

**The standard library** is the set of ready-made tools that come with a language or runtime. You do not need to install anything to use them. JavaScript comes with tools for working with text, numbers, lists and dates; Node.js adds tools for files and networks.

A **library** is a collection of ready-made code written by someone else that you can add to your project and *call* when you need it. For example, a library for formatting dates, or one for sending email. **You** stay in control: your code decides when to use the library.

A **framework** is a larger structure that organises your whole application. With a framework, the relationship is reversed: **the framework is in control**, and it calls *your* code at the right moments. You fill in the pieces it asks for. React (Part VI) and NestJS (Part VII) are frameworks.

```text
   LIBRARY:     your code  ---calls--->  library code
                (you decide when)

   FRAMEWORK:   framework  ---calls--->  your code
                (it decides when; you fill in the parts)
```

The reversal in the diagram has a name: **inversion of control**. It is the most reliable way to tell a library from a framework.

> [!ANALOGY]
> A library is like a toolbox. You build the furniture your way, and reach for a hammer or a screwdriver whenever you need one.
>
> A framework is like a flat-pack furniture kit with instructions. The structure is decided for you; you follow the steps and attach the parts where the instructions say.
>
> **Where the analogy breaks:** real frameworks are far more flexible than flat-pack furniture. Much of an experienced developer's skill is knowing *how far* a framework can be bent to fit a problem, and when to stop fighting it.

Frameworks and libraries save enormous amounts of work. But they are built on the language, so they only make sense once you know the language well. This is why the book teaches JavaScript itself thoroughly before any framework. Developers who learn a framework first often hit problems they cannot solve, because the problem is really in the language underneath.

## Your first line of JavaScript

You do not need to install anything to run JavaScript. Every modern web browser contains a JavaScript engine and a tool for typing code into it directly, called the **console**.

### Opening the browser console

1. Open Google Chrome or Microsoft Edge (Firefox works too).
2. Press <kbd>F12</kbd>, or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd> on Windows and Linux, or <kbd>Cmd</kbd> + <kbd>Option</kbd> + <kbd>J</kbd> on a Mac.
3. A panel opens, usually at the side or bottom of the window. Click the tab labelled **Console** if it is not already selected.
4. You will see a prompt — a `>` symbol with a blinking cursor. This is where you type JavaScript.

The set of panels you just opened is called the browser's **developer tools** ("DevTools"). You will use it constantly as a web developer.

> [!NOTE]
> The first time you paste code into the console, some browsers show a warning and ask you to type "allow pasting". This protects people from scammers who trick them into pasting harmful code. In this book you should be *typing* code anyway, not pasting it.

### Hello, world

Type this exactly, then press <kbd>Enter</kbd>:

```js
console.log("Hello, world!");
```

**Output:**

```text
Hello, world!
undefined
```

Let us go through it piece by piece.

- `console` — the name of a ready-made tool the runtime gives you for writing messages to this console panel. It is one of the runtime's extra abilities. Both browsers and Node.js provide it.
- `.` — the dot means "the part of the thing on the left called…". So `console.log` means "the `log` ability belonging to `console`". You will see dots everywhere in JavaScript.
- `log` — the specific ability that writes a message. "Log" means "record", as in a ship's log.
- `( )` — round brackets after a name mean "do it now". Using an ability like this is called **calling** it. Whatever you put inside the brackets is passed to it — here, the message to write.
- `"Hello, world!"` — a piece of text. The double quote marks tell JavaScript where the text starts and ends; they are not part of the text itself, which is why they do not appear in the output. A piece of text in code is called a **string**.
- `;` — the semicolon marks the end of a statement, like a full stop at the end of a sentence.

And the output:

- `Hello, world!` is the message you asked to be logged.
- `undefined` is something else entirely. The console always shows you the **result** of whatever you typed. `console.log` does its job (writing the message) but does not give back any result value, and JavaScript's word for "no value" is `undefined`. This line is a feature of the console, not of your program. When you run code from a file later, you will not see it.

> [!TRY]
> Now break it on purpose, one change at a time, and read each error message:
>
> 1. Remove the closing quote mark: `console.log("Hello, world!);`
> 2. Misspell `log`: `console.lgo("Hello, world!");`
> 3. Remove the quote marks completely: `console.log(Hello, world!);`
>
> For each one, decide before pressing Enter: will this be a **syntax error** (the grammar is broken) or a **runtime error** (the grammar is fine, but something goes wrong while running)?

<details>
<summary>What happened, and why</summary>

1. **Missing closing quote** — a **syntax error**, something like `SyntaxError: Invalid or unexpected token`. Without the closing quote, the engine cannot find where the text ends, so it cannot even split the line into tokens properly.
2. **Misspelt `lgo`** — a **runtime error**: `TypeError: console.lgo is not a function`. The grammar is fine — it is a perfectly valid way to *write* a call. But when it runs, `console` turns out to have no ability called `lgo`. Spelling mistakes in names are usually runtime errors, which is why they can hide in parts of a program that rarely run.
3. **No quote marks** — a **syntax error**. Without quotes, `Hello, world!` is not text. JavaScript tries to read `Hello` and `world` as names, and the `!` in that position breaks the grammar.

Notice how precise the computer is. A human would understand all three versions instantly. The engine accepts none of them. This precision is not the computer being difficult; it is the price of a machine that does *exactly* what it is told.

</details>

### A little more

Try a few more lines, one at a time:

```js
console.log(2 + 3);
console.log("2" + "3");
console.log(10 * 4);
```

**Output:**

```text
5
23
40
```

Walkthrough:

- `2 + 3` — two numbers. The `+` adds them, and `console.log` writes the result, `5`.
- `"2" + "3"` — two *strings* (because of the quote marks). With text, `+` does not add; it **joins** the two pieces together, giving `23`. Remember from {{ch:what-a-computer-is}}: the character "2" and the number 2 are different things to a computer. Here you can see the difference directly.
- `10 * 4` — the `*` symbol means multiply, because keyboards have no × sign. The result is `40`.

Typing code straight into a console like this — one line at a time, seeing each result immediately — is how programmers try out small ideas quickly. The console is a type of **REPL**, which stands for Read–Eval–Print Loop: it **reads** what you type, **evaluates** (runs) it, **prints** the result, and **loops** back to wait for more. Node.js has a REPL too, which you will use in {{ch:setting-up-your-workshop}}.

For real programs, you write code in files instead, so it can be saved, shared and run again. That is coming soon.

## From beginner to enterprise: the same journey at different scales

The path from source code to running program exists at every level of software, but it grows more elaborate as projects grow.

**Level 3 — A single file.** You write `hello.js` and run it with Node.js. The engine parses, compiles and runs it in a fraction of a second. There is one step between your code and the CPU.

**Level 4 — A real web application.** A shop's website might be written in TypeScript, split across hundreds of files, using dozens of libraries. Before it runs, a **build** step prepares it: TypeScript is checked and converted to JavaScript (this kind of translation, from one high-level language to another, is called **transpiling**), the files are combined into a few larger files, and unnecessary spaces are removed to make downloads smaller. Tools that do this are called **build tools** or **bundlers**.

**Level 5 — A professional team.** The build is automated. Every time a developer shares a change, a server automatically checks the code, runs the tests, and builds the application. If anything fails, the change is rejected before it reaches users. This automation is called **CI/CD** (continuous integration and continuous delivery), taught in {{ch:cicd}}. Teams also fix the exact version of the runtime and every library, so that the code behaves the same on every developer's laptop and every server.

**Level 6 — Enterprise scale.** Large companies run many services written in different languages, each chosen for its job: perhaps JavaScript for web servers, Go for high-traffic network services, Python for machine learning, and Java for core business systems. Each service is built into a standard package — often a **container**, covered in {{ch:docker}} — so that, however differently they were compiled or interpreted, they can all be deployed and run in the same way.

## Real-world use cases

### Beginner level — Choosing where to run a script

**Situation:** a beginner writes a small script that reads a list of customer names from a file on their computer and prints them sorted.

**The decision:** this needs to read files, which browsers deliberately do not allow. So it must run in **Node.js**, not the browser console.

**Lesson:** the choice of runtime depends on which outside-world abilities the program needs.

### Intermediate level — A form that crashes for some users

**Business problem:** an online booking site's checkout page works for most customers, but a few report that nothing happens when they press "Pay".

**Technical problem:** the developers used a very new JavaScript feature. Most customers' browsers support it, but some older browsers — for example, on older phones that no longer receive updates — do not. In those browsers, parsing fails, so *none* of that file's code runs, including the payment button's code.

**Solution:** the team adds a build step that converts modern syntax into an older form that all supported browsers understand, and decides officially which browser versions they support.

**Trade-off:** the converted code is a little larger and the build is more complex. In exchange, every supported customer can pay. For a business, a working checkout is clearly worth it.

### Advanced level — A service that is fast in testing and slow in production

**Business problem:** a reporting feature in a software-as-a-service product (software that customers use online for a monthly fee) runs quickly in testing but becomes slow when real customers use it.

**Technical problem:** an engineer measures it and finds that a central function, called millions of times, is sometimes given numbers and sometimes given numbers written as text. The JIT compiler keeps optimising the function for one kind of value and then throwing that optimisation away when the other arrives (deoptimisation).

**Solution:** convert all values to real numbers once, when the data first arrives, so that the hot function always receives the same kind of value.

**Reasoning:** understanding how the engine works led directly to the fix. Without that understanding, the team might have bought bigger servers, which would not have solved the problem.

**Limitation:** this kind of tuning only matters for code that runs extremely often. Applying it everywhere would make code more complicated for no benefit. Measuring first is essential.

### Enterprise level — Choosing languages across a large company

**Business problem:** a large logistics company needs a customer website, a real-time parcel-tracking service handling enormous numbers of location updates, a route-optimisation system, and a model that predicts delivery delays.

**Solution (illustrative):** the website and its backend in TypeScript, so frontend and backend developers share one language; the high-volume tracking service in Go, which is compiled ahead of time and handles many network connections efficiently; route optimisation in a compiled language for raw calculation speed; and delay prediction in Python, because its machine-learning libraries are the industry standard.

**Reasoning:** no single language is best at everything. Each choice balances speed, developer productivity, available libraries, and the skills of the team.

**Disadvantages:** more languages mean more tools, more build systems and more specialised knowledge. If only one engineer knows the Go service, the company has a risk when that person leaves. Many companies therefore deliberately limit how many languages they use, accepting slightly less-than-ideal tools in exchange for simplicity.

## Common mistakes

### Beginner mistake — Expecting the computer to understand what you meant

**What it looks like:** `console.log("Total is" + 5 + 5)` printing `Total is55` instead of `Total is10`, and the beginner assuming the computer is broken.

**Why it happens:** a human reading the line understands the intention. The engine follows rules exactly: it works left to right, joins `"Total is"` and `5` into text, and then joins the next `5` onto that text.

**How to spot it:** whenever a result surprises you, assume the computer did exactly what you wrote, and trace through what you actually wrote, step by step.

**How to fix it:** make the intention explicit, for example `"Total is " + (5 + 5)`. The brackets force the addition to happen first. You will learn the exact rules in {{ch:operators-and-decisions}}.

### Beginner mistake — Reading only the first word of an error message

**What it looks like:** seeing red text, panicking, and changing code at random.

**Why it happens:** error messages look intimidating at first.

**What happens:** random changes create new errors on top of the old one.

**How to fix and prevent it:** read the whole message. It tells you the **kind** of error (`SyntaxError`, `TypeError`, `ReferenceError`), a **description** of what went wrong, and usually the **file and line number**. These three pieces of information are almost always enough to find the problem. {{ch:errors-and-debugging}} teaches error reading in depth.

### Intermediate mistake — Writing browser code and running it on the server, or the reverse

**What it looks like:** `ReferenceError: document is not defined` in Node.js, or `require is not defined` in the browser.

**Why it happens:** the same language runs in both places, so it is easy to forget that the *runtimes* offer different abilities.

**How to fix and prevent it:** know which runtime each piece of code is for. Keep browser-only code and server-only code clearly separated, and keep shared code to pure language features that work in both.

### Production mistake — "It works on my machine"

**What it looks like:** an application works perfectly on a developer's laptop and fails after deployment.

**Why it happens:** the server runs a different version of Node.js, or slightly different versions of the libraries, than the developer's laptop. A feature the code relies on is missing or behaves differently.

**Consequences:** failed deployments, emergency fixes, and possibly downtime for users.

**How to prevent it:** record the exact runtime version a project needs, lock the exact library versions (you will learn how in {{ch:modules-and-npm}}), and use the same versions everywhere — something that containers ({{ch:docker}}) make much easier.

### Enterprise mistake — Choosing a language for fashion rather than fit

**What it looks like:** rewriting a working system in a newly fashionable language because it is popular, without a clear problem it solves.

**What happens:** months of work to reach the same functionality, new bugs, a team that must learn new tools, and often no measurable benefit.

**How to prevent it:** ask what specific problem the change solves, and whether that problem is worth the cost. Experienced engineers are generally cautious about rewrites, because they know how much hidden knowledge lives inside working code.

## How a senior engineer thinks about languages and runtimes

> [!SENIOR]
> Beginners often ask, "Which is the best programming language?" Experienced engineers hear that as an incomplete question. Their version is: **"Best for what, for whom, and at what cost?"**
>
> When they choose a language or runtime, they weigh:
>
> - **The job.** Heavy calculation, many network connections, a user interface, data analysis?
> - **The team.** What do the people who will maintain this already know? A slightly slower tool the team knows well usually beats a faster one nobody understands.
> - **The ecosystem.** Are there mature, well-maintained libraries for what we need?
> - **The operations.** How is it built, deployed, monitored and updated? Who fixes it at 3 a.m.?
> - **The lifetime.** Will this language and its tools still be supported in five or ten years?
>
> They also know that the language is rarely the reason a project succeeds or fails. Clear design, good tests and a team that understands its tools matter far more. That is why this book teaches one language deeply and spends most of its pages on ideas that work in every language.

## Exercises

### Exercise 1 — Syntax, runtime or logic?

**Objective:** practise recognising the three kinds of errors.

**What to do:** for each situation, decide whether it describes a syntax error, a runtime error or a logic error.

1. A program meant to add up the prices in a basket gives a total that is always 1 rupee too low. No error message appears.
2. A file has a missing closing bracket on line 40. When you run it, nothing at all happens except an error message mentioning line 40.
3. A program runs fine for most customers, but crashes with a `TypeError` for customers who have no saved address.
4. A program calculates a delivery date that is one day too early in every case.

<details>
<summary>Show the solution</summary>

1. **Logic error.** The program runs and produces a result without any error message; the result is simply wrong. Something in the instructions is incorrect — perhaps one item is skipped. Only testing against known correct answers reveals this.
2. **Syntax error.** A missing bracket breaks the grammar, so parsing fails and *nothing* in the file runs — not even lines 1 to 39.
3. **Runtime error.** The grammar is fine, and the program works for most data. It only fails when it meets particular data (a customer with no address) while running. This is why runtime errors can hide for a long time.
4. **Logic error.** Consistent wrong results with no error message point to mistaken instructions, such as counting from the wrong starting day.

**Common wrong approach:** calling every problem "a bug" without asking which kind. The kind tells you where to look: syntax errors are fixed by reading the line the parser complains about; runtime errors by checking what data was present at the time; logic errors by tracing the program's reasoning and comparing it with the correct answer.

</details>

### Exercise 2 — Predict, then run

**Objective:** practise predicting before running, using the browser console.

**What to do:** for each line, write down what you think will appear. Then type it into the console and compare.

```js
console.log(7 + 8);
console.log("7" + "8");
console.log("7" + 8);
console.log(7 * 8);
console.log("Hello" + " " + "there");
```

**Hint:** when text and a number are joined with `+`, JavaScript treats the result as text.

<details>
<summary>Show the solution</summary>

**Output:**

```text
15
78
78
56
Hello there
```

Walkthrough:

- `7 + 8` — two numbers, so `+` adds them: **15**.
- `"7" + "8"` — two strings, so `+` joins them: **78**. This is the text "78", not the number seventy-eight.
- `"7" + 8` — one string and one number. When either side of `+` is text, JavaScript turns the other side into text too and joins them: **78**. This rule causes many real bugs, for example when a number typed into a web form arrives as text.
- `7 * 8` — multiplication: **56**.
- `"Hello" + " " + "there"` — three strings joined in order. The middle one is a single space, which is why the result has a space in it: **Hello there**.

If your predictions were wrong for lines 2 or 3, that is the exercise working. You have found the exact rule to remember: `+` adds numbers but joins text, and one piece of text turns the whole thing into joining.

</details>

### Exercise 3 — Which runtime?

**Objective:** practise deciding whether code belongs in the browser or in Node.js.

**What to do:** for each task, say whether it should run in the browser, in Node.js, or could work in either — and why.

1. Changing the colour of a button when the user clicks it.
2. Reading a file of orders saved on a server's disk.
3. Adding up a list of prices.
4. Running a web server that answers requests from many users.

<details>
<summary>Show the solution</summary>

1. **Browser.** It needs the web page and the user's clicks, which only the browser runtime provides.
2. **Node.js.** It needs access to files on the disk, which Node.js provides and browsers deliberately do not.
3. **Either.** Adding numbers uses only the core language, which the engine provides in every runtime.
4. **Node.js.** Running a server requires network abilities that Node.js provides; a web page cannot act as a server for other users.

**Common wrong approach:** thinking "it's JavaScript, so it runs anywhere". The *language* runs anywhere; the *abilities* depend on the runtime.

</details>

### Exercise 4 — Fix the broken lines (debugging)

**Objective:** practise reading error messages and fixing code.

**What to do:** each line below has one mistake. Type it into the console, read the error, fix it, and run it again until it prints the expected output.

```js
console.log("Good morning);       // expected: Good morning
console.Log("Good evening");       // expected: Good evening
console.log(5 + 5;                 // expected: 10
```

<details>
<summary>Show the solution</summary>

```js
console.log("Good morning");
console.log("Good evening");
console.log(5 + 5);
```

**Output:**

```text
Good morning
Good evening
10
```

Walkthrough of each fix:

1. The closing quote mark was missing. The text had a start but no end, causing a **syntax error**. Adding `"` before the bracket closes the text.
2. `Log` had a capital L. JavaScript is **case-sensitive**: `log` and `Log` are completely different names. `console` has no ability called `Log`, so this was a **runtime error** (`console.Log is not a function`). Changing it to lowercase `log` fixes it.
3. The closing round bracket was missing, so the call was never finished — a **syntax error**. Adding `)` before the semicolon fixes it.

**Common wrong approach:** retyping the whole line from memory instead of reading the error. Reading the error message first tells you exactly what kind of mistake to look for, and usually where.

</details>

## Summary

A CPU only understands **machine code** — numbered instructions specific to its instruction set. Programmers write in **high-level languages**, which are readable, portable and productive, and these must be translated.

There are three ways to translate. A **compiler** translates the whole program into an executable before it runs: fast to run, errors caught early, but with a build step and tied to one platform. An **interpreter** translates and runs code piece by piece: no waiting, but slower and with some errors found late. **Just-in-time compilation**, used by modern JavaScript, starts quickly and compiles frequently used code into fast machine code while running.

A **JavaScript engine** such as V8 tokenises, parses, compiles to bytecode, interprets and JIT-compiles your code. A **runtime** is an engine plus abilities that connect code to the world: the **browser** provides the web page and user events; **Node.js** provides files, networking and the operating system. The same language behaves the same in both, but the available abilities differ.

**Syntax errors** are found during parsing and stop everything before it runs. **Runtime errors** happen partway through, when something goes wrong with real data. **Logic errors** produce wrong results without any error message, and are caught by testing. The earlier a mistake is found, the cheaper it is to fix.

Languages and runtimes have **versions**; JavaScript's standard is **ECMAScript**. **Libraries** are code you call; **frameworks** call your code. You ran your first JavaScript in the browser console.

## Key terms

- **Programming language** — A formal language with exact rules for writing instructions that a computer can carry out after translation.
- **Source code** — The text of a program as written by a programmer, stored in ordinary text files.
- **Syntax** — The grammar rules of a programming language: which words, symbols and arrangements are allowed.
- **Semantics** — What correctly written code actually means and does when it runs.
- **Machine code** — The numbered instructions that a specific type of CPU can execute directly.
- **Instruction set** — The complete set of machine instructions a particular family of CPUs understands, such as x86-64 or ARM.
- **Assembly language** — A low-level language that uses short words for individual CPU instructions; translated into machine code by an assembler.
- **High-level language** — A programming language that expresses ideas such as values, decisions and repetition, rather than hardware details; for example JavaScript or Python.
- **Compiler** — A program that translates a whole program's source code into another form, usually machine code, before it runs.
- **Executable** — A file containing machine code that the computer can run directly; also called a binary.
- **Interpreter** — A program that reads source code and carries it out directly, piece by piece, while the program runs.
- **Just-in-time (JIT) compilation** — Compiling frequently used parts of a program into fast machine code while the program is running.
- **Deoptimisation** — When a JIT compiler discards fast machine code because an assumption it made turns out to be wrong, and falls back to a slower path.
- **JavaScript engine** — The program that executes JavaScript code, such as V8 (used in Chrome, Edge and Node.js).
- **Token** — One of the smallest meaningful pieces that source code is split into, such as a name, a number or a symbol.
- **Parsing** — Checking that code follows the language's grammar and building a structured description of it.
- **Abstract syntax tree (AST)** — The tree-shaped structure a parser builds to represent what a piece of code means.
- **Bytecode** — A compact, simple set of instructions that an engine generates from source code and runs internally; not tied to a real CPU.
- **Runtime (runtime environment)** — An engine plus extra abilities, such as access to files or a web page, that let code interact with the outside world.
- **Node.js** — A runtime that runs JavaScript outside the browser, with access to files, networking and the operating system.
- **Syntax error** — An error caused by code that breaks the language's grammar; found before the program runs, so nothing runs.
- **Runtime error** — An error that occurs while a program is running, when something goes wrong with the actual data or situation.
- **Logic error** — A mistake that makes a program produce wrong results without any error message.
- **ECMAScript** — The official standard that defines the JavaScript language, with a new edition published each year.
- **LTS (Long-Term Support)** — A version of software that will receive fixes for a long period, recommended for real applications.
- **Standard library** — The ready-made tools that come built into a language or runtime.
- **Library** — Reusable code written by others that your program calls when it needs it.
- **Framework** — A larger structure that organises an application and calls your code at the right moments.
- **Inversion of control** — The reversal in which a framework calls your code, instead of your code calling a library.
- **Browser console** — A panel in the browser's developer tools where you can type and run JavaScript and see messages from web pages.
- **Developer tools (DevTools)** — A set of panels built into web browsers for inspecting, testing and debugging web pages.
- **Calling (a function)** — Telling a named piece of code to run now, written with round brackets after its name.
- **String** — A piece of text in a program, written between quote marks.
- **REPL (Read–Eval–Print Loop)** — An interactive tool that reads code you type, runs it, prints the result and waits for more.
- **Case-sensitive** — Treating uppercase and lowercase letters as different, so that `log` and `Log` are different names.
- **Transpiling** — Translating source code from one high-level language into another, such as TypeScript into JavaScript.
- **Build step** — An automated preparation of code before it runs or is deployed, such as checking, transpiling and combining files.

## What comes next

You now know how code becomes a running program, and you have run JavaScript in the browser console.

The console is handy for trying small ideas, but professional programmers spend much of their day in a different tool: a text-based window where they move around folders, run programs, install tools and control servers by typing commands. In the next chapter, **The Terminal: Talking to Your Computer in Text**, you will learn what the terminal is, why engineers prefer it for so many jobs, and the essential commands you will use for the rest of your career.
