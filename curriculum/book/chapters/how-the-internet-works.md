# How the Internet Works

> [!GOALS]
> - What a network is, and what the internet actually is (and is not).
> - How every device on a network gets an address — IP addresses, public and private addresses, and how your home router shares one address among many devices.
> - Why data is cut into small packets, and how routers pass those packets across the world.
> - What a protocol is, and how the internet is built from layers of protocols.
> - The difference between TCP and UDP, and how TCP makes unreliable networks reliable.
> - What ports are, and why one computer can run many network programs at once.
> - How names like `google.com` become addresses (an introduction to DNS).
> - The difference between latency and bandwidth, and why it matters for every application you build.
> - How to investigate the network yourself with `ping`, `traceroute` and `nslookup`.

## Why this matters

In {{ch:what-a-computer-is}} we looked inside one computer. But almost no modern software lives inside one computer.

When you open a shopping app, your phone talks to the shop's servers. Those servers talk to a database on another machine, to a payment company's servers, to a delivery company's servers, and to an email service. A single tap on "Place order" may cause messages to travel between a dozen computers in several countries — and the whole thing is expected to finish in under a second.

As a software engineer, especially on the backend, the network is part of nearly everything you build. Understanding it explains questions you will face constantly:

- Why does my application work on my laptop but nobody else can reach it?
- Why is this page fast in Lahore and slow in London?
- Why did this request fail "sometimes", with no change to the code?
- What does "connection refused" mean, and how is it different from "timed out"?
- Why does the server say a port is "already in use"?

This chapter answers these by following data from your computer, across the world, to another computer and back.

## The simple idea

A **network** is two or more computers connected so they can send each other messages.

The **internet** is a network of networks: millions of separate networks — homes, offices, universities, phone companies, data centres — all connected together, and all agreeing on the same rules for passing messages along. No single company owns or controls it.

> [!ANALOGY]
> The internet works very much like the postal system.
>
> - Every house has an **address**. Every device on the internet has an **IP address**.
> - You do not deliver a letter yourself. You drop it in a post box, and it is passed from post office to post office, each one sending it a step closer to its destination. On the internet, **routers** pass data along in the same way.
> - A large parcel may be split into several boxes that travel separately and are put back together at the other end. Internet data is split into **packets** in the same way.
> - Everyone follows the same rules about how to write an address on an envelope. On the internet, these shared rules are called **protocols**.
>
> **Where the analogy breaks:** the post takes days; internet packets cross the world in a fraction of a second. And the post office handles each letter carefully, while internet routers are allowed to *drop* packets when they are too busy — they simply throw them away. The internet's reliability comes from the computers at each end noticing missing packets and asking for them again, as you will see later in this chapter.

## The proper definition and key words

- **Network** — a group of devices connected so that they can exchange data.
- **Internet** — the worldwide network of interconnected networks that all use a shared set of protocols called TCP/IP.
- **Host** — any device connected to a network that can send or receive data: a laptop, phone, server, smart TV.
- **Protocol** — an agreed set of rules for how two parties communicate: what messages look like, in what order they are sent, and what each one means.
- **Client** — a program (or device) that *asks* for something. Your web browser is a client.
- **Server** — a program (or the computer running it) that *answers* requests. A website's server sends you its pages.

> [!WARNING]
> **The internet and the web are not the same thing.** The **internet** is the network itself — the "roads". The **World Wide Web** is one service that runs on top of it — web pages and websites, which travel using a protocol called HTTP. Email, video calls, online games, and apps talking to their servers also use the internet, but are not "the web". The next chapter, {{ch:how-the-web-works}}, is about the web specifically.

## Level 1 — From your computer to your router

Let us start small, with the network inside a home or office.

When you connect to Wi-Fi at home, your laptop joins a small **local area network** (LAN) — a network covering one building or room. At the centre of it is a box usually called the **router** (often combined with the Wi-Fi access point and the modem in one device provided by your internet company).

```text
         YOUR HOME NETWORK (LAN)
   +-----------------------------------------+
   |                                         |
   |   laptop      phone      smart TV       |
   |      \          |          /            |
   |       \         |         /             |
   |        +--------+--------+              |
   |                 |                       |
   |            [ ROUTER ]                   |
   +-----------------|-----------------------+
                     |
                     v
          your internet service provider
              (PTCL, Nayatel, StormFiber...)
                     |
                     v
                THE INTERNET
```

Read the diagram from top to bottom. Every device in the house connects to the router, by Wi-Fi or by cable. The router has one connection leading out of the house to your **internet service provider** (ISP) — the company you pay for internet access. The ISP connects you to the rest of the internet.

The router has two jobs:

1. **Inside the house**, it passes messages between your own devices.
2. **At the edge of the house**, it is the single doorway between your home network and the outside world. Everything leaving or arriving passes through it.

### How data physically travels

The messages themselves have to travel through something physical:

- **Wi-Fi** uses radio waves between your device and the router.
- **Ethernet cables** carry electrical signals over copper wires, common in offices and data centres.
- **Fibre-optic cables** carry pulses of light through thin strands of glass. They carry enormous amounts of data over long distances, and form the backbone of the internet.
- **Undersea cables** — fibre-optic cables laid across the ocean floor — connect the continents. The great majority of traffic between countries travels through them, not through satellites. When an undersea cable is damaged, whole regions can see slower internet for weeks while it is repaired.

Whatever the medium, the data is the same thing you learned about in {{ch:what-a-computer-is}}: bits, 0s and 1s, represented as radio signals, voltages or flashes of light.

## Level 2 — Addresses: IP addresses

For a message to reach the right device among billions, every device needs an address. On the internet, that address is an **IP address** (IP stands for Internet Protocol).

### IPv4 addresses

The most common form looks like this:

```text
192.168.1.15
```

This is an **IPv4** address (version 4 of the Internet Protocol). It is four numbers separated by dots. Each number is between 0 and 255.

Why 0 to 255? Because each of the four numbers is stored in one **byte** — 8 bits — and you learned in {{ch:what-a-computer-is}} that a byte holds 256 different values. So an IPv4 address is 4 bytes, or 32 bits.

32 bits give about **4.3 billion** possible addresses. When IPv4 was designed in the early 1980s, that seemed like plenty. Today there are far more devices than that: phones, laptops, servers, cameras, watches. The world ran out of new IPv4 addresses years ago. Two solutions emerged, and you need to understand both.

### Solution 1 — IPv6

**IPv6** is the newer version of the Internet Protocol. Its addresses are 128 bits long and look like this:

```text
2001:0db8:85a3:0000:0000:8a2e:0370:7334
```

They are written as eight groups of hexadecimal digits. (**Hexadecimal** is a way of writing numbers using sixteen digits: 0–9 and then a–f for ten to fifteen. Each hexadecimal digit represents exactly 4 bits, which makes it a compact way to write long binary values.) Groups of zeros can be shortened, so you often see addresses like `2001:db8::1`.

128 bits give an almost unimaginable number of addresses — enough for every device that will ever exist many times over. IPv6 is widely used today, especially on mobile networks, but IPv4 is still everywhere, so the two run side by side. As a developer, you will mostly see IPv4 addresses in examples and in your own work, but your code and servers should not assume every address is IPv4.

### Solution 2 — Private addresses and NAT

The second solution is the one your home network is using right now.

Some ranges of IPv4 addresses are set aside as **private addresses**. They are free for anyone to use *inside* their own network, and they are never used on the public internet. The main private ranges are:

```text
10.0.0.0      to  10.255.255.255
172.16.0.0    to  172.31.255.255
192.168.0.0   to  192.168.255.255
```

Your laptop's address at home is almost certainly in one of these ranges — very often `192.168.something.something`. So is your neighbour's laptop. Millions of homes use exactly the same private addresses, and that is fine, because private addresses only have meaning inside their own network.

Your router, however, has one **public IP address**, given to it by your ISP. That address is unique on the whole internet. It is how the outside world reaches your home.

So how do several devices with private addresses share one public address? The router uses a technique called **NAT** (Network Address Translation):

```text
  laptop  192.168.1.15  --request-->  ROUTER  --request-->  website
                                     (public:              203.0.113.50
                                      39.45.12.88)
                                        |
             remembers: "this request came from 192.168.1.15"
                                        |
  laptop  192.168.1.15  <--reply-----  ROUTER  <--reply---  website
```

Here is what happens, step by step:

1. Your laptop (private address `192.168.1.15`) sends a request to a website.
2. Before sending it out, the router replaces the "from" address with its own public address, `39.45.12.88`, and writes a note: *"this conversation belongs to 192.168.1.15"*.
3. The website only ever sees the router's public address. It sends its reply there.
4. The router receives the reply, checks its notes, and passes it to `192.168.1.15`.

> [!ANALOGY]
> NAT is like an office building with one public street address and a receptionist. Employees send letters out with the building's address as the return address. When replies arrive, the receptionist checks a log of who sent what, and delivers each reply to the right desk.
>
> **Where the analogy breaks:** the receptionist can deliver a letter that arrives unexpectedly, addressed to "the accounts department". A home router usually cannot: if a message arrives from the internet that is *not* a reply to something sent from inside, the router has no note telling it which device should receive it, so it drops it.

That last point has a big practical consequence. **A program running on your laptop at home cannot normally be reached from the internet.** If you start a web server on your laptop, you can visit it yourself, and devices on your home Wi-Fi may be able to reach it, but a friend in another city cannot. To make an application reachable by anyone, you put it on a server with a public address — which is what deployment, covered in Parts IX and X, is all about. This is also, incidentally, a useful layer of protection: random computers on the internet cannot start conversations with your laptop.

### Special addresses you will use constantly

| Address | Name | Meaning |
|---|---|---|
| `127.0.0.1` | **localhost** (loopback) | "This same computer." Messages sent here never leave your machine. |
| `localhost` | the name for the above | You will type `localhost` in your browser hundreds of times while developing. |
| `0.0.0.0` | "all addresses" (when a server listens) | A server listening here accepts connections arriving on any of the computer's network addresses. |
| `::1` | localhost in IPv6 | The IPv6 version of `127.0.0.1`. |

When you build a web application in later chapters, you will start it on your own computer and open `http://localhost:3000` in your browser. `localhost` means "this machine", and `3000` is a **port** — explained shortly.

> [!TRY]
> Find your own computer's private IP address.
>
> - **Windows (PowerShell):** run `ipconfig` and look for "IPv4 Address" under your Wi-Fi or Ethernet adapter.
> - **macOS:** run `ipconfig getifaddr en0`.
> - **Linux:** run `ip addr` and look for `inet` followed by an address.
>
> It will very likely start with `192.168.` or `10.` — a private address. Now search for "what is my IP" in a web browser. The address the website shows you is different: it is your router's **public** address, because that is the only one the outside world ever sees.

## Level 3 — Packets: cutting data into pieces

Suppose you download a 5 MB photo. That photo does not travel as one long, continuous stream. It is cut into many small pieces called **packets**, typically up to about 1,500 bytes each. A 5 MB photo becomes several thousand packets.

Each packet has two parts:

```text
  +-------------------------------+-----------------------------------+
  |            HEADER             |              PAYLOAD              |
  | from: 203.0.113.50            |  a small piece of the actual      |
  | to:   39.45.12.88             |  data — e.g. bytes 4,500 to 5,960 |
  | protocol, length, order no.   |  of the photo                     |
  +-------------------------------+-----------------------------------+
```

- The **header** is like the outside of an envelope: where the packet came from, where it is going, and other information needed to deliver and reassemble it.
- The **payload** is the contents: a small slice of the real data.

Why cut data up at all? There are three good reasons:

1. **Sharing the network fairly.** If one huge download could occupy a cable completely until it finished, everyone else would have to wait. With packets, many conversations' packets take turns on the same cable, so everyone makes progress at once.
2. **Recovering from errors cheaply.** If something goes wrong in transit, only the damaged or lost packet needs to be sent again, not the whole photo.
3. **Flexible routes.** Each packet can travel along whatever path is best at that moment. If one route is congested or broken, later packets can go another way.

This design — splitting data into independent packets that share the network — is called **packet switching**. It is one of the main reasons the internet has proven so resilient: it was designed from the beginning to keep working even when parts of it fail.

## Level 4 — Routing: how packets find their way

Your packet leaves your router. How does it reach a server on another continent?

It is passed from **router to router**. The internet is full of routers — at your ISP, at major junctions between networks, at the edges of data centres. Each router does one simple job, over and over:

> Look at the packet's destination address. Decide which neighbouring router is the best next step towards it. Send the packet there.

Each step from one router to the next is called a **hop**. A typical journey across the world takes somewhere between ten and thirty hops.

```text
  your laptop
     |
  home router  (hop 1)
     |
  ISP router in your city  (hop 2)
     |
  ISP's main network  (hops 3-5)
     |
  international exchange / undersea cable  (hops 6-10)
     |
  networks in another country  (hops 11-14)
     |
  data centre router  (hop 15)
     |
  the web server
```

The important thing to notice is that **no single router knows the whole route.** Each one only knows which neighbour is the best next step for each range of addresses, rather like a road sign that points towards "Islamabad" without showing you the whole journey. Routers keep this information in a **routing table**, and they constantly exchange updates with each other about which networks they can reach. When a link breaks, routers learn of it and start sending packets another way, usually within seconds or minutes.

The networks that make up the internet — ISPs, big companies, cloud providers — are connected at shared meeting points, and they announce to each other which ranges of addresses they can deliver to. The protocol they use for this is called **BGP** (Border Gateway Protocol). You will not configure BGP as an application developer, but it is worth knowing it exists: when you read news about a large part of the internet suddenly becoming unreachable, a mistaken BGP announcement is a common cause.

### Packets can be lost, delayed or reordered

Because each packet travels independently through busy routers, three things can go wrong:

- **Lost.** A router that is overloaded is allowed to drop packets. They simply disappear.
- **Delayed.** Packets wait in queues at busy routers.
- **Reordered.** Packet 7 might take a faster route than packet 6 and arrive first.

At this level, the internet makes **no promises** about delivery. It does its best, and that is all. This is called **best-effort delivery**. If we want reliable, complete, correctly ordered data — and for almost everything, we do — something else has to provide it. That something is a protocol called TCP, and to understand where it fits we first need the idea of layers.

## Level 5 — Protocols in layers

Sending a web page across the world involves many different problems: turning bits into radio waves, finding a route between continents, making sure no data goes missing, and understanding what the data actually means. No single protocol solves all of these. Instead, the internet uses a **stack of layers**, each solving one problem and relying on the layer below it.

The model used to describe the real internet has four layers:

```text
  +-----------------------------------------------------------------+
  | 4. APPLICATION  | What the data means to programs.               |
  |                 | HTTP (web), DNS (names), SMTP (email), SSH     |
  +-----------------------------------------------------------------+
  | 3. TRANSPORT    | Conversations between programs on two hosts.   |
  |                 | TCP (reliable) or UDP (fast, no guarantees);   |
  |                 | ports identify which program                   |
  +-----------------------------------------------------------------+
  | 2. INTERNET     | Getting packets from one host to another,      |
  |                 | across many networks. IP addresses, routing    |
  +-----------------------------------------------------------------+
  | 1. LINK         | Moving bits across one physical connection.    |
  |                 | Wi-Fi, Ethernet, fibre                         |
  +-----------------------------------------------------------------+
```

Read the diagram from the bottom up, because each layer builds on the one beneath:

1. The **link layer** moves bits across a single physical connection — your Wi-Fi to your router, or a cable between two routers.
2. The **internet layer** (the IP protocol) gets a packet from one host to another anywhere in the world, hop by hop, using IP addresses and routing. It is best-effort.
3. The **transport layer** turns the unreliable packet delivery of IP into a useful conversation between two specific *programs*. This is where TCP and UDP live.
4. The **application layer** is the language the two programs actually speak — HTTP for web pages, DNS for looking up names, SMTP for email.

When your browser sends a request, each layer wraps the data from the layer above inside its own header — like putting a letter in an envelope, then putting that envelope in a larger, labelled mailbag. This is called **encapsulation**:

```text
                              [ HTTP request: "GET /index.html" ]     application
                    [ TCP header | HTTP request                ]     transport
         [ IP header | TCP header | HTTP request                ]     internet
  [ Wi-Fi | IP header | TCP header | HTTP request         | Wi-Fi ]  link
```

At the receiving end, each layer removes its own header and hands the contents up to the layer above, until the web server's program receives the original HTTP request.

The great benefit of layering is **independence**. The web (HTTP) does not care whether its packets travel over Wi-Fi, fibre or a mobile network. Wi-Fi does not care whether it is carrying a web page or a video call. Each layer can improve or be replaced without changing the others.

> [!NOTE]
> You will also hear about the **OSI model**, which describes networking in **seven** layers instead of four. It was designed as a teaching and standards model, and the real internet does not follow it exactly. Its layer *numbers* are still used in everyday engineering language, so it is worth knowing two of them: "**layer 4**" means the transport layer (TCP/UDP), and "**layer 7**" means the application layer (HTTP). When an engineer says "a layer 7 load balancer", they mean one that understands HTTP; "layer 4" means one that only looks at addresses and ports. You will meet these terms again in {{ch:networking}} and {{ch:elb}}.

## Level 6 — The transport layer: TCP and UDP

The transport layer has two main protocols. Almost everything you build will use one or the other, so it is worth understanding both properly.

### TCP: a reliable conversation

**TCP** (Transmission Control Protocol) takes the unreliable, best-effort service of IP and builds something very dependable on top of it. TCP guarantees that:

- **all** the data arrives — anything lost is sent again;
- it arrives **in the correct order** — packets are reassembled in sequence;
- it arrives **without corruption** — damaged data is detected and re-sent;
- the sender does not **overwhelm** the receiver or the network — it slows down when packets start getting lost.

How does it achieve this over a network that loses packets?

**Numbering.** TCP gives every byte it sends a sequence number. The receiver uses these numbers to put data back in order and to notice gaps.

**Acknowledgements.** The receiver regularly sends back a short message saying "I have received everything up to byte number N". This is an **acknowledgement**, or **ACK**.

**Re-sending.** If the sender does not receive an acknowledgement in time, it assumes the data was lost and sends it again.

```text
  SENDER                                          RECEIVER
    |  --- packet 1 (bytes 1-1000) ------------------>  |
    |  --- packet 2 (bytes 1001-2000) ------X  (lost)   |
    |  --- packet 3 (bytes 2001-3000) ------------->    |  "I have up to 1000,
    |  <------------------ ACK: up to 1000 ----------   |   and a gap after it"
    |                                                   |
    |  (no ACK for 1001-2000 arrives in time)           |
    |  --- packet 2 again (bytes 1001-2000) --------->  |
    |  <------------------ ACK: up to 3000 ----------   |  now complete
```

The diagram shows a lost packet being detected and re-sent. The receiver holds on to packet 3 until the missing packet 2 arrives, then delivers all the data, in order, to the program.

The program using TCP never sees any of this. It writes data into one end and reads exactly the same data out of the other, as if it were a perfect pipe. All the counting, waiting and re-sending happens underneath.

#### The three-way handshake

Before any data flows, TCP sets up a **connection** — both sides agree to talk and exchange their starting sequence numbers. This takes three messages, called the **three-way handshake**:

```text
  CLIENT                                   SERVER
    |  --- SYN: "I'd like to connect" ------>  |
    |  <-- SYN-ACK: "OK, and I'd like to" ---  |
    |  --- ACK: "Great, let's go" ---------->  |
    |                                          |
    |  ======= data can now flow ============  |
```

1. **SYN** (synchronise): the client asks to open a connection and sends its starting number.
2. **SYN-ACK**: the server agrees, acknowledges the client's number and sends its own.
3. **ACK**: the client acknowledges the server's number. The connection is open.

This handshake is why the very first request to a server takes a little longer than later ones on the same connection: one full round trip is spent just saying hello. For a server far away, that round trip might take 150 milliseconds before any real data moves. This cost explains why browsers and servers try hard to **reuse** connections instead of opening a new one for every request — a theme you will see again when we discuss connection pools for databases.

### UDP: fast and simple, no promises

**UDP** (User Datagram Protocol) is the opposite approach. It sends each message as a single packet and does nothing else. No handshake, no acknowledgements, no re-sending, no ordering. If a packet is lost, it is simply gone.

That sounds worse, so why use it? Because for some kinds of data, **late is as bad as lost**:

- In a **voice or video call**, if a fraction of a second of sound is lost, re-sending it would make it arrive too late to be useful. It is better to skip it and keep the conversation flowing.
- In a fast-moving **online game**, the position of a player from half a second ago is useless; you want the newest position.
- **DNS lookups** (coming up next) are tiny, single-question messages; setting up a whole TCP connection for each one would be wasteful.

| | TCP | UDP |
|---|---|---|
| Setup | Three-way handshake first | None — just send |
| Delivery | Guaranteed; lost data re-sent | Not guaranteed |
| Order | Guaranteed | Not guaranteed |
| Speed and overhead | Slower to start; more overhead | Very low overhead |
| Typical uses | Web pages, APIs, email, file transfer, databases | Video and voice calls, games, live streaming, DNS |

> [!INSIDE]
> The newest version of the web's protocol, **HTTP/3**, actually runs over UDP, using a protocol called **QUIC** that rebuilds reliability, ordering and encryption on top of UDP in a more efficient way. This shows that the layers are not fixed forever: engineers can rebuild the guarantees of TCP themselves when they need different trade-offs. As an application developer you will rarely see this directly, but you may see "HTTP/3" or "QUIC" in browser developer tools and server settings.

For almost all the applications in this book — websites, APIs, databases — you will be using TCP, usually without thinking about it, because the tools you use (web servers, database drivers) handle it for you.

## Ports: many programs on one computer

An IP address gets a packet to the right **computer**. But one computer runs many programs that use the network at once: a web server, a database, an email server. How does an incoming packet reach the right **program**?

With a **port**: a number from 0 to 65,535 that identifies a specific program on a computer. Every TCP or UDP packet carries a port number in its header, alongside the IP address.

> [!ANALOGY]
> If the IP address is the address of an apartment building, the port is the apartment number. The building's address gets the letter to the right building; the apartment number gets it to the right door.
>
> **Where the analogy breaks:** apartment numbers are fixed by the building. Ports are claimed by programs when they start: a program asks the operating system for a port, and if another program already has it, the request fails.

A program that waits for incoming connections on a port is said to be **listening** on that port. Many services have a standard, well-known port, so that clients know where to find them:

| Port | Protocol | Used for |
|---|---|---|
| 22 | SSH | Logging in to remote servers |
| 53 | DNS | Looking up domain names |
| 80 | HTTP | Web pages (unencrypted) |
| 443 | HTTPS | Web pages (encrypted) |
| 5432 | PostgreSQL | The PostgreSQL database |
| 27017 | MongoDB | The MongoDB database |
| 6379 | Redis | The Redis in-memory store |
| 3000, 5173, 8080 | — | Common choices for apps during development |

When you type `https://example.com` in your browser, you do not type a port, because the browser automatically uses the standard HTTPS port, 443. When you develop locally and visit `http://localhost:3000`, you must give the port, because 3000 is not a standard one.

The combination of an IP address and a port — written like `203.0.113.50:443` — identifies one specific program on one specific computer. A TCP connection is identified by *both* ends: the client's address and port plus the server's address and port. The client's port is usually chosen automatically by its operating system from a high range of temporary numbers, which is why one browser can have many separate connections to the same server at once.

### Two errors you will see often

**"Address already in use"** (or `EADDRINUSE`). You tried to start a program listening on a port that another program is already listening on. Only one program can listen on a given port at a time. Usually the other program is an old copy of your own application that is still running in another terminal. Stop it (<kbd>Ctrl</kbd> + <kbd>C</kbd> in that terminal) or use a different port.

**"Connection refused"** (or `ECONNREFUSED`). Your packet reached the computer, but **no program was listening on that port**, so the computer immediately refused it. Typically the server is not running, or it is listening on a different port from the one you are connecting to. Compare this with a **timeout**, where no reply arrives at all — the packets may be blocked by a firewall, the address may be wrong, or the computer may be switched off. "Refused" is fast and certain; "timed out" is slow and ambiguous. Telling them apart is one of the most useful debugging skills in networking.

### Firewalls

A **firewall** is a program or device that decides which network traffic is allowed in or out, usually based on addresses and ports. Your operating system has one; servers and cloud networks have them too. A typical server firewall might allow incoming traffic on ports 443 (HTTPS) and 22 (SSH, from the company's network only), and block everything else.

Firewalls are a basic security tool: a database should almost never be reachable from the whole internet, and a firewall rule is the simplest way to make sure of that. They are also a classic cause of confusing timeouts: if a firewall silently drops your packets, your program just waits until it gives up. You will configure firewalls in the cloud chapters ({{ch:vpc}}).

## Names instead of numbers: an introduction to DNS

Nobody wants to type `142.250.183.46` to reach Google. People use **domain names** like `google.com`. But routers only understand IP addresses. Something has to translate.

That something is **DNS**, the Domain Name System. DNS is like the internet's phone book: you look up a name, and it gives you the number.

When you type `example.com` in your browser, before anything else happens:

```text
  1. Browser: "What is the IP address of example.com?"
        |
        v
  2. Asks a DNS resolver (usually run by your ISP, or a public
     one such as 1.1.1.1 or 8.8.8.8)
        |
        v
  3. Resolver finds the answer (asking other DNS servers if needed)
        |
        v
  4. Answer: "example.com is at 93.184.215.14"
        |
        v
  5. Browser now connects to 93.184.215.14 on port 443
```

Answers are **cached** — remembered for a while — by your browser, your operating system and the resolver, so most lookups are answered instantly from memory instead of repeating the whole search. Each answer comes with a **TTL** (time to live) saying how many seconds it may be remembered.

This is only an introduction. DNS has a fascinating internal structure — a hierarchy of servers starting at the "root" of the internet — and it is behind a large number of real production problems, from websites "moving" slowly after a change to whole services going offline. {{ch:dns}} covers it in depth. For now, remember: **names are for people; IP addresses are for machines; DNS translates between them, and caches the results.**

## Speed on the network: latency and bandwidth

People say an internet connection is "fast" or "slow", but there are two completely different kinds of speed, and confusing them leads to wrong decisions.

**Bandwidth** is how much data can travel per second — how *wide* the pipe is. It is measured in bits per second: a "100 Mbps" connection can carry up to 100 million bits per second.

**Latency** is how long it takes a single piece of data to make the journey — how *long* the pipe is. It is measured in milliseconds. The most common measurement is the **round-trip time** (RTT): the time for a message to go to the other computer and for a reply to come back.

> [!ANALOGY]
> Think of a motorway. **Bandwidth** is the number of lanes: more lanes, more cars per hour. **Latency** is how long the journey takes: Lahore to Karachi is a long drive however many lanes the road has.
>
> **Where the analogy breaks:** on a real motorway, cars can go faster to shorten the journey. On a network, the signal already travels at a large fraction of the speed of light through fibre. You cannot speed it up; the only way to reduce latency much is to **shorten the distance** — by putting servers closer to users.

Latency has a floor set by physics. Light in fibre travels at roughly 200,000 kilometres per second. The distance from Pakistan to the eastern United States is roughly 12,000 kilometres in a straight line, and real cables take longer routes. A single round trip therefore cannot take much less than about 120 milliseconds, and in practice usually takes more like 200 or more.

Why this matters so much for software:

- **Many small round trips are slow, even on high bandwidth.** If loading a page requires 20 separate requests that must happen one after another, and each round trip takes 200 ms, that is 4 seconds of waiting — and buying more bandwidth will not help at all. Reducing the number of sequential round trips does.
- **Distance matters.** This is why large companies run servers in many regions of the world, and why **content delivery networks** (CDNs) keep copies of images and pages in cities close to users ({{ch:cloudfront}}).
- **Large files need bandwidth; chatty applications need low latency.** Knowing which one your application needs tells you how to make it faster.

| Situation | Bandwidth or latency? | What helps |
|---|---|---|
| Downloading a 2 GB file | Bandwidth | A faster connection |
| A page making 30 small requests in sequence | Latency | Fewer requests; doing them in parallel; servers closer to users |
| A video call that is choppy | Mostly latency and packet loss | A more stable connection; a server closer to both people |
| A backend calling a database in another region for every request | Latency | Put the database in the same region as the server |

> [!RECAP]
> In {{ch:what-a-computer-is}} you saw a table of how long it takes to reach data in different places: nanoseconds for memory, microseconds for an SSD, and **milliseconds** for another computer across the internet. Now you can see why the network is so slow by comparison: it involves physical distance, many hops, queues at routers and handshakes. That is why experienced engineers always look at network round trips first when an application is slow.

## Putting it together: what happens when you send a message

Let us follow every layer through one action: you visit `https://example.com` from your laptop at home.

1. **Name lookup (DNS).** Your browser asks for the IP address of `example.com`. If it is not cached, a DNS resolver finds it: `93.184.215.14`. This query usually travels over UDP to port 53.
2. **Connection (TCP).** Your browser opens a TCP connection to `93.184.215.14` on port 443, using the three-way handshake. Your operating system picks a temporary port on your side, say 51234.
3. **Security.** Because the address starts with `https`, your browser and the server set up encryption so nobody in between can read or alter the conversation. ({{ch:how-the-web-works}} introduces this, and {{ch:tls-ssl}} explains it in depth.)
4. **The request (application layer).** Your browser sends an HTTP request asking for the page.
5. **Down the layers.** The request is wrapped in a TCP header (ports 51234 → 443), then an IP header (your laptop's private address → `93.184.215.14`), then a Wi-Fi frame, and sent as radio waves to your router.
6. **NAT.** Your router replaces your private address with its public address, notes the conversation, and sends the packets to your ISP.
7. **Routing.** Router after router passes the packets onward, hop by hop, possibly through an undersea cable, until they reach the network where `example.com`'s server lives.
8. **Up the layers.** The server's network card receives the packets. IP checks they are for this computer; TCP puts them in order, acknowledges them and passes the data to the program listening on port 443 — the web server.
9. **The response.** The web server prepares the page and sends it back the same way in reverse, as many packets.
10. **Reassembly.** Your router passes the replies to your laptop using its NAT notes. TCP on your laptop reassembles the packets in order, requests any that went missing, and hands the complete response to your browser.
11. **Display.** Your browser shows the page.

All of this typically takes a fraction of a second. And every web application, mobile app and API you build in this book relies on it.

## Investigating the network yourself

You can watch much of this happen with standard tools that come with every operating system.

### `ping` — is it reachable, and how far away?

```text
> ping example.com
```

**Output (shortened, Windows):**

```text
Pinging example.com [93.184.215.14] with 32 bytes of data:
Reply from 93.184.215.14: bytes=32 time=183ms TTL=52
Reply from 93.184.215.14: bytes=32 time=181ms TTL=52
Reply from 93.184.215.14: bytes=32 time=185ms TTL=52
Reply from 93.184.215.14: bytes=32 time=182ms TTL=52
```

Walkthrough:

- The first line shows that `example.com` was translated by DNS into `93.184.215.14`.
- `ping` sends small test messages and waits for replies. Each reply line shows the **round-trip time**: about 183 milliseconds here. That is the latency between you and that server.
- `TTL` here is a counter in each packet that decreases by one at every router; when it reaches zero, the packet is discarded. It exists to stop packets circling forever if routes go wrong. (This is a different TTL from the DNS caching one — the same abbreviation is used for both.)

On Windows, `ping` stops after four replies. On macOS and Linux it continues until you press <kbd>Ctrl</kbd> + <kbd>C</kbd>.

> [!NOTE]
> Some servers are configured not to answer pings, for security reasons. So "no reply to ping" does not necessarily mean the server is down. It is a useful first check, not final proof.

### `tracert` / `traceroute` — what route do packets take?

- **Windows:** `tracert example.com`
- **macOS and Linux:** `traceroute example.com`

This lists each router (hop) on the path to the destination, with the time to reach it. You can see your home router as hop 1, then your ISP, then the long jumps across countries. A sudden large increase in time between two hops often marks a long physical distance — such as an undersea cable.

### `nslookup` — what does DNS say?

```text
> nslookup example.com
```

**Output (shortened):**

```text
Name:      example.com
Addresses: 2606:2800:21f:cb07:6820:80da:af6b:8b2c
           93.184.215.14
```

This asks DNS directly for a name's addresses. Here you can see both an IPv6 and an IPv4 address for the same name. When a website "cannot be found", checking whether its name resolves is one of the first steps.

## From beginner to enterprise: the network at every level

**Level 3 — Your own machine.** You run a server on `localhost:3000` and open it in your browser. The request never leaves your computer: it goes down the layers and straight back up, via the loopback address. No router, no NAT, no internet.

**Level 4 — A real deployed application.** Your application runs on a cloud server with a public IP address, behind a domain name. Users' requests travel across the internet as described above. A firewall allows only ports 443 and 22 in. The database runs on a separate server with a *private* address that is not reachable from the internet at all, so only your application server can talk to it.

**Level 5 — Professional engineering.** Engineers design with the network's weaknesses in mind. Every network call has a **timeout**, so a slow service cannot make the caller wait forever. Failed calls are **retried** carefully — but not endlessly, and not in a way that floods a struggling service. Servers and databases are placed in the same region to keep latency low. Connections are reused rather than re-opened for every request.

**Level 6 — Enterprise scale.** Large companies run their systems in several regions around the world. Traffic is directed to the nearest healthy region, sometimes by DNS that gives different answers to users in different places. Content is served from CDN locations in dozens of cities. Internal networks are carefully divided so that each service can reach only what it needs. And because, at that scale, *something* in the network is always failing somewhere, systems are designed to keep working when parts of the network are slow or unreachable — the subject of {{ch:distributed-systems}}.

## Real-world use cases

### Beginner level — "It works for me but not my friend"

**Situation:** a learner builds a small website and starts it on their laptop. It works at `http://localhost:3000`. They send that link to a friend in another city, who cannot open it.

**Explanation:** `localhost` means "this computer" — on the friend's machine, it points at the *friend's* computer, where nothing is running. Even using the learner's private address would not work: it is a private address behind NAT, unreachable from outside.

**Solution:** to share an application with the world, deploy it to a server with a public address (Parts IX and X). For quick demonstrations, developers sometimes use **tunnelling** services that temporarily give a local server a public web address — useful for testing, but not for running real applications.

### Intermediate level — A slow checkout for distant customers

**Business problem:** an online shop based in Europe starts selling in South Asia. Customers there find checkout slow, although the servers are not busy.

**Technical problem:** checkout makes eight requests to the server one after another. Each round trip from South Asia to Europe takes about 150 milliseconds, so the waiting alone is over a second, before any processing.

**Solution:** combine requests so checkout needs fewer round trips; serve images and static files from a CDN with locations near customers; later, consider running servers in a region closer to these customers.

**Reasoning and trade-offs:** reducing round trips is cheap and helps everyone. Running servers in a second region helps most but is expensive and complicated, especially for keeping data consistent between regions. Engineers usually do the cheap improvements first and measure.

### Advanced level — A service that hangs instead of failing

**Business problem:** a food-delivery platform's order service occasionally stops responding entirely for several minutes, even though it is running.

**Technical problem:** the order service calls a restaurant-availability service over the network. When that service became slow, every order request waited for it — with no timeout — so all of the order service's capacity was tied up waiting. One slow dependency froze everything.

**Solution:** add a timeout to every network call (for example, two seconds); when the availability service does not answer in time, show a sensible fallback ("availability temporarily unknown") instead of waiting forever. Add limited retries with increasing delays between attempts.

**Reasoning:** a network call can fail in ways a local function call never does — it can be slow, partial or silent. Code that treats network calls as if they always answer quickly is fragile. This idea is so important that engineers have named the common false assumptions "the fallacies of distributed computing" — the first of which is "the network is reliable".

**Failure scenario to avoid:** retrying immediately and without limit. If thousands of clients all retry a struggling service at once, they can keep it overloaded and prevent it from recovering.

### Enterprise level — Keeping the database off the internet

**Business problem:** a healthcare software company stores patient records. Regulations and basic safety require that this data is strongly protected.

**Solution (illustrative):** the database servers have only private addresses inside the company's cloud network. A firewall allows connections to the database port only from the application servers. The application servers sit behind a load balancer that is the only component exposed to the internet, on port 443 only. Engineers reach the servers through a tightly controlled access system rather than open SSH.

**Reasoning:** if the database cannot even be reached from the internet, a whole category of attacks becomes impossible. Network design is a security tool, not just a plumbing detail.

**Disadvantage:** the setup is more complex, and engineers need extra steps to investigate problems directly on the database. The company accepts this cost because the data is sensitive.

## Common mistakes

### Beginner mistake — Confusing localhost with "my computer's address on the network"

**What it looks like:** expecting another device to reach `localhost:3000`, or being surprised that a phone on the same Wi-Fi cannot open the site.

**Why it happens:** "localhost" sounds like "my computer", which it is — but only from the point of view of whichever device is using the word.

**How to fix it:** from another device on the same network, use your laptop's *private IP address* (for example `http://192.168.1.15:3000`) — and make sure your server is listening on all addresses (`0.0.0.0`), not only on `localhost`. From outside your home network, you need a deployed server.

### Beginner mistake — "Address already in use"

**What it looks like:** starting your application and seeing `EADDRINUSE: address already in use :::3000`.

**Why it happens:** a previous copy of the application is still running, often in another terminal window you forgot about.

**How to fix it:** stop the old process (<kbd>Ctrl</kbd> + <kbd>C</kbd> in its terminal), or choose another port. On Windows, `netstat -ano | findstr :3000` shows which process is using the port; on macOS and Linux, `lsof -i :3000` does the same.

### Intermediate mistake — Treating a network call like a local function call

**What it looks like:** code that calls another server and assumes it will always answer, quickly and correctly — no timeout, no handling of failure.

**What happens:** when the other server is slow or down, your application hangs or crashes, and the failure spreads to everything that depends on you.

**How to prevent it:** always set timeouts on network calls; decide in advance what to do when a call fails; retry with limits and growing delays; and test what happens when the other service is switched off. You will practise this in {{ch:error-handling}}.

### Production mistake — A server listening only on localhost

**What it looks like:** an application deployed to a server, running happily, but unreachable from outside — every request times out or is refused.

**Why it happens:** the application was started listening on `127.0.0.1` (localhost only), which is a safe default on a laptop but means "accept connections only from this same machine". This happens very often with applications inside containers.

**How to spot it:** the application responds when you connect from the server itself, but not from anywhere else.

**How to fix it:** configure it to listen on `0.0.0.0` (all addresses), and control access with a firewall instead.

### Enterprise mistake — Exposing internal services to the internet

**What it looks like:** a database, cache or admin panel reachable from any address on the internet, often with a default or weak password.

**Why it happens:** opening a port "temporarily" to debug something, and forgetting to close it; or default cloud settings that were never reviewed.

**What happens:** automated programs scan the entire internet continuously for exactly these open ports. Exposed databases have been found, emptied and held to ransom, sometimes within hours of being exposed. Many large real-world data leaks have started this way.

**How to prevent it:** keep internal services on private addresses only, allow access through firewalls only from the systems that need it, and regularly review which ports are open to the internet.

## Debugging and troubleshooting

When a network connection fails, work through the layers from the bottom up. This is how experienced engineers narrow down network problems quickly.

| Question | How to check | What a failure suggests |
|---|---|---|
| Does the name resolve? | `nslookup example.com` | DNS problem: wrong name, missing record, or a DNS outage |
| Is the host reachable at all? | `ping` the address | Host down, network down, or pings blocked (not conclusive) |
| Where does the path break? | `tracert` / `traceroute` | Which network the problem lies in |
| Is something listening on the port? | Connect to it; read the error | **Refused**: nothing listening there. **Timed out**: firewall, wrong address or host down |
| Is it my code or the network? | Try the same request from another machine or tool | If other tools fail too, it is the network or the server |

> [!TIP]
> Learn to tell **"connection refused"** from **"connection timed out"** instantly. *Refused* means you reached the computer and it said "nothing here on that port" — check that the server is running and on the right port. *Timed out* means nothing came back at all — check the address, the firewall and whether the host is up. This single distinction cuts many debugging sessions from an hour to a few minutes.

## How a senior engineer thinks about the network

> [!SENIOR]
> Experienced engineers carry a few assumptions with them every time a design involves the network:
>
> - **The network will fail.** Not "might" — will. Every call needs a timeout and a plan for failure.
> - **Latency adds up.** They count the round trips in a user action, especially sequential ones, and estimate the total before building.
> - **Distance is physics.** No amount of code makes light travel faster. If users are far away, data or servers must move closer.
> - **Every open port is a door.** They expose as little as possible to the internet and keep everything else private.
> - **Retries can make outages worse.** They retry with limits, growing delays and a little randomness, so that recovering services are not flooded.
>
> None of this requires knowing every protocol detail. It requires the clear model you now have: packets, hops, layers, TCP, ports and DNS.

## Exercises

### Exercise 1 — Public or private?

**Objective:** practise recognising private and special addresses.

**What to do:** for each address, say whether it is private, public, or special — and what that means.

1. `192.168.0.101`
2. `8.8.8.8`
3. `127.0.0.1`
4. `10.20.30.40`
5. `172.20.5.9`
6. `172.40.5.9`

<details>
<summary>Show the solution</summary>

1. `192.168.0.101` — **private** (in the 192.168.x.x range). A device inside a home or office network; not reachable directly from the internet.
2. `8.8.8.8` — **public**. A real internet address (it belongs to Google's public DNS service).
3. `127.0.0.1` — **special: localhost**. Always means "this same computer".
4. `10.20.30.40` — **private** (the 10.x.x.x range). Common inside company and cloud networks.
5. `172.20.5.9` — **private**. The private range is 172.16.0.0 to 172.31.255.255, and 20 is between 16 and 31.
6. `172.40.5.9` — **public**. 40 is outside 16–31, so this is *not* in the private range. Many people get this one wrong because it starts with 172.

**Common wrong approach:** assuming every address starting with 172 is private. Only 172.16 to 172.31 are.

</details>

### Exercise 2 — TCP or UDP?

**Objective:** practise choosing the right transport protocol from the requirements.

**What to do:** for each application, choose TCP or UDP and explain why.

1. Downloading a software update.
2. A live voice call.
3. Submitting a bank transfer.
4. A multiplayer racing game sending each car's position 30 times per second.

<details>
<summary>Show the solution</summary>

1. **TCP.** Every byte of the update must arrive, in order, without corruption. A missing piece would break the software.
2. **UDP.** Sound must arrive on time. Re-sending a lost fraction of a second would make it arrive too late to play; skipping it is better.
3. **TCP.** The request must arrive completely and correctly. (In practice it will be HTTPS, which runs over TCP or QUIC — either way, reliability is guaranteed.)
4. **UDP.** A new position arrives every 33 milliseconds, so an old, re-sent position would already be out of date. Games usually add their own small reliability mechanisms only for the few messages that truly must arrive, such as "player finished the race".

**Common wrong approach:** thinking UDP is simply "worse". It is a different trade-off: it gives up guarantees in exchange for speed and freshness, which is exactly right when late data is useless.

</details>

### Exercise 3 — Measure latency yourself

**Objective:** connect the idea of latency to real measurements.

**What to do:**

1. Run `ping` against your home router (often `192.168.1.1` or `192.168.0.1` — `ipconfig` on Windows shows it as "Default Gateway").
2. Run `ping` against a well-known site such as `google.com`.
3. Run `tracert` (Windows) or `traceroute` (macOS/Linux) against a site hosted far away — for example, a university website in another continent.
4. Compare the times. What explains the differences?

<details>
<summary>Show the solution</summary>

Typical results look something like this:

```text
home router:          1–5 ms
google.com:           20–60 ms  (large companies have servers near most users)
a distant site:       150–300 ms
```

Explanation:

- **The router** is in the same room. Only one short hop is involved, so the round trip is a few milliseconds.
- **Large services** usually have servers in or near your country, or use CDNs, so the distance — and therefore the latency — is relatively small.
- **A distant site** requires crossing continents, often through undersea cables. The traceroute output usually shows a sudden jump in time at one hop: that is where the signal makes the long physical journey.

The lesson: latency is mostly determined by **physical distance** and the number of hops, not by how fast your internet plan is.

**Common wrong approach:** concluding that a slow ping to a distant server means your internet connection is "slow". Your bandwidth may be excellent; the delay is the distance.

</details>

### Exercise 4 — Refused or timed out? (debugging scenario)

**Objective:** practise diagnosing connection failures.

**The scenario:** a developer deploys an application to a cloud server at `203.0.113.10` and expects it on port 3000. Consider two separate situations:

- **A:** connecting to `203.0.113.10:3000` fails *immediately* with "connection refused".
- **B:** connecting to `203.0.113.10:3000` waits for 30 seconds and then fails with "connection timed out".

**What to do:** for each, explain what it tells you and what you would check.

<details>
<summary>Show the solution</summary>

**A — Refused.** The packets reached the server, and the server's operating system answered immediately: *no program is listening on port 3000.* The network path and firewall are fine. Check:

- Is the application actually running? (It may have crashed on start-up — check its logs.)
- Is it listening on port 3000, or on a different port?
- Is it listening only on `127.0.0.1`? Then it accepts connections only from the server itself. It should listen on `0.0.0.0`.

**B — Timed out.** Nothing came back at all. The packets were probably dropped before reaching any program. Check:

- Is the **firewall** (on the server or in the cloud network settings) allowing incoming traffic on port 3000? This is the most common cause.
- Is the IP address correct, and is the server running?

**Common wrong approach:** treating both errors as "the server is down" and restarting everything. The two errors point to completely different causes — the application in case A, the network or firewall in case B. Reading the error carefully tells you where to look.

</details>

## Summary

A **network** connects devices so they can exchange data; the **internet** is a worldwide network of networks sharing the TCP/IP protocols. The **web** is one service running on top of it.

Every device has an **IP address**. IPv4 addresses are 32 bits and have run out; **IPv6** provides vastly more. Homes and offices use **private addresses** internally, and the router uses **NAT** to share one **public address** — which is also why a program on your laptop cannot normally be reached from the internet. `localhost` (`127.0.0.1`) always means "this computer".

Data travels as **packets**, each with a header and payload, passed **hop by hop** by **routers** using routing tables. IP is **best-effort**: packets can be lost, delayed or reordered. The internet is built in **layers** — link, internet, transport and application — each wrapping the data from the layer above.

**TCP** provides reliable, ordered delivery using sequence numbers, acknowledgements and re-sending, after a **three-way handshake**. **UDP** sends without guarantees, which suits calls, games and DNS. **Ports** identify which program on a computer should receive data; "connection refused" means nothing is listening, while a **timeout** usually means a firewall, wrong address or down host. **Firewalls** control which traffic is allowed. **DNS** translates names into IP addresses and caches the answers.

**Bandwidth** is how much data flows per second; **latency** is how long one trip takes and is limited by physical distance. Many sequential round trips make applications slow regardless of bandwidth.

## Key terms

- **Network** — A group of devices connected so that they can exchange data.
- **Internet** — The worldwide network of interconnected networks that all use the TCP/IP protocols.
- **World Wide Web** — The system of web pages and websites, transferred using HTTP, that runs on top of the internet.
- **Host** — Any device connected to a network that can send or receive data.
- **Client** — A program or device that sends requests to another program and uses its answers.
- **Server** — A program, or the computer running it, that waits for requests and answers them.
- **Protocol** — An agreed set of rules for how two parties communicate, including the format and order of messages.
- **Local area network (LAN)** — A network covering a small area such as a home, office or building.
- **Router** — A device that forwards packets between networks, choosing the next step towards each packet's destination.
- **Internet service provider (ISP)** — A company that connects homes and businesses to the internet.
- **IP address** — A number that identifies a device on a network so that data can be delivered to it.
- **IPv4** — The original version of the Internet Protocol, with 32-bit addresses written as four numbers such as 192.168.1.15.
- **IPv6** — The newer version of the Internet Protocol, with 128-bit addresses, providing a practically unlimited number of addresses.
- **Hexadecimal** — A way of writing numbers using sixteen digits (0–9 and a–f), where each digit represents 4 bits.
- **Private IP address** — An address from a reserved range used only inside private networks and never on the public internet.
- **Public IP address** — An address that is unique on the whole internet and can be reached from anywhere.
- **NAT (Network Address Translation)** — A technique by which a router lets many devices with private addresses share one public address.
- **Localhost** — The name for the loopback address (127.0.0.1), which always refers to the same computer you are using.
- **Packet** — A small piece of data sent across a network, made of a header with delivery information and a payload with the data.
- **Header** — The part of a packet or message that carries information about it, such as its source and destination.
- **Payload** — The actual data carried inside a packet or message.
- **Packet switching** — Sending data as independent packets that share network links and may take different routes.
- **Hop** — One step of a packet's journey, from one router to the next.
- **Routing table** — A router's list of which neighbouring router to send packets to for each range of destination addresses.
- **BGP (Border Gateway Protocol)** — The protocol that the networks making up the internet use to tell each other which addresses they can reach.
- **Best-effort delivery** — A service that tries to deliver data but makes no guarantee that it will arrive, arrive once, or arrive in order.
- **Encapsulation** — Wrapping data from one network layer inside the header of the layer below it.
- **OSI model** — A seven-layer model for describing networks; its layer numbers (such as layer 4 and layer 7) are used in everyday engineering language.
- **TCP (Transmission Control Protocol)** — A transport protocol that provides reliable, ordered, error-checked delivery of data between two programs.
- **UDP (User Datagram Protocol)** — A simple transport protocol that sends individual messages with no guarantee of delivery or order.
- **Acknowledgement (ACK)** — A message confirming that data has been received.
- **Three-way handshake** — The three messages (SYN, SYN-ACK, ACK) that open a TCP connection.
- **QUIC** — A modern transport protocol built on UDP that provides reliability and encryption; used by HTTP/3.
- **Port** — A number from 0 to 65,535 that identifies which program on a computer should receive network data.
- **Listening** — A program waiting for incoming network connections on a particular port.
- **Connection refused** — An error meaning the computer was reached but no program was listening on the requested port.
- **Timeout** — Giving up on an operation, such as a network call, after waiting a set amount of time without a response.
- **Firewall** — A program or device that allows or blocks network traffic according to rules, usually based on addresses and ports.
- **Domain name** — A human-readable name for an internet address, such as example.com.
- **DNS (Domain Name System)** — The system that translates domain names into IP addresses.
- **TTL (time to live)** — In DNS, how long an answer may be cached; in IP packets, a counter that limits how many hops a packet may take.
- **Bandwidth** — The amount of data a connection can carry per second.
- **Latency** — The time it takes for data to travel from one point to another.
- **Round-trip time (RTT)** — The time for a message to travel to another computer and for the reply to come back.
- **Content delivery network (CDN)** — A network of servers in many locations that keeps copies of content close to users to reduce latency.
- **Ping** — A tool that sends small test messages to a host and measures the round-trip time of the replies.
- **Traceroute** — A tool that lists each router on the path to a destination and the time taken to reach it.

## What comes next

You now know how data crosses the world: addresses, packets, routers, layers, TCP, ports and DNS.

But we have only touched the most important use of all this machinery for your career: the **web**. When you visit a website or a mobile app fetches your orders, the messages follow a specific protocol called HTTP, exchanged between browsers and servers. In the next chapter, **How the Web Works: Browsers, Servers and HTTP**, we follow a web request from the moment you press Enter to the moment a page appears, and learn the language of requests and responses that every frontend and backend developer uses every day.
