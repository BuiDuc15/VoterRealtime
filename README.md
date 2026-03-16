# VoterRealtime MVP

Web app vote realtime cho su kien noi bo, dung React + Firebase Firestore.

## Tinh nang

- Tao session vote tu trang chu va sinh 3 URL (`/vote/:code`, `/display/:code`, `/admin/:code`)
- Quan ly rounds trong trang admin (them/sua/xoa, mo/dong/next)
- Vote realtime qua Firestore `onSnapshot`
- Tang phieu an toan bang `runTransaction`
- Chan vote lai tren cung thiet bi qua `localStorage`
- Man hinh display dark mode + chart realtime + winner overlay

## Cau hinh moi truong

Tao file `.env` tu `.env.example` va dien thong tin Firebase:

```bash
cp .env.example .env
```

## Chay local

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

## Firebase files

- Firestore rules: `firestore.rules`
- Hosting config: `firebase.json`

## Ghi chu

- UI text dung tieng Viet theo spec MVP.
- App duoc toi uu cho mobile o trang vote (viewport nho, touch target lon).
