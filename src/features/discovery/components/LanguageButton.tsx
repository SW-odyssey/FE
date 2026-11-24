"use client";

export function LanguageButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={
        className ? `local-icon-button ${className}` : "local-icon-button"
      }
      aria-label={label}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <svg
        className="local-language-mark"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M7 2v3M2 5h12M11 5c-1.1 4-3.5 7-7.5 9M4.5 8c1.4 2.4 3.4 4.5 6.2 6" />
        <path d="m12 22 5-10 5 10M14 18h6" />
      </svg>
    </button>
  );
}
