import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as UsersRepo from "../repositories/users.repo.js";
import { query } from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET ;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a strong random value (>=32 chars)");
}
const TOKEN_TTL  = process.env.TOKEN_TTL ;
const JWT_ISS = process.env.JWT_ISS ;
const JWT_AUD = process.env.JWT_AUD ;


const sign = (user) => jwt.sign(
  { sub: user.id, role: user.role_primary || "SEEKER", typ: "access" },
  JWT_SECRET,
  { expiresIn: TOKEN_TTL, issuer: JWT_ISS, audience: JWT_AUD }
);

export const signAccess = (user) =>
  jwt.sign({ sub: user.id, role: user.role_primary, typ: "access" }, JWT_SECRET, {
    expiresIn: process.env.TOKEN_TTL || "1h",
    issuer: JWT_ISS,
    audience: JWT_AUD,
  });

const signRefresh = (user) =>
  jwt.sign({ sub: user.id, typ: "refresh" }, JWT_SECRET, {
    expiresIn: process.env.REFRESH_TTL || "30d",
    issuer: JWT_ISS,
    audience: JWT_AUD,
  });


export async function registerStep1({ handle, password }) {
  if (!handle || !password) {
    const e = new Error("handle & password are required"); e.status = 400; throw e;
  }
  const existed = await UsersRepo.getByHandle(handle);
  if (existed) { const e = new Error("Handle already exists"); e.status = 409; throw e; }

  const hash = await bcrypt.hash(password, 10);
  const user = await UsersRepo.createUserWithHandle({ handle, passwordHash: hash });
  const token = sign(user);
  return { user, token, expires_in: TOKEN_TTL };
}

export async function login({ handle, password, ip, agent }) {
  const user = await UsersRepo.getByHandle(handle);
  if (!user) throw Object.assign(new Error("Invalid handle"), { status: 401 });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw Object.assign(new Error("Invalid password"), { status: 401 });

  const access = signAccess(user);
  const refresh = signRefresh(user);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

  // 🔹 lưu session vào DB
  await query(
    `INSERT INTO app.user_sessions (user_id, token, device_info, ip_address, expires_at)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING`,
    [user.id, refresh, agent ?? null, ip ?? null, expiresAt]
  );

  return {
    user,
    access_token: access,
    refresh_token: refresh,
    expires_in: process.env.TOKEN_TTL || "1h",
  };
}