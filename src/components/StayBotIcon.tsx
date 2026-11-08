interface StayBotIconProps {
  className?: string
}

const BOLT_PATH =
  'M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z'

export function StayBotIcon({ className }: StayBotIconProps) {
  return (
    <svg viewBox="0 0 48 46" className={className} role="img" aria-label="StayBot">
      <path d={BOLT_PATH} fill="url(#staybot-gradient)" />
      <defs>
        <linearGradient id="staybot-gradient" x1="0" y1="0" x2="48" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      {/* ojitos */}
      <circle cx="17.5" cy="11.5" r="3.1" fill="#fff" />
      <circle cx="28.5" cy="11.5" r="3.1" fill="#fff" />
      <circle cx="18.3" cy="12" r="1.5" fill="#1e1b4b" />
      <circle cx="29.3" cy="12" r="1.5" fill="#1e1b4b" />
    </svg>
  )
}
