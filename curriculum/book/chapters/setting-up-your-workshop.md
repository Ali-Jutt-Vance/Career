# Setting Up Your Workshop

> [!GOALS]
> - Which tools a professional JavaScript developer uses every day, and what each one is for.
> - How to install Node.js, Visual Studio Code and Git correctly, and how to check that each one works.
> - How to choose the right Node.js version, and why "LTS" matters.
> - How to organise your projects on disk so that tools do not break.
> - How to use Visual Studio Code: the file explorer, the editor, the built-in terminal and a few essential extensions.
> - How to write a program in a file and run it with Node.js — your first real program.
> - How to use the Node.js REPL and watch mode to work faster.
> - How to fix the installation problems almost everyone meets at least once.

## Why this matters

A carpenter with blunt tools and a cluttered bench works slowly, makes more mistakes, and blames themselves for problems that are really caused by the tools. Programming is the same.

Many beginners lose hours — sometimes days — to problems that have nothing to do with programming: a tool that is "not recognized", a project that breaks because its folder name has a space in it, an editor that does not show errors, two different versions of Node.js fighting each other. These problems are frustrating precisely because the book or tutorial never mentioned them.

This chapter sets up your workshop properly, once, the way professional developers set up theirs. You will install three tools, learn what each one does, check that each works, and write and run your first program from a file. Every later chapter assumes the setup from this one.

## The simple idea

To write software you need three things:

1. **A place to write code** — a code editor. We will use **Visual Studio Code**.
2. **Something to run the code** — a runtime. We will use **Node.js**, which runs JavaScript on your computer (you met runtimes in {{ch:from-code-to-running-program}}).
3. **A way to save the history of your work** — a version control system. We will use **Git**.

Plus one tool you already know from {{ch:the-terminal}}: the **terminal**, which ties them together.

```text
   +-------------------+     write code      +------------------+
   |  VS Code (editor) | ------------------> |  hello.js (file) |
   +-------------------+                     +--------+---------+
            |                                         |
            | built-in terminal                       | node hello.js
            v                                         v
   +-------------------+                     +------------------+
   |  Terminal (shell) | ------------------> |  Node.js runs it |
   +-------------------+                     +------------------+
            |
            | git commit
            v
   +-------------------+
   |  Git (history)    |
   +-------------------+
```

Read the diagram from the top left. You write code in the editor, which saves it as a file. You run that file with Node.js from the terminal. And you record your progress with Git. Visual Studio Code contains its own terminal, so in practice all of this happens in one window.

> [!ANALOGY]
> Think of a kitchen. The editor is the chopping board and knives — where you prepare things. Node.js is the stove — where things actually get cooked. Git is a notebook where you record each version of a recipe that worked, so you can always go back.
>
> **Where the analogy breaks:** in a kitchen, a mistake wastes food. In programming, Git lets you undo almost anything, as long as you recorded it. That makes it safe to experiment boldly — which is exactly how you should learn.

## The proper definition and key words

- **Code editor** — a text editor built for writing code. It colours the different parts of your code (**syntax highlighting**), suggests completions as you type, points out mistakes, and can run tools for you. It is different from a word processor like Microsoft Word, which adds hidden formatting that would break code.
- **IDE** (Integrated Development Environment) — a larger, all-in-one programming tool that includes an editor, a debugger, build tools and more. Visual Studio Code sits between a simple editor and a full IDE: it starts light and becomes more capable as you add **extensions**.
- **Extension** — an add-on that gives the editor a new ability, such as support for a language or a code-formatting tool.
- **Runtime** — the program that runs your code and gives it access to the outside world (from {{ch:from-code-to-running-program}}). Node.js is our runtime.
- **Version control** — a system that records changes to files over time, so you can see what changed, when and why, and return to earlier versions. Git is the most widely used version control system in the world.
- **Installer** — a program that copies a tool onto your computer and configures it, for example by adding it to your PATH (from {{ch:the-terminal}}).

## Before you install: organise your disk

A few decisions made now prevent a surprising number of problems later.

### Create one folder for all your code

Make a single folder that will hold every project you write. A common choice is a folder called `code` (or `dev`, or `projects`) directly inside your home directory:

```text
Windows:          C:\Users\YourName\code
macOS / Linux:    /Users/yourname/code   or   /home/yourname/code
```

You can create it from the terminal:

```text
> cd ~
> mkdir code
```

Each project then gets its own folder inside it:

```text
code
├── learning-javascript
├── shop-api
└── portfolio
```

### Folder names: lowercase, no spaces

Name project folders and files in lowercase, with **dashes instead of spaces**: `shop-api`, not `Shop API`.

You saw why in {{ch:the-terminal}}: the shell uses spaces to separate parts of a command, so names with spaces need quote marks everywhere. Many developer tools are written mainly for Linux and macOS, and some still handle spaces badly, producing confusing errors. Linux servers also treat `Shop-API` and `shop-api` as different names, so mixing capitals causes problems when your code moves to a server.

> [!WARNING]
> **If your Windows user name contains a space** — for example `C:\Users\DUNYA TRADER` — your home folder path contains a space, and you cannot easily change it. Most modern tools handle this correctly, but if a tool ever fails with an error that shows your path cut off at the space (for example `C:\Users\DUNYA`), that is the cause. The simplest workaround is to keep your code in a folder whose path has no spaces, such as `C:\code`. Create it with `mkdir C:\code` and use it instead of `~\code`. Professional developers on Windows often do exactly this.

### Avoid synced and protected folders

Do not keep code inside folders that are automatically synced to the cloud (such as OneDrive's Documents or Desktop folders, Dropbox or Google Drive) or inside `Downloads`.

Projects create thousands of small files, especially when you install libraries (you will see this in {{ch:modules-and-npm}}). Sync tools try to upload all of them, slow your computer down, and sometimes lock files at the exact moment a tool needs to change them, causing strange, intermittent errors. Your code will be safely backed up by Git and GitHub instead ({{ch:git}}, {{ch:github}}).

## Installing Node.js

### Which version?

Node.js releases a new major version regularly, numbered 20, 22, 24 and so on. As you learned in {{ch:from-code-to-running-program}}, even-numbered versions become **LTS** (Long-Term Support) releases: they receive fixes and security updates for a long period, and are what companies run in production.

On the Node.js download page you will see two choices:

- **LTS** — recommended for most users. **Choose this one.**
- **Current** — the newest features, but less tested, and with a shorter support life.

Throughout this book, use the **LTS** version available when you install. Everything taught here works on any recent LTS version.

### Installing on Windows

1. Go to the official website, **nodejs.org**, and download the **LTS** installer for Windows (a `.msi` file).
2. Run the installer and accept the defaults. Make sure the option **"Add to PATH"** is selected (it is by default). This is what lets your terminal find the `node` command, as you learned in {{ch:the-terminal}}.
3. If the installer offers to install "Tools for Native Modules" (extra build tools), you can leave it unticked for now; you will not need it for this book's early chapters.
4. When it finishes, **close every terminal window** and open a new one, so that the terminal picks up the updated PATH.

### Installing on macOS

Download the **LTS** installer (a `.pkg` file) from nodejs.org and run it. Alternatively, if you use the **Homebrew** package manager, run `brew install node@24` (replacing 24 with the current LTS number) or `brew install node`.

### Installing on Linux

Linux distributions often include old versions of Node.js in their default package lists. Follow the instructions on nodejs.org for your distribution, or use a version manager (below), to get a current LTS version.

### A note on version managers

Professional developers often install Node.js through a **version manager** — a small tool that can install several Node.js versions side by side and switch between them, because different projects may need different versions. Popular choices are **nvm** (macOS and Linux), **nvm-windows**, and **fnm** (all systems).

You do not need one to start. The plain installer is simpler and is all this book requires. When you begin working on several real projects, a version manager becomes very useful, and {{ch:modules-and-npm}} shows how projects record the version they need.

> [!WARNING]
> **Do not mix installation methods.** Installing Node.js once from the official installer and again through a version manager or another package manager gives you two copies, and the terminal may run a different one from the one you expect. If you later switch to a version manager, uninstall the old copy first.

### Checking the installation

Open a **new** terminal and run:

```text
> node --version
v24.11.1
> npm --version
11.6.2
```

Your numbers will differ; what matters is that both commands print a version instead of an error.

- `node --version` asks Node.js which version it is. The `v24...` shows the major version is 24.
- `npm --version` checks **npm** (Node Package Manager), which is installed together with Node.js. npm installs libraries written by other people. You will use it from {{ch:modules-and-npm}} onwards.

If either says "not recognized" or "command not found", jump to the troubleshooting section at the end of this chapter.

## Installing Visual Studio Code

**Visual Studio Code** (usually called **VS Code**) is a free code editor made by Microsoft. It is by far the most widely used editor among web developers, it runs on Windows, macOS and Linux, and its large collection of extensions supports almost every language and tool.

> [!NOTE]
> **Visual Studio** (without "Code") is a different, much larger product, mainly used for C# and C++ on Windows. Make sure you install **Visual Studio Code**. Several editors are built on VS Code and work almost identically, such as **Cursor**. If you already use one of these, everything in this chapter applies to it too.

### Installing

1. Download VS Code from the official site, **code.visualstudio.com**.
2. On Windows, run the installer. On the "Select Additional Tasks" page, tick:
   - **Add "Open with Code" action to Windows Explorer file context menu**
   - **Add "Open with Code" action to Windows Explorer directory context menu**
   - **Add to PATH** (usually ticked already)

   The first two let you right-click any folder and open it in VS Code. The last one lets you open VS Code from the terminal with the `code` command.
3. On macOS, open the downloaded file and drag **Visual Studio Code** into your Applications folder. Then open VS Code, press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, type **shell command**, and choose **Install 'code' command in PATH**.

Check it from a **new** terminal:

```text
> code --version
1.106.2
...
```

### A tour of the VS Code window

Open your code folder in VS Code. From the terminal:

```text
> cd ~/code
> code .
```

`code .` means "open VS Code in the current folder". Remember from {{ch:the-terminal}} that `.` means the current directory.

The window has five main areas:

```text
  +----+---------------------+----------------------------------------+
  |    |  EXPLORER           |  hello.js  x                           |
  | A  |  > learning-js      |  1  console.log("Hello from a file");  |
  | c  |      hello.js       |  2                                     |
  | t  |                     |              EDITOR                    |
  | i  |    SIDE BAR         |                                        |
  | v  |                     +----------------------------------------+
  | i  |                     |  TERMINAL                              |
  | t  |                     |  PS C:\code\learning-js> node hello.js |
  | y  |                     |  Hello from a file                     |
  +----+---------------------+----------------------------------------+
  |  STATUS BAR:  main   Ln 1, Col 1   UTF-8   JavaScript             |
  +-------------------------------------------------------------------+
```

- **Activity bar** (far left) — icons that switch the side bar between the file **Explorer**, **Search**, **Source Control** (Git), **Run and Debug** and **Extensions**.
- **Side bar** — shows whatever the activity bar has selected; usually the Explorer, a tree of your project's files and folders.
- **Editor** — where you write code. You can have several files open in tabs, side by side.
- **Panel** (bottom) — most importantly, the built-in **terminal**. Open it with <kbd>Ctrl</kbd> + <kbd>`</kbd> (the backtick key, usually below <kbd>Esc</kbd>), or from the **Terminal → New Terminal** menu. It starts in your project's folder automatically.
- **Status bar** (very bottom) — information about the current file: cursor position, character encoding (you should see **UTF-8**, from {{ch:what-a-computer-is}}), and the language.

### The command palette

The single most useful shortcut in VS Code is the **command palette**: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> (<kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> on macOS). It opens a search box listing every command the editor has. Instead of hunting through menus, type a few letters of what you want — "format", "terminal", "theme" — and choose it.

A few other shortcuts worth learning now:

| Action | Windows / Linux | macOS |
|---|---|---|
| Command palette | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> |
| Open a file by name | <kbd>Ctrl</kbd> + <kbd>P</kbd> | <kbd>Cmd</kbd> + <kbd>P</kbd> |
| Show / hide terminal | <kbd>Ctrl</kbd> + <kbd>`</kbd> | <kbd>Ctrl</kbd> + <kbd>`</kbd> |
| Save | <kbd>Ctrl</kbd> + <kbd>S</kbd> | <kbd>Cmd</kbd> + <kbd>S</kbd> |
| Comment / uncomment line | <kbd>Ctrl</kbd> + <kbd>/</kbd> | <kbd>Cmd</kbd> + <kbd>/</kbd> |
| Search across all files | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> |

### Settings worth changing

Open the settings with <kbd>Ctrl</kbd> + <kbd>,</kbd> (<kbd>Cmd</kbd> + <kbd>,</kbd> on macOS) and search for each of these:

- **Auto Save** → set to `afterDelay`. Files save themselves a moment after you stop typing. Forgetting to save, and then running the *old* version of a file, is one of the most common beginner frustrations: "I fixed it but nothing changed!"
- **Format On Save** → ticked. Once a formatter is installed (next section), your code will be tidied automatically every time it is saved.
- **Tab Size** → `2`. Two spaces per indentation level is the most common style in JavaScript projects.

### Essential extensions

Click the **Extensions** icon in the activity bar (it looks like four squares), search for each of these, and click **Install**:

1. **ESLint** — a **linter**: a tool that reads your code and warns you about likely mistakes and bad patterns *before* you run it — for example, a variable you created but never used, or a name you misspelt. It underlines problems in the editor as you type.
2. **Prettier – Code formatter** — a **formatter**: a tool that rewrites the *layout* of your code (spacing, line breaks, quote marks) into a consistent style, without changing what it does. After installing it, open the command palette, run **Format Document With…**, choose **Configure Default Formatter**, and pick **Prettier**.
3. **Error Lens** (optional but very helpful for learners) — shows error and warning messages directly on the line where they occur, instead of only as a small underline.

That is all you need for now. Resist installing dozens of extensions: each one uses memory and can slow the editor down, and many overlap with each other.

> [!TIP]
> **A linter and a formatter do different jobs.** A formatter cares only about *appearance*: it would happily tidy perfectly formatted code that is completely wrong. A linter cares about *likely bugs*: it warns you about code that will probably misbehave, however tidy it looks. Professional teams use both, and run them automatically so that nobody wastes time arguing about spaces in code reviews.

## Installing Git

**Git** records the history of your project. Every time you reach a working point, you save a snapshot called a **commit**, with a short message describing what changed. You can look back through every commit, see exactly what changed, and return to any earlier state. {{ch:git}} teaches Git thoroughly; here we just install it and give it your name.

### Installing

- **Windows:** download **Git for Windows** from **git-scm.com** and run the installer. The default options are fine for nearly every page. Two worth noticing:
  - **Default editor** — choose **Use Visual Studio Code as Git's default editor**, so that when Git needs you to write a message, it opens VS Code instead of a confusing terminal editor.
  - **Default branch name** — choose **Override** and enter `main`. This matches modern conventions and GitHub's default.

  Git for Windows also installs **Git Bash**, a Bash shell for Windows. As you learned in {{ch:the-terminal}}, Bash is the shell used on Linux servers, so Git Bash lets you practise the exact commands you will use on servers. You can choose it as your terminal in VS Code: click the small arrow next to the **+** in the terminal panel and select **Git Bash**.
- **macOS:** open a terminal and run `git --version`. If Git is not installed, macOS offers to install the "command line developer tools", which include it. Accept.
- **Linux:** install it with your package manager, for example `sudo apt install git` on Ubuntu.

Check it from a new terminal:

```text
> git --version
git version 2.51.0
```

### Telling Git who you are

Every commit records who made it. Set your name and email once:

```text
> git config --global user.name "Your Name"
> git config --global user.email "you@example.com"
```

Walkthrough:

- `git config` changes Git's settings.
- `--global` means "for every project on this computer", rather than just one project.
- `user.name` and `user.email` are the setting names; the text in quote marks is the value.

Use the same email address you will use for your GitHub account ({{ch:github}}), so that your commits are linked to your profile. If you would rather not make your personal email public, GitHub provides a private "noreply" address you can use instead.

Check the settings:

```text
> git config --global --list
user.name=Your Name
user.email=you@example.com
...
```

## Your first program from a file

Everything is installed. Now the moment that matters: writing a program in a file and running it.

### Step 1 — Create a project folder

In a terminal:

```text
> cd ~/code
> mkdir learning-javascript
> cd learning-javascript
> code .
```

VS Code opens with an empty project.

### Step 2 — Create a file

In the Explorer, hover over the project name and click the **New File** icon (a page with a plus sign). Name it `hello.js`.

The `.js` extension tells VS Code (and other tools) that the file contains JavaScript, so the editor turns on JavaScript colouring and checking. Remember from {{ch:what-a-computer-is}} that the extension is only a label — but tools rely on it, so always name JavaScript files with `.js`.

### Step 3 — Write the code

Type this into `hello.js` (type it, do not paste — as you learned in {{ch:how-this-book-teaches}}):

```js
// My first program in a file
console.log("Hello from a file!");
console.log("2 + 3 =", 2 + 3);
console.log("Today I set up my workshop.");
```

Walkthrough:

- **Line 1** begins with `//`, which makes it a **comment**: a note for humans. Node.js ignores everything from `//` to the end of the line. Comments are useful for explaining *why* code exists.
- **Line 2** writes the text `Hello from a file!`, just as you did in the browser console in {{ch:from-code-to-running-program}}. Here `console` is provided by Node.js, so the output appears in the terminal instead of a browser panel.
- **Line 3** shows something new: you can give `console.log` **several values**, separated by commas. It prints them all on one line with a space between each. The first value is the text `"2 + 3 ="`; the second is the calculation `2 + 3`, which JavaScript works out to be `5` before printing.
- **Line 4** writes another line of text.

Save the file (it saves automatically if you turned on Auto Save).

### Step 4 — Run it

Open VS Code's terminal with <kbd>Ctrl</kbd> + <kbd>`</kbd>. It is already in your project folder. Run:

```text
> node hello.js
```

**Output:**

```text
Hello from a file!
2 + 3 = 5
Today I set up my workshop.
```

Here is exactly what happened, using what you learned in Part I:

1. The shell looked up `node` in the **PATH** and found the Node.js program.
2. It started Node.js as a new **process**, passing it the **argument** `hello.js`.
3. Node.js read the file `hello.js` from **storage** into **memory**.
4. Its **V8 engine** tokenised and parsed the code, compiled it to bytecode and ran it.
5. Each `console.log` asked Node.js to write text to the terminal — the program's **output**.
6. When the last line finished, there was nothing left to do, so Node.js **exited** with exit code 0 (success), and the shell showed its prompt again.

Notice there is no extra `undefined` line this time. That appeared in the browser console because a console shows the result of everything you type. When you run a file, only what you explicitly log is shown.

Congratulations: you have written and run a real program.

> [!TRY]
> Break the program on purpose, one change at a time, run it after each change, and read the error:
>
> 1. Delete the closing `)` on line 2.
> 2. Change `console` to `Console` on line 4.
> 3. Rename the file to `hello.txt` and run `node hello.js` again.
>
> Before running each one, predict: will it be a syntax error, a runtime error, or something else? Then put everything back as it was.

<details>
<summary>What happened, and why</summary>

1. **Missing bracket** — a `SyntaxError`. Node.js shows the file name, the line number and a small arrow pointing at where it got confused. Because it is a syntax error, *nothing* runs — not even line 1's comment or anything else. (As you learned in {{ch:from-code-to-running-program}}, the whole file must parse before any of it runs.)
2. **`Console` with a capital C** — a runtime error: `ReferenceError: Console is not defined`. Lines 2 and 3 print normally first, and then the program stops at line 4. JavaScript is case-sensitive, and there is no `Console`.
3. **Wrong file name** — an error like `Error: Cannot find module 'C:\code\learning-javascript\hello.js'`. Node.js looked for the file you named and it was not there. This is not a JavaScript error at all; it is the same "file not found" problem you met in {{ch:the-terminal}}. Check the name and the folder with `ls`.

Learning to recognise these three kinds of message — grammar, runtime, and "can't find the file" — will save you a great deal of time.

</details>

### The VS Code way: notice the warnings

Look at the editor after making mistake 1 above. VS Code underlines the problem in red *before* you run anything, and the **Problems** panel (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd>) lists it. Hover over the red line to read the message.

Get into the habit of glancing at these underlines as you type. They catch many mistakes in the moment you make them, which — as you learned in {{ch:from-code-to-running-program}} — is the cheapest possible time to fix them.

## Two tools that make learning faster

### The Node.js REPL

In {{ch:from-code-to-running-program}} you used the browser console to try code one line at a time. Node.js has the same thing, called the **REPL** (Read–Eval–Print Loop). Type `node` on its own:

```text
> node
Welcome to Node.js v24.11.1.
Type ".help" for more information.
> 10 * 3
30
> "Lahore".length
6
> .exit
```

Walkthrough:

- Running `node` with no file name starts the REPL. Its own prompt is also `>`.
- `10 * 3` — the REPL evaluates it and prints `30` immediately.
- `"Lahore".length` — asks for the length of the text `"Lahore"`: 6 characters. You will learn about `.length` in {{ch:types-of-data}}.
- `.exit` leaves the REPL and returns you to the normal shell. (Pressing <kbd>Ctrl</kbd> + <kbd>C</kbd> twice also works.)

Use the REPL to test a small idea quickly — "what does this do?" — and files for anything longer than a line or two.

### Watch mode

Running `node hello.js` again after every change gets tiresome. Node.js can watch your file and re-run it automatically whenever you save:

```text
> node --watch hello.js
Hello from a file!
2 + 3 = 5
Today I set up my workshop.
Completed running 'hello.js'
```

Now change a line and save. The program runs again by itself, showing the new output. Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to stop watching.

This fast loop — change, save, see the result — is how developers work all day. It makes the "predict, then run" habit from {{ch:how-this-book-teaches}} almost effortless.

## Saving your first snapshot with Git

You will learn Git properly in {{ch:git}}, but it is worth recording your first program now, so the habit starts early. In the project folder:

```text
> git init
Initialized empty Git repository in C:/code/learning-javascript/.git/
> git add hello.js
> git commit -m "My first program"
[main (root-commit) 3f2a1b9] My first program
 1 file changed, 4 insertions(+)
 create mode 100644 hello.js
```

Walkthrough:

- `git init` turns this folder into a Git **repository** — a project whose history Git tracks. Git creates a hidden folder called `.git` where it stores that history. Never edit or delete `.git` by hand.
- `git add hello.js` tells Git you want to include the current state of `hello.js` in the next snapshot.
- `git commit -m "My first program"` saves the snapshot, with the message after `-m` describing it. Git replies with a short ID for the commit (`3f2a1b9` here — yours will differ) and a summary: one file changed, four lines added.

Your work now has a recorded history. If you break `hello.js` badly, Git can bring this version back. The Source Control icon in VS Code's activity bar shows the same information visually.

## From beginner to enterprise: development environments at every level

**Level 3 — Your own computer.** One editor, one Node.js version, Git, and a tidy folder of projects. Everything in this chapter.

**Level 4 — A real project.** The project records the Node.js version it needs (for example in a small file called `.nvmrc`, or in its `package.json` — see {{ch:modules-and-npm}}), so that a version manager can switch automatically. It includes shared linter and formatter settings, so that every developer's editor checks and formats code the same way. A `README` file explains, step by step, how to install and run the project.

**Level 5 — Professional teams.** Teams aim for a new colleague to be able to run the project on their first day by following the README, often with a single setup command. Editor settings shared through a file in the project (such as `.editorconfig` or `.vscode/settings.json`) keep everyone consistent. The same linter, formatter and tests run automatically on every proposed change ({{ch:cicd}}), so a problem missed on one laptop is caught before it reaches anyone else.

**Level 6 — Enterprise.** Large companies often go further and give developers **containerised development environments** — the whole toolset, with the exact versions, packaged so it runs the same way on every machine ({{ch:docker}}). Some use cloud-hosted development environments, where the code and tools run on a powerful remote machine and the developer's laptop only shows the editor. The goal at every level is the same: remove "works on my machine" problems, so engineers spend their time on the product, not on their tools.

## Real-world use cases

### Beginner level — A student's first week

**Situation:** a student installs Node.js and VS Code, but every time they run their file, the old output appears.

**Cause:** they are editing the file but not saving it, so Node.js runs the old saved version.

**Fix:** turn on Auto Save, and watch the editor tab: a filled circle instead of an × means "unsaved changes".

### Intermediate level — A new developer joins a small company

**Business problem:** a new developer spends their first three days unable to run the company's project.

**Technical problem:** the project needs a specific Node.js version, a particular database and several settings, none of which are written down. Each existing developer set things up differently years ago.

**Solution:** the team writes a clear README, records the Node.js version in the project, and adds a script that prepares the local database. The next new developer is productive on their first afternoon.

**Reasoning:** an hour spent documenting setup saves days for every future colleague. Experienced engineers treat a project that is hard to set up as a real problem to be fixed, not as an initiation ritual.

### Advanced level — "It works on my machine"

**Business problem:** a bug appears in production but cannot be reproduced on any developer's laptop.

**Technical problem:** production runs a different Node.js version from the developers, and a behaviour changed between the versions.

**Solution:** pin the exact Node.js version in the project and in the production environment, and run automated tests on that same version.

**Trade-off:** pinning versions means the team must deliberately upgrade later, rather than drifting automatically. That is a small, planned cost in exchange for predictable behaviour.

### Enterprise level — Consistent environments for hundreds of engineers

**Business problem (illustrative):** a large software company has hundreds of engineers working on dozens of services. Each service has its own tools and versions, and setting them up by hand costs each new engineer weeks.

**Solution:** each service ships with a containerised development environment that contains the exact tools and versions it needs. Opening the project in the editor starts the environment automatically.

**Advantages:** identical setups everywhere, fast onboarding, and fewer "works on my machine" bugs.

**Disadvantages:** containers add complexity and need more memory and disk space; someone must maintain the environment definitions. For a single developer or a small team, the plain setup in this chapter is simpler and entirely sufficient.

## Common mistakes

### Beginner mistake — Running the old version of a file

**What it looks like:** "I changed the code but the output is the same."

**Why it happens:** the file was not saved, or the terminal is in a different folder running a different copy of the file.

**How to spot it:** check for the unsaved-changes dot on the editor tab; run `pwd` and `ls` in the terminal.

**How to fix and prevent it:** turn on Auto Save; use VS Code's built-in terminal, which opens in the project folder.

### Beginner mistake — Using an old terminal after installing

**What it looks like:** `node : The term 'node' is not recognized...` immediately after a successful installation.

**Why it happens:** the terminal was opened before the installer updated the PATH, as you learned in {{ch:the-terminal}}.

**How to fix it:** close all terminals — including VS Code entirely, since its terminal inherits VS Code's PATH — and open them again.

### Intermediate mistake — Several Node.js installations

**What it looks like:** `node --version` shows a different version from the one you just installed, or a tool complains about the wrong version.

**Why it happens:** Node.js was installed more than once — perhaps once from the website and once through another tool.

**How to spot it:** on Windows, run `where.exe node`; on macOS and Linux, run `which -a node`. More than one result means more than one installation.

**How to fix it:** uninstall all but one, or switch to a version manager and remove the others.

### Intermediate mistake — Running everything as administrator

**What it looks like:** opening the terminal "as Administrator" (or using `sudo` on macOS and Linux) to make an error go away.

**Why it happens:** it often *does* make a permission error disappear, so it feels like a fix.

**What happens:** files get created owned by the administrator, which causes *more* permission errors later when you run normally — and any code you run with administrator rights can change anything on your computer, which is a real security risk.

**How to fix and prevent it:** keep code in your own folders (such as `C:\code` or `~/code`), where you already have full permission. If a tool insists on administrator rights for ordinary development work, something is set up wrongly; fix the cause instead.

### Production mistake — Developing on a different version from production

**What it looks like:** code that works on every laptop fails after deployment.

**How to prevent it:** use LTS versions, record the required version in the project, and make production use the same one. This becomes routine once you learn about `package.json` ({{ch:modules-and-npm}}) and containers ({{ch:docker}}).

## Debugging and troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `node` / `npm` / `git` / `code` "not recognized" or "command not found" | Terminal opened before installing, or the tool's folder is not in the PATH | Close and reopen every terminal and VS Code. If it persists, reinstall with "Add to PATH" selected. |
| On Windows: `npm : File ... npm.ps1 cannot be loaded because running scripts is disabled on this system` | PowerShell's safety setting blocks script files by default | Run once in PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer `Y`, and reopen the terminal. This allows scripts you create or install locally while still blocking unsigned scripts downloaded from the internet. |
| `Error: Cannot find module '...hello.js'` | You are in the wrong folder, or the file name is different | Run `pwd` and `ls`; check the name and extension. |
| Errors showing your path cut off at a space | A tool does not handle spaces in paths | Move your code to a folder without spaces, such as `C:\code`. |
| VS Code shows no red underlines for obvious mistakes | The file is not recognised as JavaScript, or extensions are not installed | Check the file ends in `.js`; check the language in the status bar; check ESLint is installed. |
| Very slow computer while coding | Too many applications open, or code inside a synced folder | Close unused applications and browser tabs; move code out of OneDrive/Dropbox folders. |

> [!TIP]
> When a setup problem appears, follow the same method every time: **read the full error message**, identify which tool produced it (the shell? Node.js? npm? Git?), and check the simplest causes first — a fresh terminal, the current folder, the spelling. The vast majority of setup problems are solved by one of these three.

## How a senior engineer thinks about their tools

> [!SENIOR]
> Experienced engineers are particular about their tools, but not in the way beginners expect. They rarely chase the newest editor or the most extensions. Instead they care about:
>
> - **Reproducibility.** "If my laptop died today, how quickly could I be working again?" Settings, versions and setup steps are written down or kept in the project, not stored only in their heads.
> - **Fast feedback.** Linting in the editor, formatting on save, watch mode, quick tests. Every second between making a change and seeing its effect is friction they try to remove.
> - **Matching production.** The closer their machine is to where the code really runs, the fewer surprises.
> - **Knowing the tool underneath.** They use the editor's buttons, but they know the command each one runs, so they can do the same thing in a terminal on a server when there are no buttons.
>
> They also know that tools are a means, not the goal. Time spent configuring a perfect setup is time not spent building. Good enough, reproducible and fast beats perfect.

## Exercises

### Exercise 1 — Check your workshop

**Objective:** confirm every tool is installed and reachable.

**What to do:** in a new terminal, run each command and write down the result:

```text
node --version
npm --version
git --version
code --version
git config --global user.name
```

<details>
<summary>Show the solution</summary>

Each command should print a version number, or, for the last one, your name:

```text
v24.11.1
11.6.2
git version 2.51.0
1.106.2
Your Name
```

Your exact numbers will differ, and that is fine.

If any command fails:

- **"Not recognized" / "command not found"** — close every terminal and VS Code, open a new terminal, and try again. If it still fails, reinstall that tool and make sure "Add to PATH" is selected.
- **`git config --global user.name` prints nothing** — you have not set your name yet. Run the two `git config` commands from this chapter.

**Common wrong approach:** assuming a tool works because the installer said "Finished". Always check from a fresh terminal; that is what every later chapter will rely on.

</details>

### Exercise 2 — A program about you

**Objective:** practise writing, running and changing a program in a file.

**Starting point:** your `learning-javascript` project.

**What to build:** a file `about-me.js` that prints three lines: your name, your city, and the result of calculating how many hours are in a week (use `*` to multiply). Run it with `node --watch`, then change the city while it is running and watch it re-run.

**Hints:** you can give `console.log` several values separated by commas, as on line 3 of `hello.js`.

<details>
<summary>Show the solution</summary>

```js
// Information about me
console.log("Name:", "Ali");
console.log("City:", "Lahore");
console.log("Hours in a week:", 24 * 7);
```

Run it:

```text
> node --watch about-me.js
```

**Output:**

```text
Name: Ali
City: Lahore
Hours in a week: 168
Completed running 'about-me.js'
```

Walkthrough:

- Line 1 is a comment explaining the file; Node.js ignores it.
- Lines 2 and 3 each pass two values to `console.log`: a label and a piece of text. `console.log` prints them separated by a space.
- Line 4 passes a label and a calculation. JavaScript works out `24 * 7` — 24 hours times 7 days — before printing, so the output shows `168`, not the calculation itself.
- When you change `"Lahore"` to another city and save, watch mode runs the file again automatically and prints the new output.

**Common wrong approach:** writing `"24 * 7"` with quote marks. Then it is text, not a calculation, and the output shows `24 * 7` instead of `168`. Quote marks mean "this is text exactly as written".

</details>

### Exercise 3 — Fix a broken setup (debugging scenario)

**Objective:** practise diagnosing setup problems.

**The scenario:** a friend installs Node.js on Windows. In the terminal that was already open in VS Code, they type `node app.js` and see:

```text
node : The term 'node' is not recognized as the name of a cmdlet, function,
script file, or operable program.
```

After you advise them, they get a different error:

```text
Error: Cannot find module 'C:\Users\Sara\app.js'
```

**What to do:** explain both errors and what your friend should do about each.

<details>
<summary>Show the solution</summary>

**First error — "not recognized":** the shell could not find a program called `node` in the PATH. The installation itself is very likely fine; the terminal was opened before the installation, so it still has the old PATH. **Fix:** close VS Code completely (its terminals inherit its PATH), reopen it, and open a new terminal.

**Second error — "Cannot find module":** progress. This error comes from **Node.js**, so `node` is now found and running. Node.js is saying it cannot find `app.js` in `C:\Users\Sara` — the folder the terminal is in. The file is probably in a project folder somewhere else. **Fix:** `cd` into the folder containing `app.js` (check with `ls`), or open the project folder in VS Code so its terminal starts there.

**The lesson:** the two errors come from two different programs. The first is the **shell** failing to find Node.js; the second is **Node.js** failing to find your file. Reading *who* is complaining tells you what to fix.

</details>

### Exercise 4 — Record your work

**Objective:** practise the basic Git snapshot from this chapter.

**What to do:** in your `learning-javascript` folder, commit `about-me.js` with a sensible message, then run `git log --oneline` to see your history.

<details>
<summary>Show the solution</summary>

```text
> git add about-me.js
> git commit -m "Add a program that prints information about me"
> git log --oneline
a91c3e2 Add a program that prints information about me
3f2a1b9 My first program
```

Walkthrough:

- `git add about-me.js` includes the new file in the next snapshot.
- `git commit -m "..."` records the snapshot with a message. A good message says what the change does, in a short sentence.
- `git log --oneline` lists the history, newest first, one commit per line: its short ID and message.

**Common wrong approach:** forgetting `git add`, so `git commit` reports "nothing added to commit". Git only includes the changes you have added. You will learn why this two-step design is useful in {{ch:git}}.

</details>

## Summary

A developer's workshop has three core tools plus the terminal: a **code editor** (Visual Studio Code) to write code, a **runtime** (Node.js) to run it, and **version control** (Git) to record its history.

Keep all projects in one folder, use lowercase names with dashes, avoid spaces in paths, and keep code out of cloud-synced folders. Install the **LTS** version of Node.js, and avoid installing it more than one way. Check every installation from a **new** terminal with `--version`.

In VS Code, learn the Explorer, editor, built-in terminal and **command palette**; turn on Auto Save and Format On Save; and install **ESLint** (a linter that warns about likely bugs) and **Prettier** (a formatter that tidies layout). Give Git your name and email with `git config --global`.

You wrote `hello.js` and ran it with `node hello.js`, saw how syntax errors, runtime errors and "cannot find module" errors differ, used the **REPL** and **watch mode** for fast feedback, and saved your first **commit**.

## Key terms

- **Code editor** — A text editor designed for writing code, with features such as syntax highlighting, completion and error checking.
- **IDE (Integrated Development Environment)** — An all-in-one programming tool combining an editor, debugger, build tools and more.
- **Visual Studio Code (VS Code)** — A free, widely used code editor from Microsoft that is extended with add-ons.
- **Extension** — An add-on that gives an editor a new capability.
- **Syntax highlighting** — Colouring the different parts of code, such as keywords and text, to make it easier to read.
- **Command palette** — A searchable list of every command in VS Code, opened with Ctrl + Shift + P.
- **Linter** — A tool that reads code and warns about likely mistakes and risky patterns before the code runs.
- **ESLint** — The most widely used linter for JavaScript and TypeScript.
- **Formatter** — A tool that rewrites the layout of code into a consistent style without changing what it does.
- **Prettier** — A popular code formatter for JavaScript and many other languages.
- **npm (Node Package Manager)** — The tool installed with Node.js for adding libraries written by other people to a project.
- **Version manager** — A tool that installs several versions of a runtime side by side and switches between them.
- **Version control** — A system that records changes to files over time so you can review them and return to earlier versions.
- **Git** — The most widely used version control system.
- **Git Bash** — A Bash shell for Windows, installed with Git for Windows.
- **Repository** — A project whose history is tracked by Git, including the hidden `.git` folder where the history is stored.
- **Commit** — A saved snapshot of a project in Git, with a message describing what changed.
- **Comment** — Text in code, such as after `//` in JavaScript, that is ignored when the program runs and is meant for human readers.
- **REPL (Read–Eval–Print Loop)** — An interactive prompt that runs each line of code as you type it and shows the result.
- **Watch mode** — A way of running a program so that it re-runs automatically every time its file is saved.
- **Execution policy** — A Windows PowerShell safety setting that controls whether script files are allowed to run.
- **README** — A file in a project that explains what the project is and how to set it up and run it.

## What comes next

Your workshop is ready: an editor, Node.js, Git, and your first program running from a file.

Before diving into the JavaScript language, there is one more foundation to lay — and it matters as much as any tool. Today, AI assistants can write code in seconds. Used one way, they make you a faster, stronger engineer. Used another way, they quietly stop you from ever learning to program at all. In the next chapter, **How to Learn Programming — and How to Use AI Without Losing Your Skills**, we look honestly at how skill is built, what goes wrong when AI does the thinking, and a practical set of rules for using AI so that it makes you better, not weaker.
