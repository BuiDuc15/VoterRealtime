import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSessionCode() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export async function isCodeAvailable(code) {
  const snap = await getDoc(doc(db, "sessions", code));
  return !snap.exists();
}

export async function generateUniqueCode() {
  let code = generateSessionCode();
  let attempts = 0;
  let available = await isCodeAvailable(code);

  while (!available && attempts < 10) {
    code = generateSessionCode();
    attempts += 1;
    available = await isCodeAvailable(code);
  }

  if (!available) {
    throw new Error("Khong tao duoc ma session duy nhat");
  }

  return code;
}


