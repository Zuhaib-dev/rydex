import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

const uploadOnImageKit = async (file: Blob): Promise<string | null> => {
  if (!file) {
    return null;
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ImageKit requires a fileName, so we generate a random string or use a default
    const fileName = `upload_${Date.now()}`;

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

export const getOptimizedImageUrl = (
  url: string | undefined,
  width?: number,
  height?: number,
  quality = 80
): string => {
  if (!url) return "";
  if (!url.includes("ik.imagekit.io")) return url;

  const params: string[] = [];
  if (width) params.push(`w-${width}`);
  if (height) params.push(`h-${height}`);
  params.push(`q-${quality}`);
  params.push("f-auto");

  // Avoid duplicating transformations if already present
  if (url.includes("tr=")) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=${params.join(",")}`;
};

export default uploadOnImageKit;
