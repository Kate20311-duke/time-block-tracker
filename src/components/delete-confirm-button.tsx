"use client";

type Props = {
  action: (formData: FormData) => Promise<void>;
  id: string;
  confirmMessage: string;
  deleteLabel: string;
  disabled?: boolean;
  /** Additional hidden fields (e.g. calendar redirect context). */
  extraFields?: Record<string, string>;
};

export function DeleteConfirmButton({
  action,
  id,
  confirmMessage,
  deleteLabel,
  disabled = false,
  extraFields,
}: Props) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {extraFields
        ? Object.entries(extraFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      <button
        type="submit"
        disabled={disabled}
        className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
        onClick={(e) => {
          if (!confirm(confirmMessage)) {
            e.preventDefault();
          }
        }}
      >
        {deleteLabel}
      </button>
    </form>
  );
}
