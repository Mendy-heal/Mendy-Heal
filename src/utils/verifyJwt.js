import jwt from "jsonwebtoken";

export function verifyJwt(token) {
  if (!token) throw new Error("Unauthorized");

  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: process.env.JWT_ISS,
    audience: process.env.JWT_AUD,
  });
}
