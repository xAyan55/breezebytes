import nodemailer from 'nodemailer';
import { settings } from '../db/database.js';
import { encryptSecret, decryptSecret } from '../utils/cryptoUtils.js';
import { renderVerificationEmail } from '../templates/emails/verificationTemplate.js';
import { renderPasswordResetEmail } from '../templates/emails/passwordResetTemplate.js';
import { renderTestEmail } from '../templates/emails/testEmailTemplate.js';

export const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// In-memory cached transporter
let cachedTransporter = null;
let cachedConfigSignature = null;

/**
 * Loads full raw SMTP configuration with decrypted password.
 */
export function getSmtpConfig() {
  const row = settings.findOne({ key: 'smtp' });
  if (!row || !row.value) {
    return {
      enabled: false,
      host: 'smtp.gmail.com',
      port: 465,
      security: 'ssl',
      username: '',
      password: '',
      fromEmail: '',
      fromName: 'BreezeBytes',
      replyTo: '',
    };
  }

  const val = row.value;
  let decryptedPassword = '';
  if (val.password_encrypted) {
    decryptedPassword = decryptSecret(val.password_encrypted);
  } else if (val.password) {
    decryptedPassword = val.password;
  }

  return {
    enabled: Boolean(val.enabled),
    host: val.host || 'smtp.gmail.com',
    port: Number(val.port) || 465,
    security: val.security || 'ssl',
    username: val.username || '',
    password: decryptedPassword,
    fromEmail: val.fromEmail || '',
    fromName: val.fromName || 'BreezeBytes',
    replyTo: val.replyTo || '',
  };
}

/**
 * Returns safe SMTP configuration status for frontend API responses.
 * Never leaks the SMTP password.
 */
export function getPublicSmtpStatus() {
  const config = getSmtpConfig();
  return {
    enabled: config.enabled,
    configured: Boolean(config.host && config.username && config.fromEmail && config.password),
    host: config.host,
    port: config.port,
    security: config.security,
    username: config.username,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    replyTo: config.replyTo,
    passwordConfigured: Boolean(config.password),
  };
}

/**
 * Saves SMTP configuration safely, encrypting the password at rest.
 */
export function saveSmtpConfig(newValues) {
  const current = getSmtpConfig();
  const existingRow = settings.findOne({ key: 'smtp' });

  let passwordEncrypted = existingRow?.value?.password_encrypted || '';
  if (newValues.password && newValues.password.trim()) {
    passwordEncrypted = encryptSecret(newValues.password.trim());
  }

  const updatedValue = {
    enabled: newValues.enabled !== undefined ? Boolean(newValues.enabled) : current.enabled,
    host: newValues.host ? newValues.host.trim() : current.host,
    port: newValues.port ? Number(newValues.port) : current.port,
    security: newValues.security || current.security,
    username: newValues.username !== undefined ? newValues.username.trim() : current.username,
    password_encrypted: passwordEncrypted,
    fromEmail: newValues.fromEmail !== undefined ? newValues.fromEmail.trim() : current.fromEmail,
    fromName: newValues.fromName !== undefined ? newValues.fromName.trim() : current.fromName,
    replyTo: newValues.replyTo !== undefined ? newValues.replyTo.trim() : current.replyTo,
  };

  if (existingRow) {
    settings.update(existingRow.id, { value: updatedValue });
  } else {
    settings.insert({ key: 'smtp', value: updatedValue });
  }

  invalidateTransporter();
  return getPublicSmtpStatus();
}

/**
 * Invalidates the cached transporter instance.
 */
export function invalidateTransporter() {
  if (cachedTransporter) {
    try {
      cachedTransporter.close();
    } catch {}
    cachedTransporter = null;
    cachedConfigSignature = null;
  }
}

/**
 * Builds or reuses a Nodemailer SMTP transporter.
 */
export function getTransporter(customConfig = null) {
  const config = customConfig || getSmtpConfig();
  const signature = `${config.host}:${config.port}:${config.security}:${config.username}:${config.password ? 'set' : 'none'}`;

  if (!customConfig && cachedTransporter && cachedConfigSignature === signature) {
    return cachedTransporter;
  }

  const isSecure = config.security === 'ssl' || config.port === 465;

  const transportOptions = {
    host: config.host,
    port: config.port,
    secure: isSecure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };

  if (config.security === 'starttls') {
    transportOptions.requireTLS = true;
    transportOptions.secure = false;
  }

  const transporter = nodemailer.createTransport(transportOptions);

  if (!customConfig) {
    cachedTransporter = transporter;
    cachedConfigSignature = signature;
  }

  return transporter;
}

/**
 * Sends a generic email through the configured SMTP provider.
 */
export async function sendEmail({ to, subject, html, text }) {
  const config = getSmtpConfig();

  if (!config.enabled) {
    console.log(`[EMAIL] Delivery disabled; message to ${to} skipped.`);
    return { success: false, disabled: true, message: 'Email system is currently disabled.' };
  }

  if (!config.host || !config.username || !config.password || !config.fromEmail) {
    console.warn(`[EMAIL] SMTP configuration incomplete; cannot deliver to ${to}.`);
    return { success: false, notConfigured: true, message: 'SMTP configuration is incomplete.' };
  }

  try {
    const transporter = getTransporter(config);
    const fromAddress = config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || '',
      replyTo: config.replyTo || config.fromEmail,
    });

    console.log(`[EMAIL] Message delivered to ${to} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed delivering to ${to}:`, err.message);
    const error = new Error(`Email delivery failed: ${err.message}`);
    error.code = 'SMTP_SEND_FAILED';
    throw error;
  }
}

/**
 * Sends account verification email with 6-digit confirmation code.
 */
export async function sendVerificationEmail(user, code) {
  const html = renderVerificationEmail({
    username: user.username,
    code,
    expirationMinutes: 15,
  });

  return sendEmail({
    to: user.email,
    subject: `Verify your BreezeBytes account (${code})`,
    html,
    text: `Your BreezeBytes verification code is: ${code}. It expires in 15 minutes.`,
  });
}

/**
 * Sends password reset link email.
 */
export async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const html = renderPasswordResetEmail({
    username: user.username,
    resetUrl,
    expirationMinutes: 30,
  });

  return sendEmail({
    to: user.email,
    subject: 'Reset your BreezeBytes password',
    html,
    text: `To reset your BreezeBytes password, open this link in your browser: ${resetUrl}\nThis link expires in 30 minutes.`,
  });
}

/**
 * Verifies SMTP connectivity and sends an administrator test message.
 */
export async function sendTestEmail(destinationEmail) {
  const config = getSmtpConfig();

  if (!config.host || !config.username || !config.password || !config.fromEmail) {
    const err = new Error('SMTP configuration is incomplete. Host, username, password, and from email are required.');
    err.code = 'SMTP_CONFIGURATION_INVALID';
    err.status = 400;
    throw err;
  }

  const transporter = getTransporter(config);

  // 1. Verify SMTP handshake & credentials
  try {
    await transporter.verify();
  } catch (err) {
    console.error('[EMAIL ERROR] SMTP verification handshake failed:', err.message);
    const verifyErr = new Error(`SMTP connection test failed: ${err.message}`);
    verifyErr.code = err.code === 'EAUTH' ? 'SMTP_AUTH_FAILED' : 'SMTP_CONNECTION_FAILED';
    verifyErr.status = 400;
    throw verifyErr;
  }

  // 2. Send test message
  const nowStr = new Date().toUTCString();
  const html = renderTestEmail({
    recipientEmail: destinationEmail,
    sentAt: nowStr,
    host: config.host,
    port: config.port,
    security: config.security,
  });

  const fromAddress = config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: destinationEmail,
      subject: 'BreezeBytes SMTP Delivery Test',
      html,
      text: `BreezeBytes SMTP Delivery Test successful. Sent at ${nowStr}.`,
    });

    console.log(`[EMAIL] Test message sent successfully to ${destinationEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL ERROR] SMTP test message send failed:', err.message);
    const sendErr = new Error(`Failed to send test email: ${err.message}`);
    sendErr.code = 'SMTP_SEND_FAILED';
    sendErr.status = 400;
    throw sendErr;
  }
}

export default {
  getSmtpConfig,
  getPublicSmtpStatus,
  saveSmtpConfig,
  invalidateTransporter,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTestEmail,
};
