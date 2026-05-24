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
  requiredStyle?: "parens" | "asterisk";
  type?: "text" | "email" | "password" | "tel";
  as?: "textarea";
  rows?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoComplete?: string;
  minLength?: number;
  describedBy?: string;
  hint?: string;
  className?: string;
};

export function PublicFormField({
  id: idProp,
  name,
  label,
  value,
  onChange,
  placeholder,
  required,
  requiredStyle = "parens",
  type = "text",
  as,
  rows = 3,
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

  const inputClass = cn(
    "public-form-field__input",
    as === "textarea" && "public-form-field__input--textarea"
  );

  function onInputChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onChange(e.target.value);
  }

  return (
    <label htmlFor={id} className={cn("public-form-field", className)}>
      <span className="public-form-field__label">
        {label}
        {required ? (
          <span className="public-form-field__required">
            {requiredStyle === "asterisk" ? " *" : " (required)"}
          </span>
        ) : null}
      </span>
      {as === "textarea" ? (
        <textarea
          id={id}
          name={name}
          className={inputClass}
          value={value}
          onChange={onInputChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          className={inputClass}
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
      )}
      {hint ? (
        <p id={hintId} className="public-form-field__hint">
          {hint}
        </p>
      ) : null}
    </label>
  );
}
