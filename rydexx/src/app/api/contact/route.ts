import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/sendMail";

// Helper to escape HTML characters and prevent XSS in emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name: rawName, email: rawEmail, subject: rawSubject, message: rawMessage } = body;

    const name = escapeHtml((rawName || "").trim());
    const email = (rawEmail || "").trim();
    const subject = escapeHtml((rawSubject || "No Subject").trim());
    const message = escapeHtml((rawMessage || "").trim());

    // Basic Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { message: "Required fields (Name, Email, Message) are missing." },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email address format." },
        { status: 400 }
      );
    }

    // HTML Template for Zuhaib (Receive the user's message)
    const zuhaibEmailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-top: 0; font-size: 20px; font-weight: 800; tracking-tight: -0.025em;">New Contact Form Message</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px 0; font-weight: 700; width: 130px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Sender Name:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 15px;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: 700; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Sender Email:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 15px;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: 700; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Subject:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 15px; font-weight: 600;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 15px 0 10px 0; font-weight: 700; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top;" colspan="2">Message Content:</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</td>
          </tr>
        </table>
        <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center;">
          This inquiry was sent automatically from the Rydex Contact Form node.
        </div>
      </div>
    `;

    // HTML Template for Sender (Got you auto-reply)
    const senderEmailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">RYDEX</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">Moving You Forward</p>
        </div>
        
        <div style="padding: 15px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
          <p style="font-size: 16px; color: #0f172a; line-height: 1.5; margin-top: 0;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            We have received your message regarding <strong>"${subject}"</strong>. Thanks for reaching out!
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Our team of dispatchers and support agents is reviewing your inquiry. We will contact you back shortly.
          </p>
          <div style="margin: 25px 0; padding: 15px 20px; border-left: 4px solid #9eff6b; background-color: #f8fafc; border-radius: 0 12px 12px 0; font-size: 14px; color: #334155; font-weight: 600;">
            Got you! We will get in touch with you soon.
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0; font-weight: 700; color: #0f172a;">Rydex Support Team</p>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Mahanoora Chadoora, Budgam, Kashmir | Phone: +91 6006414088</p>
        </div>
      </div>
    `;

    // Send emails in parallel
    await Promise.all([
      // Send message details to Zuhaib
      sendMail("zuhaibrashid01@gmail.com", `[Rydex Contact Form] ${subject}`, zuhaibEmailHtml),
      // Send automatic confirmation email to the sender
      sendMail(email, `We've received your request - Rydex`, senderEmailHtml)
    ]);

    return NextResponse.json({ message: "Emails sent successfully." }, { status: 200 });
  } catch (error: any) {
    console.error("[Contact API Error]:", error);
    return NextResponse.json(
      { message: "An internal error occurred while processing your message." },
      { status: 500 }
    );
  }
}
