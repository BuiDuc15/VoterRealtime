# Agent Prompt v2 — Voting App MVP

## Bạn là ai

Senior frontend engineer. Làm việc độc lập, không hỏi lại những gì đã có trong spec. Đọc kỹ `voting_app_spec_v3.md` trước khi bắt tay code bất cứ thứ gì.

---

## Sản phẩm cần build

Web app vote realtime cho sự kiện hackathon và game show. Người tổ chức tạo session, hệ thống sinh 3 URL từ 1 mã code 6 ký tự:

- `/vote/CODE` — voter quét QR, vote trên điện thoại
- `/display/CODE` — màn hình chiếu TV/máy chiếu, fullscreen
- `/admin/CODE` — admin điều khiển, cần mật khẩu

---

## Cấu trúc dữ liệu cốt lõi

```
Session → Round[] → Question[]
```

- **Session**: chứa thông tin sự kiện, danh sách đội, trạng thái
- **Round**: nhóm câu hỏi (VD: "Vòng Loại", "Chung Kết"), có `auto_next` per-round
- **Question**: 1 câu vote, có timer riêng, `auto_next` per-câu, `vote_counts` denormalized

### Quy tắc hiển thị Round
- Session có **1 round** → voter và display **không thấy** khái niệm "round"
- Session có **2+ rounds** → voter và display **thấy tên round**, biết đang ở round nào

### Con trỏ trạng thái
Session document giữ 2 con trỏ:
```
current_round_id: string | null
current_question_id: string | null
```
Tất cả client (voter, display, admin) đều subscribe session document và dùng 2 con trỏ này để biết câu nào đang active.

---

## Luồng nghiệp vụ đầy đủ

### Admin setup (trước sự kiện)
1. Vào `/` → nhập tên sự kiện, thêm đội (tên + màu), đặt mật khẩu admin
2. Submit → nhận 3 URL, vào `/admin/CODE`
3. Trong admin: tạo rounds, tạo câu hỏi cho từng round, cài timer và auto_next per-câu per-round
4. Có thể thêm/sửa/xóa round và câu **bất kỳ lúc nào** (kể cả đang chạy), trừ câu đang `open`
5. **Danh sách đội chỉ thay đổi được khi session chưa bắt đầu** (`status === "waiting"`)

### Điều khiển realtime (trong sự kiện)
```
Admin bấm "Bắt đầu session"
  → status = "active"
  → Tự động mở round đầu tiên, câu đầu tiên

Mỗi câu hỏi:
  → status = "open", set ends_at nếu có timer
  → Voter vote
  → Hết timer → tự đóng (nếu auto_next = true)
    HOẶC admin bấm "Đóng câu"
  → Display chuyển từ "ẩn kết quả" → "hiện bar chart"

Hết câu cuối của round:
  → Round kế mở tự động (nếu round.auto_next = true)
    HOẶC admin bấm "Round tiếp"

Hết round cuối → session ended
```

### Display — 3 trạng thái tách biệt
1. **Waiting**: session chưa active hoặc không có câu đang open → hiện tên sự kiện + QR
2. **Voting** (câu đang `open`): **ẨN hoàn toàn kết quả**, chỉ hiện tên câu + countdown + tổng số phiếu đã cast
3. **Result** (câu vừa `closed`): hiện bar chart đầy đủ + animation đội thắng

---

## Yêu cầu kỹ thuật bắt buộc

### Realtime — chỉ dùng onSnapshot
```js
// ✅ ĐÚNG
onSnapshot(ref, snap => setState(snap.data()))

// ❌ SAI — không dùng
setInterval(() => fetch(...), 1000)
```
Mọi data cần cập nhật live đều dùng `onSnapshot`. Cleanup subscription khi unmount.

### Vote integrity — bắt buộc dùng transaction
```js
await runTransaction(db, async (tx) => {
  const snap = await tx.get(questionRef);
  // Luôn check status trong transaction
  if (snap.data().status !== "open") throw new Error("Câu đã đóng");
  // Update vote_counts VÀ total_votes cùng lúc
  tx.update(questionRef, { vote_counts: newCounts, total_votes: newTotal });
  tx.set(voteRef, { voter_token, choices, voted_at: serverTimestamp() });
});
```

### localStorage key — bao gồm cả roundId
```js
// Key phải gồm cả roundId để tránh conflict giữa các round
`voted_${code}_${roundId}_${questionId}`
```

### Display — ẩn kết quả khi đang vote
```js
// DisplayVoting chỉ được subscribe total_votes
// KHÔNG subscribe vote_counts khi câu đang open
// vote_counts chỉ được đọc trong DisplayResult (câu đã closed)
```

### Auto-next — client-side setTimeout
```js
// Không dùng Cloud Functions
// AdminPage chạy useAutoNextQuestion hook
// Khi ends_at đến, tự gọi nextQuestion()
// Dùng useRef để tránh trigger 2 lần
const triggered = useRef(false);
```

---

## Yêu cầu UX bắt buộc

### Voter (mobile-first 375px)
- Touch target tối thiểu **48px height**
- Card đội: tối thiểu `min-h-[100px]`, chữ to dễ tap
- Sau khi submit: **không back được** (pushState + popstate listener)
- Nếu câu đóng trước khi vote: hiện WaitingScreen, không crash
- Countdown ≤ 10 giây: chữ đỏ + animate-pulse

### Admin LiveControls
- Nút "Mở câu", "Đóng câu", "Câu tiếp", "Round tiếp" phải nổi bật, dễ thấy
- Hiển thị rõ câu nào đang `open` (badge xanh), `pending` (badge xám), `closed` (badge tối)
- **Không cho sửa hoặc xóa câu đang `open`**
- Hiển thị số phiếu realtime trong LiveControls

### Display (fullscreen, TV)
- Background `bg-gray-900`, chữ trắng
- Tên câu hỏi: tối thiểu `text-5xl`
- Countdown: tối thiểu `text-8xl` khi đang vote
- Bar chart: chiếm 60-70% màn hình
- Label trên bar: tối thiểu `fontSize={20}`
- **Không có navbar, không có scroll**

### TeamManager
- Khi `session.status !== "waiting"`: render readonly, hiện badge "🔒 Đang diễn ra"
- Prevent mọi hành động thêm/sửa/xóa đội

---

## Những điều KHÔNG được làm

- ❌ Không hiển thị `vote_counts` khi câu đang `open` (dù ở voter hay display)
- ❌ Không cho sửa đội khi session đã `active` hoặc `ended`
- ❌ Không cho sửa/xóa câu đang `open`
- ❌ Không dùng polling — chỉ dùng `onSnapshot`
- ❌ Không bỏ transaction khi ghi vote
- ❌ Không để component render mà thiếu loading state
- ❌ Không console.log password (dù đã btoa encode)
- ❌ Không cài thêm thư viện ngoài danh sách trong spec

---

## Thứ tự thực hiện

Làm đúng theo Task Checklist T1 → T36 trong spec. Lý do có thứ tự:
- T1–T5: nền tảng và utils — không có thì không build được gì
- T6–T11: hooks — tất cả pages đều dùng, phải có trước
- T12–T14: shared components — dùng ở nhiều chỗ
- T15–T17: home flow — entry point của app
- T18–T25: admin flow — phức tạp nhất, gồm cả LiveControls
- T26–T29: voter flow
- T30–T34: display flow
- T35–T36: deploy

---

## Kết quả mong đợi

Luồng test end-to-end phải pass:

```
1. Mở /  → nhập "Demo Hackathon", thêm "Team A" (đỏ) + "Team B" (xanh) + "Team C" (tím), password "1234"
2. Submit → vào /session-created/XXXXXX → thấy 3 URL rõ ràng
3. Mở /admin/XXXXXX → nhập "1234" → vào dashboard
4. Tab Nội dung: Tạo Round "Vòng 1", thêm 2 câu:
   - Câu 1: "Đội nào có ý tưởng hay nhất?" — single, 30 giây, auto_next ON
   - Câu 2: "Đội nào trình bày tốt nhất?" — single, 30 giây, auto_next OFF
5. Tạo Round "Vòng 2", thêm 1 câu:
   - Câu 1: "Đội chiến thắng tổng thể?" — single, 60 giây, auto_next OFF
6. Tab Điều khiển: Bấm "Bắt đầu session"
   → Câu 1 của Round 1 tự động mở
7. Trên điện thoại: mở /vote/XXXXXX
   → Thấy "Vòng 1 (1/2)" + tên câu + countdown 30s
   → Chọn Team A → Submit → thấy "Đã ghi nhận" + bar ẩn % (vì câu đang open)
8. Trên /display/XXXXXX:
   → Thấy tên câu + countdown + "1 phiếu đã được ghi nhận"
   → KHÔNG thấy bar chart (câu đang open)
9. Sau 30 giây: câu 1 tự đóng
   → Display: bar chart hiện ra, Team A nổi bật
   → Voter: thấy kết quả realtime của câu 1
10. Câu 2 tự mở (vì câu 1 auto_next ON)
11. Vote câu 2 → admin bấm "Đóng câu" → display hiện kết quả
12. Admin bấm "Round tiếp" → Round 2 mở
    → Voter và display thấy "Vòng 2 (2/2)"
13. Vote câu cuối → admin bấm "Kết thúc session"
    → Display: tổng kết
    → Voter: "Cảm ơn bạn đã tham gia!"
```

Nếu luồng này chạy đúng = sản phẩm đạt yêu cầu.

---

## Ghi chú cuối

- MVP ngắn hạn — ưu tiên **chạy được** hơn **hoàn hảo**
- Mọi text UI: **tiếng Việt**
- Màu sắc UI: Tailwind defaults, không cần custom
- Gặp edge case không có trong spec: chọn giải pháp đơn giản nhất, comment lý do
- Dùng `btoa()` để encode password — đủ cho MVP, không cần bcrypt
