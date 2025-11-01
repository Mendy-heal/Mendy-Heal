import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

export const MAIL_FROM = process.env.SMTP_FROM;

export async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST) {
    console.log("=== MOCK EMAIL ===", { to, subject, text, html });
    return { mock: true };
  }
  return transporter.sendMail({ from: MAIL_FROM, to, subject, text, html });
}
