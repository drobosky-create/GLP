import type { Screen } from "../state/store";

/**
 * TabBar — shared presentational bottom navigation (PRD §7.1: presentational only).
 * Keeps every log screen one tap away with no restart (§5). All values are theme
 * tokens / standard utilities — no raw hex, font, or magic brand value.
 */
const TABS: { id: Screen; label: string; glyph: string }[] = [
  { id: "home", label: "Home", glyph: "⌂" },
  { id: "dose", label: "Dose", glyph: "💉" },
  { id: "weight", label: "Weight", glyph: "⚖" },
  { id: "effects", label: "Effects", glyph: "✦" },
  { id: "sites", label: "Sites", glyph: "◎" },
  { id: "library", label: "Library", glyph: "📖" },
];

export function TabBar({
  active,
  onSelect,
}: {
  active: Screen;
  onSelect: (screen: Screen) => void;
}) {
  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-border bg-surface">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
              isActive ? "text-accent" : "text-muted"
            }`}
          >
            <span aria-hidden className="text-base leading-none">
              {tab.glyph}
            </span>
            <span className="font-display">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
