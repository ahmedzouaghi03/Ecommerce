import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing");
  }
  return new Resend(apiKey);
}
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/resetPassword?token=${token}`;

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Seefood</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%); padding: 40px 40px 60px 40px; text-align: center;">
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="80" style="margin: 0 auto 20px auto;">
                <tr>
                  <td style="background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 20px; padding: 20px; text-align: center;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </td>
                </tr>
              </table>
              
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; font-family: 'Georgia', serif; line-height: 1.2;">
                Reset Your Password
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #334155;">
                Hello,
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #334155;">
                We received a request to reset your password for your <strong style="color: #0c4a6e;">Seefood</strong> account. Click the button below to create a new password:
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 16px rgba(14, 165, 233, 0.25);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 14px; line-height: 1.6; color: #0369a1;">
                          <strong style="display: block; margin-bottom: 4px; color: #0c4a6e;">Important:</strong>
                          This link will expire in <strong>1 hour</strong> for security reasons. If you didn't request this reset, you can safely ignore this email.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 8px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #0369a1; word-break: break-all;">
                <a href="${resetUrl}" style="color: #0369a1; text-decoration: underline;">${resetUrl}</a>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                <tr>
                  <td style="text-align: center;">
                    <span style="font-size: 20px; font-weight: 700; color: #0c4a6e; font-family: 'Georgia', serif;">
                      🦐 Seefood
                    </span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                Premium luxury seafood — delivered fresh to your door.
              </p>
              
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                © ${new Date().getFullYear()} Seefood. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 20px auto 0 auto;">
          <tr>
            <td style="text-align: center; padding: 0 20px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                This email was sent to <strong>${email}</strong>. If you didn't request a password reset, please contact support.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;

  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: "Seefood <onboarding@resend.dev>",
      to: email,
      subject: "Reset Your Password - Seefood",
      html: emailHtml,
    });

    console.log("Password reset email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}

export async function sendContactFormEmail({
  recipient,
  name,
  email,
  phone,
  subject,
  message,
}: {
  recipient: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}) {
  try {
    if (!recipient || !name || !email || !subject || !message) {
      console.error("[EMAIL] Missing required contact form fields");
      return { success: false, error: "Missing required fields" };
    }

    console.log("[SERVER] Sending contact form email to:", recipient);

    const isWholesale =
      subject.toLowerCase().includes("wholesale") ||
      subject.toLowerCase().includes("export");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact - Seefood</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(12,74,110,0.12);">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 48px 32px;background:linear-gradient(135deg,#0c4a6e,#0369a1 50%,#0ea5e9);color:#ffffff;text-align:left;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:44px;height:44px;border-radius:12px;background:rgba(212,168,83,0.25);display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:24px;">🦐</span>
                </div>
                <div>
                  <div style="font-size:13px;letter-spacing:0.6px;text-transform:uppercase;opacity:0.85;">Seefood</div>
                  <div style="font-size:22px;font-weight:700;">New Contact Submission</div>
                </div>
              </div>
              <p style="margin:20px 0 0 0;font-size:15px;line-height:1.6;max-width:520px;opacity:0.9;">
                A customer has submitted the contact form on your website. Please review and respond promptly.
              </p>
              ${isWholesale ? '<div style="margin-top:12px;display:inline-block;padding:6px 14px;border-radius:999px;background:rgba(212,168,83,0.3);border:1px solid rgba(212,168,83,0.5);font-size:12px;font-weight:700;color:#fde68a;letter-spacing:0.5px;">⚡ WHOLESALE / EXPORT REQUEST</div>' : ""}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <!-- Customer info -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding:4px 0;">
                          <p style="margin:0 0 2px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Name</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#0c4a6e;">${name}</p>
                        </td>
                        <td width="50%" style="padding:4px 0;">
                          <p style="margin:0 0 2px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Phone</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#0c4a6e;">${phone}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:8px 0 0 0;">
                          <p style="margin:0 0 2px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Email</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#0369a1;">${email}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Subject -->
              <p style="margin:0 0 6px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Subject</p>
              <p style="margin:0 0 20px 0;font-size:16px;font-weight:600;color:#0c4a6e;">${subject}</p>

              <!-- Message -->
              <div style="padding:20px;border:1px solid #e2e8f0;border-radius:14px;background:#f0f9ff;">
                <p style="margin:0 0 10px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#0369a1;font-weight:600;">Message</p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#0f172a;white-space:pre-line;">${message}</p>
              </div>

              <!-- Tags -->
              <div style="margin-top:22px;">
                <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;font-size:12px;font-weight:600;margin-right:8px;">📧 Reply via email</span>
                ${isWholesale ? '<span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:12px;font-weight:600;margin-right:8px;">🌍 Wholesale Request</span>' : ""}
                <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:12px;font-weight:600;">✓ Via seefood.com</span>
              </div>
            </td>
          </tr>

          <!-- Action -->
          <tr>
            <td style="padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <a href="mailto:${email}?subject=Re: ${subject}" style="display:inline-block;background:linear-gradient(135deg,#0369a1,#0ea5e9);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:12px;box-shadow:0 4px 12px rgba(3,105,161,0.25);">
                      Reply to ${name.split(" ")[0]}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 32px 32px;text-align:center;font-size:12px;color:#94a3b8;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px 0;" />
              <span style="font-size:16px;font-weight:700;color:#0c4a6e;">🦐 Seefood</span>
              <p style="margin:8px 0 0 0;">Premium luxury seafood · seefood.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    const resend = getResendClient();
    const emailResult = await resend.emails.send({
      from: "Seefood <onboarding@resend.dev>",
      to: recipient,
      replyTo: email,
      subject: `[Seefood] ${subject} — from ${name}`,
      html,
    });

    if (!emailResult) {
      throw new Error("Failed to send email");
    }

    return { success: true, id: emailResult };
  } catch (error) {
    console.error("Error sending contact form email:", error);
    return { success: false, error: "Failed to send email" };
  }
}
