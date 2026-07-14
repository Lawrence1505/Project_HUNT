import nodemailer from "nodemailer";
import { renderOtpEmail } from "../templates/otpEmail.js";
import { formatOtpConsoleBlock } from "./otpService.js";

let transport = null;

/** SMTP transport from SMTP_* env; null when SMTP_USER is unset (console fallback). */
function getTransport() {
  if (transport) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER) return null;
  transport = nodemailer.createTransport({
    host: SMTP_HOST || "smtp.gmail.com",
    port: Number(SMTP_PORT || 465),
    secure: (SMTP_SECURE ?? "true") !== "false",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transport;
}

export async function sendOtpEmail(to, otp, purpose) {
  const t = getTransport();
  if (!t) {
    console.log(
      formatOtpConsoleBlock({
        channel: "email",
        to,
        otp,
        purpose,
        via: "console fallback — SMTP_USER not set",
      })
    );
    return;
  }
  const { subject, html, text } = renderOtpEmail({ otp, purpose });
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    // Surface a clear, non-leaky error (e.g. wrong Gmail App Password → EAUTH).
    console.error("email send failed:", err.message);
    const e = new Error("Could not send the verification email — check the server's SMTP settings.");
    e.code = "EMAIL_SEND_FAILED";
    throw e;
  }
}
