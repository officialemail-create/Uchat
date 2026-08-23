export function insertEmojiAtCursor(textarea: HTMLTextAreaElement | null, emoji: string, maxLength = 2000) {
  // If no textarea, return null
  if (!textarea) return null;

  const text = textarea.value ?? "";
  const start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : text.length;
  const end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : text.length;

  const nextValue = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
  if (nextValue.length > maxLength) return null;

  const caret = start + Array.from(emoji).length;

  // Update textarea value and set caret to end of inserted emoji
  textarea.value = nextValue;
  textarea.focus();
  textarea.selectionStart = caret;
  textarea.selectionEnd = caret;

  return {
    value: nextValue,
    caret,
  };
}
