const MAX_DIM = 1200;
const JPEG_QUALITY = 0.82;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_EDITOR_IMAGE_BYTES = 10 * 1024 * 1024;

async function sniffIsImage(file: File): Promise<boolean> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    if (hex.startsWith("ff d8 ff")) return true; // JPEG
    if (hex.startsWith("89 50 4e 47 0d 0a 1a 0a")) return true; // PNG
    if (hex.startsWith("52 49 46 46") && hex.slice(25, 41) === "57 45 42 50")
      return true; // RIFF .... WEBP
    return false;
  } catch {
    return false;
  }
}

export async function isSafeImage(
  file: File,
  maxBytes: number = MAX_IMAGE_BYTES
): Promise<boolean> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return false;
  if (file.size <= 0 || file.size > maxBytes) return false;
  return sniffIsImage(file);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be read"));
    img.src = src;
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  const raw = await readFileAsDataUrl(file);

  try {
    const img = await loadImage(raw);
    const isPng = file.type === "image/png";

    let { width, height } = img;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    if (scale >= 1 && !isPng) {
      return raw; // small enough and already a compressed format
    }

    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", JPEG_QUALITY);
  } catch {
    return raw; // keep the original if anything fails
  }
}

const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 0.86;

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const raw = await readFileAsDataUrl(file);
  const img = await loadImage(raw);

  const side = Math.min(img.width, img.height);
  if (side <= 0) throw new Error("Empty image");

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(
    img,
    (img.width - side) / 2,
    (img.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  );

  return canvas.toDataURL("image/jpeg", AVATAR_QUALITY);
}