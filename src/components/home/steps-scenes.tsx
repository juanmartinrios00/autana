import { sceneSvgProps } from '../ui/sketch'

interface SceneProps {
  className?: string
}

/** Ilustraciones técnicas: línea precisa, una sola acción en amarillo y
 * geometría compartida. Se mantienen livianas y escalables. */

export function UploadScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <rect x="104" y="25" width="112" height="150" rx="8" />
      <path d="M145 40h30M151 160h18" />
      <path d="M122 119v-15l12-3 14-20h31l14 20 11 3v15" />
      <path d="M140 101h47M157 82v19" />
      <circle cx="140" cy="119" r="8" />
      <circle cx="187" cy="119" r="8" />
      <rect x="188" y="135" width="36" height="36" fill="var(--canvas)" stroke="var(--accent)" />
      <path d="M206 145v16M198 153h16" stroke="var(--accent)" />
    </svg>
  )
}

export function FreeScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <path d="M57 54l47 37M104 91l48-48h99v99l-48 48z" />
      <circle cx="130" cy="91" r="9" />
      <ellipse cx="183" cy="105" rx="17" ry="25" stroke="var(--accent)" />
      <circle cx="221" cy="88" r="6" stroke="var(--accent)" />
      <path d="M237 82l-28 47" stroke="var(--accent)" />
      <circle cx="225" cy="123" r="6" stroke="var(--accent)" />
      <path d="M54 176h212" />
    </svg>
  )
}

export function InboxScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <rect x="48" y="39" width="224" height="126" />
      <path d="M48 68h224M72 91h109M72 113h151M72 135h88" />
      <rect x="215" y="78" width="34" height="34" fill="var(--accent)" stroke="var(--ink)" />
      <path d="M225 95h14M232 88v14" stroke="var(--ink)" />
      <path d="M64 176h192" />
    </svg>
  )
}

export function FilterScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <path d="M49 57h222M49 100h222M49 143h222" />
      <rect x="96" y="46" width="22" height="22" fill="var(--canvas)" />
      <rect x="194" y="89" width="22" height="22" fill="var(--canvas)" />
      <rect x="132" y="132" width="22" height="22" fill="var(--accent)" stroke="var(--ink)" />
      <path d="M67 176h186" />
    </svg>
  )
}

export function DetailScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <rect x="45" y="25" width="230" height="150" />
      <path d="M45 117h230" />
      <path d="M77 98V82l17-4 16-22h52l16 22 18 4v16" />
      <path d="M103 78h67M132 56v22" />
      <circle cx="99" cy="98" r="10" />
      <circle cx="176" cy="98" r="10" />
      <path d="M65 137h76" stroke="var(--accent)" />
      <path d="M65 155h126M219 137h34M219 155h34" />
    </svg>
  )
}

export function ContactScene({ className }: SceneProps) {
  return (
    <svg {...sceneSvgProps} className={className}>
      <path d="M42 42h151v77h-91l-30 25v-25H42z" />
      <path d="M68 69h95M68 91h64" />
      <path d="M129 102h149v64h-32v25l-29-25h-88z" fill="var(--canvas)" stroke="var(--accent)" />
      <path d="M158 127h91M181 147h68" stroke="var(--accent)" />
    </svg>
  )
}
