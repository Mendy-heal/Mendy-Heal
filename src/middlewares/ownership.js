// middlewares/ownership.js
export function enforceSelf(paramName = "userId") {
  return (req, res, next) => {
    const pathUserId = String(req.params[paramName] ?? req.body[paramName] ?? "");
    if (!pathUserId) return res.status(400).json({ message: `Missing ${paramName}` });
    if (String(req.user.id) !== pathUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

// Nếu có role admin sau này:
export function enforceSelfOrAdmin(paramName = "userId") {
  return (req, res, next) => {
    const pathUserId = String(req.params[paramName] ?? req.body[paramName] ?? "");
    if (String(req.user.id) === pathUserId) return next();
    if (req.user.role === "ADMIN") return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}
