import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { SessionUser } from "./db";

const COOKIE_NAME = "edu_session";
const SESSION_DAYS = 7;

let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= 16) {
    cachedSecret = new TextEncoder().encode(env);
    return cachedSecret;
  }
  // 환경변수가 없으면 data/ 아래에 시크릿을 생성·보관해 재시작 후에도 세션 유지
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const secretFile = path.join(dataDir, ".session-secret");
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, crypto.randomBytes(32).toString("hex"), {
      mode: 0o600,
    });
  }
  cachedSecret = new TextEncoder().encode(
    fs.readFileSync(secretFile, "utf8").trim()
  );
  return cachedSecret;
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      id: Number(payload.sub),
      username: String(payload.username ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role === "admin" ? "admin" : "student",
    };
  } catch {
    return null;
  }
}
