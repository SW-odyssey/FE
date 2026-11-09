"use client";

export function LocalIcon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  if (name === "places")
    return (
      <svg
        className="local-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="5" height="5" rx="1" />
        <rect x="3" y="15" width="5" height="5" rx="1" />
        <path d="M12 5h9M12 8h6M12 16h9M12 19h6" />
      </svg>
    );
  if (name === "sparkles")
    return (
      <svg
        className="local-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6ZM3 2v4M1 4h4M20 18v4M18 20h4" />
      </svg>
    );
  if (name === "menu")
    return (
      <svg
        className="local-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M5 6h14M5 12h14M5 18h14" />
      </svg>
    );
  if (name === "filter")
    return (
      <svg
        className="local-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 6h16M4 12h16M4 18h16M9 3v6M15 9v6M9 15v6" />
      </svg>
    );
  if (name === "check")
    return (
      <svg
        width="12"
        height="9"
        viewBox="0 0 12 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m1 4 3.5 3.5L11 1" />
      </svg>
    );
  return (
    <span
      className="local-icon"
      style={{
        width: size,
        height: size,
        maskImage: `url('/assets/icons/local/${name}.svg')`,
      }}
      aria-hidden="true"
    />
  );
}
