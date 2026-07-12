import nodemailer from "nodemailer";

// Outbound email is opt-in. Left off, sending is a no-op so test/dev traffic
// (e.g. signups to throwaway addresses) never bounces back into the real inbox.
// Set EMAIL_ENABLED=true in the environment to actually send.
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";

export const sendEmail = async (to: string, subject: string, text: string) => {
  if (!EMAIL_ENABLED) {
    console.log(`[mailer] skipped (EMAIL_ENABLED not set) → ${to}: ${subject}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
};