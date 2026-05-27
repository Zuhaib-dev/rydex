export const getOtpEmailTemplate = (
  otp: string,
  message: string,
  title: string = "Verify Your Account"
) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .header { background-color: #000000; padding: 32px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 40px 32px; text-align: center; }
        .content h2 { color: #111827; font-size: 24px; margin-top: 0; margin-bottom: 16px; font-weight: 700; }
        .content p { color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
        .otp-container { background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 12px; padding: 32px 24px; margin: 32px 0; }
        .otp-code { font-size: 42px; font-weight: 800; color: #000000; letter-spacing: 12px; margin: 0; }
        .footer { padding: 24px 32px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6; }
        .footer p { color: #9ca3af; font-size: 14px; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RYDEX</h1>
        </div>
        <div class="content">
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="otp-container">
                <p class="otp-code">${otp}</p>
            </div>
            <p>This code is valid for a limited time. Please do not share it with anyone.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Rydex Premium Vehicle Booking. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};
