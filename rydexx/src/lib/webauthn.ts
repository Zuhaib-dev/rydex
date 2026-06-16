export const rpName = "Rydex";

export const getExpectedOrigin = (req?: Request) => {
  let origin = process.env.NODE_ENV === "production" 
    ? "https://rydexx.netlify.app" 
    : "http://localhost:3000";

  if (process.env.NEXT_PUBLIC_APP_URL) {
    origin = process.env.NEXT_PUBLIC_APP_URL;
  } else if (req) {
    const reqOrigin = req.headers.get("origin");
    if (reqOrigin) origin = reqOrigin;
  }

  // WebAuthn origins must NOT have a trailing slash
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
};

export const getRpID = (req?: Request) => {
  const origin = getExpectedOrigin(req);
  try {
    return new URL(origin).hostname;
  } catch {
    return "localhost";
  }
};
