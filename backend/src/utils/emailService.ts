// ── Email Service — Nodemailer + Resend SMTP ───────────────────────────────
// Uses Resend's SMTP relay (smtp.resend.com:465).
// Credentials: username = "resend", password = RESEND_API_KEY.
// Free plan: 3 000 emails/month. Connection-pooled for fast repeated sends.

import nodemailer from 'nodemailer';

// ── Pooled transporter (created once, reused for every send) ──────────────
// `pool: true` keeps persistent TCP+TLS connections alive so subsequent emails
// skip the ~500 ms TLS handshake cost entirely.
const createTransporter = (): nodemailer.Transporter => {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();

    return nodemailer.createTransport({
        pool: true,               // ← persistent connection pool
        maxConnections: 5,        // up to 5 parallel SMTP connections
        maxMessages: Infinity,    // never drop a connection after N mails
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
            user: 'resend',
            pass: apiKey,
        },
        // Fail fast — surface problems immediately instead of hanging
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        socketTimeout: 10_000,
    });
};

// Single instance shared by the whole process
const transporter: nodemailer.Transporter = createTransporter();

// ── Startup health-check ──────────────────────────────────────────────────
export const verifyEmailConnection = async (): Promise<void> => {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
        console.error('❌ EMAIL: RESEND_API_KEY is missing. Emails will not be sent.');
        return;
    }
    try {
        await transporter.verify();
        console.log('✅ EMAIL: Nodemailer + Resend SMTP pool ready — emails will be fast.');
    } catch (err: any) {
        console.error('❌ EMAIL: SMTP pool verification failed:', err.message);
    }
};

// ── Internal send helper with 2 fast retries ─────────────────────────────
const send = async (mailOptions: nodemailer.SendMailOptions): Promise<void> => {
    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(
                `[EMAIL] ✅ Delivered to ${mailOptions.to} (attempt ${attempt}) — id: ${info.messageId}`
            );
            return;
        } catch (err: any) {
            lastError = err;
            console.error(`[EMAIL] ❌ Attempt ${attempt}/${maxAttempts} failed:`, err.message);
            if (attempt < maxAttempts) {
                // Short exponential back-off: 500 ms, 1 000 ms
                await new Promise(r => setTimeout(r, 500 * attempt));
            }
        }
    }

    throw lastError;
};

// ── Shared email boilerplate ──────────────────────────────────────────────
const senderAddress = (): string =>
    `"Clean India" <${(process.env.EMAIL_FROM || 'onboarding@resend.dev').trim()}>`;

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
        <!-- Header -->
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
        <!-- Body -->
        <tr><td style="padding:32px 40px;">${bodyContent}</td></tr>
        <!-- Footer -->
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
        from: senderAddress(),
        to,
        subject: '🔐 Your Clean India Verification Code',
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
        from: senderAddress(),
        to,
        subject: '🔑 Reset Your Clean India Password',
        html: emailWrapper(body),
    });
};
