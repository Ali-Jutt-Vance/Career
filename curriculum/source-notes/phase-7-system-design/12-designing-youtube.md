# Phase 7 — Chapter 12: Designing YouTube/Netflix

---

## Chapter Overview

Designing a video streaming platform covers the most challenging distributed systems problems: massive blob storage, video transcoding pipelines, adaptive bitrate streaming, CDN delivery, and recommendations at scale. YouTube serves 500 hours of video uploaded per minute and 1B hours watched per day.

**Topics:**
- Requirements for video streaming
- Video upload pipeline (chunking, transcoding)
- Adaptive bitrate streaming (ABR)
- CDN strategy for video delivery
- Metadata storage
- View counting at scale
- Recommendation system concepts

---

## Requirements Clarification

```
Functional:
  1. Upload videos (up to 4K, up to 10 GB)
  2. Stream videos at multiple quality levels (360p, 720p, 1080p, 4K)
  3. Adaptive bitrate: auto-switch quality based on network speed
  4. Search videos by title, description, tags
  5. Like, comment, subscribe
  6. View count
  7. Recommended videos

Non-Functional:
  Availability:    99.99% (revenue-critical)
  Upload latency:  Video processable within 5 minutes of upload
  Stream latency:  Video starts within 2 seconds (with ABR)
  Scale:           500 hours uploaded/min, 1B hours watched/day
  Global:          Multi-region, videos served from closest edge
  Durability:      Videos never lost (multiple storage copies)
```

---

## Scale Estimation

```
Upload:
  500 hours of video/minute
  Average video: 20 min, 4 GB (raw)
  500 hours / 20 min per video = 1,500 videos/minute = 25/second
  Raw data: 25 × 4 GB = 100 GB/second upload
  After transcoding: multiple resolutions, ~10x original = 1 TB/second stored

View:
  1B hours watched/day ÷ 24 = 41.7M concurrent viewers
  Average video: 8 minutes
  Concurrent streams: 41.7M × 8 min / 60 = 5.6M concurrent streams

Bandwidth:
  5.6M × 5 Mbps (1080p) = 28 Tbps → must use CDN
  YouTube CDN servers: 100,000+ edge nodes globally

Storage:
  500 hours/min × 60 min/hour × 24 hours × 10x (transcoded) = 4.3 PB/day
  × 365 years of video: exabytes (impossible to hold all at full quality forever)
  Solution: compress older/less-popular videos more aggressively
```

---

## Video Upload Pipeline

```
Upload flow:
  1. User selects video → client splits into chunks (5 MB each)
  2. Client uploads each chunk to Upload Service (resumable upload)
  3. Upload Service writes raw chunks to S3 → publishes UploadComplete event
  4. Transcoding Service picks up event (async)
  5. Transcode to multiple resolutions: 360p, 480p, 720p, 1080p, 4K
  6. Generate thumbnail frames
  7. Create HLS/DASH manifests (.m3u8 files)
  8. Push all assets to CDN origin
  9. Update metadata DB: video_status = "published", cdn_urls = [...]
  10. Notify uploader: "Your video is ready"

Transcoding:
  FFmpeg: open-source, industry standard
  Each resolution = parallel job
  AWS Elastic Transcoder or MediaConvert (managed service)
  YouTube uses their own massive GPU cluster (Argos, Sieve)
  
  Formats output:
    H.264 (HLS) → widest device compatibility
    H.265/HEVC   → 50% smaller at same quality (newer devices)
    VP9/AV1      → YouTube's own codec, even smaller
    
  HLS (HTTP Live Streaming):
    Video split into 6-second .ts segments
    .m3u8 manifest file listing all segments + quality levels
    Player downloads manifest, picks quality, downloads segments sequentially
    On network change: player downloads next quality level's segments
```

---

## Adaptive Bitrate Streaming (ABR)

```
Problem: fixed quality video breaks if network slows down.
ABR: player monitors network speed, switches quality mid-playback.

HLS manifest structure:
  master.m3u8 (quality selector):
    #EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=640x360
    360p.m3u8
    #EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720
    720p.m3u8
    #EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080
    1080p.m3u8

  720p.m3u8 (segment list):
    #EXTINF:6.0,
    seg001.ts
    #EXTINF:6.0,
    seg002.ts
    ...

Player behavior:
  1. Download master.m3u8
  2. Measure network speed: 2 Mbps → select 720p
  3. Download seg001.ts → play
  4. Download seg002.ts while playing seg001
  5. Network drops to 0.5 Mbps → switch to 360p
  6. Download next segment at 360p
  
Buffer strategy:
  Buffer 30 seconds ahead (smooth playback)
  If buffer drops below 10s: switch to lower quality
  If buffer > 30s: try higher quality
```

---

## CDN Architecture for Video

```
Video delivery architecture:
  S3 (origin) → CDN Edge (100k+ nodes) → User

CDN hierarchy:
  Origin:      S3 bucket in us-east-1 (source of truth)
  Shield:      Regional shield node (reduces origin load)
  Edge:        City-level PoP, serves user from nearest location

Request flow:
  User in Mumbai requests video segment →
  Mumbai CDN edge (cache HIT?) → serve instantly
  Cache MISS → request to Singapore shield →
  Singapore shield (cache HIT?) → serve
  Shield MISS → S3 us-east-1 → return + cache at shield and edge

Cache TTL:
  Video segments: 1 year (content never changes by design)
  Manifests (.m3u8): short TTL or re-sign URL
  Thumbnails: 24 hours

Popularity-aware caching:
  Popular videos: cached at all edge nodes
  Rare videos: cached only at shield, not at every edge
  New video (30 min): warm up by pre-pushing to multiple edges

CDN providers:
  YouTube: Google's own CDN (Google Global Cache)
  Netflix: Open Connect Appliances (Netflix's own ISP-hosted CDN boxes)
  Generic: CloudFront, Akamai, Fastly
```

---

## View Counting at Scale

```
Challenge: 1B views/day = 11,500 view events/second
  Naive: UPDATE videos SET view_count = view_count + 1 WHERE id = ?
  Problem: database lock contention at 11,500 QPS on same row → slowdown

Solution 1: Redis counter (fast writes)
  On view: INCR view:{videoId}
  Periodic job: flush Redis counts to DB every 30 seconds
  Redis: 100,000 INCR/sec per node → easily handles this
  Downside: lose a few views if Redis crashes (acceptable)

Solution 2: Kafka stream counting
  Each view event → Kafka topic → Spark Streaming job
  Aggregate: count by videoId per 30-second window
  Flush to DB
  Benefit: durable, replayable, analytics built in

Solution 3: Probabilistic counting (HyperLogLog)
  For approximate counts: PFADD views:{videoId} {userId}
  HyperLogLog: 12KB per counter, ~0.8% error, counts distinct viewers
  YouTube uses this for approximate counts (doesn't show exact beyond "1M+")

Anti-abuse:
  Don't count: same IP within 30s, bots (low time-on-page)
  Async count: don't block video playback on count increment
  Batch dedup: deduplicate views before counting
```

---

## Interview Preparation

**Q1: How does video transcoding work at scale?**
A: A raw uploaded video (e.g., 4K .mp4) needs to be converted to multiple resolutions and formats for different devices and network conditions. Process: 1) Video uploaded to S3 as raw file. 2) Transcoding event published. 3) Transcoding workers (running FFmpeg) pick up the job. 4) Each worker transcodes to one resolution (parallel: one worker per resolution). 5) Output: video segments in HLS format (.ts files, 6 seconds each) and manifest files (.m3u8). 6) All outputs uploaded to CDN origin (S3). 7) Metadata updated: video is "published" with CDN URLs. Scale: AWS MediaConvert or a GPU cluster can transcode a 20-min 4K video to all resolutions in under 5 minutes using parallel workers. Checkpointing: if a worker crashes mid-transcode, it restarts from last checkpoint (S3 stores progress).

**Q2: How would you design adaptive bitrate streaming?**
A: Adaptive bitrate (ABR) streaming solves the problem of varying network conditions. The video is encoded at multiple bitrates (360p, 720p, 1080p). An HLS manifest (master .m3u8) lists all available quality levels. The player starts by downloading the manifest, selects an initial quality based on network speed, downloads 6-second segments. The player continuously measures: download speed of the last segment, current buffer level. If buffer drops below 10s or download speed drops: switch to lower quality for next segment. If buffer > 30s: try higher quality. This happens seamlessly mid-playback — the user sees a brief quality change, not a stall. Key insight: small 6-second segments allow granular quality switching, and buffering ahead ensures smooth playback during the switch.

---

## Cheat Sheet

```
YouTube Scale:
  500 hours uploaded/minute, 1B hours watched/day
  5.6M concurrent streams, 28 Tbps served via CDN
  Storage: petabytes/day (exabytes total)

Upload pipeline:
  Chunk → Upload Service → S3 raw → Kafka → Transcoding workers
  → HLS segments (.ts) + manifests (.m3u8) → CDN → Published

ABR key metrics:
  Segment size: 6 seconds each
  Buffer target: 30s ahead
  Switch down when: buffer < 10s or speed drops below bitrate
  Switch up when: buffer > 30s, speed > next tier

View counting:
  Redis INCR per view → batch flush to DB every 30s
  Or: Kafka stream → Spark → DB
  HyperLogLog for distinct viewer count (~0.8% error)

Storage decisions:
  Raw video: S3 (origin)
  Transcoded segments: S3 → CDN origin → edge cache
  Thumbnails: S3 + CDN, 24h TTL
  Metadata: PostgreSQL (video info) or Cassandra
  Search: Elasticsearch (title, description, tags)
```
