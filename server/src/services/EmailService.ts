import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: env.MAIL_PORT === 465,
  auth: {
    user: env.MAIL_USERNAME,
    pass: env.MAIL_PASSWORD,
  },
});

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
      logger.error('Email send failed', { error: err, to: options.to });
    }
  }

  static async sendOtp(to: string, otp: string, expiresMinutes = 10): Promise<void> {
    await this.send({
      to,
      subject: 'Your Riayah Plus verification code',
      html: `
        <p>Your one-time password is:</p>
        <h2 style="letter-spacing:4px">${otp}</h2>
        <p>This code expires in ${expiresMinutes} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }

  static async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your Riayah Plus password',
      html: `
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${resetUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Reset Password
        </a>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `,
    });
  }

  static async sendEmailVerification(to: string, verifyUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Verify your Riayah Plus email',
      html: `
        <p>Welcome to Riayah Plus! Please verify your email address:</p>
        <a href="${verifyUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
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
    await this.send({
      to,
      subject: 'Set up your Riayah Plus account',
      html: `
        <p>Hello ${data.name},</p>
        <p>You have been invited as a <strong>${roleLabel}</strong> on Riayah Plus.</p>
        <p>Click the link below to set your password and access your dashboard:</p>
        <a href="${data.setPasswordUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
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
    await this.send({
      to,
      subject: 'Your Riayah Plus account is ready — you can log in now',
      html: `
        <p>Hello ${data.name},</p>
        <p>Good news — your account has been linked to <strong>${data.organizationName}</strong>.</p>
        <p>You can now log in to the family portal and continue with your care request.</p>
        <p style="margin:24px 0">
          <a href="${loginUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
            Go to Family Login
          </a>
        </p>
        <p>Or open this link directly:</p>
        <p><a href="${loginUrl}">${loginUrl}</a></p>
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
    await this.send({
      to,
      subject: `New family assigned: ${data.familyName}`,
      html: `
        <p>Hello ${data.coordinatorName},</p>
        <p>You have been assigned as the primary care coordinator for:</p>
        <p>
          <strong>${data.familyName}</strong><br/>
          ${data.familyEmail}<br/>
          Organization: <strong>${data.organizationName}</strong>
        </p>
        <p>Their care requests will appear in your intake queue.</p>
        <p style="margin:24px 0">
          <a href="${queueUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
            Open Intake Queue
          </a>
        </p>
        <p>Login: <a href="${loginUrl}">${loginUrl}</a></p>
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
        <p>Dear ${data.clientName},</p>
        <p>Your booking with <strong>${data.providerName}</strong> has been confirmed for <strong>${data.scheduledAt}</strong>.</p>
        <p>Log in to your Riayah Plus account to view details.</p>
      `,
    });
  }

  static async sendInvoice(
    to: string,
    data: { name: string; invoiceNumber: string; amount: string; currency: string; pdfUrl?: string }
  ): Promise<void> {
    await this.send({
      to,
      subject: `Invoice ${data.invoiceNumber} — Riayah Plus`,
      html: `
        <p>Dear ${data.name},</p>
        <p>Your invoice <strong>${data.invoiceNumber}</strong> for <strong>${data.currency} ${data.amount}</strong> is ready.</p>
        ${data.pdfUrl ? `<p><a href="${data.pdfUrl}">Download Invoice PDF</a></p>` : ''}
        <p>Log in to pay online: <a href="${env.FRONTEND_URL}/invoices">${env.FRONTEND_URL}/invoices</a></p>
      `,
    });
  }
}
