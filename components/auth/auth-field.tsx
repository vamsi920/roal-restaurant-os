"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ChangeEvent, type ReactNode } from "react";
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
  /** Right side of the label row, e.g. "Forgot password?". */
  labelAside?: ReactNode;
  autoFocus?: boolean;
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
  labelAside,
  autoFocus,
  className,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const ariaDescribedBy = [describedBy, hintId].filter(Boolean).join(" ") || undefined;
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <div className={cn("auth-field", className)}>
      <div className="auth-field__row">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="auth-field__control">
        <input
          id={id}
          name={name}
          type={isPassword && revealed ? "text" : type}
          className={cn("input-base auth-input", isPassword && "auth-input--with-toggle")}
          value={value}
          onChange={onInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          minLength={minLength}
          autoFocus={autoFocus}
          autoCapitalize={type === "email" ? "none" : undefined}
          spellCheck={type === "email" || isPassword ? false : undefined}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
        />
        {isPassword ? (
          <button
            type="button"
            className="auth-input__toggle"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            aria-controls={id}
            disabled={disabled}
          >
            {revealed ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="auth-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
