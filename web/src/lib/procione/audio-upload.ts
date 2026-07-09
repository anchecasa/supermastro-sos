export function audioUploadName(mimeType: string): string {
  const mime = mimeType.toLowerCase();
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "voice.m4a";
  if (mime.includes("ogg")) return "voice.ogg";
  if (mime.includes("wav")) return "voice.wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "voice.mp3";
  return "voice.webm";
}
