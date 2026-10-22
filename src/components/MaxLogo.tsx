import { useId } from 'react'

interface MaxLogoProps {
  size?: number
}

export function MaxLogo({ size = 40 }: MaxLogoProps) {
  const gradientId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#3fa0ff" />
          <stop offset="0.5" stopColor="#5b5bff" />
          <stop offset="1" stopColor="#a246ff" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path
        d="M24 11c-7.2 0-13 5.4-13 12.2 0 3.3 1.4 6.3 3.6 8.5L13.5 37l5.7-2.6c1.5.5 3.1.8 4.8.8 7.2 0 13-5.4 13-12S31.2 11 24 11Z"
        fill="#fff"
      />
    </svg>
  )
}
