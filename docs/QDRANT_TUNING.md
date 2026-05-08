Qdrant Tuning Recommendations

Mục tiêu: tối ưu chi phí tìm kiếm and indexing ở scale (hàng chục - hàng trăm nghìn ảnh, mỗi ảnh nhiều chunk).

1) Kiến trúc collections
- Dùng 2 collection tách biệt: `image_index` (primary + chunks) và `face_index` (face vectors).
- Giữ một point "primary" (`is_primary: True`) mỗi ảnh để làm representative vector.
- Lưu chunks (tất cả vectors) cùng với metadata `photo_id`, `project_id`, `is_primary`.

2) HNSW / index config
- Mặc định HNSW phù hợp cho read-heavy workloads.
- Thông số khuyến nghị: `m=16`, `ef_construct=128` cho build; `ef` (query time) tăng dần theo latency/budget, ví dụ `ef=64` để bắt đầu.
- Tăng `ef` khi cần recall cao hơn ở chi phí latency chấp nhận được.

3) Two-phase search (đã áp dụng)
- Phase-1: tìm kiếm trên các primary vectors (1 point/ảnh) với top_k nhỏ (ví dụ 200-500). Rất nhanh vì số điểm thấp.
- Phase-2: lấy các photo_id của top-K phase-1, tải chunk-level vectors chỉ của những ảnh đó và rerank bằng cosine/inner product chính xác để tăng recall.
- Đây là tradeoff tốt giữa latency và recall ở scale lớn.

4) Upsert & batching
- Upsert theo batch vừa phải (e.g. 128-512 points) để tránh timeouts và dùng concurrency bounded (Semaphore).
- Sinh point IDs deterministic (UUID v5) để tránh duplicates và dễ update.

5) Payload & filtering
- Lưu metadata cần thiết (project_id, photo_id, is_primary, quality_score) để filter theo project trước khi rerank.
- Khi tìm kiếm global, luôn filter theo `project_id` để tránh trả kết quả cross-project.

6) Operational
- Snapshot/backup Qdrant thường xuyên (export snapshots) trước các thao tác flush/major rebuild.
- Giám sát: latency p50/p95/p99, QPS, memory usage, disk I/O, fragment counts.
- Thử nghiệm với `ef` và `m` trên staging dataset trước khi apply production.

7) Resource sizing
- Vector dimension × points xác định memory: estimate = points × dim × 4 bytes (+overhead). Cân nhắc sharding khi dataset lớn.
- Sử dụng CPU mạnh cho xây dựng index (ef_construct) và nhiều RAM cho lưu trữ hoạt động.

8) Consistency
- Sử dụng deterministic IDs và checkpointing để đảm bảo idempotent upserts.
- Nếu cần rollback, giữ log các upsert batches và dùng snapshots để phục hồi.

9) Tips cụ thể cho project này
- Sử dụng primary-first search đã tích hợp để giảm chi phí queries trên toàn bộ chunks.
- Giữ `max_rerank` giới hạn (ví dụ 200-500 image candidates) để tránh fetch quá nhiều chunk vectors.
- Nếu latency phase-2 quá cao, cân nhắc caching chunk embeddings cho các ảnh phổ biến hoặc precomputed representatives per album.

10) Tham khảo lệnh
- Kiểm tra collection stats: dùng Qdrant HTTP API `/collections/{name}` để xem pointCount và segments.
- Ví dụ upsert batch CLI (pseudo):

  POST /collections/image_index/points
  body: { "points": [ { "id": "...", "vector": [...], "payload": {...} }, ... ] }

Kết luận: Hai thay đổi có hiệu quả lớn nhất là (1) dùng primary representative vectors + two-phase rerank, và (2) batching + bounded concurrency cho upserts. Hai việc này cân bằng tốt giữa chi phí và chất lượng tìm kiếm.
