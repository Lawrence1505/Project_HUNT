import { OTP_TTL_SECONDS } from "../services/otpService.js";

const PURPOSE_COPY = {
  signup: {
    subject: "Your HEAL verification code",
    heading: "Verify your email",
    intro: "Use this code to finish creating your HEAL account.",
  },
  reset: {
    subject: "Your HEAL password reset code",
    heading: "Reset your password",
    intro: "Use this code to reset the password for your HEAL account.",
  },
};

/**
 * Render the OTP email → { subject, html, text }.
 * Inline CSS for email clients; a small <style> block adds dark-mode
 * (prefers-color-scheme) and small-screen overrides — the defaults still
 * read fine in clients that ignore it. No external images: the HEAL
 * wordmark is gradient text with a solid-color fallback.
 */
export function renderOtpEmail({ otp, purpose = "signup" }) {
  const copy = PURPOSE_COPY[purpose] ?? PURPOSE_COPY.signup;
  const minutes = OTP_TTL_SECONDS / 60;
  const year = new Date().getFullYear();
  const font =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const text = [
    `HEAL — ${copy.heading}`,
    "",
    "Hi there,",
    "",
    copy.intro,
    "",
    `Your code: ${otp}`,
    "",
    `It expires in ${minutes} minutes.`,
    "",
    "Never share this code with anyone — HEAL will never ask you for it.",
    "If you didn't request it, you can safely ignore this message.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${copy.subject}</title>
<style>
  @media (prefers-color-scheme: dark) {
    body, .heal-bg { background-color: #0b0d12 !important; }
    .heal-card { background-color: #161a22 !important; border-color: #262c38 !important; }
    .heal-heading, .heal-otp { color: #f3f4f6 !important; }
    .heal-text { color: #c3c9d4 !important; }
    .heal-muted { color: #8a92a3 !important; }
    .heal-otp-box { background-color: #0f1319 !important; border-color: #2c3444 !important; }
  }
  @media only screen and (max-width: 520px) {
    .heal-card { padding: 28px 20px !important; }
    .heal-otp { font-size: 32px !important; letter-spacing: 8px !important; }
  }
</style>
</head>
<body class="heal-bg" style="margin:0; padding:0; background-color:#eef1f6;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${copy.intro} Your code expires in ${minutes} minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="heal-bg" style="background-color:#eef1f6;">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-family:${font}; font-size:30px; font-weight:800; letter-spacing:5px; color:#7c5cff; background-image:linear-gradient(135deg, #7c5cff 0%, #00c2a8 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;">HEAL</span>
            </td>
          </tr>
          <tr>
            <td class="heal-card" style="background-color:#ffffff; border:1px solid #e3e8f0; border-radius:16px; padding:36px 32px;">
              <h1 class="heal-heading" style="margin:0 0 12px; font-family:${font}; font-size:22px; line-height:1.3; font-weight:700; color:#111827;">${copy.heading}</h1>
              <p class="heal-text" style="margin:0 0 6px; font-family:${font}; font-size:15px; line-height:1.6; color:#4b5563;">Hi there,</p>
              <p class="heal-text" style="margin:0 0 24px; font-family:${font}; font-size:15px; line-height:1.6; color:#4b5563;">${copy.intro}</p>
              <div class="heal-otp-box" style="background-color:#f4f6fb; border:1px dashed #cdd6e4; border-radius:12px; padding:22px 12px; text-align:center;">
                <span class="heal-otp" style="font-family:'Courier New', Courier, monospace; font-size:40px; line-height:1.2; font-weight:700; letter-spacing:12px; color:#111827;">${otp}</span>
              </div>
              <p class="heal-muted" style="margin:16px 0 0; font-family:${font}; font-size:13px; line-height:1.6; color:#6b7280; text-align:center;">This code expires in <strong>${minutes} minutes</strong>.</p>
              <hr style="border:none; border-top:1px solid #e3e8f0; margin:24px 0;">
              <p class="heal-muted" style="margin:0; font-family:${font}; font-size:12px; line-height:1.7; color:#6b7280;">
                <strong>Never share this code with anyone — HEAL will never ask you for it.</strong><br>
                If you didn't request it, you can safely ignore this message; your account is safe.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:20px;">
              <p class="heal-muted" style="margin:0; font-family:${font}; font-size:12px; line-height:1.6; color:#8a92a3;">
                &copy; ${year} HEAL — your daily growth companion.<br>
                This is an automated message; please don't reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: copy.subject, html, text };
}
