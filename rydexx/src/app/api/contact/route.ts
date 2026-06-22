import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { name, email, dispatchId, subject, message } = await req.json();

    if (!email || !email.includes('@') || !name || !message || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS environment variables.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send notification to admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `Dispatch Ticket: ${subject} [${dispatchId || 'No ID'}]`,
      text: `New dispatch ticket filed.\n\nOperator Name: ${name}\nEmail: ${email}\nDispatch ID: ${dispatchId || 'N/A'}\nSubject: ${subject}\n\nMessage:\n${message}`,
    });

    // Send auto-reply to user
    await transporter.sendMail({
      from: `"Rydex Dispatch" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Re: Dispatch Ticket [${subject}] Received`,
      text: `Hello ${name},\n\nWe have received your dispatch ticket regarding "${subject}".\n\nOur field office operator will review the logs and reach back out to you on this channel within 4 hours.\n\n— Rydex Dispatch Terminal (SXR)`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact error:', error);
    return NextResponse.json({ error: 'Failed to file dispatch' }, { status: 500 });
  }
}
