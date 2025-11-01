import { Router } from "express";
import rateLimit from "express-rate-limit";
import { auth } from "../middlewares/auth.js";
import { follow, unfollow } from "../controllers/follows.controller.js";

const r = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 30 });

r.use(auth);

r.post("/follow", limiter, follow);     // body: user_id
r.post("/unfollow", limiter, unfollow); // body: user_id

export default r;
