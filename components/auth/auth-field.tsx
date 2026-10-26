import { useId, type ChangeEvent } from "react";
import { cn } from "@/lib/cn";

type Props = {
  id?: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email" | "password" | "tel";
  disabled?: boolean;
  invalid?: boolean;
  autoComplete?: string;
  minLength?: number;
  describedBy?: string;
  hint?: string;
  className?: string;
};

export function AuthField({
  id: idProp,
  name,
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  disabled,
  invalid,
  autoComplete,
  minLength,
  describedBy,
  hint,
  className,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const ariaDescribedBy = [describedBy, hintId].filter(Boolean).join(" ") || undefined;

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <label htmlFor={id} className={cn("auth-field", className)}>
      <span className="field-label">
        {label}
        {required ? <span className="auth-field__required"> (required)</span> : null}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        className="auth-field__input"
        value={value}
        onChange={onInputChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        minLength={minLength}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
      />
      {hint ? (
        <p id={hintId} className="auth-field__hint">
          {hint}
        </p>
      ) : null}
    </label>
  );
}
