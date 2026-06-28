import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/**
 * Form — shared presentational primitives (PRD §7.1: presentational only). Every
 * screen composes these so the UI stays visually consistent and every value comes
 * from a theme token / standard utility (PRD §13). No raw hex / font / magic value.
 */

export function Card({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      {title ? (
        <h2 className="mb-3 font-display text-sm font-semibold text-muted">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

const controlClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-text";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={controlClass} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={controlClass} />;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** ISO string -> value for <input type="datetime-local"> in the user's local zone. */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** datetime-local field that reads and writes ISO strings; conversion stays here. */
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="datetime-local"
        className={controlClass}
        value={isoToLocalInput(value)}
        onChange={(e) => onChange(new Date(e.target.value).toISOString())}
      />
    </Field>
  );
}

/** Human-friendly timestamp for list rows. */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-on-accent"
      : "bg-surface text-muted border border-border";
  return (
    <button
      {...props}
      className={`rounded-md px-4 py-2 font-display text-sm disabled:opacity-50 ${styles} ${
        className ?? ""
      }`}
    />
  );
}
