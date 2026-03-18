import { Timestamp } from "firebase/firestore";

export function makeEndsAt(durationSeconds) {
  return Timestamp.fromDate(new Date(Date.now() + durationSeconds * 1000));
}

export function getRemainingSeconds(endsAt) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt.toMillis() - Date.now()) / 1000));
}

export function isExpired(endsAt) {
  return !!endsAt && endsAt.toMillis() < Date.now();
}
