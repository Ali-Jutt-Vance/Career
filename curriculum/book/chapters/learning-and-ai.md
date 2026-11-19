# How to Learn Programming — and How to Use AI Without Losing Your Skills

> [!GOALS]
> - Why AI coding assistants can make you a stronger engineer or quietly stop you from learning, depending on how you use them.
> - Roughly how these AI tools work, and why they can be confidently wrong.
> - The three specific skills that disappear when AI does your thinking, and how to build each one.
> - A practical method for getting unstuck on your own, including the twenty-minute rule.
> - Clear rules for using AI while you are learning a topic, and after you have learned it.
> - How to read documentation, how to ask a good question, and how to check any answer you receive.
> - How employers and interviewers think about AI-assisted engineers today.

## Why this matters

Today, you can describe a program in plain English to an AI assistant and receive working code in seconds. This is genuinely remarkable, and professional engineers use these tools every day.

It also creates a trap that did not exist for earlier generations of programmers, and it is the single biggest risk to your learning.

Here is how the trap works. Writing a piece of code yourself might take forty minutes, produce something that works, and teach you something. Asking an AI might take ninety seconds, produce something that works, and teach you nothing. **Both finish the task.** In the moment, the second path is always the sensible choice. So people take it — not once, but every day, several times a day.

Months or years later, they sit in an interview. Someone shares a screen and says, "Write a function that returns the second-largest number in a list." No AI is available. And their mind is completely blank.

This chapter exists so that this never happens to you. It is not an argument against AI — by the end of this book you will build products with AI models inside them ({{ch:llm-fundamentals}}). It is about *order*: build the skill first, then use the tool to multiply it. Done in that order, AI makes you far stronger. Done the other way round, it replaces the very skill you were trying to build.

## The simple idea

Using AI while learning to program is like using a calculator while learning arithmetic.

An engineer who already understands arithmetic uses a calculator to work faster on big problems. Nothing is lost; the calculator multiplies a skill they have.

A child who uses a calculator *instead of* learning arithmetic never develops a sense of numbers. They cannot tell when an answer is obviously wrong — when they typed 1,000 instead of 100 and got a result ten times too big — because they have no feeling for what the answer should be.

> [!ANALOGY]
> AI coding tools are like a car for a person learning to walk. Once you can walk, a car takes you much further, much faster. But if you are carried everywhere from the start, your legs never grow strong — and on the day the car is not available, you cannot move.
>
> **Where the analogy breaks:** a car takes you exactly where you steer it. AI tools sometimes take you somewhere confidently wrong, and only someone who can "walk" — who understands the code — will notice. That makes the underlying skill even more important with AI than without it.

## What AI coding tools actually are

To use a tool well, you need a rough picture of how it works. You will study this properly in {{ch:llm-fundamentals}}; here is the beginner's version.

The AI assistants that write code are built on **large language models** (LLMs). An LLM is a program trained on an enormous amount of text — books, websites and a great deal of public code. From all that text, it has learned patterns: which words and symbols tend to follow which others, in which situations.

When you ask it a question, it produces an answer **one small piece of text at a time**, each time choosing a likely next piece given everything before it. It is astonishingly good at this. For common tasks that appear many times in its training text, its answers are usually correct.

But three consequences follow, and every programmer must understand them:

1. **It produces what is *likely*, not what is *verified*.** It does not run the code to check it unless the tool is specifically set up to do so. A likely-looking answer can be wrong.
2. **It can be confidently wrong.** When it does not know something, it does not necessarily say so. It may invent a function that does not exist, a setting that was never real, or a library that was never written — in perfectly confident language. This is called **hallucination**.
3. **It knows nothing about your specific situation unless you tell it.** It does not know your project, your company's rules or what you actually meant — only what you typed.

Modern tools reduce these problems — some run code, search documentation or read your whole project. They are improving quickly. But the basic fact remains: **someone has to judge whether the output is right.** If that someone cannot read and write code fluently, nobody is judging.

> [!WARNING]
> A beginner cannot tell a correct AI answer from a subtly wrong one, because both look equally confident and equally tidy. This is the deepest reason to build your own skill first. The value of AI to an engineer is roughly *the speed of the tool multiplied by the engineer's ability to judge its output*. If your judgement is zero, the result is zero — or worse than zero, because you will ship bugs you cannot see.

## The three skills AI can take from you

"I can't code without AI" is a feeling, not a diagnosis. When people rely on AI while learning, three specific skills fail to develop. Each needs a different treatment, so it is worth naming them precisely.

### Skill 1 — Writing code from an empty file

This is the ability to start from nothing and produce code. Not to recognise correct code, not to modify existing code, but to face an empty file and generate something.

You met the reason this matters in {{ch:how-this-book-teaches}}: **recognition** and **production** are different stages of learning. Reading an AI's solution and thinking "yes, that makes sense" exercises recognition only. Production is a separate ability, and like any ability it only grows by being used. People who delegate it for long enough can read code fluently and still freeze in front of an empty file.

**How to build it:** volume of unaided writing. Not reading solutions, not watching videos — writing. That is why every chapter in this book has exercises, and why their solutions are hidden until you have tried.

### Skill 2 — Staying with a problem you cannot yet solve

This is the skill people most underestimate.

Being stuck is the **normal state** of engineering work. Experienced engineers spend a large part of every week not knowing the answer yet — reading error messages, forming guesses, testing them, being wrong, narrowing things down. Over thousands of hours, they built two things: a toolkit of strategies for getting unstuck, and a calm **tolerance** for the discomfort of not knowing.

If an answer is always one second away, that tolerance never forms. Then, when you are stuck, the feeling is not "this is normal; let me work through it", but "something is wrong with me". You reach for an escape at the first moment of discomfort, and you never develop the strategies.

**How to build it:** deliberate, limited struggle — the twenty-minute rule, described below.

### Skill 3 — Thinking out loud

Most technical interviews require you to solve a problem while explaining your reasoning to another person. Real work requires the same thing in design discussions and code reviews.

This is not natural. It is a performance skill, trained separately from coding itself. Someone who has always worked alone — or with an AI that never asks "why did you do that?" — may be able to solve a problem silently and still fail when they must talk while solving it, because speaking uses attention they needed for the problem.

**How to build it:** explain your code out loud while you write it, from the very beginning — even to an empty room. It feels strange for the first few sessions, and then it becomes normal. Part XV of this book, especially {{ch:talking-about-code}}, develops this further.

## How to get unstuck: a method

Since being stuck is normal, you need a reliable way through it. Here is a method you can use for every problem in this book and for the rest of your career.

```text
  STUCK
    |
    v
  1. Read the error message slowly, all of it.
    |
    v
  2. Say what you expected, and what actually happened.
    |
    v
  3. Make the problem smaller: find the smallest piece that fails.
    |
    v
  4. Check your assumptions with console.log: print the values.
    |
    v
  5. Explain the code, line by line, out loud.
    |
    v
  6. Look it up: this book's glossary and chapters, then official docs.
    |
    v
  7. After a genuine attempt (about twenty minutes), ask for help —
     the right way (see "Asking a good question").
```

Let us go through each step.

**Step 1 — Read the error message.** All of it, slowly. In {{ch:from-code-to-running-program}} and {{ch:setting-up-your-workshop}} you saw that error messages tell you the *kind* of problem, a description, and usually the *file and line*. Beginners often glance at the red text and start changing code randomly. Reading carefully solves a surprising share of problems on its own.

**Step 2 — State the expectation and the reality.** Say, or write, "I expected the total to be 900, but it printed 990." This sounds too simple to help, but forcing yourself to state the gap precisely often reveals the cause immediately. Many problems are not "the code is broken" but "the code does exactly what I wrote, and I wrote something different from what I meant" — the logic errors you met in {{ch:from-code-to-running-program}}.

**Step 3 — Make it smaller.** Remove everything that is not needed to show the problem. If a 50-line program prints the wrong total, can you reproduce it in 5 lines? Very often, the act of shrinking the problem reveals which part is responsible.

**Step 4 — Print the values.** Your guess about what a value *is* at some point may be wrong. Instead of guessing, look: add `console.log` lines to show the actual values as the program runs. ({{ch:errors-and-debugging}} teaches more powerful tools, but printing values remains one of the most useful debugging techniques for engineers at every level.)

**Step 5 — Explain it out loud.** Go through the code line by line and explain to someone — or something — what each line does. Programmers call this **rubber duck debugging**, after a well-known story of a programmer who explained code to a rubber duck on their desk. It works because explaining forces you to look at what each line *actually* says, rather than what you *think* it says. Halfway through a sentence, you notice the mistake.

**Step 6 — Look it up properly.** Check this book's glossary and the chapter that taught the idea. Then check the **official documentation** for the tool (how to read documentation is explained below). Searching for the exact error message is also reasonable.

**Step 7 — Ask for help.** After a genuine attempt — the twenty-minute rule — ask a person, a community or an AI, in the way described in "Asking a good question" below.

### The twenty-minute rule

When you are stuck, **stay with the problem for twenty minutes of genuine effort before looking for an answer.** Use steps 1 to 6 during that time. Keep a short note of what you tried.

Two things will happen:

- **Most of the time, you will solve it before the twenty minutes are up** — often in eight or ten. And because you solved it yourself, you will remember it.
- **When you do not solve it, you will have understood the problem deeply enough that the answer actually teaches you something.** You will recognise exactly which piece you were missing. An answer to a question you have struggled with sticks; an answer to a question you have barely read does not.

Twenty minutes is not a magic number. It is long enough for real struggle and short enough that you do not waste an afternoon. For very hard exercises later in the book, you might extend it. The point is that the struggle comes *first*.

> [!TIP]
> Keep a small "stuck log" — a few lines in your learning notebook each time you get seriously stuck: what the problem was, what you tried, what finally solved it. Over a few months, it shows you patterns. You may discover that you are always stuck on the same kind of thing (a gap to fix), or that you mostly get stuck late at night when you are tired (a schedule to fix, not a skill).

## Rules for using AI

Here are the rules this book recommends. They are based on a simple principle: **AI may help you understand; it may not do your learning for you.** The rules change as your skill in a topic grows.

### While you are learning a topic

For any topic you are currently learning — for example, while you work through the JavaScript chapters:

**Allowed:**

- This book, its glossary, and its exercises.
- Official documentation and language references.
- Error messages, read carefully.
- Your own earlier code and notes.
- Search engines used to find documentation and explanations — different from using them to find finished answers to your exercise.

**Not allowed:**

- Any AI tool writing code for you on that topic — not a function, not a few lines, not "just this once because I am tired".
- Editor autocomplete that suggests whole lines or blocks. Many editors now include AI completion. Turn it **off** while learning (in VS Code, AI completion features can be disabled in the settings or from the status bar). Simple completion of a single name you have already typed is fine.
- Copying a complete solution from a forum or article.
- Asking another person to write it for you.

**Allowed with a condition:**

- After a genuine attempt — at least twenty minutes, with a note of what you tried — you may ask an AI to **explain a concept**, in general terms, *without* giving it your code. "How does a loop know when to stop?" is allowed. "Here is my code, fix it" is not.

Why such strict rules? Because every one of the forbidden uses replaces exactly the skill you are trying to build — production from an empty file, and staying with a problem. The allowed uses support understanding without doing the work for you.

> [!NOTE]
> The first stretch of working this way is uncomfortable, especially if you have used AI heavily before. Everything feels slower. Your code will be less polished than what a tool would produce. That discomfort is not a sign that something is wrong; it is what building a skill feels like. For most people, the change comes after a few weeks of steady practice: something you would have handed to a tool, you now do without thinking. The blankness goes. Speed comes later.

### After you have learned a topic

How do you know you have learned a topic? Use the test from {{ch:how-this-book-teaches}}: **can you produce it from an empty file, with the book closed, and explain it?** Once the answer is yes, AI becomes a powerful assistant for that topic, under one permanent rule:

> **You must be able to explain, without help, every line of code you commit.**

That single rule keeps the useful uses comfortable and makes the harmful ones impossible. Here is what it allows — and what experienced engineers genuinely use AI for:

- **Review.** "Here is my login code. What security problems does it have?" You wrote it; the tool critiques it. This is like having a reviewer available at any hour, and it is one of the most valuable uses there is.
- **Explanation.** "Why does the database choose to scan the whole table here?" Learning at the exact moment of confusion — the best thing these tools do.
- **Repetitive code you could write yourself.** The tenth configuration file, the fifth form-validation rule. Once you can produce something from scratch, having it produced for you is leverage, not a substitute. **The order matters absolutely: skill first, automation second.**
- **Exploring options.** "What are three ways to structure this, and their trade-offs?" — followed by your own judgement about which fits.
- **Naming, wording and documentation.** Low risk, real time saved.
- **Tests and edge cases.** "What inputs might break this function?" — then you check each suggestion yourself.

And what it forbids, permanently:

- Generating code for a problem you do not yet understand.
- Accepting anything you could not defend line by line if a colleague or interviewer asked.
- Using AI to skip the twenty minutes of struggle on something new.

### If you break the rules

You will, at least once — probably late at night, when something has refused to work for an hour.

When it happens, do not hide it from yourself. Write it in your stuck log: what the task was, how long you had been stuck, what time it was, how tired you were. After a few such entries you will usually see that the pattern is about energy and time of day, not difficulty. That is useful: it tells you to do new, hard work when you are fresh, and to use tired hours for review instead. An honest record of a broken rule teaches you more than a perfect record that was quietly edited.

## Checking any answer — from AI, a website or a person

Whatever its source, every answer should pass through your own judgement before you use it. Here is a checklist that works for AI output, forum answers and blog posts alike:

1. **Do I understand every line?** If not, find out what each unfamiliar part does before using it.
2. **Does it actually run?** Run it. Do not assume.
3. **Does it do what I need — including the unusual cases?** Try empty input, very large input, wrong input.
4. **Do the functions and options it uses really exist?** Check them in the official documentation. Invented functions are a classic hallucination.
5. **Is it current?** Older answers may use outdated patterns or versions. Check the date.
6. **Is it safe?** Does it handle passwords, user input or money? Then check it with special care. Security mistakes in copied code are common.
7. **Could I explain it to an interviewer?** If not, you are not finished.

> [!TRY]
> Here is an answer that an AI assistant might plausibly give. Using what you learned in {{ch:from-code-to-running-program}}, find the mistake before reading on.
>
> *"In JavaScript, `console.log("5" + 3)` prints `8`, because the plus sign adds the two numbers together."*

<details>
<summary>What is wrong with it</summary>

It prints `53`, not `8`. Because `"5"` is in quote marks, it is a **string** (text), not a number. When one side of `+` is text, JavaScript **joins** instead of adding: `"5"` joined with `3` gives the text `"53"`.

The explanation sounds completely reasonable and is stated confidently. Only someone who knows the rule — or who runs the code — catches the mistake. That is exactly the point of this chapter. Notice also how you caught it: by applying something you had genuinely learned, not by asking another tool.

</details>

## How to read documentation

You may have found official documentation hard to learn from. That is normal: most documentation is written as **reference material** for people who already understand the basics, not as teaching. That is exactly why this book teaches every topic properly first.

But documentation is where every engineer finds precise, up-to-date facts, so learning to read it is essential. A few techniques make it much easier.

**Know the four kinds of documentation.** Good documentation is usually organised into four types, and knowing which one you are reading changes how you read it:

| Kind | What it is for | How to read it |
|---|---|---|
| **Tutorial** | Learning by building a small thing, step by step | Follow it in order, typing everything |
| **How-to guide** | Doing one specific task, such as "connect to a database" | Jump straight to the steps you need |
| **Reference** | Exact facts: every function, option and setting | Look up one item; do not read it start to finish |
| **Explanation** | Background: why something works the way it does | Read slowly, like a book chapter |

Much frustration comes from trying to *learn* from reference pages. Reference pages are dictionaries; you look things up in them once you know roughly what you want.

**Read a reference entry in a fixed order.** When you look up a function, look for: its **name**, a one-sentence **description** of what it does, its **parameters** (what you give it), its **return value** (what it gives back), **examples**, and **notes or warnings**. Read the example first if you are unsure — it often makes the description click.

**Check the version.** Documentation usually has a version selector. Make sure it matches the version you are using, as you learned in {{ch:from-code-to-running-program}}.

**Try it in the REPL.** When the documentation describes something, test it immediately in the Node.js REPL or the browser console ({{ch:setting-up-your-workshop}}). Seeing it work is how a description becomes understanding.

The main documentation you will use in this book is the **MDN Web Docs** (developer.mozilla.org), the standard reference for JavaScript, HTML, CSS and web browsers, and the official Node.js documentation (nodejs.org/docs). Each later chapter tells you which official documentation covers its topic, *after* teaching the topic properly.

## Asking a good question

Sometimes, after a genuine attempt, you need help from another person — a colleague, a mentor or an online community. How you ask makes an enormous difference to how quickly you get a useful answer.

A weak question:

> "My code doesn't work. Can someone help?"

Nobody can help with that. They do not know what the code is, what "doesn't work" means, or what you have tried.

A good question has five parts:

1. **What you are trying to do** — the goal, in one sentence.
2. **What you expected** to happen.
3. **What actually happened** — including the **exact error message**, copied in full.
4. **The smallest piece of code that shows the problem** — not your whole project.
5. **What you have already tried**, and what you learned from it.

> "I'm trying to add up the prices in a basket. I expected `15`, but it prints `555`. Here is a 4-line example that shows it: … I've printed each price with `console.log` and they look like `5`. I think they might be text rather than numbers, but I'm not sure how to check."

The second question is far more likely to get a fast, useful answer. Notice also that writing it — making the problem smaller, printing the values, stating expectation and reality — is steps 2 to 4 of the unsticking method. Very often, people solve their own problem while writing a good question. Experienced engineers know this well, and it is one of the reasons they write questions carefully.

The same structure works when you ask an AI to explain a concept after a genuine attempt: a precise question gets a precise answer.

## How employers see AI-assisted engineers

It is worth being honest about the job market, because it affects how you should learn.

**At work, AI-assisted coding is now normal.** Many companies give engineers AI tools and expect them to use them. Engineers who use them well — for review, explanation, repetitive code and exploration — are more productive.

**But companies are hiring for judgement, not typing.** When anyone can generate code, the valuable skills are the ones AI does not replace: understanding the problem, choosing a sensible design, spotting what is wrong in generated code, debugging production problems, making trade-offs, and taking responsibility for what ships. These are exactly the skills this book focuses on.

**Interviews still test fundamentals.** Hiring processes vary between companies, and some now allow AI tools in certain rounds or ask candidates to review AI-generated code. But most still include rounds where you must write code yourself, explain it out loud, and answer "why?" and "what if?" questions about it. An engineer who cannot produce or explain code without help struggles in those rounds — and the gap is very visible to an experienced interviewer within minutes.

**Your own story matters.** If you have previously relied on AI heavily and are now rebuilding your skills properly, that is not something to hide. "I used these tools as a substitute for thinking, I noticed the gap, I rebuilt my fundamentals, and now I use them as a reviewer and accelerator" is a strong, honest story. It shows self-awareness and discipline — qualities employers value highly.

## From beginner to enterprise: AI in engineering at every level

**Level 3 — Learning.** You write all the code for the topics you are learning. AI explains concepts after genuine attempts, never writes your exercises. Your judgement is being built.

**Level 4 — Building real projects.** For topics you have mastered, AI speeds up repetitive work and reviews your code. You still understand and can explain every line you commit. You check every suggestion against documentation and tests.

**Level 5 — Professional teams.** Teams agree on how AI tools may be used: which tools are approved, what code and data may be shared with them, and how generated code is reviewed. All code — human-written or generated — goes through the same review and automated tests. Engineers remain responsible for everything they submit.

**Level 6 — Enterprise.** Large companies treat AI tools as part of their engineering platform, with security and legal rules attached: preventing confidential code, customer data or passwords from being sent to outside services; checking that generated code does not introduce security weaknesses or licence problems; and measuring whether the tools actually improve quality and speed. Some build their own AI-powered internal tools — the kind of systems Part XIII teaches you to build.

## Real-world use cases

### Beginner level — The student who could not start

**Situation:** a student finishes a course in which they used AI for every exercise. Their certificate says they know JavaScript. Asked to write a short program from an empty file, they cannot begin.

**Cause:** they built recognition, never production. Every exercise was completed; none was learned.

**Solution:** return to the basics and write every exercise by hand, using the unsticking method and the twenty-minute rule. Progress feels slow at first and then accelerates, because much of the *understanding* is already there; what is missing is practice in producing code.

### Intermediate level — The confident bug

**Business problem:** a junior developer at an online shop uses an AI assistant to write code that applies discount codes. It looks clean and passes a quick manual test.

**Technical problem:** the generated code applies a percentage discount *after* adding delivery charges instead of before, so customers receive larger discounts than the business intended. Nobody notices for weeks.

**What would have caught it:** a developer who understood every line and checked it against the business rule; or tests written from the rules themselves ({{ch:testing}}). The developer accepted code they could not fully explain, and nobody was really judging it.

**Lesson:** generated code is only as correct as the judgement applied to it.

### Advanced level — AI as a reviewer

**Situation:** an experienced backend engineer writes an authentication feature themselves, then asks an AI tool to review it for security problems.

**Result:** the tool points out that error messages reveal whether an email address is registered, which helps attackers. The engineer agrees, checks the recommendation against security guidance, and fixes it.

**Why this works:** the engineer wrote and understood the code, so they could evaluate each suggestion — accepting the good one, rejecting others that did not apply. The tool added a second pair of eyes; it did not replace the first.

### Enterprise level — Protecting data when using AI tools

**Business problem (illustrative):** a bank wants its engineers to benefit from AI coding tools, but its code and customer data are confidential and regulated.

**Solution:** the bank approves specific tools under contracts that prevent its data from being stored or used for training, blocks unapproved tools, forbids pasting customer data or secrets into any tool, and requires that all code — however it was produced — passes normal review, security scanning and tests.

**Trade-offs:** engineers have fewer choices of tool, and the approval process takes time. In exchange, the bank gains productivity without risking leaks of confidential information.

## Common mistakes

### Beginner mistake — Using AI to finish exercises

**What it looks like:** pasting each exercise into an AI tool, reading the answer, and moving on.

**Why it happens:** it is fast, and the answer is usually right.

**What happens:** you reach the end of the book able to recognise code and unable to write it. The gap stays hidden until an interview or a real job exposes it.

**How to fix and prevent it:** follow the learning-phase rules. Turn off AI autocomplete while learning. Attempt every exercise before opening its solution.

### Beginner mistake — Treating being stuck as failure

**What it looks like:** giving up, or reaching for an answer, within a minute or two of getting stuck.

**Why it happens:** discomfort feels like a sign that you are not good enough.

**What happens:** the strategies and the calm tolerance that experienced engineers rely on never develop.

**How to fix it:** remember that being stuck is the normal state of engineering. Use the unsticking method and the twenty-minute rule.

### Intermediate mistake — Trusting confident output

**What it looks like:** using a function, option or library that an AI suggested, without checking that it exists or works as described.

**What happens:** errors such as "is not a function", or worse, code that runs but does the wrong thing.

**How to fix and prevent it:** check unfamiliar functions and options in the official documentation; run and test everything.

### Production mistake — Committing code you cannot explain

**What it looks like:** a pull request full of generated code that the author cannot explain when a reviewer asks questions.

**What happens:** bugs and security holes reach production; when something breaks, nobody understands the code well enough to fix it quickly.

**How to prevent it:** the permanent rule — you must be able to explain every line you commit.

### Enterprise mistake — Leaking secrets or customer data into AI tools

**What it looks like:** pasting a configuration file containing passwords, or a sample of real customer records, into an AI tool to "help debug".

**What happens:** confidential data leaves the company's control. Depending on the tool and its terms, it may be stored by an outside company. In regulated industries this can break the law.

**How to prevent it:** never paste secrets, credentials or real personal data into any external tool; use made-up sample data; follow your company's rules about approved tools.

## How a senior engineer thinks about AI and learning

> [!SENIOR]
> Experienced engineers use AI tools heavily — and sceptically. Their habits are worth copying:
>
> - **They stay the author.** The tool proposes; they decide. They read every line as if a junior colleague had written it, because they are responsible for it.
> - **They use it most where they know most.** Paradoxically, AI is most useful to people who could have written the code themselves, because they can instantly spot what is wrong.
> - **They verify facts at the source.** Documentation, tests and measurement beat confident text.
> - **They keep learning the fundamentals.** New tools appear every year; the ideas underneath — data, networks, failure, trade-offs — change slowly. Fundamentals are what let them evaluate each new tool quickly.
> - **They protect what is not theirs to share.** Customer data, credentials and confidential code never go into tools that are not approved for them.

## Exercises

### Exercise 1 — Write your own AI-use agreement

**Objective:** turn this chapter's rules into a commitment in your own words.

**What to do:** in your learning notebook, write a short agreement with yourself covering:

1. What you will not use AI for while learning a topic.
2. When you may ask AI for an explanation, and how.
3. The permanent rule for code you commit.
4. What you will do if you break the rules.

<details>
<summary>Show the solution</summary>

There is no single correct wording, but a good agreement looks something like this:

```text
My agreement on AI

1. While I am learning a topic, no AI writes code for me on that topic,
   and AI autocomplete is switched off in my editor.
2. After 20 minutes of genuine effort, with notes on what I tried, I may
   ask an AI to explain a concept in general terms — never "fix my code".
3. I never commit code I cannot explain line by line without help.
4. If I break these rules, I write it in my stuck log — what, when, how
   tired I was — and look for the pattern.
```

What makes it good:

- It is **specific**: "AI autocomplete is switched off", not "I'll try not to use AI too much".
- It includes the **conditions** under which help is allowed, so you do not have to negotiate with yourself when tired.
- It has a plan for **failure**, which makes it realistic.

**Common wrong approach:** writing a vague promise such as "I will use AI responsibly". A rule that depends on how you feel in the moment is not really a rule.

</details>

### Exercise 2 — Practise the unsticking method

**Objective:** use the method on a real problem, using only what you know so far.

**The problem:** a beginner writes this program, expecting it to print `Total: 30`:

```js
console.log("Total: " + 10 + 20);
```

It prints `Total: 1020` instead.

**What to do:** without running anything yet, apply steps 2 to 5 of the method. Write down what was expected, what happened, a smaller example that shows the same behaviour, and your explanation. Then fix it, and run both versions in the Node.js REPL to confirm.

**Hint:** think about the order in which JavaScript works through the `+` signs, and what you learned about joining text in {{ch:from-code-to-running-program}}.

<details>
<summary>Show the solution</summary>

**Step 2 — expected versus actual:** expected `Total: 30`; got `Total: 1020`.

**Step 3 — smaller example:** `"a" + 1 + 2` gives `"a12"`, while `1 + 2` alone gives `3`. So the problem appears only when text comes first.

**Step 4 — the values:** `"Total: "` is a string; `10` and `20` are numbers.

**Step 5 — explanation, line by line:** JavaScript works through `+` from left to right. First, `"Total: " + 10` — one side is text, so it joins them: `"Total: 10"`. Then `"Total: 10" + 20` — again one side is text, so it joins: `"Total: 1020"`. The numbers were never added to each other.

**Fix:** make the addition happen first, using brackets:

```js
console.log("Total: " + (10 + 20));
```

**Output:**

```text
Total: 30
```

The brackets mean "work this out first", so `10 + 20` becomes `30` before it is joined to the text. Another option is to pass separate values to `console.log`: `console.log("Total:", 10 + 20)`.

**Common wrong approach:** changing things randomly — adding spaces, swapping the order of the numbers — until something works, without understanding why. Even if that eventually prints the right answer, nothing has been learned.

</details>

### Exercise 3 — Turn a weak question into a strong one

**Objective:** practise asking a question that gets a useful answer.

**The weak question:**

> "node not working pls help"

**The situation behind it:** the person installed Node.js, opened VS Code's terminal, typed `node app.js`, and saw `node : The term 'node' is not recognized as the name of a cmdlet, function, script file, or operable program.` They have checked that the installer finished. They have not tried anything else.

**What to do:** rewrite the question using the five parts of a good question. Then, using {{ch:the-terminal}} and {{ch:setting-up-your-workshop}}, decide whether they should have needed to ask at all.

<details>
<summary>Show the solution</summary>

A strong version:

> **Goal:** run a JavaScript file with Node.js on Windows.
> **Expected:** `node app.js` runs my program.
> **Actual:** PowerShell says: `node : The term 'node' is not recognized as the name of a cmdlet, function, script file, or operable program.`
> **Smallest example:** the same error appears for `node --version`, so it isn't my code.
> **Tried:** the Node.js installer said it finished successfully. I'm using the terminal inside VS Code, which was already open while I installed.

Writing it out reveals the answer. The error comes from the **shell**, not from Node.js, and means the shell could not find `node` in the **PATH**. The VS Code terminal was open *before* the installation, so it has the old PATH. Closing VS Code completely and reopening it fixes it — exactly the fix taught in {{ch:the-terminal}}.

So the honest conclusion: by working through the parts of a good question, they could have solved it themselves. That happens often, and it is why experienced engineers write their questions carefully.

**Common wrong approach:** posting the weak question and waiting. It wastes everyone's time — most of all the asker's.

</details>

## Summary

AI coding tools are built on **large language models**, which produce likely-looking text rather than verified answers. They can **hallucinate** — confidently invent things — and they know nothing about your situation beyond what you tell them. Their value to an engineer depends on that engineer's ability to judge the output.

Relying on AI while learning prevents three skills from developing: **writing code from an empty file**, **staying with a problem you cannot yet solve**, and **thinking out loud**. Each is built by deliberate practice.

When stuck, use the method: read the error, state expectation versus reality, make the problem smaller, print values, explain it out loud (**rubber duck debugging**), look it up, and only then ask for help — after about **twenty minutes** of genuine effort.

While learning a topic, AI may explain concepts after a genuine attempt, but must not write your code, and AI autocomplete should be off. After you have learned a topic, AI becomes a powerful reviewer and accelerator, under one permanent rule: **you must be able to explain every line you commit.** Check every answer — from any source — for understanding, correctness, real existence, currency and safety. Learn to read documentation by knowing its four kinds, and ask questions with a goal, expectation, actual result, minimal example and what you tried. Employers value engineers who use AI well, but hire for judgement — and interviews still test fundamentals.

## Key terms

- **Large language model (LLM)** — A program trained on huge amounts of text that generates answers by repeatedly predicting a likely next piece of text.
- **AI coding assistant** — A tool, usually built on a large language model, that suggests, writes or explains code.
- **Hallucination** — When an AI model confidently states something false, such as a function or library that does not exist.
- **AI autocomplete** — An editor feature that uses AI to suggest whole lines or blocks of code as you type.
- **Twenty-minute rule** — The practice of making about twenty minutes of genuine effort on a problem before looking for an answer.
- **Rubber duck debugging** — Finding a bug by explaining your code, line by line, out loud — even to an object.
- **Stuck log** — A short personal record of problems you got stuck on, what you tried and what solved them.
- **Minimal reproduction** — The smallest piece of code that still shows a problem, used for debugging and for asking questions.
- **Official documentation** — The documentation published by the makers of a language or tool; the most reliable source of precise facts about it.
- **Reference documentation** — Documentation that lists exact details of every function, option and setting, meant to be looked up rather than read in order.
- **MDN Web Docs** — The standard reference documentation for JavaScript, HTML, CSS and web browser features.

## What comes next

Part I is complete. You know what a computer is and how it stores information, how code becomes a running program, how to work in the terminal, how the internet and the web carry data, how to set up a professional workshop, and how to learn — and use AI — in a way that builds real skill.

Now the programming begins. In Part II, you will learn JavaScript properly, one idea at a time. The first chapter, **Your First Program: Values, Variables and Output**, starts with the most basic building blocks of every program: the values it works with, and the names it gives them so it can remember and change them.
