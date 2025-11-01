import { Router } from "express";
import { register, login ,refresh } from "../controllers/auth.controller.js";
const r = Router();
r.post("/register", register); // nhẹ: handle + password
r.post("/login", login);
r.post("/refresh", refresh);// cần email + password
export default r;
