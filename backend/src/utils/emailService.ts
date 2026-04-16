import nodemailer from 'nodemailer';

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

export const sendOtpEmail = async (to: string, otp: string, userName: string): Promise<void> => {
    const transporter = createTransporter();

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

    await transporter.sendMail({
        from: `"Clean India" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: '🔐 Your Clean India Verification Code',
        html,
    });
};

export const sendPasswordResetEmail = async (to: string, resetUrl: string, userName: string): Promise<void> => {
    const transporter = createTransporter();

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

    await transporter.sendMail({
        from: `"Clean India" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: '🔑 Reset Your Clean India Password',
        html,
    });
};
