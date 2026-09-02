import { renderBaseLayout } from './baseLayout.js';

export function renderVerificationEmail({ username, code, expirationMinutes = 15 }) {
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      Verify your email address
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Hi <strong style="color: #e2e8f0;">${username || 'there'}</strong>,<br>
      Thanks for registering with BreezeBytes. To activate your hosting account and provision your servers, please enter the one-time verification code below:
    </p>

    <!-- Verification Code Box -->
    <div style="background-color: #08090d; border: 2px solid #282d40; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #c5a6ff;">
        ${code}
      </span>
      <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        Valid for ${expirationMinutes} minutes
      </div>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.6;">
      If you did not sign up for an account with BreezeBytes, you can safely ignore this email. Someone may have entered your address by mistake.
    </p>
  `;

  return renderBaseLayout({
    title: 'Verify Your Email — BreezeBytes',
    previewText: `Your BreezeBytes verification code is ${code}. Valid for ${expirationMinutes} minutes.`,
    contentHtml,
    footerNote: 'Never share your verification code with anyone. BreezeBytes staff will never ask for your code.',
  });
}
