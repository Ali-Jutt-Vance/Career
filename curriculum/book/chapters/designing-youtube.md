# Case Study: Designing YouTube

> [!GOALS]
> - Design a video platform: requirements, estimates, components and deep dives.
> - Build a reliable **upload** path with resumable uploads and an asynchronous **transcoding pipeline**.
> - Serve video with **adaptive bitrate streaming** and **CDNs**, and understand why players switch quality.
> - Choose storage tiers for originals, renditions and metadata, and control cost.
> - Count views and handle comments, search and recommendations at scale.

## Why this matters

Video is the largest share of internet traffic, and video platforms — YouTube, Netflix, TikTok, course sites, internal training portals — combine many of the hardest problems in one product: huge files uploaded over unreliable connections, compute-heavy processing, petabytes of storage, global delivery with low start-up time, and enormous numbers of small events such as views and likes.

"Design YouTube" is a classic interview question because it rewards thinking about **pipelines**, **storage and bandwidth costs** and **delivery**, rather than databases alone. It uses the patterns from this part: object storage and pre-signed uploads ({{ch:s3}}), queues and workers ({{ch:message-brokers}}), CDNs ({{ch:cloudfront}}), caching and counters ({{ch:caching-at-scale}}) and event-driven processing ({{ch:event-driven-systems}}).

## The simple idea

Think of a film studio and cinema chain. A director delivers one master copy of a film. The studio's lab makes many copies in different formats — large for big screens, small for phones, versions with subtitles — and ships them to cinemas in every city, so audiences never wait for a reel to travel from the studio. Each cinema shows the format that suits its screen.

> [!ANALOGY]
> A video platform is like a studio and cinema chain: receive one master, make copies in many formats, and keep them in cinemas near the audience.
>
> **Where the analogy breaks:** a cinema chooses its format once. A video player chooses a new quality every few seconds as a phone's connection changes on a train — and there are billions of "cinemas", each showing a different film at a different point, many of which almost nobody watches.

## Requirements

### Level 1 — What to build

**Functional:**
- Upload videos (up to several gigabytes), with title, description and thumbnail.
- Watch videos on any device and network, with seeking.
- View counts, likes and comments.
- Search; a home page of recommendations (mention; out of depth for the core design).

**Non-functional:**
- **Playback starts quickly** (under 2 seconds) and rarely stalls; quality adapts to the network.
- **Uploads are reliable** over poor connections and can resume.
- **Processing** can take minutes; the uploader is told when the video is ready.
- **Highly available** playback; uploads and processing may degrade more gracefully.
- **Durable**: uploaded videos are never lost.
- **Cost-aware**: storage and bandwidth dominate the budget.

### Level 1 — Estimates

Assume 1 billion daily viewers watching 5 videos a day, and 500,000 hours of video uploaded per day.

- **Views**: 5 billion a day ≈ **58,000 views/s** average.
- **Upload volume**: 500,000 hours × ~2 GB per hour of original (1080p) ≈ **1 PB of originals a day**.
- **Renditions**: transcoding into several resolutions adds roughly the same again or more (see the example below); over a year, hundreds of petabytes.
- **Egress**: if the average stream is 2 Mbit/s and 50 million streams run at peak, that is **100 Tbit/s** — only CDNs and edge caches inside internet providers can deliver this; it never touches application servers.
- **Metadata** (titles, owners, counts): billions of rows, but small compared with video.

## High-level design

### Level 2 — Components

```text
 UPLOAD
 client ──1. create upload──► upload API ──► metadata DB (video: status "uploading")
 client ──2. resumable multipart upload (pre-signed)──► object storage: originals
 storage event ──► queue ──► transcoding pipeline (split → encode renditions → package) ──► object storage: renditions
                                     └──► thumbnails, captions, checks ──► metadata DB (status "ready") ──► notify uploader

 WATCH
 player ──► API: video metadata + manifest URL ──► metadata cache
 player ──► CDN edge ──miss──► origin (object storage renditions)        segments of 2–6 seconds
 player ──► events (views, progress, quality) ──► stream ──► counters, analytics, recommendations
```

## Deep dives

### Level 3 — The upload path

- **Direct to storage**: the upload API creates a video record and returns **pre-signed multipart upload URLs**; the client uploads parts in parallel directly to object storage, and a lost connection only repeats the failed part — **resumable** uploads ({{ch:file-uploads}}).
- **Completion** triggers an event: storage notifications put a message in a queue; the pipeline starts. The upload API never handles video bytes.
- **Validation**: file type, duration and size limits; malware and policy checks before publishing.
- **Status** is visible to the uploader (uploading → processing → ready, or failed with a reason).

### Level 3 — The transcoding pipeline

Devices and networks need different versions. One upload becomes many **renditions** (resolution and bitrate combinations), each cut into short **segments** with **manifests** that list them (HLS or MPEG-DASH):

```ts
// 1. Transcoding multiplies storage: one upload becomes many renditions
const renditions = [
  { name: "2160p", mbps: 16 }, { name: "1080p", mbps: 5 }, { name: "720p", mbps: 2.5 },
  { name: "480p", mbps: 1 }, { name: "360p", mbps: 0.6 }, { name: "240p", mbps: 0.3 },
];
const minutes = 10;
const gb = (mbps: number) => (mbps * 60 * minutes) / 8 / 1000;      // megabits per second -> GB for the video
const total = renditions.reduce((s, r) => s + gb(r.mbps), 0);
console.log(`a ${minutes}-minute video: ${renditions.map((r) => `${r.name} ${gb(r.mbps).toFixed(2)} GB`).join(", ")}`);
console.log(`total ${total.toFixed(2)} GB per video, plus the original upload`);

// 2. Adaptive bitrate streaming: the player picks a rendition for each 4-second segment
//    from measured throughput and how much video is buffered.
const throughputMbps = [8, 8, 7, 3, 1.2, 1.0, 1.1, 4, 9, 9];       // network conditions per segment (a train journey)
let bufferSeconds = 0;
const segmentSeconds = 4;
const choices: string[] = [];
let rebuffers = 0;
let estimate = 2;                                                     // players only know the *previous* segment's speed
for (const tput of throughputMbps) {
  const safety = bufferSeconds < 8 ? 0.5 : 0.8;                       // be cautious while the buffer is low
  const pick = renditions.find((r) => r.mbps <= estimate * safety) ?? renditions.at(-1)!;
  const downloadSeconds = (pick.mbps * segmentSeconds) / tput;
  bufferSeconds -= downloadSeconds;                                    // playing while downloading
  if (bufferSeconds < 0) { if (choices.length > 0) rebuffers++; bufferSeconds = 0; }   // the first segment is start-up delay, not a stall
  bufferSeconds += segmentSeconds;
  choices.push(`${pick.name}@${tput}Mbps`);
  estimate = tput;
}
console.log("segments:", choices.join(" "));
console.log(`stalls after start: ${rebuffers}, buffer at end: ${bufferSeconds.toFixed(1)} s`);

// The same journey with a player that always picks the highest rendition the network can "just" carry
bufferSeconds = 0; rebuffers = 0; estimate = 2;
for (const [i, tput] of throughputMbps.entries()) {
  const pick = renditions.find((r) => r.mbps <= estimate) ?? renditions.at(-1)!;
  estimate = tput;
  bufferSeconds -= (pick.mbps * segmentSeconds) / tput;
  if (bufferSeconds < 0) { if (i > 0) rebuffers++; bufferSeconds = 0; }
  bufferSeconds += segmentSeconds;
}
console.log(`greedy player: stalls after start: ${rebuffers}`);
```

**Output:**

```text
a 10-minute video: 2160p 1.20 GB, 1080p 0.38 GB, 720p 0.19 GB, 480p 0.07 GB, 360p 0.04 GB, 240p 0.02 GB
total 1.90 GB per video, plus the original upload
segments: 480p@8Mbps 720p@8Mbps 720p@7Mbps 1080p@3Mbps 480p@1.2Mbps 360p@1Mbps 360p@1.1Mbps 360p@4Mbps 720p@9Mbps 1080p@9Mbps
stalls after start: 0, buffer at end: 18.8 s
greedy player: stalls after start: 2
```

The first two lines show transcoding's storage cost; the rest are about streaming, discussed next.

- A 10-minute video produces almost **2 GB** of renditions — the 4K rendition alone is over 60% of it. Multiply by millions of uploads a day and storage becomes the main design question.
- **Pipeline design**: split the video into chunks, encode chunks **in parallel** on many workers (a 2-hour film encodes in minutes), then join and package. Each step is a queue-driven, **idempotent** task with retries, so a worker crash only repeats one chunk ({{ch:queues}}).
- **Prioritise**: encode low resolutions first so the video can be published quickly, and higher ones after; encode 4K only for videos that become popular.
- Use **GPU or specialised encoding hardware** for cost and speed; codecs such as H.264 (universal), VP9 and AV1 (smaller files, more compute) trade encoding cost for bandwidth savings — worthwhile for popular videos.

### Level 3 — Adaptive bitrate streaming

The player downloads short segments (here 4 seconds) and, for each one, chooses a rendition from its **throughput estimate** and **buffer level**. The output simulates a train journey with bandwidth falling from 8 to about 1 Mbit/s and recovering:

- The **adaptive** player started at a modest quality, rose when the buffer was healthy, dropped to 360p while the connection was poor, and climbed back to 1080p — **no stalls**. Its safety margins (using only 50–80% of the estimated throughput) and its buffer absorbed the drop.
- A **greedy** player always chose the highest quality the last measured speed allowed — and **stalled twice** when the network fell. Players only know how fast the **previous** segment downloaded, so aggressive choices fail exactly when conditions change.
- Real players (hls.js, dash.js, ExoPlayer, AVPlayer) combine throughput and buffer-based algorithms; start-up uses a low rendition to begin quickly. Stalls hurt viewers more than lower resolution, so good algorithms prefer stability.

### Level 3 — Delivery and storage tiers

- **CDNs** serve segments from edges near viewers; popular videos are almost entirely served from edge caches. Large platforms also place caches **inside internet providers' networks**.
- **Long-tail videos** (most videos are rarely watched) are served from regional caches or the origin; pre-warming edges is worthwhile only for expected hits (a launch, a live event).
- **Storage tiers**: renditions of popular videos in standard storage; rarely watched videos' renditions in cheaper, infrequent-access classes; originals in archive tiers (kept to re-encode with future codecs) ({{ch:s3}}).
- **Cost levers**: fewer renditions for unpopular videos, better codecs for popular ones, deleting unused high resolutions, and caching efficiency ({{ch:cost-optimization}}).
- **Metadata** (video records, channels, playlists) in a sharded relational or key-value store keyed by video ID and channel ID, with heavy caching — the watch page reads it on every view ({{ch:database-scaling}}).

### Level 4 — Views, likes and comments

- **Views** arrive at tens of thousands per second, concentrated on viral videos (hot keys). Clients send playback events to an ingestion API that writes them to a **stream** (Kafka or Kinesis); stream processors validate them (bots, repeated refreshes), aggregate per video per minute, and update counters — **sharded** for hot videos ({{ch:message-brokers}}).
- **Displayed counts** come from a cache and may lag by seconds or minutes; that is acceptable and standard.
- **Comments** are a classic sharded store keyed by video ID, paginated, with moderation and spam filtering in the pipeline.
- The same event stream feeds **analytics** for creators and **recommendations**.

### Level 4 — Search and recommendations

- **Search**: video metadata, titles, descriptions and captions indexed in a search engine; updates flow from events when videos become ready or change.
- **Recommendations**: candidate generation (videos similar to what you watched, popular in your region, from channels you follow) followed by ranking with machine-learned models using watch history — mostly computed offline and in near real time, served from precomputed lists and caches. In an interview, describe the data flow and serving path rather than the models ({{ch:embeddings-and-vector-databases}}).

### Level 4 — Failures and live streaming

- **Pipeline failures**: idempotent chunk tasks with retries and DLQs; a stuck video shows "processing failed" with retry options; alarms on queue age.
- **CDN or region failures**: multiple CDN providers or regions; players retry segments from alternative hosts listed in manifests.
- **Viral spikes**: edges absorb views; metadata and counters must handle hot keys.
- **Live streaming** differs: ingest servers receive streams, transcode in real time into short segments, and CDNs deliver with a few seconds of latency — no time for slow, parallel offline encoding.

## From beginner to enterprise

**Level 1–2 — the basic design.** Requirements and estimates; pre-signed, resumable uploads; a queue-driven transcoding pipeline; a CDN for playback; metadata in a database with caching.

**Level 3 — the core mechanics.** Renditions, segments and manifests; parallel chunked encoding; adaptive bitrate streaming; storage tiers by popularity.

**Level 4 — at scale.** Event streams for views and analytics; sharded counters for hot videos; search and recommendation data flows; multi-CDN delivery; failure handling; live streaming differences.

**Level 5 — senior discussion.** Codec and storage cost trade-offs; quality-of-experience metrics (start-up time, stall rate); edge capacity planning; content moderation pipelines.

**Level 6 — real platforms.** Custom hardware encoders, ISP-embedded caches and global traffic engineering — beyond an interview, but useful context.

## Interview walkthrough

### How to present it

1. Clarify: upload and watch as the core; scale; latency of playback versus processing.
2. Estimate uploads, storage growth and peak egress — the egress number justifies CDNs.
3. Draw the **upload pipeline** and the **watch path** separately.
4. Deep-dive into transcoding (renditions, parallel chunks), adaptive streaming and storage tiers.
5. Add view counting, failure handling and cost; mention recommendations briefly.

## Common mistakes

### Beginner: uploading through application servers

**Consequence:** overloaded servers and failed large uploads. **Fix:** pre-signed multipart uploads to object storage.

### Beginner: one video file for all devices

**Consequence:** stalls on slow networks, wasted bandwidth on small screens. **Fix:** renditions and adaptive streaming.

### Intermediate: serial transcoding of whole files

**Consequence:** hours of processing for long videos. **Fix:** chunked parallel encoding.

### Intermediate: serving video from the origin

**Consequence:** impossible bandwidth and cost. **Fix:** CDNs and edge caching.

### Intermediate: counting views with database row updates

**Fix:** event streams and aggregated, sharded counters.

### Production: storing every rendition forever in the most expensive tier

**Fix:** tiers and rendition policies by popularity.

## Debugging and troubleshooting

- **Videos stuck in processing**: queue backlog or failing chunks; check DLQs and worker errors.
- **Playback stalls in one region**: CDN edge issues or poor cache hit ratio; check per-region quality metrics.
- **Slow start-up**: large first segments, high starting bitrate or slow manifest and metadata requests.
- **View counts frozen**: the aggregation pipeline is lagging; check stream consumer lag.
- **Upload failures on mobile**: part sizes too large, no resume support, or URLs expiring too soon.

## Security summary

- **Authenticated uploads** with pre-signed URLs scoped to one object and short expiry.
- **Scan and moderate** uploaded content before publishing.
- **Private and paid videos**: signed URLs or cookies on the CDN, and DRM where licensing requires it ({{ch:cloudfront}}).
- **Bot detection** for views and likes, and rate limits on comments ({{ch:rate-limiting}}).
- **Protect originals**: private buckets, versioning and restricted access.

## How a senior engineer thinks about this

- **Bandwidth and storage dominate.** Design around bytes, not just requests.
- **Pipelines, not requests.** Slow work is asynchronous, parallel, idempotent and observable.
- **The player is part of the system.** Adaptive streaming decides the viewer's experience.
- **Popularity is extremely uneven.** Spend more on what is watched, less on the long tail.

## Exercises

### Exercise 1 — Estimate egress

**Objective:** practise bandwidth estimation.
**What to do:** at peak, 20 million people watch simultaneously at an average of 3 Mbit/s. What is the total egress, and what does it imply for the design?

<details>
<summary>Show the solution</summary>

20M × 3 Mbit/s = **60 Tbit/s**. No origin or single data centre can serve that; video must come from **CDN edges** and caches close to viewers (including inside ISPs), with the origin serving only cache misses. It also shows why codec efficiency matters: 20% fewer bits per stream saves 12 Tbit/s.

</details>

### Exercise 2 — Design the transcoding pipeline

**Objective:** practise pipeline design.
**What to do:** design the steps from "upload completed" to "video ready", with failure handling.

<details>
<summary>Show the solution</summary>

1. Storage event → **queue** → a coordinator records the job.
2. **Probe and validate** the file (format, duration, policy checks).
3. **Split** into chunks (for example 10 seconds at keyframes).
4. **Encode** each chunk into each rendition as separate tasks on a worker pool; tasks are idempotent (output path by video, rendition and chunk), retried with backoff, dead-lettered after failures.
5. **Join and package** into segments and manifests; generate thumbnails and captions.
6. **Publish**: update metadata to "ready", notify the uploader, start with low renditions and add higher ones later.
7. **Monitor** queue age, failure rates and processing time per minute of video.

</details>

### Exercise 3 — Fix the stalling

**Objective:** practise streaming quality.
**The scenario:** mobile viewers in one country report frequent stalls, although their average bandwidth is fine. Logs show the player often requests 1080p segments right before stalls. What would you change?

<details>
<summary>Show the solution</summary>

The player is choosing qualities too **aggressively** for variable mobile networks: it reacts to short bursts of high throughput, then stalls when speed drops. Changes: larger safety margins and smoothing of throughput estimates; buffer-based rules (do not raise quality unless the buffer is healthy); shorter segments for faster adaptation; a lower maximum quality on cellular networks by default; and checking CDN performance in that country (edge cache hit ratio, latency). Measure **stall rate** and start-up time before and after.

</details>

## Summary

A video platform is dominated by **bytes**: petabytes of uploads, renditions that roughly double storage, and peak egress of tens of terabits per second. Uploads go **directly to object storage** with pre-signed, **resumable multipart** uploads; a storage event starts an asynchronous **transcoding pipeline** that splits videos into chunks, encodes renditions **in parallel** with idempotent, retried tasks, packages **segments** and **manifests** (HLS, DASH), and marks the video ready.

Players use **adaptive bitrate streaming**, choosing a rendition per segment from throughput estimates and buffer levels; cautious algorithms avoid the stalls that greedy ones cause, because throughput is only known after the fact. **CDNs** deliver segments from the edge; **storage tiers** and rendition policies follow popularity. Views and likes flow through **event streams** into aggregated, **sharded counters**; comments, search and recommendations are fed by the same events. Plan for pipeline failures, CDN failures and viral spikes, and treat live streaming as a separate, real-time variant.

## Key terms

- **Rendition** — A version of a video at a particular resolution and bitrate.
- **Transcoding** — Converting a video into other formats, resolutions or bitrates.
- **Segment** — A short piece of a rendition, typically a few seconds long.
- **Manifest** — A file listing a video's renditions and segments for the player.
- **HLS / MPEG-DASH** — Common protocols for segmented adaptive streaming.
- **Adaptive bitrate streaming** — Choosing a rendition per segment based on network conditions.
- **Buffer** — Video downloaded ahead of the playback position.
- **Stall (rebuffering)** — Playback pausing because the buffer is empty.
- **Codec** — An algorithm for compressing video, such as H.264, VP9 or AV1.
- **Chunked parallel encoding** — Encoding parts of a video simultaneously on many workers.
- **Resumable upload** — An upload that can continue after interruption without restarting.
- **Long tail** — The many items that are each rarely accessed.
- **Egress** — Data sent out from a platform to users.

## What comes next

This completes the system design part. Part XII turns from systems to the engineer. The next chapter, {{ch:application-security}}, starts with application security at senior level: threat modelling, the OWASP Top 10, secure design and the security habits that protect every system you build.
