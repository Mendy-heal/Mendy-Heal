import { Router } from "express";
import rateLimit from "express-rate-limit";
import { auth } from "../middlewares/auth.js";
import {
  create, update, remove, detail, timeline, feed,
  react, unreact, save, unsave
} from "../controllers/posts.controller.js";

const r = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 20 });

r.use(auth);

r.get("/feed", feed);
r.get("/timeline", timeline); // ?user_id=...

r.post("/", limiter, create);              // body: content, privacy, file_ids[]
r.patch("/:id", limiter, update);
r.delete("/:id", limiter, remove);
r.get("/:id", detail);

r.post("/:id/react", limiter, react);      // body: kind
r.delete("/:id/react", unreact);

r.post("/:id/save", limiter, save);
r.delete("/:id/save", unsave);

export default r;
