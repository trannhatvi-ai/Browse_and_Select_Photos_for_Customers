Để sử dụng GitNexus trong IDE nhằm giảm lượng context (ngữ cảnh) khi dùng AI Code Agent (như Cursor, Claude Code, Windsurf, v.v.), bạn sẽ tận dụng tính năng **MCP (Model Context Protocol)** của nó.

GitNexus hoạt động bằng cách quét toàn bộ mã nguồn của bạn và tạo ra một **Knowledge Graph (Sơ đồ tri thức) cục bộ**. Thay vì phải nhét hàng loạt file code vào context window của AI một cách thủ công và tốn kém, AI agent sẽ tự động truy vấn Sơ đồ tri thức này thông qua các "Tools" (công cụ) của MCP để chỉ lấy ra chính xác hàm, file hoặc luồng thực thi (call chain) mà nó cần. Điều này giúp tiết kiệm token đáng kể và giảm thiểu tình trạng AI bị "ảo giác" (hallucination) do quá tải context.

Dưới đây là các bước chi tiết để cài đặt và tích hợp GitNexus vào IDE của bạn:

### Bước 1: Cài đặt GitNexus CLI

Bạn cần cài đặt công cụ này toàn cục (global) trên máy tính bằng Node.js (npm):

```bash
npm install -g gitnexus

```

### Bước 2: Quét (Index) Project của bạn

Mở terminal, điều hướng đến thư mục gốc của repository (project code) mà bạn đang làm việc và chạy lệnh sau:

```bash
npx gitnexus analyze

```

*Lệnh này sẽ quét toàn bộ code, thiết lập sơ đồ tri thức cục bộ và tự động tạo các file context tối ưu (`AGENTS.md` / `CLAUDE.md`) cho AI agent.*

### Bước 3: Kết nối GitNexus với IDE (Cấu hình MCP)

GitNexus cung cấp một lệnh tự động phát hiện IDE và cấu hình MCP cho bạn. Chỉ cần chạy:

```bash
npx gitnexus setup

```

Nếu lệnh tự động không tương thích hoặc bạn muốn cấu hình thủ công tùy theo IDE/Agent bạn đang dùng, hãy tham khảo các cách sau:

#### 1. Dành cho Cursor:

Bạn cần mở file cấu hình MCP toàn cục (nằm ở `~/.cursor/mcp.json`) và thêm cấu hình của gitnexus vào:

```json
{
  "mcpServers": {
    "gitnexus": {
      "command": "npx",
      "args": ["-y", "gitnexus@latest", "mcp"]
    }
  }
}

```

*Sau khi lưu, hãy khởi động lại Cursor. Trong mục MCP của Cursor, bạn sẽ thấy GitNexus được kết nối.*

#### 2. Dành cho Claude Code:

Mở terminal và chạy lệnh tương ứng với hệ điều hành:

* **macOS / Linux:**
```bash
claude mcp add gitnexus -- npx -y gitnexus@latest mcp

```


* **Windows:**

```bash
  claude mcp add gitnexus -- cmd /c npx -y gitnexus@latest mcp

```

#### 3. Dành cho Windsurf (nếu cấu hình qua file mcp.json thủ công):

Tương tự như Cursor, bạn cung cấp command là `npx` với các arguments `["-y", "gitnexus@latest", "mcp"]` trong file config mcp của Windsurf.

#### 4. Dành cho OpenCode:

Cập nhật file `~/.config/opencode/config.json`:

```json
{
  "mcp": {
    "gitnexus": {
      "type": "local",
      "command": ["gitnexus", "mcp"]
    }
  }
}

```

### Cách Agent sử dụng nó lúc bạn code:

Sau khi thiết lập thành công, mỗi khi bạn prompt AI (ví dụ: *"Sửa logic của hàm authenticateUser và kiểm tra xem có ảnh hưởng đến nơi nào khác không"*):

1. Code Agent sẽ nhận thấy nó có bộ công cụ của GitNexus (bao gồm 16 tools như `query`, `context`, `impact` phân tích tầm ảnh hưởng, v.v.).
2. Thay vì đọc toàn bộ thư mục `auth`, Agent sẽ gọi công cụ MCP để tìm các điểm phụ thuộc của `authenticateUser`.
3. Agent chỉ kéo đúng những dòng code và file liên quan trực tiếp vào context, bỏ qua các file rác.
4. Điều này giúp giảm tối đa context, tối ưu hóa tốc độ cũng như độ chính xác của AI.

*(Lưu ý: Nếu code của bạn thay đổi nhiều sau một thời gian phát triển, thỉnh thoảng bạn có thể chạy lại `npx gitnexus analyze` ở terminal để AI cập nhật lại biểu đồ tri thức của codebase).*

```

```