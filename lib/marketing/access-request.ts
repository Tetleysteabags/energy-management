const DEFAULT_ACCESS_REQUEST_URL = "https://formspree.io/f/mzdnqoqb";

export function getAccessRequestUrl(): string {
  return process.env.NEXT_PUBLIC_ACCESS_REQUEST_URL?.trim() || DEFAULT_ACCESS_REQUEST_URL;
}
