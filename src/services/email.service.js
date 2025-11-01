import { query } from "../config/db.js";
import { sendMail } from "../config/mailer.js";

const genOtp = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 số

export async function createAndSendOtp(userId, email) {
  const otp = genOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

  await query(
    `INSERT INTO app.email_verifications (user_id, email, otp_code, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, email) DO UPDATE
       SET otp_code = EXCLUDED.otp_code,
           expires_at = EXCLUDED.expires_at,
           verified = FALSE,
           created_at = now()`,
    [userId, email, otp, expiresAt]
  );

  await sendMail({
    to: email,
    subject: "Mã OTP xác thực",
    text: `Mã OTP của bạn là ${otp}. Có hiệu lực 10 phút.`,
    html: `<p>Mã OTP của bạn là <b>${otp}</b>. Có hiệu lực 10 phút.</p>`
  });

  return { sent: true };
}

export async function verifyOtp(userId, email, otp) {
  const { rows } = await query(
    `SELECT id, otp_code, expires_at, verified
       FROM app.email_verifications
      WHERE user_id = $1 AND email = $2
      ORDER BY id DESC
      LIMIT 1`,
    [userId, email]
  );
  const rec = rows[0];
  if (!rec) { const e = new Error("OTP not found"); e.status = 400; throw e; }
  if (rec.expires_at < new Date()) { const e = new Error("OTP expired"); e.status = 400; throw e; }
  if (rec.otp_code !== otp) { const e = new Error("Invalid OTP"); e.status = 400; throw e; }

  await query(`UPDATE app.email_verifications SET verified = TRUE WHERE id = $1`, [rec.id]);
  await query(`UPDATE app.users SET email = $2, is_email_verified = TRUE, updated_at = now() WHERE id = $1`, [userId, email]);
  return { verified: true };
}
