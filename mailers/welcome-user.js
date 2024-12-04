import sendEmail from "../utils/send-email.js";

const otpExpiry = process.env.OTP_EXPIRE * 60 * 1000;
const supportEmail = process.env.SUPPORT_EMAIL
export const sendWelcomeMail = async (email, name, otp) => {
  const subject = "Welcome to Student Tiffin! Please Verify Your Account";
  const body = `
<!DOCTYPE html>
<html>

<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
  <div
    style="max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <div style="font-size: 20px; font-weight: bold; text-align: center; color: #4caf50; margin-bottom: 20px;">
      Welcome to Student Tiffin!
    </div>
    <div style="font-size: 16px;">
      <p>Dear <strong>${name}</strong>,</p>
      <p>Welcome to <strong>Student Tiffin</strong>! We're excited to have you on board as part of our community.
        Student Tiffin is
        here to make your daily meal planning and ordering a breeze, providing fresh and healthy tiffin services
        tailored to your needs.</p>

      <p>To get started, please verify your account by using the OTP provided below:</p>

      <div style="font-size: 22px; font-weight: bold; color: #4caf50; text-align: center; margin: 20px 0;">
        ${otp}
      </div>

      <p style="font-style: italic;"><strong>OTP will expire in ${otpExpiry / 60} minutes</strong></p>

      <p>By verifying your account, you'll be able to enjoy all the features that <strong>Student Tiffin</strong> has to
        offer,
        including meal plans, deliveries, and special offers designed for students.</p>

      <p>If you have any questions or need assistance, feel free to reach out to us at
        <a href="mailto:${supportEmail}"
          style="color: #4caf50; text-decoration: none;">${supportEmail}</a>. We're here to help!
      </p>

      <p>Thank you for joining <strong>Student Tiffin</strong>, and we look forward to serving you!</p>

      <p>Best regards,<br>The <strong>Student Tiffin</strong> Team!</p>
    </div>
    <div style="margin-top: 20px; font-size: 14px; color: #555; text-align: center;">
      <p>Need help? Visit our
        <a href="mailto:${supportEmail}" style="color: #4caf50; text-decoration: none;">Support Center</a>.
      </p>
    </div>
  </div>
</body>

</html>
`;

  await sendEmail(email, subject, body);
  return true;
};