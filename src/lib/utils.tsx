import React from "react";

/**
 * Ensures a URL has a valid protocol (defaults to https:// if omitted)
 */
export function formatUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Extracts a readable domain from a URL for clean display
 */
export function getDomainFromUrl(url?: string): string {
  if (!url) return "";
  const formatted = formatUrl(url);
  try {
    const parsed = new URL(formatted);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Parses a string and converts any detected URLs into clickable anchor elements
 */
export function renderTextWithLinks(text?: string): React.ReactNode {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      const href = formatUrl(part);
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--accent, #38bdf8)",
            textDecoration: "underline",
            wordBreak: "break-all",
            fontWeight: 500
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {part} ↗
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
