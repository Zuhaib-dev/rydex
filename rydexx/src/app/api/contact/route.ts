import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/sendMail';

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
    }

    if (!name || !message) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Send notification to admin
    await sendMail(
      "zuhaibrashid01@gmail.com",
      `New dispatch/contact from ${name}: ${subject}`,
      `Operator Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    );

    // Send auto-reply to user
    await sendMail(
      email,
      "We have received your request",
      `Hello ${name},\n\nGot you! Our field office has received your dispatch ticket regarding "${subject}". We will reach back out within 4 hours.\n\n— Rydex Dispatch Terminal`
    );

    return NextResponse.json({ message: 'Message sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Contact error:', error);
    return NextResponse.json({ message: 'Failed to file dispatch' }, { status: 500 });
  }
}
