import { Timestamp } from "firebase/firestore";

export function makeEndsAt(durationSeconds) {
  return Timestamp.fromDate(new Date(Date.now() + durationSeconds * 1000));
}

export function isExpired(endsAt) {
  if (!endsAt) return false;
  return endsAt.toMillis() < Date.now();
}

