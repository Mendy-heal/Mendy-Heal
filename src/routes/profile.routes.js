import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";
import { auth } from "../middlewares/auth.js";
import { completeProfile, getMyProfile, updateExpertProfile } from "../controllers/profile.controller.js";

const UPLOAD_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname).toLowerCase()}`)
});
function fileFilter(_req, file, cb) {
  const isImage = /^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype);
  const isDoc = /(pdf|msword|officedocument\.wordprocessingml\.document|plain)/i.test(file.mimetype);
  if (file.fieldname === "avatar") return cb(null, isImage);
  if (file.fieldname === "attachment") return cb(null, isDoc);
  return cb(null, false);
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });



const r = Router();
r.get("/me", auth, getMyProfile);
r.post(
  "/setup",
  auth,
  upload.fields([{ name: "avatar", maxCount: 1 }, { name: "attachment", maxCount: 1 }]),
  completeProfile
);
r.put("/expert", auth, updateExpertProfile);
export default r;
