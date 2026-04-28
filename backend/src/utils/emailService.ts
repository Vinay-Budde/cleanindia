import nodemailer from 'nodemailer';

// ── Singleton transporter ─────────────────────────────────────────────────────
// Created once on first use and reused. Avoids per-request connection overhead
// and ensures the verify() handshake only happens once at startup.
let _transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
    if (_transporter) return _transporter;

    // Google App Passwords are shown with spaces in the UI — strip them.
    const pass = (process.env.EMAIL_PASS || '').replace(/\s/g, '');

    _transporter = nodemailer.createTransport({
        host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
        port:   Number(process.env.EMAIL_PORT) || 587,
        secure: false,           // STARTTLS on port 587
        auth: {
            user: process.env.EMAIL_USER,
            pass,
        },
        // ── Timeouts — critical for production (Render, Railway, etc.) ──────
        connectionTimeout: 10_000,   // 10 s to establish the TCP connection
        greetingTimeout:   10_000,   // 10 s waiting for the SMTP EHLO greeting
        socketTimeout:     15_000,   // 15 s of inactivity before giving up
        // ────────────────────────────────────────────────────────────────────
        tls: { rejectUnauthorized: false },
        pool: true,              // keep connections alive across sends
        maxConnections: 3,
        maxMessages: 100,
    });

    return _transporter;
};

// ── Startup SMTP health-check ─────────────────────────────────────────────────
export const verifyEmailConnection = async (): Promise<void> => {
    try {
        await getTransporter().verify();
        console.log('✅ SMTP connection verified — emails ready to send');
    } catch (err: any) {
        console.error('❌ SMTP connection FAILED:', err.message);
        console.error('   Check EMAIL_USER and EMAIL_PASS in your environment variables.');
        // Do NOT throw — a broken SMTP config shouldn't crash the server.
        // Individual email sends will fail and surface their own errors.
        _transporter = null;  // reset so the next request retries the connection
    }
};

// ── Send with retry ────────────────────────────────────────────────────────────
const sendWithRetry = async (
    mailOptions: nodemailer.SendMailOptions,
    maxAttempts = 3,
): Promise<void> => {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await getTransporter().sendMail(mailOptions);
            console.log(`[EMAIL] ✅ Sent to ${mailOptions.to} (attempt ${attempt})`);
            return;
        } catch (err: any) {
            lastError = err;
            console.error(`[EMAIL] ❌ Attempt ${attempt}/${maxAttempts} failed for ${mailOptions.to}:`, err.message);

            // On any error, reset the transporter so a fresh connection is tried next time.
            _transporter = null;

            if (attempt < maxAttempts) {
                // Exponential back-off: 1s, 2s, 4s…
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }

    throw lastError;
};

// ── OTP email ─────────────────────────────────────────────────────────────────
export const sendOtpEmail = async (
    to: string,
    otp: string,
    userName: string,
): Promise<void> => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Verify Your Email</title>
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#115e59,#0f766e);padding:32px 40px;text-align:center;">
                  <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#ffffff;margin-bottom:12px;line-height:48px;">CI</div>
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Clean India</h1>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Smart City Civic Management Platform</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Verify Your Email</h2>
                  <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">Hi ${userName},</p>
                  <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                    Thank you for registering with Clean India. Use the One-Time Password (OTP) below to complete your account verification. This code expires in <strong>10 minutes</strong>.
                  </p>
                  <!-- OTP Box -->
                  <div style="text-align:center;margin:0 0 28px;">
                    <div style="display:inline-block;background:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:20px 40px;">
                      <div style="font-size:11px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">Your OTP Code</div>
                      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#115e59;font-family:'Courier New',monospace;">${otp}</div>
                    </div>
                  </div>
                  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
                  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                    If you did not create an account with Clean India, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
                  <p style="margin:0;color:#d1d5db;font-size:11px;">© ${new Date().getFullYear()} Clean India. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await sendWithRetry({
        from:    `"Clean India" <${process.env.EMAIL_USER}>`,
        to,
        subject: '🔐 Your Clean India Verification Code',
        html,
    });
};

// ── Password reset email ──────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (
    to: string,
    resetUrl: string,
    userName: string,
): Promise<void> => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Reset Your Password</title>
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#115e59,#0f766e);padding:32px 40px;text-align:center;">
                  <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#ffffff;margin-bottom:12px;line-height:48px;">CI</div>
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Clean India</h1>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Smart City Civic Management Platform</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Reset Your Password</h2>
                  <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">Hi ${userName},</p>
                  <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                    We received a request to reset the password for your Clean India account. Click the button below to create a new password. This link will expire in <strong>1 hour</strong>.
                  </p>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#115e59,#0f766e);color:#ffffff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                      Reset Password
                    </a>
                  </div>
                  <p style="margin:0 0 12px;color:#9ca3af;font-size:12px;line-height:1.6;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="margin:0 0 24px;word-break:break-all;">
                    <a href="${resetUrl}" style="color:#0f766e;font-size:12px;">${resetUrl}</a>
                  </p>
                  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
                  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                    If you did not request a password reset, you can safely ignore this email. Your account will remain secure.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
                  <p style="margin:0;color:#d1d5db;font-size:11px;">© ${new Date().getFullYear()} Clean India. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await sendWithRetry({
        from:    `"Clean India" <${process.env.EMAIL_USER}>`,
        to,
        subject: '🔑 Reset Your Clean India Password',
        html,
    });
};
