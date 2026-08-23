import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

const GROUPS = [
  {
    id: "smileys",
    label: "😀",
    title: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😍", "🥰", "😘", "😗", "😙", "😚", "🤗", "😋", "😛", "😝", "😜", "🤪", "😎", "🥳", "😏", "😒", "😞", "😔", "😟", "😢", "😭", "😤", "😠", "😡", "🤬", "😳", "😱", "😨", "😰", "😥", "😓", "🤤", "😴", "😪", "🤐", "🥺", "😬", "🤭", "😮", "😯", "😲", "😇", "🤓", "🫠", "😈", "👻"],
  },
  {
    id: "people",
    label: "👋",
    title: "People",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "👍", "👎", "🙌", "👏", "🫶", "🙏", "💪", "🦾", "🦿", "🧠", "🫵", "👀", "👁️", "👶", "🧒", "👦", "👧", "👨", "👩", "🧑", "👱", "👴", "👵", "👼", "🤰", "🤱", "🧔", "🧑‍🦰", "🧑‍🦱"],
  },
  {
    id: "animals",
    label: "🐶",
    title: "Animals",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙊", "🙉", "🙈", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐚"],
  },
  {
    id: "food",
    label: "🍕",
    title: "Food",
    emojis: ["🍕", "🍔", "🌭", "🍟", "🌮", "🌯", "🥙", "🧆", "🥚", "🍳", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🍤", "🍦", "🍨", "🍧", "🎂", "🧁", "🍰", "🥧", "🍎", "🍓", "🍇", "🍉", "🍊", "🍋", "🍌", "🍒"],
  },
  {
    id: "activities",
    label: "⚽",
    title: "Activities",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏓", "🏸", "🥊", "🥋", "🎳", "🎮", "🎲", "🎯", "🎨", "🎬", "🎤", "🎧", "🎼", "🎵", "🎷", "🎸", "🎺", "🎻", "🏄", "🚴", "🏊", "🤸", "🤽", "🧗", "🏋️"],
  },
  {
    id: "travel",
    label: "✈️",
    title: "Travel",
    emojis: ["✈️", "🚀", "🛸", "🚁", "🚂", "🚊", "🚇", "🚋", "🛺", "🚲", "🛵", "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🏖️", "🌋", "🏕️", "🏠", "🏡", "🏰", "🌍"],
  },
  {
    id: "objects",
    label: "💡",
    title: "Objects",
    emojis: ["💡", "🔦", "🪔", "🧰", "🔧", "🔨", "⚒️", "🛠️", "🔩", "⚙️", "🧱", "⛏️", "🔒", "🔑", "🪪", "💳", "💰", "💎", "📱", "💻", "🖥️", "⌨️", "🖱️", "📷", "📸", "📹", "📼", "💾", "💿", "📀"],
  },
];

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeId, setActiveId] = useState("smileys");
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return GROUPS;

    return GROUPS
      .map((group) => ({
        ...group,
        emojis: group.emojis.filter((emoji) => emoji.toLowerCase().includes(normalized)),
      }))
      .filter((group) => group.emojis.length > 0);
  }, [query]);

  const active = filteredGroups.find((group) => group.id === activeId) ?? filteredGroups[0] ?? GROUPS[0];

  const visibleGroups = filteredGroups.length > 0 ? filteredGroups : GROUPS;

  return (
    <div data-emoji-picker-root style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.6)", width: 360, maxHeight: 320 }} className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/6">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="w-full rounded-md bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400"
          aria-label="Search emojis"
        />
        <button onClick={() => onClose?.()} className="ml-2 p-1 rounded-md text-white/60 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-2 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        {visibleGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => {
              setActiveId(group.id);
              setQuery("");
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg transition-colors",
              activeId === group.id && !query ? "bg-purple-600/20 text-purple-300" : "hover:bg-white/6",
            )}
            title={group.title}
            aria-label={group.title}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        <div className="grid grid-cols-8 gap-2">
          {(query ? active?.emojis : active?.emojis).map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              type="button"
              onClick={() => onSelect(emoji)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[1.25rem] transition-all duration-75 hover:bg-white/6 focus:outline-none"
              style={{ fontSize: '20px' }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
