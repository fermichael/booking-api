import "dotenv/config";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;

if (!apiKey) {
  throw new Error("Configure RESEND_API_KEY no .env");
}

if (!fromEmail) {
  throw new Error("Configure RESEND_FROM_EMAIL");
}

const resend = new Resend(apiKey);
const sender = fromEmail;

export async function sendEmail(to: string, subject: string, html: string) {
  const result = await resend.emails.send({
    from: sender,
    to,
    subject,
    html,
  });

  if (result.error) {
    console.error(result.error);
    throw new Error("Could not send email");
  }

  return result.data;
}
