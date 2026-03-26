import nodemailer from "nodemailer";

// Create transporter only if SMTP is configured
const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Mail] SMTP not configured, emails will not be sent');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

export async function sendEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  if (!transporter) {
    console.log('[Mail] SMTP not configured, skipping email send');
    console.log(`[Mail] Would send to ${to}: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: body,
    });
    console.log(`[Mail] Email sent successfully to ${to}`);
  } catch (error) {
    console.error('[Mail] Email send error:', error);
    throw error;
  }
}
