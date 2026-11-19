# What a Computer Really Is

> [!GOALS]
> - What a computer actually does, reduced to four simple jobs.
> - Why computers store everything as 0s and 1s, and what bits and bytes are.
> - How numbers, text, colours and pictures are all turned into 0s and 1s.
> - What the processor (CPU) does, and what "instructions", "clock speed" and "cores" mean.
> - The difference between memory (RAM) and storage (SSD or hard disk), and why mixing them up causes real problems.
> - Why some parts of a computer are millions of times faster than others, and why that shapes how software is built.
> - What an operating system is, and what files, folders, programs and processes are.

## Why this matters

Every program you will ever write runs on a computer. Even when an application lives "in the cloud", it is running on a real computer in a building somewhere, with the same basic parts as the laptop in front of you.

Many beginners skip this knowledge and go straight to a programming language. Then they meet problems that make no sense to them:

- "My program was working, I restarted the computer, and all the data disappeared."
- "Why does `0.1 + 0.2` give `0.30000000000000004`?"
- "Why does the name *José* show up as *JosÃ©* on the website?"
- "Why is reading this file a thousand times slower than reading the same data from a variable?"
- "The server crashed with an *out of memory* error. What memory? It has a 500 GB disk."

Every one of those questions has a simple answer once you understand what is inside a computer. This chapter gives you that understanding. There is no programming in it. Instead, you will build a clear mental picture of the machine — a picture you will use in every chapter that follows.

## The simple idea

Strip away the screen, the keyboard, the brand name and the shiny case, and a computer does only four things:

1. **It takes in information** (input) — from a keyboard, a mouse, a microphone, a camera, a network connection or a file.
2. **It works on information** (processing) — adding numbers, comparing things, making decisions, following steps.
3. **It keeps information** (storage) — for a moment while it is working, or for years.
4. **It gives information back** (output) — on a screen, through speakers, to a printer, or across the network to another computer.

```text
              +------------------------------------+
  INPUT  -->  |  PROCESS        <-->      STORE    |  -->  OUTPUT
 keyboard     |  (the processor)     (memory and   |      screen
 mouse        |                       storage)     |      speakers
 network      |                                    |      network
 files        +------------------------------------+      files
```

Everything a computer does — playing a video, running a bank, showing you this book — is a combination of these four jobs, repeated billions of times a second.

> [!ANALOGY]
> Think of a computer as a small office with one very fast clerk.
>
> - Letters arrive through the post slot (**input**).
> - The clerk reads each letter and follows instructions written in a big procedures manual (**processing**).
> - On the clerk's desk is a small amount of space for papers being worked on right now (**memory**). In the back room are filing cabinets for everything that must be kept (**storage**).
> - Replies go out through the outgoing tray (**output**).
>
> **Where the analogy breaks:** a human clerk understands what the letters mean. A computer understands nothing. It follows instructions exactly, at enormous speed, without any idea what they are for. If the instructions are wrong, it will follow the wrong instructions perfectly. This is the most important difference between a computer and a person, and it is why programming requires such precision.

## The proper definition and key words

A **computer** is a machine that follows a list of instructions, called a **program**, to take in data, process it, store it and produce results.

A few words you will hear all the time:

- **Hardware** — the physical parts of a computer that you could touch: the processor, the memory chips, the storage drive, the screen.
- **Software** — the programs that run on the hardware. You cannot touch software; it is information. This book teaches you to write software.
- **Data** — any information the computer works with: numbers, text, images, sounds, a list of customers, a bank balance.
- **Program** — a precise list of instructions for the computer to follow.

The hardware is the office and the clerk. The software is the procedures manual. Data is the letters and files. As a software engineer, you write the manual.

## How a computer stores anything: 0s and 1s

Before we look at the parts of a computer, we need to answer a deeper question. How can a machine made of metal and silicon "store" a photo, a song or the word *hello*?

### Level 1 — The light switch

Imagine a row of light switches. Each switch can be in only one of two positions: **off** or **on**.

With one switch, you can represent two different things — say, "no" (off) and "yes" (on).

With two switches, you have four possible combinations:

```text
  off off
  off on
  on  off
  on  on
```

With three switches, eight combinations. Each extra switch **doubles** the number of combinations. With enough switches, you can represent anything you like — as long as everyone agrees which combination means what.

That is exactly how a computer works. Inside its chips are billions of tiny electronic switches called **transistors**. Each one is either off or on. We write "off" as **0** and "on" as **1**.

### Level 2 — Bits and bytes

A single 0-or-1 value is called a **bit** (short for *binary digit*). "Binary" means "made of two options".

A bit on its own can hold very little — just yes or no. So bits are grouped. A group of **8 bits** is called a **byte**. A byte can hold 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 = **256** different combinations, from `00000000` to `11111111`.

The byte is the basic unit computers use to measure data. You have seen these words:

| Unit | Short | About how many bytes | Roughly what fits |
|---|---|---|---|
| Byte | B | 1 | one letter of English text |
| Kilobyte | KB | 1,000 | a short paragraph |
| Megabyte | MB | 1,000,000 (a million) | a photo from a phone (a few MB) |
| Gigabyte | GB | 1,000,000,000 (a billion) | a full-length film (a few GB) |
| Terabyte | TB | 1,000,000,000,000 (a trillion) | hundreds of films |

> [!NOTE]
> You will sometimes see these units calculated with 1,024 instead of 1,000, because 1,024 is a power of two (2 multiplied by itself 10 times), which suits binary hardware. Strictly, 1,024 bytes is a **kibibyte** (KiB) and 1,024 × 1,024 bytes is a **mebibyte** (MiB). This is why a "1 TB" drive shows up as about "931 GB" in some operating systems: the drive maker counted in thousands, and the operating system counted in 1,024s. Both are right; they are using different units with similar names.

Also notice the difference between a lowercase **b** and an uppercase **B**. Internet speeds are usually measured in *bits* per second (Mbps, megabits per second), while file sizes are measured in *bytes*. A "100 Mbps" connection therefore downloads at most about 12.5 megabytes per second, because there are 8 bits in a byte. Mixing these up is a very common source of confusion.

### Level 3 — Counting in binary

How do 0s and 1s become numbers? The same way ordinary numbers work — just with two digits instead of ten.

In everyday numbers (called **decimal**, base 10), each position is worth ten times the position to its right. The number 352 means:

```text
   3          5         2
 hundreds    tens      ones
 3 x 100  +  5 x 10  +  2 x 1   =  352
```

In **binary** (base 2), each position is worth **two** times the position to its right:

```text
 position value:   128   64   32   16    8    4    2    1
 binary digits:      0    0    1    0    1    1    0    1

 = 32 + 8 + 4 + 1 = 45
```

Read the diagram like this: write the position values above the digits, starting with 1 on the right and doubling each time to the left. Then add up the values wherever there is a **1**. Here, the 1s sit under 32, 8, 4 and 1, so the binary number `00101101` means 45.

To go the other way — from decimal to binary — find the largest position value that fits, subtract it, and repeat. For 13: the largest value that fits is 8 (leaving 5), then 4 (leaving 1), then 1 (leaving 0). So 13 is 8 + 4 + 1, which is `1101` in binary.

> [!TRY]
> Work out what the binary number `00001010` is in decimal. Then write the decimal number 6 in binary. (Answers: 10, and `110`.)

You will almost never need to convert binary by hand as a programmer. But understanding *that* numbers are stored this way explains several things you will meet later — including why computers have limits on how large a number can be, and why some decimals behave strangely.

### Level 4 — Why some numbers behave strangely

**Whole numbers have limits.** If a computer stores a number in a fixed number of bits, there is a largest value it can hold. With 8 bits, the largest is 255 (`11111111`). Add 1 more and there is no ninth bit to hold the carry, so — depending on the system — the number may "wrap around" to 0, or the program may report an error. This is called **overflow**.

Real systems usually use 32 or 64 bits for numbers, so the limits are enormous (a 64-bit whole number can go past nine quintillion). But overflow still happens in real software. A famous rule of thumb in engineering is: *any counter will eventually be bigger than you expected.* Databases have run out of ID numbers for their rows because the ID column was 32 bits and the table grew past about 2.1 billion rows. You will see how to choose sizes correctly in the database chapters.

**Decimal fractions are approximations.** In decimal, some fractions cannot be written exactly: one-third is `0.3333…` forever. Binary has the same problem, but with different fractions. The number 0.1 — which is simple in decimal — cannot be written exactly in binary. It becomes a long repeating pattern, and the computer stores the closest value that fits in its bits.

So when a program adds 0.1 and 0.2, it is really adding two tiny approximations, and the result is a tiny bit off: `0.30000000000000004`. This is not a bug in any particular language. It is how almost all computers store fractions, using a standard called **floating point**.

> [!WARNING]
> Because of floating point, **never store money as a fractional number** like `19.99`. Small errors add up over thousands of transactions, and accounts stop balancing. Real financial systems store money as a whole number of the smallest unit — for example, 1999 cents or paisa instead of 19.99 — or they use special decimal number types. You will learn exactly how in the JavaScript and database chapters. Banks, payment companies and online shops all follow this rule.

### Level 5 — Text: turning letters into numbers

If a computer can only store numbers, how does it store the letter **A**?

The answer is simple: everyone agrees on a table that gives each character a number. The computer stores the number, and when it is time to show it on screen, it looks the number up in the table and draws the matching letter.

The earliest widely used table was **ASCII** (American Standard Code for Information Interchange), created in the 1960s. It covers 128 characters: English letters, digits, punctuation and some control codes. In ASCII:

```text
 character   number   binary
 A           65       01000001
 B           66       01000010
 a           97       01100001
 0 (digit)   48       00110000
 space       32       00100000
```

Notice that the *digit* `0` is number 48, not the number zero. The character "0" that you type and the number 0 that you calculate with are different things to a computer. This distinction appears constantly in programming.

ASCII had a big problem: it only covered English. There was no room for Urdu, Arabic, Chinese, Hindi, accented European letters or emoji. Different countries invented their own incompatible tables, and text written on one computer often appeared as nonsense on another.

The solution is **Unicode** — one giant table that gives a unique number to every character in every writing system, plus symbols and emoji. Unicode has room for over a million characters. The letter A is still 65 (Unicode kept ASCII's numbers for compatibility), the Urdu letter ب has its own number, and so does 😀.

Unicode says *which number* each character has. A separate decision is *how to store that number as bytes*. The most common way is **UTF-8**. In UTF-8:

- English letters and digits take **1 byte** each (exactly like ASCII, so old English text is already valid UTF-8).
- Most other alphabets, including Arabic and Urdu letters, take **2 bytes**.
- Chinese, Japanese and many symbols take **3 bytes**.
- Emoji usually take **4 bytes**.

UTF-8 is used by almost every website and modern system. When you build software, you will nearly always use it.

### Level 6 — When text goes wrong in production

Remember the name *José* appearing as *JosÃ©*? Here is exactly what happens.

In UTF-8, the letter **é** is stored as two bytes. Suppose one part of a system writes the name in UTF-8, but another part reads those bytes using an old one-byte-per-character table. The reader sees two bytes and draws two separate characters — **Ã** and **©** — instead of one **é**.

This garbled text has a name: **mojibake** (a Japanese word meaning "character transformation"). It is a real and common production bug. It appears when:

- a database is set to an old character encoding while the application sends UTF-8;
- a file is saved in one encoding and opened in another;
- a web page does not declare its encoding, and the browser guesses wrongly.

The fix is always the same principle: **use UTF-8 everywhere, and say so explicitly** — in the database settings, in the files, and in the web pages. Large companies serving many languages, such as e-commerce platforms selling across countries, treat consistent encoding as a basic requirement, because one misconfigured component can corrupt customer names and addresses for millions of records.

### Everything else is numbers too

Once you see that text is numbers, the pattern is clear: **everything a computer handles is ultimately numbers stored as bits.**

- **Colours** on a screen are usually three numbers — how much red, green and blue light to mix — each from 0 to 255. Pure red is (255, 0, 0). White is (255, 255, 255). Black is (0, 0, 0).
- **Pictures** are a grid of tiny dots called **pixels**. Each pixel is a colour, so a picture is a long list of colour numbers. A photo 4,000 pixels wide and 3,000 high has 12 million pixels; at 3 bytes per pixel, that is 36 MB before compression. (Formats like JPEG and PNG **compress** the data — store it more cleverly — so the file is much smaller.)
- **Sound** is a list of numbers measuring the height of a sound wave, taken tens of thousands of times per second.
- **Programs themselves** are numbers too. Every instruction the processor can follow has a number. A program is a long list of these instruction numbers.

The meaning of a set of bits depends entirely on how a program **interprets** them. The byte `01000001` is the number 65 if you treat it as a number, the letter A if you treat it as text, and a dark shade of blue if you treat it as part of a colour. The bits are the same. The interpretation is different. Much of programming is about keeping track of what kind of data you have — a theme that returns in the chapter on data types.

## The parts of a computer

Now that you know *what* a computer stores, let us look at *where*. Every computer — your laptop, your phone, a server in a data centre — has the same main parts.

```text
     +-----------------------------------------------------+
     |                    MOTHERBOARD                      |
     |                                                     |
     |   +---------+      +-------------+                  |
     |   |   CPU   |<---->|   MEMORY    |                  |
     |   | (brain) |      |   (RAM)     |                  |
     |   +----+----+      +-------------+                  |
     |        |                                            |
     |        +-----------+----------------+               |
     |                    |                |               |
     |             +------+------+   +-----+------+        |
     |             |  STORAGE    |   |  INPUT and |        |
     |             | (SSD / HDD) |   |  OUTPUT    |        |
     |             +-------------+   | devices    |        |
     |                               +------------+        |
     +-----------------------------------------------------+
```

The **motherboard** is the main circuit board that everything plugs into. It carries the electrical connections that let the parts talk to each other. The arrows in the diagram show the paths data travels along. The most important path is between the **CPU** and **memory**, because that is where almost all the work happens.

Let us look at each part in turn.

## The processor (CPU)

### Level 1 — The clerk who follows instructions

The **CPU** (Central Processing Unit), often just called the **processor**, is the part that does the work. It is the clerk in our office analogy: it reads instructions one after another and carries them out.

The CPU is surprisingly simple in *what* it can do. Each instruction is tiny:

- add two numbers;
- compare two numbers;
- copy a number from one place to another;
- jump to a different instruction depending on the result of a comparison.

That is roughly it. A CPU cannot "show a web page" or "send an email" as a single instruction. Those are built out of millions of these tiny steps. The CPU's power comes from doing them unbelievably fast.

### Level 2 — The fetch-execute cycle

The CPU works in a loop that never stops while the computer is on. It is called the **fetch–decode–execute cycle**:

```text
         +------------------------------+
         |                              |
         v                              |
   1. FETCH the next instruction        |
      from memory                       |
         |                              |
         v                              |
   2. DECODE it: work out what          |
      the instruction means             |
         |                              |
         v                              |
   3. EXECUTE it: add, compare,         |
      copy or jump                      |
         |                              |
         +------------------------------+
              then go back to step 1
```

1. **Fetch.** The CPU reads the next instruction from memory. It keeps track of where it is with a tiny internal storage space called the **program counter**, which holds the memory location of the next instruction.
2. **Decode.** It works out which operation the instruction asks for and which data it needs.
3. **Execute.** It carries out the operation. If the instruction is a "jump", the program counter changes, and the next fetch comes from a different place — this is how programs make decisions and repeat things.

Then it goes back to step 1. Billions of times per second.

Inside the CPU are a few very small, very fast storage slots called **registers**. The CPU can only calculate with values that are in its registers, so a great deal of its work is moving data between memory and registers.

> [!INSIDE]
> When you later write a line of code such as "add the price to the total", the computer does not run that sentence directly. Your line is translated into a handful of tiny CPU instructions — something like: *copy the total from memory into register 1; copy the price from memory into register 2; add register 2 to register 1; copy register 1 back to memory where the total lives.* {{ch:from-code-to-running-program}} explains how that translation happens.

### Level 3 — Clock speed

The CPU's steps are kept in rhythm by a **clock** — an electronic signal that ticks at a steady rate. Each tick lets the CPU move forward. Clock speed is measured in **hertz** (ticks per second). A 3 GHz (gigahertz) processor ticks **three billion times per second**.

That number is hard to imagine. If every tick were one second, a single second of a 3 GHz processor's work would take you about 95 years.

Clock speed is not the whole story of performance, though. Modern CPUs can often finish several instructions per tick, and some instructions take many ticks. So two processors with the same clock speed can perform very differently.

### Level 4 — Cores: more than one clerk

For a long time, processors got faster mainly by ticking faster. Around the mid-2000s, that hit physical limits — faster clocks produced too much heat. So manufacturers started putting **several complete processors on one chip**. Each one is called a **core**.

A 4-core CPU is like an office with four clerks. Four different jobs can be worked on at exactly the same moment. A typical laptop today has between 4 and 16 cores; large servers can have more than 100.

But here is the catch, and it matters a great deal later in this book: **more cores only help if the work can be split up.** If you have one long task where each step depends on the result of the step before, four clerks are no faster than one — three of them just sit and wait.

> [!ANALOGY]
> Cooking a meal for a hundred people goes faster with four cooks: one chops, one fries, one bakes, one plates. But boiling a single egg does not go faster with four cooks. The egg takes the time it takes.
>
> **Where the analogy breaks:** human cooks naturally coordinate by talking. Software running on several cores has to coordinate deliberately and carefully. If two cores change the same piece of data at the same moment without coordinating, the data can become corrupted. This problem — called a **race condition** — is one of the hardest bugs in software, and we will meet it properly in the chapters on asynchronous code, databases and distributed systems.

This is also why the same program can show "25% CPU usage" on a 4-core computer while running as fast as it possibly can: it is using one core fully and the other three are idle.

### Level 5 — What this means for real software

Knowing how the CPU works helps you make real engineering decisions:

- **Some work is "CPU-bound".** Resizing images, encrypting data, compressing video or calculating complex reports keep the CPU busy the whole time. Making this work faster means doing less calculation or spreading it across cores or machines.
- **Most web application work is not CPU-bound.** A typical web server spends most of its time *waiting* — for the database to reply, for a file to load, for another service across the network. During that waiting, the CPU is idle. This is why the JavaScript runtime you will learn, Node.js, is designed around doing other work while waiting, rather than around using many cores. {{ch:the-event-loop}} explains this in detail.
- **Servers are priced partly by cores.** When you rent computers in the cloud (Part X), the number of virtual CPUs ("vCPUs") is one of the main things you pay for. Knowing whether your work is CPU-bound tells you whether paying for more cores will help at all.

## Memory (RAM)

### Level 1 — The desk

**Memory**, usually called **RAM** (Random Access Memory), is where the computer keeps the data and instructions it is working with *right now*.

In our office analogy, RAM is the clerk's desk. Papers on the desk can be reached instantly. But the desk is limited in size, and — this is the crucial part — **when the office closes for the night, the desk is cleared.** Everything on it is thrown away.

### Level 2 — Addresses and volatility

You can picture RAM as a very long row of numbered boxes. Each box holds one byte. The number of a box is called its **address**.

```text
  address:   0     1     2     3     4     5     6    ...  8,000,000,000
           +-----+-----+-----+-----+-----+-----+-----+     +-----+
  value:   |  72 | 101 | 108 | 108 | 111 |  0  |  17 | ... |  0  |
           +-----+-----+-----+-----+-----+-----+-----+     +-----+
```

In this diagram, the boxes at addresses 0 to 4 hold the numbers 72, 101, 108, 108 and 111. If a program treats those as text, they are the letters **H, e, l, l, o**. A computer with 8 GB of RAM has about eight billion of these boxes.

"Random access" means the CPU can jump straight to *any* box by its address, equally quickly, without going through the boxes before it. Box 5 and box 7,000,000,000 take the same time to reach.

Two properties of RAM matter to every programmer:

1. **RAM is fast.** The CPU can read from it in roughly a hundred nanoseconds (a nanosecond is a billionth of a second).
2. **RAM is volatile.** *Volatile* means it needs electrical power to keep its contents. **When the power goes off, everything in RAM is lost.**

### Level 3 — What lives in RAM

When you open a program, the computer copies the program's instructions from storage into RAM, because the CPU can only run instructions that are in memory. As the program runs, all of its working data lives in RAM too: the text you are typing in a document, the items in an online shopping basket on the server, the numbers a calculation is using.

This explains the first problem from the start of the chapter. "My program was working, I restarted the computer, and all the data disappeared." The program stored its data only in RAM — for example, in variables, which you will meet in {{ch:first-program}}. Restarting cleared RAM. To keep data, a program must deliberately write it to **storage**.

### Level 4 — Running out of memory

RAM is limited. When programs together need more memory than the computer has, a few things can happen:

- The operating system can move some less-used data from RAM onto storage temporarily. This is called **swapping** or using a **page file**. It keeps things running, but storage is far slower than RAM, so everything becomes sluggish.
- If even that is not enough, programs start failing with **out of memory** errors, or the operating system forcibly stops a program to free its memory.

This is the answer to the server question from the start of the chapter: "out of memory" refers to RAM, not the disk. A server can have 500 GB of free disk space and still run out of its 4 GB of RAM.

> [!NOTE]
> This happens on ordinary laptops too. If many large applications are open at once — several code editors, a browser with many tabs, chat apps — RAM fills up, the system swaps heavily, and eventually programs crash with out-of-memory errors. Closing applications you are not using is the immediate fix.

### Level 5 — Memory in professional engineering

In real systems, memory use is something engineers measure and plan for:

- **Memory leaks.** A program has a **memory leak** when it keeps holding on to memory it no longer needs, so its memory use grows and grows until it crashes. A web server with a small leak might run fine for days and then crash at the busiest moment. You will learn how leaks happen in JavaScript and how to find them in {{ch:advanced-javascript}}.
- **Choosing server size.** Cloud servers are sold with a fixed amount of RAM. Engineers estimate how much memory each running copy of their application needs and choose servers accordingly. Too little and the application crashes; too much and the company pays for memory it never uses.
- **Keeping frequently used data in RAM.** Because RAM is so much faster than storage, systems deliberately keep popular data in memory. Databases keep their most-used data in RAM. Tools like **Redis** ({{ch:redis}}) exist entirely to store data in memory for speed. The cost is that RAM is expensive and volatile, so it is used as a fast copy, not as the only copy.

## Storage (SSD and hard disk)

### Level 1 — The filing cabinet

**Storage** is where data is kept *permanently* — even when the power is off. In the office analogy, it is the filing cabinets in the back room. They hold far more than the desk, and nothing is lost overnight, but fetching something from them takes much longer.

### Level 2 — Two kinds of storage

There are two main kinds of storage device:

- A **hard disk drive (HDD)** stores data magnetically on spinning metal platters, read by an arm that moves across them — rather like a record player. Because parts physically move, it is slow to jump between different locations. HDDs are cheap per gigabyte and still used for storing very large amounts of data.
- A **solid-state drive (SSD)** stores data in electronic chips with no moving parts. It is much faster than an HDD, especially for jumping between locations, and is now standard in laptops and most servers.

Both are **non-volatile**: their contents survive when the power goes off. This is the defining difference from RAM.

| | RAM (memory) | SSD / HDD (storage) |
|---|---|---|
| What it is for | Data being worked on right now | Data that must be kept |
| Survives power off? | **No** (volatile) | **Yes** (non-volatile) |
| Speed | Very fast | Much slower |
| Typical size in a laptop | 8–32 GB | 256 GB – 2 TB |
| Cost per GB | High | Low |

### Level 3 — Files and folders

Storage itself is just a huge collection of bytes. To make it usable, the operating system organises it into **files** and **folders** (also called **directories**).

- A **file** is a named collection of bytes — a document, a photo, a program. Its name usually ends with an **extension** such as `.txt`, `.jpg` or `.js` that hints at what kind of data it contains. The extension is only a hint; the data inside is what really matters.
- A **folder** is a named container for files and other folders. Folders inside folders form a tree.

The location of a file is described by its **path** — the list of folders you go through to reach it, from the top of the tree. On Windows, a path looks like this:

```text
C:\Users\Ali\Documents\notes.txt
```

On macOS and Linux, it looks like this:

```text
/home/ali/documents/notes.txt
```

Read each one left to right, as a series of steps. In the Windows path, `C:` is the drive, and each backslash `\` separates one folder name from the next: start at drive C, go into `Users`, then `Ali`, then `Documents`, and there is the file `notes.txt`. macOS and Linux use forward slashes `/` instead of backslashes and have no drive letter; the path starts at `/`, which is called the **root** — the top of the whole tree.

Paths are everywhere in programming. You will work with them constantly from {{ch:the-terminal}} onwards.

### Level 4 — Saving is a deliberate act

Here is the idea that connects memory and storage:

> When you edit a document, your changes live in RAM. When you press **Save**, the program copies the data from RAM to a file in storage.

If the computer loses power before you save, the changes in RAM are gone. The last saved version on storage survives. Every program you write that needs to remember something — a user's account, an order, a message — must do the same thing deliberately: write the data to storage, usually by sending it to a **database**, which is a program designed to store data safely and find it quickly. Part VIII of this book is entirely about databases.

### Level 5 — Durability in real systems

In professional systems, "saved" is more subtle than it looks.

When a program writes to a file, the operating system often keeps the data in RAM for a short time and writes it to the drive a moment later, because writing in larger batches is faster. If the power fails in that moment, data the program *thought* was saved can be lost.

Systems that cannot afford to lose data — banks, payment systems, hospital records — must deal with this explicitly. Databases force important data all the way to the physical drive before telling the application "your transaction is saved". This guarantee is called **durability**, and it is one of the four famous properties of database transactions that you will study in {{ch:transactions}}.

### Level 6 — Storage at enterprise scale

At very large scale, even durable storage on one machine is not enough, because machines fail. Drives wear out; whole servers die; occasionally an entire data centre loses power.

So large systems store **several copies** of important data on different machines, often in different buildings or cities. This is called **replication** ({{ch:replication}}). Cloud storage services such as Amazon S3 ({{ch:s3}}) are designed to store multiple copies across separate facilities automatically, so that the loss of one drive or one building does not lose a customer's files. The basic principle is the same one you learned above — RAM is temporary, storage is permanent — extended to "one machine is temporary; many copies are permanent".

## The speed gap: why it shapes everything

We have said RAM is "fast" and storage is "slower". The real difference is far larger than most people imagine, and it is one of the most important facts in software engineering.

Here are rough, typical times for a modern computer to fetch a small piece of data from each place. These are approximate and vary by hardware, but the *proportions* are what matter:

| Where the data is | Rough time to reach it | If a CPU register took 1 second… |
|---|---|---|
| CPU register | under 1 nanosecond | 1 second |
| CPU cache (small, very fast memory on the CPU chip) | about 1–10 nanoseconds | a few seconds |
| RAM | about 100 nanoseconds | a couple of minutes |
| SSD | about 50–150 microseconds (thousands of nanoseconds) | one to two days |
| Hard disk (HDD) | about 5–10 milliseconds (millions of nanoseconds) | several months |
| Another computer across the internet | about 10–200 milliseconds | years |

Look at the last column. If fetching from a register took one second, fetching from RAM would take a couple of minutes, from an SSD about a day or two, and from a server on another continent, years.

You may have noticed a new item: the **CPU cache**. Because RAM is so slow compared with the CPU, processors contain a small amount of extremely fast memory right on the chip. The CPU automatically keeps copies of recently used data there. When the data it needs is already in the cache — called a **cache hit** — it avoids a slow trip to RAM.

> [!SENIOR]
> This table explains a huge number of engineering decisions you will meet in this book:
>
> - **Why caching exists everywhere.** If data is slow to fetch, keep a copy somewhere faster. CPUs cache RAM. Operating systems cache files in RAM. Applications cache database results in Redis. Websites cache pages in servers close to users (content delivery networks, {{ch:cloudfront}}). It is the same idea at every level.
> - **Why databases use indexes** ({{ch:indexes}}): to find data by reading a few small pieces from storage instead of scanning everything.
> - **Why network calls are the first thing to suspect** when a web page is slow. One trip across the internet costs more than millions of operations in memory.
> - **Why "chatty" designs are slow.** A program that makes a hundred small trips to a database is usually much slower than one that asks for everything in a single trip, even if the total data is the same.
>
> Experienced engineers carry a rough version of this table in their heads and use it to estimate whether an idea will be fast enough *before* building it.

## The operating system

### Level 1 — The office manager

You now know the hardware: CPU, memory and storage. But if every program had to control the hardware directly, chaos would follow. Two programs might try to use the same memory. A buggy game could overwrite your documents. Every program would need its own code to talk to every model of keyboard, screen and drive.

The **operating system** (OS) solves this. It is the main piece of software that runs the computer and sits between the hardware and every other program. Windows, macOS, Linux, Android and iOS are operating systems.

In the office analogy, the operating system is the **office manager**. Clerks (programs) do not walk into the filing room and rearrange the cabinets themselves. They ask the manager, who keeps everything organised, makes sure clerks do not interfere with each other, and decides who gets to use what.

### Level 2 — What the operating system does

The operating system has several main jobs:

1. **Running programs.** It loads programs from storage into memory and gives them turns on the CPU.
2. **Managing memory.** It gives each program its own section of RAM and stops programs from reading or overwriting each other's memory.
3. **Managing files.** It organises storage into files and folders, and controls who can read or change each one.
4. **Talking to hardware.** It uses small programs called **drivers** to communicate with each specific device — a particular graphics card, printer or Wi-Fi chip — so that other programs do not have to.
5. **Providing services.** It offers programs standard ways to do common things: open a file, send data over the network, show a window, read the time.

When a program wants to do any of these things, it makes a **system call** — a request to the operating system. A program cannot simply grab the hard drive; it asks the OS to open a file on its behalf, and the OS checks whether the program is allowed to.

```text
   +----------+  +----------+  +----------+
   | Browser  |  | Code     |  | Music    |      programs
   |          |  | editor   |  | player   |      (software you use
   +----+-----+  +----+-----+  +----+-----+       and will write)
        |  system calls  |             |
        v                v             v
   +-------------------------------------------+
   |            OPERATING SYSTEM               |  manages everything
   |  programs · memory · files · devices      |
   +-------------------------------------------+
        |                |             |
        v                v             v
   +---------+   +-----------+   +-----------+
   |   CPU   |   |  MEMORY   |   |  STORAGE  |     hardware
   +---------+   +-----------+   +-----------+
```

The diagram shows the layers. Programs sit at the top and never touch the hardware directly. Every request goes down through the operating system, which decides how to carry it out.

### Level 3 — Programs and processes

Two words that sound similar mean different things:

- A **program** is a file in storage containing instructions — for example, the file that holds a web browser. It just sits there.
- A **process** is a program that is **running**: it has been loaded into memory, it has its own section of RAM, and the operating system is giving it turns on the CPU.

You can run the same program several times at once, and each one is a separate process with its own memory. Open two windows of a text editor and, depending on the editor, you may have two processes from one program.

> [!ANALOGY]
> A program is like a recipe written in a cookbook. A process is someone actually cooking that recipe in a kitchen. The recipe can sit on the shelf for years doing nothing. Two people can cook the same recipe at the same time in two kitchens, each with their own ingredients.
>
> **Where the analogy breaks:** a cook can improvise when a recipe is unclear. A process never improvises. It does exactly what the instructions say, even when the instructions are obviously wrong.

### Level 4 — Sharing the CPU

A laptop with 8 cores may be running hundreds of processes at once. How?

The operating system switches between them extremely quickly. It lets one process use a core for a few thousandths of a second, then pauses it, saves exactly where it was, and lets another process run. This is called **scheduling**. Because the switching happens hundreds or thousands of times per second, it looks to you as if everything runs at once.

Most processes, most of the time, are not using the CPU at all. They are **waiting** — for you to press a key, for a file to load, for a network reply. A waiting process takes no CPU time; the operating system simply does not schedule it until whatever it was waiting for arrives.

### Level 5 — Permissions and isolation

Because the operating system sits in the middle of everything, it is also the main guard of security.

- Each process gets its own private memory, so a buggy or malicious program cannot read your banking app's memory.
- Each file has **permissions** — rules about which users and programs may read, change or run it. You will work with permissions directly in the Linux chapter ({{ch:linux}}), because getting them wrong on a server is a common cause of both outages ("the application cannot read its own configuration file") and security holes ("anyone can read the file containing the database password").

### Level 6 — Operating systems in the world of servers

As a backend engineer, you will spend much of your time with **Linux**, an operating system that runs the large majority of the world's web servers and cloud computers. It is free, very stable, and controlled mostly by typing commands rather than clicking — the skill {{ch:the-terminal}} begins teaching.

Later in the book you will see two technologies that build on the operating system's ability to isolate processes:

- **Virtual machines** ({{ch:ec2}}) let one physical server pretend to be many separate computers, each with its own operating system. This is how cloud providers rent you a "server" that is really a slice of a much larger machine.
- **Containers** such as Docker ({{ch:docker}}) go one step lighter: many isolated applications share one operating system, but each believes it has the machine to itself.

Both are extensions of the same idea you learned here — the operating system keeping programs separate from each other and from the hardware.

## Putting it all together: what happens when you open a program

Let us follow every part through one everyday action: you double-click a text editor and open a file called `notes.txt`.

1. **Input.** Your mouse sends a signal. The operating system's mouse driver receives it and works out that you double-clicked the editor's icon.
2. **Loading.** The operating system finds the editor's program file in **storage** and copies its instructions into **RAM**. Storage is slow, which is why large programs take a moment to open.
3. **A new process.** The operating system creates a **process** for the editor, gives it its own section of memory, and starts **scheduling** it on the **CPU**.
4. **Fetch–execute.** The CPU begins fetching the editor's instructions from RAM and executing them, billions per second. Many of those instructions are requests to the operating system — **system calls** — such as "please create a window".
5. **Opening the file.** You choose `notes.txt`. The editor makes a system call asking the operating system to open the file. The OS checks the file's **permissions**, finds it using its **path**, and reads its bytes from **storage** into the editor's memory.
6. **Interpreting the bytes.** The file's bytes are numbers. The editor treats them as **UTF-8** text and converts each number into a character.
7. **Output.** The editor asks the operating system to draw those characters in its window. The graphics driver turns them into coloured **pixels** on your screen.
8. **Editing.** As you type, your changes go into **RAM** only. The file in storage is unchanged.
9. **Saving.** You press Save. The editor asks the OS to write the bytes from RAM back to the file in **storage**. Now your changes will survive a power cut.

Every application you will ever build follows the same basic path: data comes in, lives in memory while it is worked on, is saved to storage to be kept, and goes out as output. The rest of this book teaches you to build each step well.

## Real-world use cases

The ideas in this chapter appear in real engineering decisions every day. Here are four examples, from a small project to a large company. All of them are illustrative — typical situations rather than descriptions of a specific company.

### Beginner level — A to-do list that forgets everything

**Business problem:** a student builds a to-do list app for themselves. They add tasks, close the app and reopen it — and every task has disappeared.

**Technical problem:** the tasks were stored only in the program's memory (RAM). When the process ended, its memory was released.

**Solution:** save the tasks to storage whenever they change — at first to a simple file on disk, later to a database — and load them from storage when the app starts.

**Reasoning:** RAM is temporary and storage is permanent. Anything that must outlive the process must be written to storage.

**Trade-off:** writing to storage is much slower than writing to memory. For a to-do list this does not matter at all. For a system handling thousands of changes per second, *how often* and *how* you write becomes an important design question.

### Intermediate level — An online shop's slow product page

**Business problem:** an online clothing shop's product pages take three seconds to load, and customers leave before buying.

**Technical problem:** for each page, the server makes forty separate requests to the database — one for the product, one for each size, one for each review. Each request is a trip across the network between two machines.

**Solution:** ask the database for everything in a few combined requests, and keep a copy of popular product pages in fast memory (a **cache**) for a short time.

**Reasoning:** the speed table. Forty network trips cost far more than the calculation itself. Fewer trips, and serving repeated requests from RAM, makes the page dramatically faster.

**Trade-off and failure scenario:** a cached copy can be out of date. If the price changes, customers may briefly see the old price. The shop must decide how long a cached copy may live, and refresh it when the product changes. You will learn exactly how in {{ch:caching}}.

### Advanced level — A payment service that must never lose money

**Business problem:** a payment company processes card payments for many shops. A payment reported as "successful" must never vanish, even if a server loses power.

**Technical problem:** data written by a program can sit briefly in the operating system's memory before reaching the physical drive. A power cut at that moment loses it.

**Solution:** use a database that guarantees **durability** — it confirms a payment only after the data has been forced onto the physical drive — and keep **replicas** of the data on other machines.

**Reasoning:** the company would rather each payment take a few extra milliseconds than risk reporting success for a payment it later cannot find.

**Trade-off:** forcing every write to disk and copying it to other machines makes each operation slower and the system more expensive. For payments that is clearly worth it. For something like counting page views, it would be wasted cost.

### Enterprise level — Choosing servers for a large logistics platform

**Business problem:** a logistics company tracks millions of parcels. Its route-planning service is slow at busy times, and its cloud bill is rising fast.

**Technical problem:** engineers measure the service and find two different kinds of work. Route calculation is **CPU-bound** — it keeps the processor fully busy. The tracking-page service is **waiting-bound** — it spends most of its time waiting for the database and uses little CPU.

**Solution:** run route calculation on servers with many cores, splitting each batch of routes across them. Run the tracking service on cheaper servers with fewer cores, and add caching so it waits less.

**Reasoning:** more cores only help work that can be split up and that actually uses the CPU. Buying large servers for the waiting-bound service would cost money and change nothing.

**Failure scenario to watch for:** if the route calculation's memory use is not measured, the larger servers may run out of RAM under heavy load and crash at the busiest time — exactly when the company most needs them.

## Common mistakes

### Beginner mistake — Thinking memory and storage are the same thing

**What it looks like:** saying "my computer has 512 GB of memory" when it has 512 GB of *storage* and 8 GB of memory; or expecting data held in a running program to still be there after a restart.

**Why people make it:** everyday language uses "memory" loosely, and phone adverts often call storage "memory".

**What happens:** programs lose data unexpectedly, and you misread problems — like hunting for disk space when the real problem is running out of RAM.

**How to spot it:** ask, "Where does this data live, and does it survive the power going off?"

**How to fix and prevent it:** use the words precisely. **Memory (RAM)** is fast and temporary. **Storage** is slower and permanent. Anything that must be kept must be written to storage.

### Beginner mistake — Expecting exact results from fractional numbers

**What it looks like:** checking whether `0.1 + 0.2` equals `0.3`, and being surprised that it does not.

**Why people make it:** in school maths these decimals are exact.

**What happens:** comparisons fail, totals are slightly wrong, and in money calculations, errors add up over many transactions.

**How to fix and prevent it:** remember that fractions are approximations in floating point. Store money as whole numbers of the smallest unit, or use proper decimal types. Compare fractional results with a small tolerance rather than exact equality. You will practise this in {{ch:types-of-data}}.

### Intermediate mistake — Assuming "more cores" means "faster"

**What it looks like:** a slow application, and a decision to move it onto a server with twice the cores.

**Why people make it:** more of something sounds like more speed.

**What happens:** if the application spends its time waiting for a database or network, or does its work as one sequential task, nothing changes except the bill.

**How to spot it:** measure first. If CPU usage stays low while the application is slow, the CPU is not the problem.

**How to fix and prevent it:** find out where the time actually goes before choosing a fix. You will learn the tools for this in the performance chapters.

### Production mistake — Character encoding mismatches

**What it looks like:** customer names with accents or non-English letters appear garbled, like *JosÃ©*, on invoices or in the admin panel.

**Why people make it:** one component — often an old database or a file export — was left on a default encoding that is not UTF-8. Everything looks fine in testing with plain English names.

**What happens:** corrupted names and addresses, failed deliveries, angry customers. Worse, if garbled text is saved again, the original data can be permanently damaged.

**How to spot it:** test with names in several languages, including accented letters and emoji, in every part of the system.

**How to fix and prevent it:** use UTF-8 in every layer — files, database, application, web pages — and state it explicitly in each one's settings.

### Enterprise mistake — Treating one machine as permanent

**What it looks like:** storing a company's only copy of important data on a single server's drive.

**Why people make it:** the server has run reliably for years, and copies cost money.

**What happens:** drives and servers eventually fail. When this one does, the data is gone. Companies have lost years of records this way.

**How to fix and prevent it:** keep backups that are regularly tested by actually restoring them, and keep replicas of critical data on separate machines and locations. Part VIII and Part X cover how.

## Debugging and troubleshooting

You do not write programs yet, but you can already use the operating system's own tools to see the ideas in this chapter. Every operating system has a way to see running processes and how much CPU and memory they use:

- **Windows:** press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Esc</kbd> to open **Task Manager**. The *Processes* tab lists running processes. The *Performance* tab shows CPU, memory and disk use over time.
- **macOS:** open **Activity Monitor** from Applications → Utilities.
- **Linux:** run the command `top` in a terminal ({{ch:the-terminal}} teaches the terminal).

Here is how to read common symptoms:

| Symptom | Likely cause | What to check |
|---|---|---|
| Everything is slow; the disk is constantly busy | RAM is full and the system is swapping to storage | Memory usage near 100%? Close unused applications. |
| One application is slow; CPU at 100% on one core | That application is doing heavy calculation | Which process is using the CPU? |
| Applications crash with "out of memory" | Not enough RAM for everything running | Memory usage, and which processes use the most |
| An application's memory grows steadily for hours | Possibly a memory leak | Watch that process's memory over time |
| Text shows strange symbols like `Ã©` | Character encoding mismatch | Which encoding the file or system is using |

> [!TRY]
> Open Task Manager (or Activity Monitor) now. Find the three processes using the most memory. Then check how much RAM your computer has in total and how much is in use. Is it close to full? Which applications would you close first if it were?

## How a senior engineer thinks about hardware

> [!SENIOR]
> Experienced engineers rarely think about transistors or binary day to day. But they constantly use the *consequences* of this chapter:
>
> - **"Where does this data live, and what happens if this machine dies?"** If the answer is "only in memory" or "only on this one server", that is a risk they make a deliberate decision about.
> - **"Is this slow because of calculation, or because of waiting?"** They measure before buying bigger servers or rewriting code.
> - **"How many trips does this make?"** Across the network, to the disk, to the database. Trips usually cost more than calculation.
> - **"What is the largest this number can ever get?"** For IDs, counters and file sizes, they choose types that will not overflow when the business grows.
> - **"Is text handled as UTF-8 everywhere?"** They test with real names in many languages, not just English.
>
> None of these questions needs advanced knowledge. They need the clear picture of the machine you now have.

## Exercises

### Exercise 1 — Binary practice

**Objective:** become comfortable with how numbers are stored in binary.

**Starting point:** the position values from the chapter: 128, 64, 32, 16, 8, 4, 2, 1.

**What to do:**

1. Convert these binary numbers to decimal: `00000111`, `00010000`, `11111111`.
2. Convert these decimal numbers to binary (use 8 digits): 9, 100.
3. What is the largest number that fits in 4 bits?

**Hints:** for binary to decimal, add the position values wherever there is a 1. For decimal to binary, take away the largest position value that fits, and repeat.

<details>
<summary>Show the solution</summary>

**1. Binary to decimal**

- `00000111` — the 1s are under 4, 2 and 1. So 4 + 2 + 1 = **7**.
- `00010000` — a single 1 under 16. So **16**.
- `11111111` — every position is 1: 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = **255**. This is the largest value one byte can hold, which is why the byte has 256 combinations (0 to 255).

**2. Decimal to binary**

- **9**: the largest value that fits is 8, leaving 1. Then 1 fits, leaving 0. So we have 1s under 8 and 1: `00001001`.
- **100**: 64 fits (leaving 36), then 32 (leaving 4), then 4 (leaving 0). 1s under 64, 32 and 4: `01100100`.

**3. Largest number in 4 bits**

All four bits set to 1: `1111` = 8 + 4 + 2 + 1 = **15**. Four bits give 16 combinations (0 to 15).

**Common wrong approach:** reading binary from left to right with the left digit worth 1. The rightmost digit is always the "ones" position, just as in ordinary decimal numbers.

</details>

### Exercise 2 — Estimate the size of data

**Objective:** practise turning real information into bytes, the way engineers estimate how much storage or memory a system needs.

**Starting point:** English text in UTF-8 takes about 1 byte per character.

**What to do:**

1. A customer record has a name (about 30 characters), an email (about 30 characters), an address (about 100 characters) and a phone number (about 15 characters). Roughly how many bytes is one record?
2. An online shop has 2 million customers. Roughly how much storage do all the customer records need?
3. Would all the customer records fit in the RAM of a server with 4 GB?

<details>
<summary>Show the solution</summary>

1. 30 + 30 + 100 + 15 = **175 bytes**, so roughly **200 bytes** per record. Engineers round estimates up to keep them simple and safe.
2. 2,000,000 × 200 bytes = 400,000,000 bytes = **about 400 MB**.
3. **Yes, comfortably** — 400 MB is about a tenth of 4 GB. (In practice, databases add extra data for organising and indexing, so the real size might be two or three times larger — still well within 4 GB.)

This kind of estimate is called a **back-of-the-envelope calculation**, and it is a real skill used in system design interviews (Part XI). It tells you quickly whether a design is reasonable before anyone writes code.

**Common wrong approach:** forgetting to convert units consistently — for example, mixing up bits and bytes, or treating "400 million bytes" as 400 GB. Count the zeros carefully: a thousand bytes is a KB, a million is an MB, a billion is a GB.

</details>

### Exercise 3 — Investigate your own computer

**Objective:** connect this chapter's ideas to the real machine in front of you.

**What to do:** using Task Manager (Windows), Activity Monitor (macOS) or system settings, find out:

1. How many CPU cores your computer has.
2. How much RAM it has, and how much is in use right now.
3. How much storage it has, and whether it is an SSD or HDD.
4. Which process is using the most memory.

**Hints:** on Windows, Task Manager → *Performance* shows CPU (with the number of cores), Memory and Disk, including the disk type. On macOS, the Apple menu → *About This Mac* shows memory, and Activity Monitor shows processes.

<details>
<summary>Show the solution</summary>

Answers depend on your computer. A typical result looks like this:

```text
CPU:      8 cores
RAM:      8 GB total, 6.8 GB in use (85%)
Storage:  512 GB SSD, 120 GB free
Biggest:  the code editor, about 600 MB
```

Then interpret it:

- **If RAM use is above about 85–90%**, the computer is probably swapping to storage, which makes everything slow and can make programs crash with out-of-memory errors. Closing unused applications — especially several copies of large ones — is the fix.
- **If storage is nearly full**, the operating system has less room for swapping and temporary files, which causes problems of its own.
- **Notice the difference in size** between RAM (gigabytes) and storage (hundreds of gigabytes). That difference — fast but small versus slow but large — is the memory/storage trade-off from this chapter.

</details>

### Exercise 4 — Diagnose the problem (debugging scenario)

**Objective:** practise reasoning about a real-sounding problem using this chapter's ideas.

**The scenario:** a small company runs its website on one server with 2 GB of RAM and a 100 GB SSD. Every afternoon at about the same time, the website stops responding, and the logs (records the server writes about what it is doing) show "out of memory". The disk is only 30% full. A team member suggests buying a bigger disk.

**What to do:** explain whether a bigger disk will help, what is probably happening, and what you would check.

<details>
<summary>Show the solution</summary>

**A bigger disk will not help.** "Out of memory" refers to **RAM**, not the disk. The disk has plenty of free space.

**What is probably happening:** something makes memory use grow during the day until it passes 2 GB. Two common causes:

1. **More visitors in the afternoon.** Each visitor's request uses some memory. At the busiest time, the total exceeds the RAM available.
2. **A memory leak.** The application slowly holds on to more and more memory and never releases it. If memory use rises steadily from the moment the server starts, a leak is likely.

**What to check:**

- A graph of the server's memory use over the day. A rise that matches visitor numbers points to cause 1; a steady climb regardless of visitors points to cause 2.
- Which process is using the memory.

**Possible fixes:** for cause 1, a server with more RAM, or making each request use less memory. For cause 2, finding and fixing the leak (a restart only hides it until the next afternoon).

**Common wrong approach:** solving the symptom without measuring — buying storage, or restarting the server every day and calling it fixed. Measuring first is what experienced engineers do.

</details>

## Summary

A computer does four jobs: input, processing, storage and output. Everything it handles — numbers, text, colours, sound, even programs — is stored as **bits** (0s and 1s), grouped into **bytes**. Numbers are stored in **binary**; text is stored by giving each character a number, using **Unicode**, usually stored as **UTF-8**. The same bits can mean different things depending on how a program interprets them.

Fractional numbers are stored as approximations (**floating point**), so `0.1 + 0.2` is not exactly `0.3`, and money must never be stored as fractions. Whole numbers have size limits, and exceeding them causes **overflow**.

The **CPU** runs programs by fetching, decoding and executing tiny instructions billions of times per second. **Cores** let it work on several things at once, but only if the work can be split up. **RAM** is fast, temporary working space that is lost when the power goes off. **Storage** (SSD or HDD) is slower but permanent, and is organised by the operating system into **files** and **folders** reached by **paths**. The enormous speed difference between registers, cache, RAM, storage and the network explains why caching, indexes and fewer network trips matter so much.

The **operating system** manages programs, memory, files and devices, keeps processes isolated, and enforces permissions. A **program** is instructions in a file; a **process** is a program that is running.

## Key terms

- **Computer** — A machine that follows a list of instructions to take in data, process it, store it and produce results.
- **Hardware** — The physical parts of a computer, such as the processor, memory chips and storage drive.
- **Software** — Programs: the instructions that tell the hardware what to do.
- **Data** — Any information a computer works with, such as numbers, text, images or sound.
- **Program** — A precise list of instructions for a computer to follow, stored in a file.
- **Process** — A program that is currently running, with its own memory, and taking turns on the CPU.
- **Bit** — The smallest unit of data: a single 0 or 1.
- **Byte** — A group of 8 bits, able to hold 256 different values; the basic unit for measuring data size.
- **Binary** — A way of writing numbers using only two digits, 0 and 1, where each position is worth twice the one to its right.
- **Transistor** — A tiny electronic switch, billions of which inside a chip store and process bits.
- **Overflow** — What happens when a number grows larger than the space reserved for it can hold.
- **Floating point** — The standard way computers store fractional numbers, as close approximations rather than exact values.
- **ASCII** — An early table that gives a number to each English letter, digit and punctuation mark (128 characters).
- **Unicode** — A single worldwide table that gives a unique number to every character in every writing system, plus symbols and emoji.
- **UTF-8** — The most common way of storing Unicode characters as bytes, using 1 to 4 bytes per character.
- **Character encoding** — The rule a system uses to turn characters into bytes and back again.
- **Mojibake** — Garbled text that appears when bytes written in one character encoding are read using another.
- **Pixel** — One tiny dot of colour; images on a screen are grids of pixels.
- **CPU (Central Processing Unit)** — The part of the computer that carries out program instructions; also called the processor.
- **Instruction** — One tiny operation a CPU can perform, such as adding, comparing, copying or jumping.
- **Fetch–decode–execute cycle** — The endless loop in which the CPU reads the next instruction, works out what it means and carries it out.
- **Register** — A very small, extremely fast storage slot inside the CPU that holds values being calculated with.
- **Clock speed** — How many times per second the CPU's internal clock ticks, measured in hertz (for example, 3 GHz is three billion ticks per second).
- **Core** — One complete processing unit inside a CPU chip; a multi-core CPU can run several instructions streams at the same time.
- **Race condition** — A bug where the result depends on the unpredictable timing of two or more things happening at once, such as two cores changing the same data.
- **CPU-bound** — Describes work whose speed is limited by how fast the processor can calculate.
- **RAM (Random Access Memory)** — Fast, temporary working memory that holds running programs and their data, and loses its contents when the power goes off.
- **Memory address** — The number that identifies one location in memory.
- **Volatile** — Describes storage that loses its contents when the power is turned off, such as RAM.
- **Non-volatile** — Describes storage that keeps its contents when the power is turned off, such as an SSD or hard disk.
- **Swapping** — When the operating system moves data from full RAM onto slower storage to free memory, making the computer slower.
- **Memory leak** — A bug in which a program keeps holding memory it no longer needs, so its memory use grows until it may crash.
- **Storage** — Permanent data storage, such as an SSD or hard disk, that keeps data without power.
- **SSD (Solid-State Drive)** — A fast storage device with no moving parts that stores data on electronic chips.
- **HDD (Hard Disk Drive)** — A storage device that stores data magnetically on spinning platters; cheaper but slower than an SSD.
- **File** — A named collection of bytes kept in storage, such as a document, photo or program.
- **Folder (directory)** — A named container for files and other folders, forming a tree.
- **Path** — The written location of a file or folder, listing the folders you go through to reach it.
- **File extension** — The ending of a file name, such as `.txt` or `.jpg`, that hints at what kind of data the file contains.
- **Database** — A program designed to store data permanently and safely, and to find it quickly.
- **Durability** — The guarantee that once data is reported as saved, it will survive crashes and power failures.
- **CPU cache** — A small amount of very fast memory on the processor chip that keeps copies of recently used data to avoid slow trips to RAM.
- **Cache** — A faster place that keeps a copy of data so it can be reached more quickly than from its original location.
- **Operating system (OS)** — The main software that manages a computer's hardware, runs programs and provides services to them; for example Windows, macOS or Linux.
- **Driver** — A small program that lets the operating system communicate with a specific piece of hardware.
- **System call** — A request a program makes to the operating system, such as opening a file or sending data over the network.
- **Scheduling** — How the operating system decides which process runs on which CPU core, switching between them very quickly.
- **Permissions** — Rules that control which users and programs may read, change or run a file.
- **Replication** — Keeping copies of the same data on several machines so that it survives the failure of one.
- **Back-of-the-envelope calculation** — A quick, rough estimate used to check whether an idea is reasonable before building it.

## What comes next

You now have a clear picture of the machine: bits and bytes, the CPU following instructions, fast temporary memory, slow permanent storage, and the operating system managing it all.

But we have left one big question unanswered. The CPU only understands tiny numbered instructions — yet programmers write code in words like `if`, `while` and `function`. How does human-readable code become instructions a processor can execute? In the next chapter, **From Code to a Running Program**, we follow that journey: what a programming language is, how compilers and interpreters translate code, and what a "runtime" like Node.js actually does.
