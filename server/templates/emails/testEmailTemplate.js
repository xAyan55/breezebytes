import { renderBaseLayout } from './baseLayout.js';

export function renderTestEmail({ recipientEmail, sentAt, host, port, security }) {
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      SMTP Test Successful
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      This email confirms that your BreezeBytes SMTP delivery infrastructure is correctly configured and successfully delivering messages.
    </p>

    <!-- Configuration Details Card -->
    <div style="background-color: #08090d; border: 1px solid #232738; border-radius: 12px; padding: 18px; margin: 20px 0; font-family: monospace; font-size: 12px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="4">
        <tr>
          <td style="color: #64748b; width: 120px;">Recipient:</td>
          <td style="color: #e2e8f0;">${recipientEmail}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">SMTP Host:</td>
          <td style="color: #e2e8f0;">${host}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Port:</td>
          <td style="color: #e2e8f0;">${port} (${security?.toUpperCase() || 'SSL'})</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Timestamp:</td>
          <td style="color: #e2e8f0;">${sentAt}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Status:</td>
          <td style="color: #34d399; font-weight: bold;">CONNECTED & VERIFIED</td>
        </tr>
      </table>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.6;">
      Account confirmations, password resets, and security notices will now be delivered via this SMTP configuration.
    </p>
  `;

  return renderBaseLayout({
    title: 'SMTP Delivery Test — BreezeBytes',
    previewText: 'BreezeBytes SMTP delivery test message was received successfully.',
    contentHtml,
    footerNote: 'Sent from BreezeBytes Admin Control Plane.',
  });
}
