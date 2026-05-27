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
