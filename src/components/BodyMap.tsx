import {
  INJECTION_SITES,
  SITE_REGIONS,
  type SiteUsage,
} from "../screens/InjectionSite/sites";

/**
 * BodyMap — shared presentational injection-site map (PRD §7.1: presentational
 * only; no data access, no logic). Renders the canonical sites as a Left/Right grid
 * by region, marks the suggested next site, and reflects per-site usage passed in.
 * All values are theme tokens / standard utilities.
 */
export function BodyMap({
  usage,
  suggestedId,
  selectedId,
  onSelect,
}: {
  usage: Record<string, SiteUsage>;
  suggestedId?: string;
  selectedId?: string;
  onSelect?: (siteId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {SITE_REGIONS.map((region) => (
        <div key={region} className="flex flex-col gap-1">
          <span className="text-xs text-muted">{region}</span>
          <div className="grid grid-cols-2 gap-2">
            {INJECTION_SITES.filter((s) => s.region === region).map((site) => {
              const u = usage[site.id] ?? { count: 0 };
              const isSuggested = site.id === suggestedId;
              const isSelected = site.id === selectedId;
              return (
                <button
                  key={site.id}
                  type="button"
                  disabled={!onSelect}
                  onClick={() => onSelect?.(site.id)}
                  className={`flex flex-col items-start rounded-md border p-3 text-left ${
                    isSelected
                      ? "border-accent bg-accent text-on-accent"
                      : isSuggested
                        ? "border-accent bg-surface text-text"
                        : "border-border bg-surface text-text"
                  }`}
                >
                  <span className="font-display text-sm">{site.side}</span>
                  <span
                    className={`text-xs ${
                      isSelected ? "text-on-accent" : "text-muted"
                    }`}
                  >
                    {u.count === 0 ? "Not used yet" : `Used ${u.count}×`}
                  </span>
                  {isSuggested && !isSelected ? (
                    <span className="text-xs text-accent">Suggested next</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
