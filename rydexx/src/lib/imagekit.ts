import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

const uploadOnImageKit = async (file: Blob, originalName?: string): Promise<string | null> => {
  if (!file) {
    return null;
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ImageKit requires a fileName, so we generate a random string or use a default
    let fileName = `upload_${Date.now()}`;
    if (originalName) {
      const sanitized = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
      fileName = `${Date.now()}_${sanitized}`;
    }

    return new Promise((resolve, reject) => {
      imagekit.upload(
        {
          file: buffer,
          fileName,
        },
        (error, result) => {
          if (error) {
            console.error("ImageKit upload error:", error);
            reject(error);
          } else {
            resolve(result?.url ?? null);
          }
        }
      );
    });
  } catch (error) {
    console.error(error);
    return null;
  }
};

export default uploadOnImageKit;
