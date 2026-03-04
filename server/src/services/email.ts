import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendResetEmail = async (to: string, resetToken: string) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"Calendar App" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#4285f4;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a>
      <p>Or copy this link: ${resetUrl}</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });
};
