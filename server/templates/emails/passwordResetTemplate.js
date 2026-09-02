import { renderBaseLayout } from './baseLayout.js';

export function renderPasswordResetEmail({ username, resetUrl, expirationMinutes = 30 }) {
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      Reset your password
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Hi <strong style="color: #e2e8f0;">${username || 'there'}</strong>,<br>
      We received a request to reset your password for your BreezeBytes control plane account. Click the button below to choose a new password:
    </p>

    <!-- Action Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c5a6ff 0%, #8b5cf6 100%); color: #08090d; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 15px rgba(197, 166, 255, 0.35);">
        Reset Password
      </a>
      <div style="margin-top: 10px; font-size: 11px; color: #64748b;">
        Link expires in ${expirationMinutes} minutes
      </div>
    </div>

    <p style="margin: 24px 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.6;">
      If the button above doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin: 0 0 20px 0; font-size: 11px; color: #c5a6ff; word-break: break-all; font-family: monospace;">
      <a href="${resetUrl}" style="color: #c5a6ff; text-decoration: underline;">${resetUrl}</a>
    </p>

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.6;">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;

  return renderBaseLayout({
    title: 'Reset Your Password — BreezeBytes',
    previewText: 'A password reset request was received for your BreezeBytes account.',
    contentHtml,
    footerNote: 'For security reasons, this password reset link is valid for one use only.',
  });
}
