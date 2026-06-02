// ── Email Service — Nodemailer + Gmail SMTP ────────────────────────────────
// Uses Gmail's SMTP relay on port 587 (STARTTLS).
// Requires a Gmail App Password (NOT your regular Gmail password).
//
// Setup (one-time):
//   1. Visit https://myaccount.google.com/security
//   2. Enable 2-Step Verification if not already enabled
//   3. Search "App passwords" → Create one → label it "Clean India"
//   4. Copy the 16-character password (no spaces)
//   5. Add to Render env vars:
//        EMAIL_USER = your-gmail@gmail.com
//        EMAIL_PASS = xxxxxxxxxxxx  (16-char App Password)
//        EMAIL_FROM = your-gmail@gmail.com
// ─────────────────────────────────────────────────────────────────────────────

import nodemailer from 'nodemailer';

// ── Build a pooled transporter ────────────────────────────────────────────
// Connection pooling keeps the TCP+TLS connection alive between sends —
// eliminating the ~400 ms handshake cost on every email.
const createTransporter = (): nodemailer.Transporter => {
    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASS || '').trim();

    return nodemailer.createTransport({
        pool: true,
        maxConnections: 5,
        maxMessages: Infinity,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,          // STARTTLS — Gmail requires this on port 587
        auth: { user, pass },
        tls: { rejectUnauthorized: true },
        // Fail fast so errors are surfaced quickly
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
    });
};

// Single instance reused for every email
const transporter: nodemailer.Transporter = createTransporter();

// ── Startup health-check ──────────────────────────────────────────────────
export const verifyEmailConnection = async (): Promise<void> => {
    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASS || '').trim();

    if (!user || !pass) {
        console.error(
            '❌ EMAIL: EMAIL_USER and/or EMAIL_PASS env vars are missing.\n' +
            '   Add a Gmail App Password to Render:\n' +
            '     EMAIL_USER = your-gmail@gmail.com\n' +
            '     EMAIL_PASS = <16-char App Password>\n' +
            '   See: https://myaccount.google.com/apppasswords'
        );
        return;
    }

    try {
        await transporter.verify();
        console.log(`✅ EMAIL: Gmail SMTP authenticated as ${user} — email service ready.`);
    } catch (err: any) {
        console.error('❌ EMAIL: Gmail SMTP verification failed:', err.message);
        console.error(
            '   Possible causes:\n' +
            '   • Wrong EMAIL_PASS — must be a Gmail App Password, not your login password\n' +
            '   • 2-Step Verification not enabled on the Gmail account\n' +
            '   • Less secure app access might be disabled (use App Password instead)\n' +
            '   See: https://support.google.com/accounts/answer/185833'
        );
    }
};

// ── Internal send with retry ──────────────────────────────────────────────
const send = async (mailOptions: nodemailer.SendMailOptions): Promise<void> => {
    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASS || '').trim();

    if (!user || !pass) {
        throw new Error(
            'EMAIL_USER / EMAIL_PASS not configured. ' +
            'Add a Gmail App Password in Render environment variables.'
        );
    }

    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(
                `[EMAIL] ✅ Sent to ${mailOptions.to} (attempt ${attempt}) — id: ${info.messageId}`
            );
            return;
        } catch (err: any) {
            lastError = err;
            console.error(`[EMAIL] ❌ Attempt ${attempt}/${maxAttempts} failed:`, err.message);
            if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, 500 * attempt)); // 500 ms, 1 000 ms
            }
        }
    }

    throw lastError;
};

// ── Sender address helper ─────────────────────────────────────────────────
// Recipients see: Clean India 🌿  (not the raw Gmail address)
const from = (): string => {
    const addr = (process.env.EMAIL_FROM || process.env.EMAIL_USER || '').trim();
    return `"Clean India \uD83C\uDF3F" <${addr}>`;
};

// ── Shared HTML wrapper ───────────────────────────────────────────────────
const emailWrapper = (bodyContent: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#115e59,#0f766e);padding:28px 40px;text-align:center;">
            <div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:50%;
                        display:inline-flex;align-items:center;justify-content:center;
                        font-size:18px;font-weight:700;color:#fff;margin-bottom:10px;line-height:44px;">CI</div>
            <h1 style="margin:0;color:#fff;font-size:21px;font-weight:700;">Clean India</h1>
            <p style="margin:3px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">
              Smart City Civic Management Platform</p>
          </td>
        </tr>
        <tr><td style="padding:32px 40px;">${bodyContent}</td></tr>
        <tr>
          <td style="background:#f9fafb;padding:18px 40px;text-align:center;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#d1d5db;font-size:11px;">
              © ${new Date().getFullYear()} Clean India. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── OTP email ─────────────────────────────────────────────────────────────
export const sendOtpEmail = async (
    to: string,
    otp: string,
    userName: string,
): Promise<void> => {
    const body = `
      <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Verify Your Email</h2>
      <p style="margin:0 0 18px;color:#6b7280;font-size:14px;line-height:1.6;">Hi ${userName},</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
        Thank you for joining Clean India! Enter the OTP below to activate your account.
        This code expires in <strong>10 minutes</strong>.
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <div style="display:inline-block;background:#f0fdf4;border:2px solid #86efac;
                    border-radius:14px;padding:18px 40px;">
          <div style="font-size:11px;font-weight:700;color:#16a34a;letter-spacing:0.08em;
                      text-transform:uppercase;margin-bottom:8px;">Your OTP Code</div>
          <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#115e59;
                      font-family:'Courier New',monospace;">${otp}</div>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:20px 0;"/>
      <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
        If you did not sign up for Clean India, you can safely ignore this email.
      </p>`;

    await send({
        from: from(),
        to,
        subject: '🔐 Clean India — Your Email Verification Code',
        html: emailWrapper(body),
    });
};

// ── Password reset email ──────────────────────────────────────────────────
export const sendPasswordResetEmail = async (
    to: string,
    resetUrl: string,
    userName: string,
): Promise<void> => {
    const body = `
      <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Reset Your Password</h2>
      <p style="margin:0 0 18px;color:#6b7280;font-size:14px;line-height:1.6;">Hi ${userName},</p>
      <p style="margin:0 0 22px;color:#6b7280;font-size:14px;line-height:1.6;">
        We received a request to reset the password for your Clean India account.
        Click the button below — this link expires in <strong>1 hour</strong>.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#115e59,#0f766e);
                  color:#fff;font-size:15px;font-weight:600;padding:14px 36px;
                  border-radius:10px;text-decoration:none;">
          Reset Password
        </a>
      </div>
      <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;line-height:1.6;">
        If the button doesn't work, paste this link into your browser:
      </p>
      <p style="margin:0 0 22px;word-break:break-all;">
        <a href="${resetUrl}" style="color:#0f766e;font-size:12px;">${resetUrl}</a>
      </p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:20px 0;"/>
      <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
        If you did not request a password reset, your account remains secure — ignore this email.
      </p>`;

    await send({
        from: from(),
        to,
        subject: '🔑 Clean India — Reset Your Password',
        html: emailWrapper(body),
    });
};
