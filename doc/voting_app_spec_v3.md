# Voting App — Coding Spec v3

> Use case: Hackathon chấm điểm đội + Game show/sự kiện giải trí
> Stack: React 18 + Vite + Tailwind + Firebase Firestore + Firebase Hosting

---

## Kiến trúc tổng quan

### Luồng khởi tạo
1. Vào trang chủ `/` → form khai báo nhanh: tên sự kiện, danh sách đội, mật khẩu admin
2. Submit → sinh `sessionCode` 6 ký tự (VD: `XK9M2P`)
3. Chuyển sang trang `/session-created/XK9M2P` → hiển thị 3 URL

### 3 URL từ 1 session code

| URL | Dùng cho | Bảo vệ |
|-----|----------|--------|
| `/vote/XK9M2P` | Voter quét QR vào vote | Không cần password |
| `/display/XK9M2P` | Màn hình chiếu thống kê | Không cần password |
| `/admin/XK9M2P` | Admin điều khiển toàn bộ | Nhập password |

---

## Cấu trúc phân cấp dữ liệu

```
Session
  └── Round (1 hoặc nhiều)
        └── Question (1 hoặc nhiều)
```

### Quy tắc hiển thị Round

| Số round | Voter thấy | Display thấy |
|----------|-----------|--------------|
| = 1 | Không thấy khái niệm "round", chỉ thấy câu hỏi | Không hiện tên round |
| ≥ 2 | Thấy tên round hiện tại, biết đang ở round nào | Hiện tên round + progress |

### Quy tắc auto-next

| Cấp | Cài đặt | Trigger |
|-----|---------|---------|
| Question | `auto_next: true` + `duration > 0` | Hết timer → tự đóng câu + mở câu kế |
| Question | `auto_next: false` | Admin bấm Next mới chuyển |
| Round | `auto_next: true` | Hết câu cuối → tự đóng round + mở round kế |
| Round | `auto_next: false` | Admin bấm Next Round mới chuyển |

---

## Firestore Data Model

```
sessions/{sessionCode}
  name: string
  admin_password: string          // btoa encoded
  status: "waiting" | "active" | "ended"
  teams: Array<{
    id: string                    // uuid
    name: string
    color: string                 // hex color
    order: number                 // thứ tự hiển thị
  }>
  show_round_label: boolean       // true = luôn hiện tên round dù chỉ có 1
  created_at: timestamp

  // Con trỏ trạng thái hiện tại — admin cập nhật khi điều khiển
  current_round_id: string | null
  current_question_id: string | null

sessions/{sessionCode}/rounds/{roundId}
  name: string                    // VD: "Vòng Chung Kết"
  order: number                   // sắp xếp tăng dần
  status: "pending" | "active" | "ended"
  auto_next: boolean              // true = tự chuyển round kế sau câu cuối
  created_at: timestamp

sessions/{sessionCode}/rounds/{roundId}/questions/{questionId}
  text: string                    // Nội dung câu hỏi
  order: number                   // thứ tự trong round, admin đổi được
  vote_mode: "single" | "multi"
  status: "pending" | "open" | "closed"
  duration: number | null         // giây, null = không giới hạn
  ends_at: timestamp | null       // set khi mở câu
  auto_next: boolean              // true = hết timer tự sang câu kế
  show_realtime: false            // LUÔN false — ẩn khi đang vote, chỉ hiện sau khi đóng
  vote_counts: { [teamId]: number } // denormalized
  total_votes: number             // tổng phiếu, denormalized
  created_at: timestamp

sessions/{sessionCode}/rounds/{roundId}/questions/{questionId}/votes/{voteId}
  voter_token: string             // uuid từ localStorage
  choices: string[]               // array teamId
  voted_at: timestamp
```

> **Lưu ý:** `show_realtime` luôn `false` theo spec. Giữ field trong DB để dễ mở rộng sau này, nhưng UI không expose setting này.

---

## Stack & Setup

```bash
npm create vite@latest voting-app -- --template react
cd voting-app
npm install firebase react-router-dom recharts qrcode.react lucide-react framer-motion uuid
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js**
```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

**src/index.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**.env**
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Folder Structure

```
src/
├── main.jsx
├── App.jsx
├── firebase.js
├── pages/
│   ├── HomePage.jsx              # Form tạo session nhanh
│   ├── SessionCreated.jsx        # Hiển thị 3 URL + QR
│   ├── AdminPage.jsx             # Admin toàn bộ
│   ├── VotePage.jsx              # Voter UI
│   └── DisplayPage.jsx           # Màn hình chiếu
├── components/
│   ├── home/
│   │   └── CreateSessionForm.jsx
│   ├── admin/
│   │   ├── AdminLogin.jsx
│   │   ├── SessionSettings.jsx   # Cài đặt session: tên, đội, timer...
│   │   ├── TeamManager.jsx       # Thêm/sửa/xóa đội (khóa khi active)
│   │   ├── RoundList.jsx         # Danh sách rounds
│   │   ├── RoundForm.jsx         # Tạo/sửa round
│   │   ├── QuestionList.jsx      # Danh sách câu trong round
│   │   ├── QuestionForm.jsx      # Tạo/sửa câu hỏi
│   │   ├── LiveControls.jsx      # Điều khiển realtime: open/close/next
│   │   └── QRDisplay.jsx
│   ├── voter/
│   │   ├── WaitingScreen.jsx
│   │   ├── VoteCard.jsx
│   │   ├── ResultsPreview.jsx    # Hiện sau khi đã vote (realtime)
│   │   └── AlreadyVoted.jsx
│   ├── display/
│   │   ├── DisplayWaiting.jsx
│   │   ├── DisplayVoting.jsx     # Đang vote: ẩn kết quả, chỉ hiện countdown + tên câu
│   │   ├── DisplayResult.jsx     # Sau khi đóng câu: bar chart kết quả
│   │   ├── DisplayRoundSummary.jsx # Tổng kết round
│   │   └── WinnerAnnounce.jsx
│   └── shared/
│       ├── CountdownTimer.jsx
│       ├── LoadingSpinner.jsx
│       └── SessionUrlCard.jsx
├── hooks/
│   ├── useSession.js
│   ├── useRounds.js
│   ├── useQuestions.js           # Subscribe câu hỏi của 1 round
│   ├── useCurrentQuestion.js     # Subscribe câu đang active
│   ├── useVoterToken.js
│   ├── useAutoNextQuestion.js    # Auto-next per câu
│   └── useAutoNextRound.js       # Auto-next per round
└── utils/
    ├── sessionCode.js
    ├── voteHelpers.js
    └── timerHelpers.js
```

---

## src/App.jsx

```jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SessionCreated from "./pages/SessionCreated";
import AdminPage from "./pages/AdminPage";
import VotePage from "./pages/VotePage";
import DisplayPage from "./pages/DisplayPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session-created/:code" element={<SessionCreated />} />
        <Route path="/admin/:code" element={<AdminPage />} />
        <Route path="/vote/:code" element={<VotePage />} />
        <Route path="/display/:code" element={<DisplayPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## pages/HomePage.jsx

Form tạo session nhanh. Chỉ hỏi thông tin tối thiểu — các cài đặt còn lại vào trong admin.

**Fields:**
- Tên sự kiện (required)
- Danh sách đội: thêm từng đội (tên + màu preset), tối thiểu 2 đội
- Mật khẩu admin (required, min 4 ký tự)

**Preset colors (8 màu):**
```js
const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"
];
```

**Submit logic:**
```js
async function handleCreate({ name, teams, password }) {
  const code = await generateUniqueCode();

  await setDoc(doc(db, "sessions", code), {
    name,
    admin_password: btoa(password),
    status: "waiting",
    teams: teams.map((t, i) => ({ ...t, id: uuidv4(), order: i })),
    show_round_label: false,       // mặc định: ẩn nếu chỉ 1 round
    current_round_id: null,
    current_question_id: null,
    created_at: serverTimestamp(),
  });

  navigate(`/session-created/${code}`);
}
```

---

## pages/SessionCreated.jsx

Hiển thị 3 URL sau khi tạo session.

```
┌─────────────────────────────────────────┐
│  ✅ "Hackathon 2025" đã được tạo!       │
│  Mã session: XK9M2P                     │
├─────────────────────────────────────────┤
│  📱 Link Vote (có QR)                   │
│  https://app.com/vote/XK9M2P            │
│  [Copy] [QR to PNG]                     │
├─────────────────────────────────────────┤
│  📺 Màn hình chiếu (có QR)             │
│  https://app.com/display/XK9M2P         │
│  [Copy]                                 │
├─────────────────────────────────────────┤
│  ⚙️  Trang Admin                        │
│  https://app.com/admin/XK9M2P           │
│  [Copy]                                 │
│  ⚠️  Lưu mật khẩu admin: ******         │
└─────────────────────────────────────────┘
│  [→ Vào trang Admin để cài đặt tiếp]   │
└─────────────────────────────────────────┘
```

---

## pages/AdminPage.jsx

### Trạng thái 1: Chưa auth → AdminLogin

```jsx
const [authed, setAuthed] = useState(
  sessionStorage.getItem(`admin_authed_${code}`) === "true"
);
if (!authed) return <AdminLogin code={code} onSuccess={() => setAuthed(true)} />;
```

### AdminLogin verify:
```js
async function verify(inputPassword) {
  const snap = await getDoc(doc(db, "sessions", code));
  if (!snap.exists()) { setError("Session không tồn tại"); return; }
  if (inputPassword === atob(snap.data().admin_password)) {
    sessionStorage.setItem(`admin_authed_${code}`, "true");
    onSuccess();
  } else {
    setError("Mật khẩu không đúng");
  }
}
```

### Trạng thái 2: Đã auth → Admin Dashboard

**Layout Admin (4 tab):**

```
[Tab: Cài đặt] [Tab: Nội dung] [Tab: Điều khiển] [Tab: QR/Links]
```

**Tab 1 — Cài đặt:**
- Tên sự kiện (edit được khi chưa active)
- `TeamManager` — thêm/sửa/xóa đội, chỉ edit được khi `status === "waiting"`
- Khi `status === "active"`: hiện badge "🔒 Đang diễn ra — không thể sửa đội"
- Nút "Bắt đầu session" / "Kết thúc session"

**Tab 2 — Nội dung:**
- `RoundList` + `RoundForm`
- Trong mỗi round: `QuestionList` + `QuestionForm`
- Có thể thêm/sửa/xóa round và câu hỏi bất kỳ lúc nào (kể cả đang active), trừ câu đang `open`

**Tab 3 — Điều khiển (hiện khi session active):**
- `LiveControls` — đây là panel điều khiển realtime
- Hiển thị trạng thái hiện tại: round nào, câu nào, countdown
- Các nút: Mở câu, Đóng câu, Câu tiếp, Round tiếp

**Tab 4 — QR/Links:**
- `QRDisplay` — 3 URL + QR

---

## components/admin/TeamManager.jsx

```jsx
// Props: teams, sessionStatus, onUpdate

// Nếu sessionStatus !== "waiting": render readonly list + badge khóa
// Nếu sessionStatus === "waiting":
//   - Input tên đội + color picker (8 preset)
//   - Nút thêm đội
//   - Danh sách đội đã thêm: tên, màu, nút xóa, drag handle (up/down)
//   - Validate: tối thiểu 2 đội

async function addTeam(name, color) {
  const newTeam = { id: uuidv4(), name, color, order: teams.length };
  await updateDoc(sessionRef, { teams: arrayUnion(newTeam) });
}

async function removeTeam(team) {
  await updateDoc(sessionRef, { teams: arrayRemove(team) });
}

async function reorderTeams(newTeamsArray) {
  // newTeamsArray là array đã được sắp xếp lại, update order field
  const updated = newTeamsArray.map((t, i) => ({ ...t, order: i }));
  await updateDoc(sessionRef, { teams: updated });
}
```

---

## components/admin/RoundForm.jsx

**Fields:**
- `name`: tên round (VD: "Vòng Loại", "Chung Kết")
- `auto_next`: boolean — tự động chuyển round kế sau câu cuối

**Tạo round:**
```js
await addDoc(collection(db, "sessions", code, "rounds"), {
  name,
  order: rounds.length,
  status: "pending",
  auto_next,
  created_at: serverTimestamp(),
});
```

**Sửa round** (cho phép kể cả khi active, trừ khi round đó đang `active`):
```js
await updateDoc(roundRef, { name, auto_next });
```

**Xóa round** (chỉ khi `status !== "active"`):
```js
await deleteDoc(roundRef);
// Xóa cascade tất cả questions trong round
const questionsSnap = await getDocs(collection(roundRef, "questions"));
questionsSnap.forEach(q => deleteDoc(q.ref));
```

---

## components/admin/QuestionForm.jsx

**Fields:**
- `text`: nội dung câu hỏi (required)
- `vote_mode`: "single" | "multi" — toggle button
- `duration`: số giây (input), `null` = không giới hạn
- `auto_next`: boolean — chỉ hiện khi `duration > 0`

**Tạo câu hỏi:**
```js
await addDoc(collection(db, "sessions", code, "rounds", roundId, "questions"), {
  text,
  order: questions.length,
  vote_mode,
  status: "pending",
  duration: duration || null,
  ends_at: null,
  auto_next: duration ? auto_next : false,
  show_realtime: false,
  vote_counts: {},
  total_votes: 0,
  created_at: serverTimestamp(),
});
```

**Đổi thứ tự câu** (chỉ câu `pending`):
```js
// Swap order giữa questionA và questionB
await updateDoc(questionARef, { order: questionB.order });
await updateDoc(questionBRef, { order: questionA.order });
```

**Xóa câu** (chỉ khi `status !== "open"`):
```js
await deleteDoc(questionRef);
```

---

## components/admin/LiveControls.jsx

Panel điều khiển realtime. Chỉ hiển thị khi `session.status === "active"`.

### State hiển thị:
```
┌────────────────────────────────────────┐
│ Round hiện tại: "Vòng Chung Kết" (2/3)│
│ Câu hiện tại: "Đội nào sáng tạo nhất?"│
│ Trạng thái: 🟢 ĐANG MỞ  ⏱ 00:42      │
│ Phiếu đã vote: 23                      │
├────────────────────────────────────────┤
│ [Đóng câu này] [→ Câu tiếp theo]      │
│ [⏭ Chuyển Round]                      │
└────────────────────────────────────────┘

Danh sách câu còn lại trong round:
  ✅ Câu 1: Sáng tạo (đã đóng)
  🟢 Câu 2: Teamwork (đang mở) ← hiện tại
  ⏳ Câu 3: Thuyết trình (chờ)
```

### Hàm mở câu hỏi:
```js
async function openQuestion(question, round) {
  const endsAt = question.duration
    ? Timestamp.fromDate(new Date(Date.now() + question.duration * 1000))
    : null;

  // Cập nhật session pointer
  await updateDoc(sessionRef, {
    current_round_id: round.id,
    current_question_id: question.id,
  });

  // Cập nhật round status
  if (round.status !== "active") {
    await updateDoc(roundRef(round.id), { status: "active" });
  }

  // Mở câu hỏi
  await updateDoc(questionRef(round.id, question.id), {
    status: "open",
    ends_at: endsAt,
  });
}
```

### Hàm đóng câu hỏi:
```js
async function closeQuestion(roundId, questionId) {
  await updateDoc(questionRef(roundId, questionId), { status: "closed" });
  await updateDoc(sessionRef, { current_question_id: null });
}
```

### Hàm chuyển câu tiếp:
```js
async function nextQuestion(currentRound, currentQuestion) {
  // Đóng câu hiện tại
  await closeQuestion(currentRound.id, currentQuestion.id);

  // Tìm câu pending kế tiếp theo order
  const nextQ = questions
    .filter(q => q.status === "pending" && q.order > currentQuestion.order)
    .sort((a, b) => a.order - b.order)[0];

  if (nextQ) {
    await openQuestion(nextQ, currentRound);
  } else {
    // Hết câu trong round → đóng round
    await closeRound(currentRound);
  }
}
```

### Hàm đóng round:
```js
async function closeRound(round) {
  await updateDoc(roundRef(round.id), { status: "ended" });
  await updateDoc(sessionRef, {
    current_round_id: null,
    current_question_id: null,
  });

  // Nếu auto_next: tự mở round kế
  if (round.auto_next) {
    const nextRound = rounds
      .filter(r => r.status === "pending" && r.order > round.order)
      .sort((a, b) => a.order - b.order)[0];

    if (nextRound) {
      // Mở câu đầu tiên của round kế
      const firstQuestion = await getFirstPendingQuestion(nextRound.id);
      if (firstQuestion) await openQuestion(firstQuestion, nextRound);
    } else {
      // Hết round → kết thúc session
      await updateDoc(sessionRef, { status: "ended" });
    }
  }
}
```

### Hàm bắt đầu session:
```js
async function startSession() {
  await updateDoc(sessionRef, { status: "active" });
  // Mở round đầu tiên, câu đầu tiên
  const firstRound = rounds.sort((a, b) => a.order - b.order)[0];
  if (!firstRound) return;
  const firstQ = await getFirstPendingQuestion(firstRound.id);
  if (firstQ) await openQuestion(firstQ, firstRound);
}
```

---

## hooks/useCurrentQuestion.js

Subscribe realtime câu đang active (dựa vào `session.current_question_id`).

```js
export function useCurrentQuestion(code, session) {
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    if (!session?.current_round_id || !session?.current_question_id) {
      setQuestion(null);
      return;
    }
    const ref = doc(
      db,
      "sessions", code,
      "rounds", session.current_round_id,
      "questions", session.current_question_id
    );
    return onSnapshot(ref, snap => {
      setQuestion(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [code, session?.current_round_id, session?.current_question_id]);

  return question;
}
```

---

## hooks/useQuestions.js

Subscribe tất cả câu hỏi của 1 round.

```js
export function useQuestions(code, roundId) {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (!code || !roundId) return;
    const q = query(
      collection(db, "sessions", code, "rounds", roundId, "questions"),
      orderBy("order", "asc")
    );
    return onSnapshot(q, snap => {
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [code, roundId]);

  return questions;
}
```

---

## hooks/useAutoNextQuestion.js

Chạy trên AdminPage. Khi câu hết timer và `auto_next = true`, tự gọi `nextQuestion`.

```js
export function useAutoNextQuestion({ currentQuestion, currentRound, onNext }) {
  const triggered = useRef(false);

  useEffect(() => {
    if (
      !currentQuestion ||
      currentQuestion.status !== "open" ||
      !currentQuestion.auto_next ||
      !currentQuestion.ends_at
    ) return;

    triggered.current = false;
    const diff = currentQuestion.ends_at.toMillis() - Date.now();
    if (diff <= 0) return;

    const timer = setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        onNext(currentRound, currentQuestion);
      }
    }, diff);

    return () => clearTimeout(timer);
  }, [currentQuestion?.id, currentQuestion?.status]);
}
```

---

## pages/VotePage.jsx

```jsx
const { code } = useParams();
const { session, loading } = useSession(code);
const { rounds } = useRounds(code);
const currentQuestion = useCurrentQuestion(code, session);
const voterToken = useVoterToken();

// Round hiện tại
const currentRound = rounds.find(r => r.id === session?.current_round_id);

// Số round (để quyết định có hiện tên round không)
const totalRounds = rounds.length;
const showRoundLabel = totalRounds >= 2 || session?.show_round_label;

// Check đã vote câu này chưa
const hasVoted = !!localStorage.getItem(
  `voted_${code}_${session?.current_round_id}_${currentQuestion?.id}`
);

if (loading) return <LoadingSpinner />;
if (!session) return <div className="...">Session không tồn tại</div>;

// Routing theo trạng thái
if (session.status === "waiting")
  return <WaitingScreen message="Sự kiện chưa bắt đầu, vui lòng chờ..." />;

if (session.status === "ended")
  return <WaitingScreen message="Sự kiện đã kết thúc. Cảm ơn bạn đã tham gia! 🎉" />;

// session đang active
if (!currentQuestion || currentQuestion.status === "pending")
  return <WaitingScreen message="Chờ câu hỏi tiếp theo..." />;

if (currentQuestion.status === "closed")
  return <WaitingScreen message="Câu này đã đóng. Chờ câu tiếp theo..." />;

// currentQuestion.status === "open"
if (hasVoted)
  return (
    <ResultsPreview
      code={code}
      roundId={session.current_round_id}
      question={currentQuestion}
      teams={session.teams}
      showRoundLabel={showRoundLabel}
      roundName={currentRound?.name}
    />
  );

return (
  <VoteCard
    question={currentQuestion}
    teams={session.teams}
    showRoundLabel={showRoundLabel}
    roundName={currentRound?.name}
    roundIndex={rounds.filter(r => r.status !== "pending").length}
    totalRounds={totalRounds}
    onSubmit={submitVote}
  />
);
```

### Submit vote (transaction):
```js
async function submitVote(choices) {
  const qRef = doc(
    db, "sessions", code,
    "rounds", session.current_round_id,
    "questions", currentQuestion.id
  );
  const voteRef = doc(collection(qRef, "votes"));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(qRef);
    if (!snap.exists()) throw new Error("Câu hỏi không tồn tại");
    if (snap.data().status !== "open") throw new Error("Câu hỏi đã đóng");

    const counts = { ...snap.data().vote_counts };
    choices.forEach(teamId => { counts[teamId] = (counts[teamId] || 0) + 1; });

    tx.update(qRef, {
      vote_counts: counts,
      total_votes: (snap.data().total_votes || 0) + 1,
    });
    tx.set(voteRef, {
      voter_token: voterToken,
      choices,
      voted_at: serverTimestamp(),
    });
  });

  // localStorage key bao gồm cả roundId để đúng scope
  localStorage.setItem(
    `voted_${code}_${session.current_round_id}_${currentQuestion.id}`,
    "true"
  );

  // Chặn back
  window.history.pushState(null, "", window.location.href);
  window.addEventListener("popstate", () =>
    window.history.pushState(null, "", window.location.href)
  );
}
```

---

## components/voter/VoteCard.jsx

```jsx
// Props: question, teams, showRoundLabel, roundName, roundIndex, totalRounds, onSubmit

const [selected, setSelected] = useState([]);
const [loading, setLoading] = useState(false);
const [expired, setExpired] = useState(false);

function toggle(teamId) {
  if (expired) return;
  if (question.vote_mode === "single") {
    setSelected(prev => prev[0] === teamId ? [] : [teamId]);
  } else {
    setSelected(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  }
}

// UI layout (mobile-first, 375px):
//
// [Header: Round X/Y nếu showRoundLabel]
// [Tên câu hỏi — text-xl font-bold]
// [CountdownTimer nếu question.ends_at]
// [vote_mode badge: "Chọn 1" hoặc "Chọn nhiều"]
// [Grid đội — 1 cột, min-h-[100px] mỗi card]
//   → border-4 border-transparent → border-white khi selected
//   → bg theo team.color (inline style)
//   → tên đội: text-white text-lg font-bold text-center
// [Button Submit — w-full h-14 text-lg]
//   → disabled nếu selected.length === 0 || loading || expired
//   → text "Đã hết giờ" khi expired
```

---

## components/voter/ResultsPreview.jsx

Hiển thị sau khi đã vote. Subscribe realtime `vote_counts` của câu hiện tại.

```jsx
function ResultsPreview({ code, roundId, question, teams, showRoundLabel, roundName }) {
  const [counts, setCounts] = useState(question.vote_counts || {});
  const [total, setTotal] = useState(question.total_votes || 0);

  useEffect(() => {
    const ref = doc(db, "sessions", code, "rounds", roundId, "questions", question.id);
    return onSnapshot(ref, snap => {
      if (snap.exists()) {
        setCounts(snap.data().vote_counts || {});
        setTotal(snap.data().total_votes || 0);
      }
    });
  }, [question.id]);

  // UI:
  // ✅ "Đã ghi nhận lượt vote của bạn!"
  // [Tên câu hỏi]
  // [Bar progress từng đội — horizontal, màu đội]
  // "Đang cập nhật realtime... (X phiếu)"
}
```

---

## pages/DisplayPage.jsx

Display có **3 trạng thái chính**:

### State 1: Waiting (session chưa active hoặc không có câu đang mở)
- `DisplayWaiting`: logo, tên sự kiện, "Sự kiện sắp bắt đầu..."
- QR code nhỏ ở góc để voter quét

### State 2: Voting (câu đang `open`)
- `DisplayVoting`: **ẨN kết quả**, chỉ hiện:
  - Tên round (nếu `showRoundLabel`)
  - Tên câu hỏi (text rất to)
  - Countdown timer (to, dễ nhìn từ xa)
  - Số phiếu đã vote (realtime, không hiện phân bổ)
  - Tên các đội (không kèm số phiếu)

### State 3: Result (câu vừa `closed`)
- `DisplayResult`: hiện kết quả câu vừa đóng
  - Bar chart đầy đủ: số phiếu + % từng đội
  - Highlight đội thắng
  - `WinnerAnnounce` overlay animation
  - Giữ nguyên cho đến khi câu tiếp mở

```jsx
export default function DisplayPage() {
  const { code } = useParams();
  const { session } = useSession(code);
  const { rounds } = useRounds(code);
  const currentQuestion = useCurrentQuestion(code, session);
  const [lastClosedQuestion, setLastClosedQuestion] = useState(null);

  const currentRound = rounds.find(r => r.id === session?.current_round_id);
  const totalRounds = rounds.length;
  const showRoundLabel = totalRounds >= 2 || session?.show_round_label;

  // Khi câu chuyển từ open → closed, lưu lại để hiện kết quả
  useEffect(() => {
    if (currentQuestion?.status === "closed") {
      setLastClosedQuestion(currentQuestion);
    }
  }, [currentQuestion?.status]);

  // Quyết định render gì
  const isWaiting = !session || session.status === "waiting" ||
    session.status === "ended" || !currentQuestion;
  const isVoting = currentQuestion?.status === "open";
  const isResult = !isVoting && lastClosedQuestion;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header luôn hiện */}
      <DisplayHeader
        sessionName={session?.name}
        roundName={showRoundLabel ? currentRound?.name : null}
        roundIndex={rounds.filter(r => r.status === "active" || r.status === "ended").length}
        totalRounds={showRoundLabel ? totalRounds : null}
      />

      {/* Body */}
      <div className="flex-1 flex items-center justify-center p-8">
        {isWaiting && <DisplayWaiting sessionName={session?.name} code={code} />}
        {isVoting && (
          <DisplayVoting
            question={currentQuestion}
            teams={session.teams}
          />
        )}
        {isResult && !isVoting && (
          <DisplayResult
            question={lastClosedQuestion}
            teams={session.teams}
          />
        )}
      </div>
    </div>
  );
}
```

---

## components/display/DisplayVoting.jsx

Ẩn hoàn toàn kết quả. Chỉ cho biết bao nhiêu người đã vote.

```jsx
function DisplayVoting({ question, teams }) {
  const [totalVotes, setTotalVotes] = useState(question.total_votes || 0);

  // Subscribe chỉ để lấy total_votes (không cần counts)
  useEffect(() => {
    // onSnapshot question doc, lấy total_votes
  }, [question.id]);

  return (
    <div className="text-center space-y-8 max-w-4xl w-full">
      {/* Câu hỏi */}
      <h2 className="text-5xl font-black leading-tight">{question.text}</h2>

      {/* Countdown */}
      {question.ends_at && (
        <CountdownTimer endsAt={question.ends_at} className="text-8xl" />
      )}

      {/* Tên các đội — không có số phiếu */}
      <div className="flex flex-wrap justify-center gap-4 mt-8">
        {teams.map(team => (
          <div
            key={team.id}
            className="px-6 py-3 rounded-full text-white text-2xl font-bold"
            style={{ backgroundColor: team.color }}
          >
            {team.name}
          </div>
        ))}
      </div>

      {/* Số phiếu đã cast — không phân bổ */}
      <p className="text-gray-400 text-xl">
        {totalVotes} phiếu đã được ghi nhận
      </p>
    </div>
  );
}
```

---

## components/display/DisplayResult.jsx

```jsx
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from "recharts";

function DisplayResult({ question, teams }) {
  const total = question.total_votes || 0;

  const data = teams
    .sort((a, b) => a.order - b.order)
    .map(team => ({
      name: team.name,
      votes: question.vote_counts?.[team.id] || 0,
      pct: total > 0
        ? Math.round((question.vote_counts?.[team.id] || 0) / total * 100)
        : 0,
      color: team.color,
    }));

  const maxVotes = Math.max(...data.map(d => d.votes));
  const winners = data.filter(d => d.votes === maxVotes && d.votes > 0);

  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-3xl font-bold text-center mb-4 text-gray-200">
        {question.text}
      </h2>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 40, right: 40, left: 20, bottom: 20 }}>
            <XAxis dataKey="name" tick={{ fill: "white", fontSize: 20, fontWeight: "bold" }} />
            <YAxis hide />
            <Bar dataKey="votes" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={600}>
              {data.map(entry => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  opacity={winners.length > 0 && !winners.find(w => w.name === entry.name) ? 0.3 : 1}
                />
              ))}
              <LabelList
                content={({ x, y, width, index }) => {
                  const d = data[index];
                  return (
                    <text x={x + width / 2} y={y - 12} textAnchor="middle" fill="white" fontSize={20} fontWeight="bold">
                      {d.pct}% ({d.votes})
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Winner announce */}
      {winners.length > 0 && (
        <WinnerAnnounce winners={winners} isTie={winners.length > 1} />
      )}
    </div>
  );
}
```

---

## components/display/WinnerAnnounce.jsx

```jsx
import { motion } from "framer-motion";

function WinnerAnnounce({ winners, isTie }) {
  return (
    <motion.div
      className="text-center mt-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <p className="text-3xl mb-2">{isTie ? "🤝 Hòa điểm!" : "🏆 Chiến thắng!"}</p>
      <div className="flex justify-center gap-6 flex-wrap">
        {winners.map(w => (
          <motion.span
            key={w.name}
            className="text-6xl font-black"
            style={{ color: w.color }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {w.name}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
```

---

## utils/sessionCode.js

```js
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ 0,O,1,I

export function generateSessionCode() {
  return Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

export async function isCodeAvailable(code) {
  const { getDoc, doc } = await import("firebase/firestore");
  const { db } = await import("../firebase");
  const snap = await getDoc(doc(db, "sessions", code));
  return !snap.exists();
}

export async function generateUniqueCode() {
  let code = generateSessionCode();
  let attempts = 0;
  while (!(await isCodeAvailable(code)) && attempts < 10) {
    code = generateSessionCode();
    attempts++;
  }
  return code;
}
```

---

## utils/voteHelpers.js

```js
export function calcResults(teams, vote_counts = {}, total_votes = 0) {
  return teams
    .sort((a, b) => a.order - b.order)
    .map(team => ({
      ...team,
      votes: vote_counts[team.id] || 0,
      pct: total_votes > 0
        ? Math.round((vote_counts[team.id] || 0) / total_votes * 100)
        : 0,
    }));
}

export function getWinners(results) {
  if (!results.length) return [];
  const max = Math.max(...results.map(r => r.votes));
  if (max === 0) return [];
  return results.filter(r => r.votes === max);
}
```

---

## utils/timerHelpers.js

```js
import { Timestamp } from "firebase/firestore";

export function makeEndsAt(durationSeconds) {
  return Timestamp.fromDate(new Date(Date.now() + durationSeconds * 1000));
}

export function isExpired(endsAt) {
  if (!endsAt) return false;
  return endsAt.toMillis() < Date.now();
}

export function getRemainingSeconds(endsAt) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt.toMillis() - Date.now()) / 1000));
}
```

---

## shared/CountdownTimer.jsx

```jsx
export function CountdownTimer({ endsAt, onExpire, className = "" }) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(endsAt));

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const r = getRemainingSeconds(endsAt);
      setRemaining(r);
      if (r === 0) onExpire?.();
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [endsAt]);

  const m = String(Math.floor((remaining || 0) / 60)).padStart(2, "0");
  const s = String((remaining || 0) % 60).padStart(2, "0");
  const isUrgent = remaining !== null && remaining <= 10 && remaining > 0;

  return (
    <span className={`font-mono font-bold tabular-nums
      ${isUrgent ? "text-red-400 animate-pulse" : "text-white"}
      ${className}`}>
      {m}:{s}
    </span>
  );
}
```

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionCode} {
      allow read: if true;
      allow create: if true;
      allow update: if true;   // MVP: chấp nhận
      allow delete: if false;

      match /rounds/{roundId} {
        allow read: if true;
        allow write: if true;

        match /questions/{questionId} {
          allow read: if true;
          allow write: if true;

          match /votes/{voteId} {
            allow create: if true;
            allow read, update, delete: if false;
          }
        }
      }
    }
  }
}
```

---

## firebase.json

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

---

## Task Checklist

### Phase 1 — Foundation
- [ ] **T1** Init project, Tailwind, folder structure
- [ ] **T2** `firebase.js` — init + export db
- [ ] **T3** `App.jsx` — 5 routes
- [ ] **T4** `utils/sessionCode.js`
- [ ] **T5** `utils/voteHelpers.js` + `utils/timerHelpers.js`

### Phase 2 — Hooks
- [ ] **T6** `hooks/useSession.js`
- [ ] **T7** `hooks/useRounds.js`
- [ ] **T8** `hooks/useQuestions.js`
- [ ] **T9** `hooks/useCurrentQuestion.js`
- [ ] **T10** `hooks/useVoterToken.js`
- [ ] **T11** `hooks/useAutoNextQuestion.js` + `hooks/useAutoNextRound.js`

### Phase 3 — Shared components
- [ ] **T12** `shared/CountdownTimer.jsx`
- [ ] **T13** `shared/LoadingSpinner.jsx`
- [ ] **T14** `shared/SessionUrlCard.jsx`

### Phase 4 — Home & Session Created
- [ ] **T15** `home/CreateSessionForm.jsx` — form tạo session nhanh
- [ ] **T16** `pages/HomePage.jsx`
- [ ] **T17** `pages/SessionCreated.jsx` — 3 URL + QR

### Phase 5 — Admin
- [ ] **T18** `admin/AdminLogin.jsx` — verify password
- [ ] **T19** `admin/TeamManager.jsx` — thêm/sửa/xóa đội, khóa khi active
- [ ] **T20** `admin/SessionSettings.jsx` — tên sự kiện, bắt đầu/kết thúc
- [ ] **T21** `admin/RoundForm.jsx` + `admin/RoundList.jsx`
- [ ] **T22** `admin/QuestionForm.jsx` + `admin/QuestionList.jsx`
- [ ] **T23** `admin/LiveControls.jsx` — open/close/next câu + round
- [ ] **T24** `admin/QRDisplay.jsx`
- [ ] **T25** `pages/AdminPage.jsx` — 4 tab, ghép tất cả admin components + useAutoNext hooks

### Phase 6 — Voter
- [ ] **T26** `voter/VoteCard.jsx` — chọn đội single/multi
- [ ] **T27** `voter/ResultsPreview.jsx` — bar realtime sau khi vote
- [ ] **T28** `voter/WaitingScreen.jsx` + `voter/AlreadyVoted.jsx`
- [ ] **T29** `pages/VotePage.jsx` — routing theo trạng thái + submit vote

### Phase 7 — Display
- [ ] **T30** `display/DisplayWaiting.jsx`
- [ ] **T31** `display/DisplayVoting.jsx` — ẩn kết quả, hiện countdown
- [ ] **T32** `display/DisplayResult.jsx` — bar chart sau khi đóng câu
- [ ] **T33** `display/WinnerAnnounce.jsx` — animation
- [ ] **T34** `pages/DisplayPage.jsx` — state machine 3 trạng thái

### Phase 8 — Deploy
- [ ] **T35** `firestore.rules` + `firebase.json`
- [ ] **T36** Test end-to-end, build, `firebase deploy`
