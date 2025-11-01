import { Router } from "express";
import rateLimit from "express-rate-limit";
import { auth } from "../middlewares/auth.js";
import { add, update, remove, list } from "../controllers/comments.controller.js";

const r = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 40 });

r.use(auth);

r.get("/", list);                // ?post_id=...&before=...&limit=...
r.post("/", limiter, add);       // body: post_id, parent_id?, content
r.patch("/:id", limiter, update);
r.delete("/:id", limiter, remove);

export default r;
