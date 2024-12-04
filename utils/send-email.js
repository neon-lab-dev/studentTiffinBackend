import { createTransport as _createTransport } from "nodemailer";

const createTransport = _createTransport;

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER, // Ensure the sender is included
      to,
      subject,
      html: htmlContent,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

export default sendEmail;
