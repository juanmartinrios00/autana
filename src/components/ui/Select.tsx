import { useId, type SelectHTMLAttributes } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  /** Opcion vacia inicial, del tipo "Todas las marcas". */
  placeholder?: string
  hideLabel?: boolean
}

export function Select({
  label,
  error,
  options,
  placeholder,
  hideLabel = false,
  id,
  className,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const errorId = `${selectId}-error`

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      {label && (
        <label className={hideLabel ? 'sr-only' : 'field__label'} htmlFor={selectId}>
          {label}
        </label>
      )}

      <select
        id={selectId}
        className="field__control field__control--select"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
