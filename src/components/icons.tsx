import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const SendIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 12 20 4l-4 16-4-7-8-1Z" fill="currentColor" stroke="none" />
  </Icon>
)

export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 18 9 12l6-6" />
  </Icon>
)

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17 5 12l5-5" />
    <path d="M5 12h11" />
  </Icon>
)

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const ClockIcon = (props: IconProps) => (
  <Icon viewBox="0 0 16 16" width="14" height="14" strokeWidth="1.6" {...props}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3l2 1.5" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon viewBox="0 0 16 16" width="16" height="14" strokeWidth="1.8" {...props}>
    <path d="m3 8.5 3 3 7-7" />
  </Icon>
)

export const DoubleCheckIcon = (props: IconProps) => (
  <Icon viewBox="0 0 20 16" width="18" height="14" strokeWidth="1.8" {...props}>
    <path d="m1.5 8.5 3 3 7-7" />
    <path d="m8 10 1.5 1.5 7-7" />
  </Icon>
)

export const AlertIcon = (props: IconProps) => (
  <Icon viewBox="0 0 16 16" width="14" height="14" strokeWidth="1.6" {...props}>
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 4.5v4M8 11h.01" />
  </Icon>
)

export const EyeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const EyeOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
  </Icon>
)
