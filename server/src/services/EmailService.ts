import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { redactEmailForLog } from '../utils/auditRedact';
import { escapeHtml } from '../utils/sanitize';

function smtpTransportOptions(): SMTPTransport.Options {
  const secure = env.MAIL_PORT === 465;
  return {
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure,
    requireTLS: !secure,
    auth: {
      user: env.MAIL_USERNAME,
      pass: env.MAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: true,
    },
  };
}

const transporter = nodemailer.createTransport(smtpTransportOptions());

/** Verify SMTP TLS in production when mail credentials are configured. */
export async function verifySmtpTlsAtStartup(): Promise<void> {
  if (!env.isProd) return;
  if (!env.MAIL_USERNAME?.trim() || !env.MAIL_PASSWORD?.trim()) return;

  try {
    await transporter.verify();
  } catch (err) {
    throw new Error(
      `FATAL: SMTP TLS verification failed for ${env.MAIL_HOST}:${env.MAIL_PORT}. ` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async send(options: MailOptions): Promise<void> {
    try {
      await transporter.sendMail({
        from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`,
        ...options,
      });
    } catch (err) {
      logger.error('Email send failed', { error: err, to: redactEmailForLog(options.to) });
    }
  }

  static async sendOtp(to: string, otp: string, expiresMinutes = 10): Promise<void> {
    await this.send({
      to,
      subject: 'Your Riayah Plus verification code',
      html: `
        <p>Your one-time password is:</p>
        <h2 style="letter-spacing:4px">${escapeHtml(otp)}</h2>
        <p>This code expires in ${expiresMinutes} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }

  static async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const safeUrl = escapeHtml(resetUrl);
    await this.send({
      to,
      subject: 'Reset your Riayah Plus password',
      html: `
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${safeUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Reset Password
        </a>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `,
    });
  }

  static async sendEmailVerification(to: string, verifyUrl: string): Promise<void> {
    const safeUrl = escapeHtml(verifyUrl);
    await this.send({
      to,
      subject: 'Verify your Riayah Plus email',
      html: `
        <p>Welcome to Riayah Plus! Please verify your email address:</p>
        <a href="${safeUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Verify Email
        </a>
      `,
    });
  }

  static async sendInviteSetPassword(
    to: string,
    data: { name: string; role: string; setPasswordUrl: string },
  ): Promise<void> {
    const roleLabels: Record<string, string> = {
      org_admin: 'organization administrator',
      care_coordinator: 'care coordinator',
      clinical_staff: 'clinical staff member',
      support_worker: 'support worker',
      doctor: 'doctor',
      nurse: 'nurse',
      physiotherapist: 'physiotherapist',
      occupational_therapist: 'occupational therapist',
      speech_therapist: 'speech therapist',
      psychologist: 'psychologist',
      dietitian: 'dietitian',
      therapist: 'therapist',
    };
    const roleLabel = roleLabels[data.role] ?? data.role.replace(/_/g, ' ');
    const safeName = escapeHtml(data.name);
    const safeRole = escapeHtml(roleLabel);
    const safeUrl = escapeHtml(data.setPasswordUrl);
    await this.send({
      to,
      subject: 'Set up your Riayah Plus account',
      html: `
        <p>Hello ${safeName},</p>
        <p>You have been invited as a <strong>${safeRole}</strong> on Riayah Plus.</p>
        <p>Click the link below to set your password and access your dashboard:</p>
        <a href="${safeUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Set Password
        </a>
        <p>This link expires in 7 days.</p>
      `,
    });
  }

  static async sendFamilyOrgAssigned(
    to: string,
    data: { name: string; organizationName: string },
  ): Promise<void> {
    const loginUrl = `${env.FRONTEND_URL}/login?portal=family`;
    const safeName = escapeHtml(data.name);
    const safeOrg = escapeHtml(data.organizationName);
    const safeLogin = escapeHtml(loginUrl);
    await this.send({
      to,
      subject: 'Your Riayah Plus account is ready — you can log in now',
      html: `
        <p>Hello ${safeName},</p>
        <p>Good news — your account has been linked to <strong>${safeOrg}</strong>.</p>
        <p>You can now log in to the family portal and continue with your care request.</p>
        <p style="margin:24px 0">
          <a href="${safeLogin}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
            Go to Family Login
          </a>
        </p>
        <p>Or open this link directly:</p>
        <p><a href="${safeLogin}">${safeLogin}</a></p>
      `,
      text: `Hello ${data.name},\n\nYour account has been linked to ${data.organizationName}. You can now log in here:\n${loginUrl}\n`,
    });
  }

  /** Notify a coordinator they were assigned as primary for a family. */
  static async sendCoordinatorFamilyAssigned(
    to: string,
    data: {
      coordinatorName: string;
      familyName: string;
      familyEmail: string;
      organizationName: string;
    },
  ): Promise<void> {
    const loginUrl = `${env.FRONTEND_URL}/login?portal=coordinator`;
    const queueUrl = `${env.FRONTEND_URL}/coordinator/intake`;
    const safeCoordinator = escapeHtml(data.coordinatorName);
    const safeFamily = escapeHtml(data.familyName);
    const safeEmail = escapeHtml(data.familyEmail);
    const safeOrg = escapeHtml(data.organizationName);
    const safeQueue = escapeHtml(queueUrl);
    const safeLogin = escapeHtml(loginUrl);
    await this.send({
      to,
      subject: `New family assigned: ${data.familyName}`,
      html: `
        <p>Hello ${safeCoordinator},</p>
        <p>You have been assigned as the primary care coordinator for:</p>
        <p>
          <strong>${safeFamily}</strong><br/>
          ${safeEmail}<br/>
          Organization: <strong>${safeOrg}</strong>
        </p>
        <p>Their care requests will appear in your intake queue.</p>
        <p style="margin:24px 0">
          <a href="${safeQueue}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
            Open Intake Queue
          </a>
        </p>
        <p>Login: <a href="${safeLogin}">${safeLogin}</a></p>
      `,
      text: `Hello ${data.coordinatorName},\n\nYou have been assigned as primary coordinator for ${data.familyName} (${data.familyEmail}) at ${data.organizationName}.\n\nIntake queue: ${queueUrl}\nLogin: ${loginUrl}\n`,
    });
  }

  static async sendBookingConfirmation(
    to: string,
    data: { clientName: string; providerName: string; scheduledAt: string }
  ): Promise<void> {
    await this.send({
      to,
      subject: 'Booking Confirmed — Riayah Plus',
      html: `
        <p>Dear ${escapeHtml(data.clientName)},</p>
        <p>Your booking with <strong>${escapeHtml(data.providerName)}</strong> has been confirmed for <strong>${escapeHtml(data.scheduledAt)}</strong>.</p>
        <p>Log in to your Riayah Plus account to view details.</p>
      `,
    });
  }

  static async sendInvoice(
    to: string,
    data: { name: string; invoiceNumber: string; amount: string; currency: string; pdfUrl?: string }
  ): Promise<void> {
    const invoicesUrl = `${env.FRONTEND_URL}/invoices`;
    const safePdf = data.pdfUrl ? escapeHtml(data.pdfUrl) : '';
    await this.send({
      to,
      subject: `Invoice ${data.invoiceNumber} — Riayah Plus`,
      html: `
        <p>Dear ${escapeHtml(data.name)},</p>
        <p>Your invoice <strong>${escapeHtml(data.invoiceNumber)}</strong> for <strong>${escapeHtml(data.currency)} ${escapeHtml(data.amount)}</strong> is ready.</p>
        ${safePdf ? `<p><a href="${safePdf}">Download Invoice PDF</a></p>` : ''}
        <p>Log in to pay online: <a href="${escapeHtml(invoicesUrl)}">${escapeHtml(invoicesUrl)}</a></p>
      `,
    });
  }
}
