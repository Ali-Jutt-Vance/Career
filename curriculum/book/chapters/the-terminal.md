# The Terminal: Talking to Your Computer in Text

> [!GOALS]
> - What the terminal, the shell and the command line are, and how they relate to each other.
> - Why professional engineers use typed commands for so much of their work, even though clicking is easier at first.
> - How a command is built: the command name, its arguments and its options.
> - What the "current folder" is, and the difference between absolute and relative paths.
> - The essential commands for moving around, looking at files, and creating, copying, moving and deleting them.
> - Time-saving habits: Tab completion, command history and stopping a running program.
> - What environment variables and the PATH are, and how to fix the famous "command not found" error.
> - How to send a command's output into a file, chain commands together, and tell whether a command succeeded.

## Why this matters

So far, you have used your computer the way most people do: by clicking. You open folders by double-clicking, drag files to move them, and right-click to delete. This kind of interface is called a **graphical user interface**, or **GUI** (often pronounced "gooey"). It is easy to learn because you can see everything.

Software engineers also use another way to control a computer: they **type commands** into a text window. Watch an experienced developer for an hour and you will see them do this constantly — to start their application, run tests, install tools, save their work with Git, and control servers.

There are good reasons for this, and they are not about looking clever:

1. **Servers usually have no screen.** The computers that run websites sit in data centres. Most run Linux with no graphical interface at all. The only way to control them is by typing commands, usually from thousands of kilometres away. If you cannot use the terminal, you cannot work on a server.
2. **Most developer tools are made to be typed.** Node.js, Git, Docker, database tools and cloud tools are all used mainly through commands. Many have no buttons to click at all.
3. **Commands are precise and repeatable.** "Click the third icon, then the menu, then…" is hard to describe and easy to get wrong. A command is one exact line of text you can write down, share with a colleague, and run again later with exactly the same result.
4. **Commands can be automated.** A list of commands saved in a file becomes a **script** that the computer can run by itself — every night, or every time someone changes the code. Clicking cannot be automated in the same way. Almost all professional automation, from testing to deployment, is built on commands.
5. **It is fast for repeated work.** Renaming two hundred files by hand takes an hour. With a command, it takes a few seconds.

This chapter teaches you the terminal from nothing. By the end, you will be comfortable moving around your computer, managing files and running programs by typing — the foundation for almost every tool in the rest of the book.

## The simple idea

Using a terminal is like having a conversation with your computer by text message.

You type an instruction and press Enter. The computer carries it out and replies with text. Then it waits for your next instruction.

```text
  you type:        list the files in this folder
  computer:        notes.txt   photo.jpg   projects
  you type:        go into the projects folder
  computer:        (no reply — it just did it)
  you type:        ...
```

The difference from a real text conversation is that the computer only understands a fixed set of instructions, written in an exact form. "list the files in this folder" is not how you actually say it; you type a short command such as `ls`. Learning the terminal means learning that set of commands and their exact form.

> [!ANALOGY]
> Clicking through folders is like walking around a large building, finding rooms by looking at signs. Typing commands is like having the building's address system: you say exactly where you want to go and what you want done there, and it happens immediately.
>
> **Where the analogy breaks:** in a building, if you ask for a room that does not exist, a person will help you find the right one. The terminal will not. It will reply with an error and wait. It also will not ask "are you sure?" before doing something destructive like deleting a file. Precision matters even more here than in programming.

## The proper definition and key words

Three words are often used as if they mean the same thing. They are related but different.

- The **terminal** (also called a **terminal emulator** or **console**) is the *window* you type into. It shows text and sends your typing onward. On Windows, the modern one is called **Windows Terminal**. On macOS, it is the **Terminal** app.
- The **shell** is the *program* inside that window which reads your commands, works out what they mean, and runs them. Different shells have slightly different rules:
  - **PowerShell** — the modern shell on Windows.
  - **Bash** — the most common shell on Linux servers, and widely used everywhere.
  - **Zsh** — the default shell on macOS. For everyday commands it behaves almost exactly like Bash.
- The **command line** is the place where you type a command — and more generally, the whole way of working by typing commands. "Use the command line" means "type commands into a shell".

```text
  +------------------------------------------------------+
  |  TERMINAL  (the window)                               |
  |                                                       |
  |   +-----------------------------------------------+   |
  |   |  SHELL  (the program: PowerShell, Bash, Zsh)  |   |
  |   |   reads your command, runs it, shows result   |   |
  |   +-----------------------------------------------+   |
  |                                                       |
  |   > the command line, where you type_                 |
  +------------------------------------------------------+
```

The diagram shows the layers: the terminal is the window, the shell runs inside it, and the command line is where you type. In everyday speech, people say "open the terminal" and mean all three together. That is fine.

> [!RECAP]
> In {{ch:what-a-computer-is}} you learned that the **operating system** manages programs and files, and that programs ask it to do things through **system calls**. The shell is simply a program whose job is to take your typed commands and turn them into those requests: "start this program", "list this folder", "delete this file".

## Opening a terminal

**On Windows:**

1. Press the Windows key and type **Terminal**. Open **Windows Terminal** if it appears. If it does not, type **PowerShell** and open **Windows PowerShell**.
2. A window appears with a line ending in `>`, something like this:

```text
PS C:\Users\Ali>
```

**On macOS:** press <kbd>Cmd</kbd> + <kbd>Space</kbd>, type **Terminal**, and press Enter. You will see a line ending in `%` or `$`.

**On Linux:** press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd> on most systems, or find **Terminal** in the applications menu. You will see a line ending in `$`.

The text before the cursor is called the **prompt**. It means "I am ready — type a command". On Windows, the prompt `PS C:\Users\Ali>` tells you two things: `PS` means you are in PowerShell, and `C:\Users\Ali` is the folder you are currently in. More about that folder in a moment.

> [!NOTE]
> **About the examples in this chapter.** Most of the commands taught here work the same way in PowerShell (Windows), Zsh (macOS) and Bash (Linux). Where they differ, you will see both versions. In the examples, a line starting with `>` is something you type; do not type the `>` itself. Lines without it are the computer's reply.
>
> Later, in {{ch:setting-up-your-workshop}}, you will install **Git Bash** on Windows, which gives you a Bash shell — the same kind of shell used on Linux servers. Many developers on Windows use it alongside PowerShell. Everything you learn here carries over.

## Your first commands

### Where am I? — `pwd`

Type this and press Enter:

```text
> pwd
```

**Output (Windows):**

```text
Path
----
C:\Users\Ali
```

**Output (macOS or Linux):**

```text
/home/ali
```

`pwd` stands for **print working directory**. It shows the folder you are currently in.

This idea is central to the terminal. The shell is always "standing" in exactly one folder, called the **current working directory** (or just the **current directory**). Commands act on that folder unless you say otherwise. When you list files, you see the files in the current directory. When you create a file without giving a full path, it is created in the current directory.

When you open a new terminal, you usually start in your **home directory** — your personal folder, where your documents and settings live. On Windows that is typically `C:\Users\YourName`; on macOS `/Users/yourname`; on Linux `/home/yourname`.

### What is here? — `ls`

```text
> ls
```

**Output (shortened, PowerShell):**

```text
    Directory: C:\Users\Ali

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        14/03/2026     10:12                Desktop
d-----        02/03/2026     18:40                Documents
d-----        11/03/2026     09:05                Downloads
-a----        01/03/2026     21:17           2048 notes.txt
```

**Output (macOS or Linux):**

```text
Desktop    Documents    Downloads    notes.txt
```

`ls` is short for **list**. It lists what is inside the current directory.

PowerShell shows a table. Here is how to read it:

- **Mode** — a `d` at the start means it is a **directory** (folder). An `a` means it is a regular file.
- **LastWriteTime** — when it was last changed.
- **Length** — the size in bytes, for files only. `notes.txt` is 2,048 bytes.
- **Name** — the name of the file or folder.

macOS and Linux show just the names by default. To see more detail there, add `-l` (for "long"): `ls -l`.

> [!NOTE]
> In PowerShell, `ls` is a shortcut — an **alias** — for PowerShell's own command `Get-ChildItem`. PowerShell includes aliases for many common Linux command names so that people coming from Linux feel at home. You may see `Get-ChildItem` or its other alias `dir` in Windows documentation. They all do the same thing.

### Moving around — `cd`

`cd` stands for **change directory**. It moves you into a different folder.

```text
> cd Documents
> pwd
```

**Output (Windows):**

```text
Path
----
C:\Users\Ali\Documents
```

Walkthrough:

- `cd Documents` moves you into the `Documents` folder, which is inside the folder you were in. The shell gives no reply, because nothing went wrong. In the terminal, **silence usually means success**.
- `pwd` confirms where you now are. On Windows, the prompt also changes to show the new location: `PS C:\Users\Ali\Documents>`.

To go back **up** one level — to the folder that contains the current one, called the **parent directory** — use two dots:

```text
> cd ..
> pwd
```

**Output (Windows):**

```text
Path
----
C:\Users\Ali
```

To jump straight back to your home directory from anywhere, use the tilde symbol `~`:

```text
> cd ~
```

`~` is a shortcut meaning "my home directory". It works in PowerShell, Bash and Zsh.

> [!TRY]
> Use only `cd`, `ls` and `pwd` to walk into your Documents folder, look at what is there, come back up with `cd ..`, then go into Downloads and list it. After each `cd`, run `pwd` to check where you are. Notice that you are doing exactly what you would do by double-clicking folders — just by typing.

## Paths: telling the shell where things are

In {{ch:what-a-computer-is}} you met **paths** — the written location of a file or folder. In the terminal, paths are everywhere, and there are two kinds.

### Absolute paths

An **absolute path** describes a location starting from the very top of the file system. It means the same thing no matter which folder you are currently in.

```text
Windows:          C:\Users\Ali\Documents\notes.txt
macOS / Linux:    /home/ali/documents/notes.txt
```

On Windows, absolute paths start with a drive letter such as `C:\`. On macOS and Linux, they start with `/`, the **root** of the whole file system.

### Relative paths

A **relative path** describes a location *starting from the current directory*. It is shorter, but its meaning depends on where you are.

If you are in `C:\Users\Ali`, then:

- `Documents` means `C:\Users\Ali\Documents`
- `Documents\notes.txt` means `C:\Users\Ali\Documents\notes.txt`

Three special names make relative paths powerful:

| Symbol | Meaning |
|---|---|
| `.` | the current directory itself |
| `..` | the parent directory (one level up) |
| `~` | your home directory |

These can be combined. Suppose you are in `C:\Users\Ali\Documents` and want to reach a file in Downloads:

```text
..\Downloads\report.pdf
```

Read this as a series of steps: `..` — go up from Documents to `C:\Users\Ali`; then `Downloads` — go into Downloads; then `report.pdf` — that file. The full location is `C:\Users\Ali\Downloads\report.pdf`.

```text
  C:\
   └── Users
        └── Ali              <- ..  (parent of Documents)
             ├── Documents   <- you are here (.)
             │    └── notes.txt
             └── Downloads
                  └── report.pdf      <- ..\Downloads\report.pdf
```

The tree diagram shows the same journey visually: from Documents, `..` climbs to Ali, and from there you go down into Downloads.

> [!NOTE]
> **Slashes.** Windows traditionally uses the backslash `\` in paths; macOS and Linux use the forward slash `/`. PowerShell accepts **both**, so `cd ../Downloads` works on Windows too. Programming languages and web addresses almost always use the forward slash. Getting used to `/` will save you trouble later.

### Spaces in names

The shell uses spaces to separate the parts of a command. So a folder name containing a space confuses it:

```text
> cd My Projects
```

**Output (PowerShell):**

```text
Set-Location: A positional parameter cannot be found that accepts argument 'Projects'.
```

The shell read `My` and `Projects` as two separate pieces, and `cd` does not know what to do with the second one. The fix is to put the whole name in quote marks:

```text
> cd "My Projects"
```

Many developers avoid spaces in file and folder names entirely, using dashes or underscores instead — `my-projects` or `my_projects` — precisely to avoid this. You will see that convention throughout professional code.

## How a command is built

Every command follows the same basic structure:

```text
   command     arguments        options
     |             |               |
     v             v               v
     ls        Documents          -l
```

- The **command** is the name of the program or action to run — `ls`, `cd`, `node`, `git`.
- **Arguments** are the things the command should act on — a folder name, a file name.
- **Options** (also called **flags** or **switches**) change *how* the command behaves. They usually start with a dash: `-l`, `-r`, `--help`. A single dash is normally followed by a single letter (`-l`); two dashes are normally followed by a whole word (`--all`). PowerShell's own options use a single dash followed by a word: `-Recurse`, `-Force`.

The parts are separated by spaces. So `ls -l Documents` means "run `ls`, in long format, on the Documents folder".

### Getting help

You do not need to memorise every option. Every serious command can tell you how to use it:

- **Bash and Zsh:** most commands accept `--help`, for example `ls --help`. Many also have a full **manual page**: type `man ls` (press <kbd>q</kbd> to leave it).
- **PowerShell:** type `Get-Help` followed by the command, for example `Get-Help Get-ChildItem`.
- **Developer tools** such as `node`, `git` and `npm` all accept `--help`.

Reading help output is a real professional skill. The first few times it looks dense; soon you will scan it quickly for the one option you need.

## Creating, viewing and changing files and folders

Let us build a small practice area. Go to your home directory first:

```text
> cd ~
```

### Making folders — `mkdir`

```text
> mkdir practice
> cd practice
```

`mkdir` means **make directory**. It creates a new, empty folder in the current directory. Then `cd practice` moves into it.

You can also create several nested folders at once:

```text
> mkdir projects/shop/images
```

In PowerShell this creates all three levels if they do not exist. In Bash and Zsh, you need the `-p` option (for "parents"): `mkdir -p projects/shop/images`. Without `-p`, Bash refuses, because `projects` does not exist yet.

### Making files and writing into them

The quickest way to create a small text file is to send some text into it:

```text
> echo "Buy milk" > todo.txt
```

Walkthrough:

- `echo` is a command that simply prints whatever you give it. On its own, `echo "Buy milk"` prints `Buy milk` on the screen.
- `>` is the **redirect** symbol. Instead of showing the output on the screen, it sends it into a file. If the file does not exist, it is created. **If it does exist, its contents are replaced.**
- `todo.txt` is the file the output goes into.

To **add** a line to the end of a file without replacing what is there, use two arrows:

```text
> echo "Call the bank" >> todo.txt
```

`>>` means "append" — add to the end.

To create an empty file:

- **Bash and Zsh:** `touch notes.txt`
- **PowerShell:** `New-Item notes.txt` (or its short alias `ni notes.txt`)

### Looking inside a file — `cat`

```text
> cat todo.txt
```

**Output:**

```text
Buy milk
Call the bank
```

`cat` (short for "concatenate", because it can join files together) prints a file's contents. It works in PowerShell too, as an alias for `Get-Content`.

For long files, printing everything at once is unhelpful. Two useful alternatives:

- Show only the first few lines: `head -n 5 file.txt` in Bash; `Get-Content file.txt -TotalCount 5` in PowerShell.
- Show only the last few lines: `tail -n 5 file.txt` in Bash; `Get-Content file.txt -Tail 5` in PowerShell.

Looking at the *end* of a file is especially useful for **log files** — files where programs record what they are doing, with the newest entries at the bottom. You will use this constantly when investigating problems on servers.

### Copying — `cp`

```text
> cp todo.txt todo-backup.txt
```

`cp` means **copy**. The first argument is the source (what to copy); the second is the destination (the name or place for the copy). Now both files exist with the same contents.

To copy a whole folder and everything inside it, you need to say so explicitly — this is called copying **recursively**, meaning "this folder, and everything inside it, and everything inside that, all the way down":

- **Bash and Zsh:** `cp -r projects projects-backup`
- **PowerShell:** `cp -Recurse projects projects-backup`

### Moving and renaming — `mv`

```text
> mv todo-backup.txt projects/
```

`mv` means **move**. This moves `todo-backup.txt` into the `projects` folder.

There is no separate "rename" command in Bash. Renaming is just moving a file to a new name in the same place:

```text
> mv todo.txt shopping.txt
```

Now `todo.txt` is gone and `shopping.txt` exists with the same contents.

### Deleting — `rm`

```text
> rm shopping.txt
```

`rm` means **remove**. It deletes the file.

> [!WARNING]
> **Files deleted in the terminal do not go to the Recycle Bin or Trash.** They are gone immediately. There is no "undo", and the shell does not ask "Are you sure?".
>
> This is especially dangerous with folders. Deleting a folder and everything inside it uses the recursive option — `rm -r folder` in Bash, `rm -Recurse folder` in PowerShell — and it will delete thousands of files in a fraction of a second.
>
> Before any delete, especially a recursive one: run `pwd` to confirm where you are, and run `ls` on exactly what you are about to delete. Experienced engineers do this every single time. There are well-known stories of people deleting entire projects, or even whole servers, because they ran a delete command in the wrong folder.

### Clearing the screen

When the terminal fills with text, type `clear` (it works in all three shells), or press <kbd>Ctrl</kbd> + <kbd>L</kbd> in Bash and Zsh. This only clears the screen; it does not undo anything.

## Habits that save hours

These small habits are what make experienced developers look fast in the terminal.

### Tab completion

Type the first few letters of a file or folder name and press <kbd>Tab</kbd>. The shell completes the rest of the name for you.

```text
> cd Doc[Tab]
> cd Documents
```

If several names start with the same letters, press <kbd>Tab</kbd> again: PowerShell cycles through them; Bash shows you the options. Tab completion saves typing, and — just as importantly — prevents spelling mistakes, because the shell only completes names that actually exist. If <kbd>Tab</kbd> does nothing, that is useful information too: there is no such file where you think it is.

### Command history

Press the <kbd>↑</kbd> (up arrow) key to bring back your previous command. Press it again to go further back. Press <kbd>↓</kbd> to go forward. Press Enter to run the command shown, or edit it first.

Developers run the same commands many times a day — start the app, run the tests, check the status of their work. Pressing up-arrow twice and Enter is much faster than typing.

In Bash and Zsh, <kbd>Ctrl</kbd> + <kbd>R</kbd> searches your history: press it and type part of an old command to find it.

### Stopping a running program — Ctrl + C

Some commands keep running until you stop them — for example, a web server that waits for visitors, or a command that is taking far too long. To stop the current program, press <kbd>Ctrl</kbd> + <kbd>C</kbd>.

This does **not** copy text in most terminals; in the terminal, <kbd>Ctrl</kbd> + <kbd>C</kbd> means "interrupt". (To copy text in Windows Terminal, select it and press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>, or just select it and right-click, depending on settings.) You will use <kbd>Ctrl</kbd> + <kbd>C</kbd> every day to stop your own development servers.

## Running programs

So far you have used small built-in commands. But "a command" is really just "the name of a program to run". When you type `node`, `git` or `code`, the shell finds a program with that name and starts it as a new **process** — exactly the idea from {{ch:what-a-computer-is}}.

For example, once Node.js is installed (in {{ch:setting-up-your-workshop}}), you will run a JavaScript file like this:

```text
> node hello.js
```

Here `node` is the command (the Node.js program), and `hello.js` is its argument (the file it should run). Node.js starts, runs your code, prints any output into the terminal, and exits.

Many programs also report their version with an option:

```text
> node --version
v22.11.0
```

Checking versions this way is one of the first things you will do whenever a tool behaves unexpectedly — remember from {{ch:from-code-to-running-program}} that different versions can behave differently.

## How the shell finds programs: environment variables and the PATH

Here is a question that leads to one of the most common problems beginners face. When you type `node`, how does the shell know *where* the Node.js program is? It could be anywhere on the disk.

### Environment variables

Every running process carries a small set of named settings called **environment variables**. Each has a name and a text value. They describe the environment the program is running in: who the user is, where their home directory is, which language they use, and so on.

You can see one like this:

- **PowerShell:** `echo $env:USERNAME`
- **Bash and Zsh:** `echo $USER`

**Output:**

```text
Ali
```

The `$` tells the shell "this is the name of a variable — replace it with its value". In PowerShell, environment variables are written `$env:NAME`; in Bash, simply `$NAME`.

Environment variables matter far beyond the terminal. Real applications read their settings from environment variables — for example, the address of the database, or a secret password for an email service — so that the same code can run with different settings on a laptop and on a server, and so that secrets are not written inside the code. You will use this heavily from Part VII onwards.

### The PATH

One environment variable is special. It is called **PATH** (written `Path` on Windows), and it holds a list of folders. When you type a command, the shell looks through these folders, in order, for a program with that name. The first match is the program it runs.

See your PATH:

- **PowerShell:** `$env:Path -split ";"` (this splits the list onto separate lines, because on Windows the folders are separated by semicolons)
- **Bash and Zsh:** `echo $PATH` (the folders are separated by colons)

**Output (shortened, Windows):**

```text
C:\Windows\system32
C:\Windows
C:\Program Files\nodejs\
C:\Program Files\Git\cmd
C:\Users\Ali\AppData\Local\Programs\Microsoft VS Code\bin
```

```text
   you type:  node hello.js
                 |
                 v
   shell looks through each PATH folder in order:
     C:\Windows\system32      -> node.exe here?  no
     C:\Windows               -> node.exe here?  no
     C:\Program Files\nodejs  -> node.exe here?  YES -> run it
```

The diagram shows the search. The shell checks each folder in the PATH from top to bottom, and runs the first matching program it finds.

### The famous "command not found"

Now you can understand the error almost every developer meets early on:

**PowerShell:**

```text
node : The term 'node' is not recognized as the name of a cmdlet,
function, script file, or operable program.
```

**Bash:**

```text
bash: node: command not found
```

Both mean the same thing: **the shell searched every folder in the PATH and did not find a program with that name.** There are only a few possible causes:

1. **The program is not installed.** Install it.
2. **It is installed, but its folder is not in the PATH.** Some installers add their folder to the PATH automatically; others ask you, and it is easy to untick the box.
3. **It was just installed, but this terminal was opened before the installation.** A terminal reads the PATH when it starts. Close the terminal and open a new one. This is by far the most common cause, and the fix takes two seconds.
4. **A typing mistake** in the command name.

> [!TIP]
> When a newly installed tool gives "command not found" or "not recognized", **close every terminal window and open a fresh one** before trying anything else. It fixes the problem far more often than you would expect.

## Output, redirection and pipes

### Sending output to a file

You have already used `>` and `>>`. They work with any command, not just `echo`:

```text
> ls > file-list.txt
```

This saves the folder listing into `file-list.txt` instead of showing it on the screen. Saving command output to files is handy for keeping records and for sharing results with colleagues.

### Pipes: joining commands together

The **pipe** symbol `|` (usually <kbd>Shift</kbd> + <kbd>\</kbd> on a keyboard) sends the output of one command directly into the next command, as its input.

```text
   command 1  |  command 2  |  command 3
   produces      works on       works on
   output  --->  that output -> the result
```

For example, to find only the lines containing the word "error" in a large log file:

- **Bash and Zsh:** `cat server.log | grep error`
- **PowerShell:** `cat server.log | Select-String error`

Walkthrough of the Bash version:

- `cat server.log` produces every line of the log.
- `|` sends those lines into the next command instead of to the screen.
- `grep error` reads those lines and only lets through the ones containing "error". (`grep` is a classic tool for searching text; its odd name comes from an old editor command meaning "globally search for a regular expression and print".)

So out of perhaps a hundred thousand lines, you see only the few dozen that matter.

The idea behind pipes is powerful: **small tools that each do one job well, joined together to do bigger jobs.** This way of thinking — small, focused pieces combined into larger systems — comes up again and again in software design, from functions ({{ch:functions}}) to microservices ({{ch:microservices}}).

> [!NOTE]
> PowerShell pipes pass *objects* (structured data with named fields) between commands, while Bash pipes pass plain text. For the simple examples in this book the difference rarely matters, but it explains why some Bash pipelines do not translate word for word into PowerShell.

## Did it work? Exit codes

When a command finishes, it reports a small number back to the shell called its **exit code** (or **exit status**):

- **0** means success.
- **Any other number** means something went wrong. Different numbers can mean different kinds of failure.

You can see the exit code of the last command:

- **Bash and Zsh:** `echo $?`
- **PowerShell:** `$LASTEXITCODE` for external programs (like `node` or `git`), or `$?` which is `True` or `False`.

```text
> ls folder-that-does-not-exist
ls: cannot access 'folder-that-does-not-exist': No such file or directory
> echo $?
2
```

You will rarely check exit codes by hand. But they are what automation is built on. When a server automatically runs your tests before accepting a change ({{ch:cicd}}), it decides "pass" or "fail" purely from the exit code of the test command. A test tool that exits with 0 means "all tests passed"; anything else stops the change from going further.

You can also make one command run only if the previous one succeeded:

- **Bash and Zsh:** `mkdir build && cd build`
- **PowerShell 7:** the same `&&` works. In the older Windows PowerShell 5.1, use `mkdir build; if ($?) { cd build }`.

`&&` means "and then, but only if that worked". It prevents a chain of commands from charging ahead after a failure — for example, deploying an application whose tests just failed.

## From beginner to enterprise: the terminal at every level

**Level 3 — On your own computer.** You use the terminal to move around, create project folders, and run your programs with `node`. This is where you will be for the next several chapters.

**Level 4 — In a real project.** A typical working session in a web project looks like this:

```text
> cd ~/projects/online-shop        # go to the project
> git pull                         # get colleagues' latest changes
> npm install                      # install the libraries it needs
> npm test                         # run the automated tests
> npm run dev                      # start the app; Ctrl+C to stop
```

Each of these commands is taught later — Git in {{ch:git}}, npm in {{ch:modules-and-npm}} — but notice that the whole working day is driven from the terminal.

**Level 5 — Professional engineering.** Teams write **scripts**: files containing sequences of commands, so that common jobs — setting up a new developer's computer, preparing a release, cleaning old data — run the same way every time, for everyone. {{ch:shell-scripting}} teaches this. Teams also document the exact commands to run a project in a file called `README`, so that any new colleague can be productive on their first day.

**Level 6 — Enterprise and servers.** Engineers connect to remote Linux servers using **SSH** (Secure Shell), which gives them a terminal on a computer in a data centre as if they were sitting in front of it. They read logs with `tail` and `grep`, check running processes, and investigate problems — often under time pressure while a website is down. Large companies go further and run commands automatically across hundreds or thousands of servers at once through deployment pipelines and configuration tools, so that no human needs to type on each machine. {{ch:linux}} and {{ch:systems-manager}} cover this world.

## Real-world use cases

### Beginner level — Organising downloaded course files

**Situation:** a learner has 150 downloaded files mixed together in one folder and wants all the PDFs in their own folder.

**Solution:** create the folder and move the matching files in one command, using a **wildcard** — the `*` symbol, which means "any characters":

```text
> mkdir pdfs
> mv *.pdf pdfs/
```

`*.pdf` matches every file name ending in `.pdf`. Two commands replace several minutes of dragging.

**Caution:** wildcards are powerful in both directions. `rm *.pdf` deletes every PDF in the folder instantly. Running `ls *.pdf` first, to see exactly what matches, is the safe habit.

### Intermediate level — Investigating a failed order

**Business problem:** a customer of an online shop says their payment went through but no order was created.

**Technical problem:** the developer needs to know what the server did at that moment, among millions of log lines.

**Solution:** on the server, search the log for the customer's order reference:

```text
$ grep "ORD-48213" /var/log/shop/app.log
```

This returns only the handful of lines about that order, which show that the payment provider's confirmation arrived but the database was briefly unavailable.

**Reasoning:** logs are text, and the terminal's text tools are the fastest way to search them. In larger companies, logs are sent to a central search system (covered in {{ch:logging}}), but the idea — search the record for the one thing that matters — is the same.

### Advanced level — Making a manual process repeatable

**Business problem:** a small software company prepares each new release by hand: run the tests, build the application, copy files to the server, restart it. Twice in a month someone forgot a step, and the website went down.

**Solution:** write the steps into a script that runs them in order and stops at the first failure (using exit codes and `&&`), then later move the script into an automated pipeline.

**Advantages:** every release follows exactly the same steps; nobody can forget one; the script itself documents the process.

**Disadvantages and limits:** the script must be maintained as the process changes. A script that "usually works" but has never been tested in failure cases can fail in confusing ways. Good scripts check each step and report clearly what went wrong.

### Enterprise level — Operating a fleet of servers

**Business problem:** a payment company runs its services on hundreds of Linux servers. A security fix must be applied to all of them quickly and safely.

**Solution (illustrative):** engineers do not log in to each server. They use automation tools that run the same commands on every server, in batches — a few servers first, checking that they stay healthy, then the rest — with every command and result recorded for audit.

**Reasoning:** typing commands by hand on hundreds of machines is slow and error-prone, and leaves no reliable record. But the automation is built from exactly the same commands you are learning now. Someone who understands the commands can read, write and debug the automation.

**Failure scenario:** an incorrect command applied automatically to every server at once can break all of them at the same moment. This is why changes roll out in small batches with health checks in between.

## Common mistakes

### Beginner mistake — Not knowing which folder you are in

**What it looks like:** "No such file or directory" when the file clearly exists; or a new file created somewhere unexpected.

**Why it happens:** relative paths and many commands act on the *current* directory, and it is easy to lose track of where that is.

**How to spot it:** run `pwd`. Look at the prompt, which often shows the current folder.

**How to fix and prevent it:** check `pwd` before commands that matter. When in doubt, use an absolute path.

### Beginner mistake — Typing the prompt symbol

**What it looks like:** copying `> ls` or `$ ls` from a tutorial, including the `>` or `$`, and getting an error.

**Why it happens:** tutorials show the prompt to indicate "type this here", and it looks like part of the command.

**How to fix it:** never type the leading `$`, `>` or `PS C:\...>`. Type only the command after it.

### Intermediate mistake — Destructive commands in the wrong place

**What it looks like:** running a recursive delete — `rm -r *` or `rm -Recurse *` — intending to clear a temporary folder, but in the wrong directory.

**Why it happens:** the shell is silent about where you are, and does not ask for confirmation.

**What happens:** everything in that folder is permanently deleted. If it was your project folder, any work not saved elsewhere (for example, in Git) is lost.

**How to prevent it:** run `pwd` and `ls` immediately before any delete. Prefer explicit paths (`rm -r ./tmp`) over wildcards. Keep your work in Git ({{ch:git}}), so that even a bad delete is recoverable.

### Intermediate mistake — Overwriting a file with `>`

**What it looks like:** meaning to add a line to an important file with `echo "..." > config.txt` and replacing its whole contents.

**Why it happens:** `>` and `>>` look almost identical.

**How to prevent it:** remember **one arrow replaces, two arrows add**. For important files, make a copy first.

### Production mistake — Running commands on the wrong server

**What it looks like:** an engineer has several terminal windows open — one connected to a test server, one to the live production server — and runs a destructive command in the production window by mistake.

**Consequences:** real data deleted or a live service stopped; customers affected.

**How to prevent it:** many teams make production terminals visually different (for example, a red prompt showing the server name), restrict who may run commands on production at all, and prefer automated, reviewed changes over hand-typed commands. This is not about distrust; it is about designing systems where one tired moment cannot cause disaster.

## Debugging and troubleshooting

| What you see | What it usually means | What to do |
|---|---|---|
| `command not found` / `is not recognized` | The program is not installed, not in the PATH, or the terminal is older than the installation | Open a new terminal; check spelling; check the program is installed; check the PATH |
| `No such file or directory` / `Cannot find path` | The file is not where you said — often because you are in a different folder | Run `pwd` and `ls`; use Tab completion; check spelling and capitals |
| `Permission denied` / `Access is denied` | Your user is not allowed to read, change or run that file | Check you are working in your own folders; on servers, check file permissions ({{ch:linux}}) |
| A command seems to hang with no output | It is still running, or it is waiting for you to type input | Wait, or press <kbd>Ctrl</kbd> + <kbd>C</kbd> to stop it |
| "A positional parameter cannot be found" | A name with a space was split into two arguments | Put the name in quote marks |
| A command works in a tutorial but not for you | The tutorial uses a different shell (Bash versus PowerShell) | Check which shell the tutorial expects; look up the equivalent command |

> [!TIP]
> **Capital letters matter on Linux and macOS.** On Linux, `Notes.txt` and `notes.txt` are two different files. Windows treats them as the same. Code that works on a Windows laptop can fail on a Linux server because a file name's capitals do not match. Choose one style — most projects use all lowercase — and stick to it.

## How a senior engineer thinks about the terminal

> [!SENIOR]
> Experienced engineers are not people who have memorised hundreds of commands. They know perhaps thirty commands well, and they know how to find the rest quickly with `--help` and a search.
>
> What they *have* developed are habits:
>
> - **Check before destroying.** `pwd` and `ls` before every delete or overwrite, without exception.
> - **Prefer repeatable over clever.** If a sequence of commands will be needed again, they write it into a script or the project's README rather than relying on memory.
> - **Read the error message.** Nearly every terminal error says exactly what is wrong. They read it slowly before changing anything.
> - **Automate production; don't type on it.** The more important a server is, the less they want humans typing commands on it directly.
> - **Leave a trail.** They keep commands that changed something important in notes, tickets or scripts, so that others can see what was done and why.

## Exercises

### Exercise 1 — Build a project folder structure

**Objective:** practise creating and navigating folders using only the terminal.

**Starting point:** a terminal open in your home directory.

**What to build:** the following structure, inside a new folder called `shop`:

```text
shop
├── src
│   └── app.txt
├── docs
│   └── readme.txt   (containing the line: My first project)
└── images
```

Then, from inside `shop/src`, display the contents of `readme.txt` using a relative path.

**Hints:** use `mkdir`, `cd`, `echo` with `>`, and `..` to reach a sibling folder. Remember that in Bash you need `-p` to create nested folders in one go.

<details>
<summary>Show the solution</summary>

**PowerShell:**

```text
> cd ~
> mkdir shop
> cd shop
> mkdir src, docs, images
> New-Item src/app.txt
> echo "My first project" > docs/readme.txt
> cd src
> cat ../docs/readme.txt
```

**Bash or Zsh:**

```text
$ cd ~
$ mkdir shop
$ cd shop
$ mkdir src docs images
$ touch src/app.txt
$ echo "My first project" > docs/readme.txt
$ cd src
$ cat ../docs/readme.txt
```

**Output (last command):**

```text
My first project
```

Walkthrough:

- `cd ~` starts from your home directory, so the project is created in a predictable place.
- `mkdir shop` creates the project folder, and `cd shop` moves into it, so the next commands work inside it.
- `mkdir src docs images` creates three folders at once. Bash takes several names separated by spaces; PowerShell takes them separated by commas.
- `New-Item src/app.txt` (or `touch` in Bash) creates an empty file inside `src`. Notice we did not need to `cd` into `src` first — a relative path `src/app.txt` says where to put it.
- `echo ... > docs/readme.txt` creates the readme file with one line of text.
- `cd src` moves into `src`.
- `cat ../docs/readme.txt` reads the file using a relative path: `..` climbs from `src` up to `shop`, then `docs/readme.txt` goes down into the docs folder.

**Common wrong approach:** running `cat docs/readme.txt` from inside `src`. That looks for a `docs` folder *inside* `src`, which does not exist, so you get "No such file or directory". The path must start from where you are.

</details>

### Exercise 2 — Copy, rename and clean up safely

**Objective:** practise copying, moving and deleting, with the safety habits from this chapter.

**Starting point:** the `shop` folder from Exercise 1.

**What to do:**

1. Make a backup copy of the whole `docs` folder called `docs-backup`.
2. Rename `src/app.txt` to `src/main.txt`.
3. Delete the `docs-backup` folder — safely.

<details>
<summary>Show the solution</summary>

Starting in the `shop` folder:

**Bash or Zsh:**

```text
$ cp -r docs docs-backup
$ mv src/app.txt src/main.txt
$ pwd
/home/ali/shop
$ ls docs-backup
readme.txt
$ rm -r docs-backup
```

**PowerShell:**

```text
> cp -Recurse docs docs-backup
> mv src/app.txt src/main.txt
> pwd
> ls docs-backup
> rm -Recurse docs-backup
```

Walkthrough:

- Copying a folder requires the recursive option (`-r` or `-Recurse`); without it, the shell refuses to copy a directory or copies only the empty folder.
- Renaming is just `mv` to a new name in the same folder.
- Before deleting, `pwd` confirms we are in `shop`, and `ls docs-backup` shows exactly what is about to be removed. Only then do we delete.

**Common wrong approach:** skipping the `pwd` and `ls` checks because "it is only a practice folder". The point of the habit is that it happens automatically, every time — including the time when it matters.

</details>

### Exercise 3 — Find the lines that matter

**Objective:** practise redirection and pipes.

**What to do:**

1. Create a file `log.txt` with these five lines, using `echo` with `>` for the first line and `>>` for the rest:
   ```text
   INFO server started
   INFO user logged in
   ERROR database timeout
   INFO order created
   ERROR payment failed
   ```
2. Show only the lines containing `ERROR`.
3. Save those error lines into a new file called `errors.txt`, and show its contents.

<details>
<summary>Show the solution</summary>

**Bash or Zsh:**

```text
$ echo "INFO server started" > log.txt
$ echo "INFO user logged in" >> log.txt
$ echo "ERROR database timeout" >> log.txt
$ echo "INFO order created" >> log.txt
$ echo "ERROR payment failed" >> log.txt
$ cat log.txt | grep ERROR
ERROR database timeout
ERROR payment failed
$ cat log.txt | grep ERROR > errors.txt
$ cat errors.txt
ERROR database timeout
ERROR payment failed
```

**PowerShell:** the same, replacing `grep ERROR` with `Select-String ERROR`.

Walkthrough:

- The first `echo` uses `>` to create the file; the rest use `>>` to add lines. If you used `>` every time, the file would end up containing only the last line, because each `>` replaces the contents.
- `cat log.txt | grep ERROR` sends every line into `grep`, which passes through only the lines containing `ERROR`.
- Adding `> errors.txt` at the end sends that filtered output into a file instead of the screen. A pipe and a redirect can be combined in one command.

**Common wrong approach:** using `>` for every line and wondering why only "ERROR payment failed" remains. One arrow replaces; two arrows add.

</details>

### Exercise 4 — Diagnose "not recognized" (debugging scenario)

**Objective:** practise reasoning about the PATH.

**The scenario:** a colleague installs a tool called `deploytool`. In the same terminal window they had open before installing, they type `deploytool --version` and get:

```text
deploytool : The term 'deploytool' is not recognized as the name of a cmdlet...
```

The installer said "Installation complete".

**What to do:** list, in order, the things you would check, and explain why.

<details>
<summary>Show the solution</summary>

1. **Open a new terminal and try again.** A terminal reads the PATH when it starts. This window was opened before the installer added the tool's folder to the PATH, so it has an old copy. This is the most likely cause and the fastest check.
2. **Check the spelling** of the command exactly, including capitals on macOS and Linux.
3. **Check whether the installer added the tool to the PATH.** Look at the PATH (`$env:Path -split ";"` in PowerShell, `echo $PATH` in Bash) and see whether the tool's installation folder is listed. Some installers have an "Add to PATH" option that may have been unticked.
4. **If it is not in the PATH**, either add its folder to the PATH (through the system's environment variable settings on Windows, or the shell's configuration file on macOS and Linux), or run the tool using its full absolute path.

**Common wrong approach:** reinstalling the tool repeatedly. If the problem is an old terminal or a missing PATH entry, reinstalling changes nothing. Understanding *how the shell finds programs* turns a frustrating mystery into a two-minute fix.

</details>

## Summary

The **terminal** is the window you type into; the **shell** (PowerShell, Bash or Zsh) is the program that reads and runs your commands; the **command line** is the typed way of working. Engineers use it because servers usually have no screen, most developer tools are command-based, and commands are precise, repeatable and automatable.

The shell always works in a **current working directory**. **Absolute paths** start from the top of the file system; **relative paths** start from the current directory, using `.`, `..` and `~`. A command has a **name**, **arguments** and **options**, and `--help` explains any of them.

The essential commands are `pwd`, `ls`, `cd`, `mkdir`, `cat`, `cp`, `mv` and `rm`. Deleting in the terminal is permanent, so check with `pwd` and `ls` first. **Tab completion**, **command history** and <kbd>Ctrl</kbd> + <kbd>C</kbd> save time every day.

Commands are programs found through the **PATH** environment variable; "command not found" means the shell could not find the program there — very often fixed by opening a new terminal. **Redirection** (`>` replaces, `>>` appends) sends output to files, **pipes** (`|`) join commands together, and **exit codes** (0 for success) let automation decide whether to continue.

## Key terms

- **Graphical user interface (GUI)** — A way of controlling a computer by clicking and dragging visible windows, icons and buttons.
- **Terminal** — The window in which you type commands and see their text output; also called a terminal emulator or console.
- **Shell** — The program inside a terminal that reads typed commands and runs them, such as PowerShell, Bash or Zsh.
- **Command line** — The place where you type commands, and the general way of working by typing commands.
- **PowerShell** — The modern command shell on Windows.
- **Bash** — A widely used shell, standard on most Linux servers.
- **Zsh** — The default shell on macOS; very similar to Bash for everyday use.
- **Prompt** — The text a shell shows when it is ready for your next command, such as `PS C:\Users\Ali>` or `$`.
- **Current working directory** — The folder the shell is currently working in; commands act on it unless told otherwise.
- **Home directory** — Your personal folder on a computer, written as `~` in the shell.
- **Parent directory** — The folder that contains the current folder, written as `..`.
- **Absolute path** — A path that starts from the top of the file system and means the same thing wherever you are.
- **Relative path** — A path that starts from the current directory, so its meaning depends on where you are.
- **Root directory** — The top of the whole file system on macOS and Linux, written as `/`.
- **Argument** — A value given to a command telling it what to act on, such as a file or folder name.
- **Option (flag)** — A setting given to a command, usually starting with a dash, that changes how it behaves.
- **Alias** — A short alternative name for a command, such as `ls` for PowerShell's `Get-ChildItem`.
- **Recursive** — Applying an action to a folder and everything inside it, at every level.
- **Redirection** — Sending a command's output into a file instead of the screen, using `>` (replace) or `>>` (append).
- **Pipe** — The `|` symbol, which sends one command's output into another command as its input.
- **Wildcard** — A symbol such as `*` that matches many file names at once, for example `*.pdf`.
- **Log file** — A file in which a program records what it is doing, usually with the newest entries at the end.
- **Tab completion** — The shell's ability to finish a partly typed file, folder or command name when you press Tab.
- **Environment variable** — A named setting, holding text, that every process carries and can read, such as the user's name or the PATH.
- **PATH** — An environment variable listing the folders in which the shell looks for programs when you type a command.
- **Exit code** — A number a command returns when it finishes; 0 means success and any other number means failure.
- **Script** — A file containing a series of commands that can be run together, automatically.
- **SSH (Secure Shell)** — A secure way to open a terminal on a remote computer, such as a server, over the network.

## What comes next

You can now move around your computer, manage files and run programs by typing. That is the ground you will stand on for the rest of the book.

So far, everything has happened inside one computer. But almost all modern software talks to other computers — a website talks to a server, a server talks to a database, and phones talk to all of them. In the next chapter, **How the Internet Works**, we follow data as it leaves your computer and travels across the world: what IP addresses, packets, routers and protocols are, and how a message finds its way to exactly the right machine among billions.
