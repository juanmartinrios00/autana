import { useId, type InputHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  icon?: IconName
  /** Oculta el label visualmente pero lo deja para el lector de pantalla. */
  hideLabel?: boolean
}

export function Input({ label, error, icon, hideLabel = false, id, className, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`

  const control = (
    <input
      id={inputId}
      className="field__control"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      {...rest}
    />
  )

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      {label && (
        <label className={hideLabel ? 'sr-only' : 'field__label'} htmlFor={inputId}>
          {label}
        </label>
      )}

      {icon ? (
        <div className="field__control field__control--group">
          <Icon name={icon} className="field__icon" />
          <input
            id={inputId}
            className="field__inner"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...rest}
          />
        </div>
      ) : (
        control
      )}

      {error && (
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
