import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
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
      subject: 'New Field Notes Subscription!',
      text: `A new user has subscribed to Rydex Field Notes: ${email}`,
    });

    // Send auto-reply to user
    await transporter.sendMail({
      from: `"Rydex Field Notes" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Rydex Field Notes',
      text: `Thanks for subscribing to Rydex Field Notes!\n\nWe dispatch updates on the first of every month. Stay tuned for the latest from our field office.\n\n— Rydex Mobility`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
