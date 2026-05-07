Tuyệt vời, bắt đầu với v0 (v0.dev) của Vercel là cách nhanh nhất để hiện thực hóa ý tưởng giao diện (frontend). v0 rất mạnh trong việc hiểu ngôn ngữ tự nhiên và chuyển thành component Tailwind CSS/Shadcn UI.

Vì v0 tạo giao diện dựa trên từng component hoặc từng trang đơn lẻ, tôi sẽ cung cấp cho bạn **3 Prompts** cho 3 trang quan trọng nhất của hệ thống này.

Bạn hãy copy đoạn tiếng Anh (v0 hiểu tiếng Anh tốt nhất) và dán vào ô chat của v0 nhé.

---

### Prompt 1: Trang Duyệt và Chọn Ảnh dành cho Khách hàng (Quan trọng nhất)

Trang này cần ưu tiên trải nghiệm mượt mà trên điện thoại, ảnh hiển thị đẹp, dễ tương tác.

**Copy đoạn này vào v0:**

> Build a web page interface for photography clients to review and select their photos.
>
> **Layout:**
> 1.  **Header:** Studio Logo (left), "Welcome, Nguyen Van A" (right), a progress bar showing "X/Y photos selected".
> 2.  **Filter Bar (sticky below header):** Buttons for "All Photos", "Selected (with heart icon)", "Unselected". A dropdown to sort by date or filename.
> 3.  **Photo Grid:** A responsive grid (2 columns on mobile, 4-5 on desktop).
>
> **Photo Interaction:**
> *   Each photo card should have a subtle diagonal text watermark "PROOFS" overlaying the image.
> *   On hover (or tap on mobile), show two icons on the bottom right of the photo: a "Heart" icon (to select) and a "Comment" icon.
> *   Clicking the heart changes its color (e.g., to red) and increments the progress bar.
> *   Clicking the comment icon opens a small, styled text input modal below the image to add retouching notes.
> *   Clicking the image itself opens it in a full-screen lightbox view with navigation arrows.
>
> **Footer (sticky):** A prominent "Submit Selection to Studio" button.
>
> **Styling:** Modern, minimalist, clean white background, use professional fonts. Focus on performance and smooth scrolling. Use shadcn/ui components where applicable.

---

### Prompt 2: Trang Dashboard dành cho Studio (Quản lý show chụp)

Trang này giúp Admin studio nhìn tổng quan tất cả các show chụp, trạng thái và dễ dàng tạo show chụp mới.

**Copy đoạn này vào v0:**

> Create a dashboard interface for a photography studio owner to manage photo proofing projects.
>
> **Layout:**
> 1.  **Sidebar Navigation:** Dashboard (active), Projects, Clients, Settings, Logout. Studio Logo at the top.
> 2.  **Main Content Area:**
>     *   **Header:** Title "My Projects" and a " + New Project" call-to-action button (primary color).
>     *   **Stats Cards (Row):** Total Projects, Pending Client Review, Completed, Storage Used.
>     *   **Project List (Table or Grid):** Show columns: Client Name, Event Name (e.g., Wedding, Portrait), Event Date, Status (Badge style: Uploading, Choosing, Done), Deadline, Action (View/Manage).
>
> **Interaction:**
> *   Hovering over a project row should highlight it.
> *   The "New Project" button should look inviting.
>
> **Styling:** Professional, efficient, slightly darker sidebar for contrast, clear typography for data readability. Look like a professional SaaS application.

---

### Prompt 3: Trang Tạo Dự Án Mới & Upload Ảnh (Dành cho Studio)

Đây là nơi studio nhập thông tin khách hàng, thiết lập giới hạn và upload ảnh.

**Copy đoạn này vào v0:**

> Design a web form for a studio to create a new photo proofing gallery for a client.
>
> **Layout:**
> A single column, focused form layout.
>
> **Sections:**
> 1.  **Client Info:** Inputs for Client Name, Email, Password for access (optional).
> 2.  **Project Details:** Input for Event Name, Date picker for event date.
> 3.  **Settings:** Input for "Max photos client can select", Deadline picker for selection. Toggle switch for "Allow client to download watermarked photos".
> 4.  **Watermark Setup:** A small section to upload studio logo for watermark, and a slider to adjust watermark opacity.
> 5.  **Upload Area:** A large, dashed-border "Drag & Drop photos here or Click to upload" area. Show progress bars for current uploads below it.
>
> **Footer:** "Save & Send Link to Client" button.
>
> **Styling:** Clean, forms are well-spaced, use shadcn/ui form and upload components. It should feel robust and trustworthy.

---

### Lưu ý sau khi v0 tạo xong:

1.  **Iterate (Tương tác lại):** Nếu v0 tạo ra kết quả bạn chưa ưng ý (ví dụ: màu xấu, bố cục sai), bạn có thể chat tiếp với nó bằng tiếng Anh. Ví dụ: *"Make the photo grid 3 columns on mobile"* hoặc *"Change primary color to deep blue"*.
2.  **Kết hợp:** Sau khi có code của 3 trang này, bạn sẽ cần một lập trình viên (hoặc tự làm nếu biết code) để kết nối chúng lại, xây dựng backend (xử lý upload ảnh thật, lưu vào database, gửi email). v0 chỉ lo phần "vỏ" giao diện.