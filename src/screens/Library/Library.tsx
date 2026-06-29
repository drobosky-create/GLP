import { useMemo, useState } from "react";
import { useAppStore } from "../../state/store";
import { COMPOUNDS } from "../../lib/peptides";
import { Button, Card, TextInput } from "../../components/Form";
import { articleForCompound } from "../Education/content";

/**
 * Peptide Library (reference) — a browsable view of the catalog's FACTUAL fields
 * only (class, route, half-life, storage, confidence). Neutrality (§1.5): no dose,
 * no recommendation, no buy. Research/compounded compounds appear only when
 * compounded mode is enabled (itself gated pending legal review, §9).
 */
export function Library() {
  const setScreen = useAppStore((s) => s.setScreen);
  const compoundedEnabled = useAppStore((s) => s.compoundedEnabled);
  const educationEnabled = useAppStore((s) => s.educationEnabled);
  const setEducationArticle = useAppStore((s) => s.setEducationArticle);
  const [query, setQuery] = useState("");

  const openArticle = (classLabel: string) => {
    setEducationArticle(articleForCompound(classLabel));
    setScreen("education");
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMPOUNDS.filter(
      (c) => compoundedEnabled || c.mode !== "compounded",
    ).filter((c) => {
      if (!q) return true;
      return (
        c.displayName.toLowerCase().includes(q) ||
        c.classLabel.toLowerCase().includes(q) ||
        (c.brandNames ?? []).some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [query, compoundedEnabled]);

  // Group by class for browsability.
  const groups = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const c of visible) {
      const list = map.get(c.classLabel) ?? [];
      list.push(c);
      map.set(c.classLabel, list);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Peptide library
        </h1>
        <p className="text-xs text-muted">
          Reference information only — half-life, route, storage. No doses, no
          recommendations.
        </p>
      </header>

      <TextInput
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, brand, or class"
      />

      {groups.map(([classLabel, items]) => (
        <Card key={classLabel} title={classLabel}>
          <ul className="flex flex-col gap-3">
            {items.map((c) => (
              <li key={c.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm text-text">
                    {c.displayName}
                  </span>
                  {c.verified ? (
                    <span className="text-xs text-muted">
                      {c.confidence} confidence
                    </span>
                  ) : (
                    <span className="text-xs text-warning">estimated</span>
                  )}
                </div>
                {c.brandNames?.length ? (
                  <span className="text-xs text-muted">
                    {c.brandNames.join(", ")}
                  </span>
                ) : null}
                <span className="text-xs text-muted">
                  {c.route} ·{" "}
                  {c.verified
                    ? `half-life ~${Math.round(c.halfLifeHours / 24) || "<1"} day(s)`
                    : "half-life unverified"}
                  {c.storage ? ` · ${c.storage}` : ""}
                </span>
                {educationEnabled ? (
                  <button
                    type="button"
                    onClick={() => openArticle(c.classLabel)}
                    className="self-start text-xs text-accent underline"
                  >
                    Learn more
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {visible.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No compounds match “{query}”.</p>
        </Card>
      ) : null}

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
