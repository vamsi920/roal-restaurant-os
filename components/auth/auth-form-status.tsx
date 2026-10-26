type Props = {
  id: string;
  message: string | null;
};

/** Reserved alert slot — avoids submit-button jump when errors appear. */
export function AuthFormStatus({ id, message }: Props) {
  return (
    <div className="auth-status-slot" data-empty={message ? undefined : true}>
      {message ? (
        <p id={id} role="alert" className="auth-error">
          {message}
        </p>
      ) : null}
    </div>
  );
}
