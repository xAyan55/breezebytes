/**
 * BreezeBytes Branded Responsive Email Base Layout
 * Compatible with Gmail, Outlook, Apple Mail, and mobile clients.
 */
export function renderBaseLayout({ title, previewText, contentHtml, footerNote = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'BreezeBytes'}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #08090d;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #08090d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #08090d;">${previewText}</div>` : ''}

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #08090d; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #12141c; border: 1px solid #232738; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #1c2030; text-align: left;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 38px; height: 38px; background: linear-gradient(135deg, #c5a6ff 0%, #8b5cf6 100%); border-radius: 10px; display: inline-block; text-align: center; line-height: 38px; font-weight: 800; color: #08090d; font-size: 20px;">
                      B
                    </div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      Breeze<span style="color: #c5a6ff;">Bytes</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; background-color: #0c0d14; border-top: 1px solid #1c2030; text-align: left; font-size: 11px; color: #64748b; line-height: 1.6;">
              ${footerNote ? `<p style="margin: 0 0 12px 0; color: #94a3b8;">${footerNote}</p>` : ''}
              <p style="margin: 0 0 8px 0;">
                © 2026 BreezeBytes Control Plane. All rights reserved.
              </p>
              <p style="margin: 0; color: #475569;">
                This automated message was sent from an unmonitored notification service. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
