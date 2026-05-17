export default function CafeLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <path d="M9 8.5 Q10.5 6 9 3.5" stroke="#94B6EF" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.75" />
      <path d="M15 8.5 Q16.5 6 15 3.5" stroke="#94B6EF" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.5" />
      <rect x="3.5" y="9" width="16" height="12" rx="1.8" fill="#60212E" stroke="#F4F2EF" strokeWidth="1.4" opacity="0.9" />
      <path d="M19.5 11.5 Q25 11.5 25 15 Q25 19 19.5 19" stroke="#F4F2EF" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="11.5" cy="11" rx="5.5" ry="1.3" fill="#94B6EF" opacity="0.3" />
      <rect x="3" y="24" width="2.5" height="3" rx="0.3" fill="rgba(148,182,239,0.35)" />
      <rect x="6.5" y="23" width="2" height="4" rx="0.3" fill="rgba(148,182,239,0.35)" />
      <rect x="9.5" y="24.5" width="1.8" height="2.5" rx="0.3" fill="rgba(148,182,239,0.25)" />
      <rect x="12" y="21.5" width="3" height="5.5" rx="0.3" fill="rgba(148,182,239,0.45)" />
      <rect x="16" y="23" width="2" height="4" rx="0.3" fill="rgba(148,182,239,0.35)" />
      <rect x="19" y="23.5" width="2.5" height="3.5" rx="0.3" fill="rgba(148,182,239,0.3)" />
      <line x1="3" y1="27" x2="22" y2="27" stroke="rgba(148,182,239,0.2)" strokeWidth="0.8" />
    </svg>
  );
}
