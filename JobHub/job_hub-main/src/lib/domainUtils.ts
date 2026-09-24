
const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "live.com",
  "msn.com",
  "inbox.com",
  "fastmail.com",
  "tutanota.com",
  "rediffmail.com",
]);

export function isPublicDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !domain || PUBLIC_DOMAINS.has(domain);
}

export function getCampusTag(email: string): "On Campus" | "Off Campus" {
  return isPublicDomain(email) ? "Off Campus" : "On Campus";
}

export function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}
