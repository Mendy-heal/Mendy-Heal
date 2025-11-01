import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error("JWT secret not set");
    const payload = jwt.verify(token, secret, {
      issuer: process.env.JWT_ISS || "healing.api",
      audience: process.env.JWT_AUD || "healing.webapp"
    });
    const userRole = payload.role || "SEEKER";
    console.log(`[DEBUG] Auth middleware - User ID: ${payload.sub}, Role: ${userRole}`);
    req.user = { id: payload.sub, role: userRole };
    next();
  } catch {
    res.status(401).json({ message: "Invalid/expired token" });
  }
}

export function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        message: `Access denied. Required role: ${requiredRole}`
      });
    }

    next();
  };
}
