import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import type { SessionUser } from "./db";

const COOKIE_NAME = "edu_session";
const SESSION_DAYS = 7;

let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const env = process.env.SESSION_SECRET;
  if (!env) {
    throw new Error(
      "SESSION_SECRET 환경 변수가 설정되어 있지 않습니다. " +
        ".env.local 파일에 SESSION_SECRET=<32바이트 이상의 무작위 문자열> 형태로 추가해 주세요. " +
        "생성 명령어: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  if (env.length < 32) {
    throw new Error(
      "SESSION_SECRET은 최소 32자 이상이어야 합니다. " +
        "생성 명령어: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  cachedSecret = new TextEncoder().encode(env);
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
