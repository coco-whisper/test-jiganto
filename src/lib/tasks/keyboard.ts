export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;

  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable
  );
}

export function focusNextFieldInRow(
  row: HTMLTableRowElement,
  direction: "next" | "prev" = "next",
) {
  const selector =
    'input:not([type="hidden"]):not([disabled]), button:not([disabled]), [role="combobox"], textarea:not([disabled])';
  const fields = Array.from(
    row.querySelectorAll<HTMLElement>(selector),
  ).filter((element) => element.offsetParent !== null);

  if (fields.length === 0) return;

  const active = document.activeElement as HTMLElement | null;
  const index = fields.findIndex((field) => field === active || field.contains(active));

  if (index === -1) {
    fields[0]?.focus();
    return;
  }

  const nextIndex =
    direction === "next"
      ? (index + 1) % fields.length
      : (index - 1 + fields.length) % fields.length;

  fields[nextIndex]?.focus();
}
