// Leave room for multipart headers under Vercel's function request limit.
export const MAX_FILE_MB = 4;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_PAGES = 20;
export const ACCEPTED = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"];
