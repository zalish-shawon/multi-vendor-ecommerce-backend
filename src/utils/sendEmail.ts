import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    // Configure your SMTP transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or your SMTP provider
      auth: {
        user: process.env.EMAIL_USER, // e.g. "yourname@gmail.com"
        pass: process.env.EMAIL_PASS, // e.g. Your 16-digit App Password
      },
    });

    await transporter.sendMail({
      from: `"Nexus Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    
    // console.log("Email sent successfully to", to);
  } catch (error) {
    console.error("Email send failed:", error);
    throw new Error("Failed to send email");
  }
};