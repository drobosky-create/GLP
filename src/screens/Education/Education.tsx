import { useMemo } from "react";
import { useAppStore } from "../../state/store";
import { Button, Card } from "../../components/Form";
import {
  CATEGORY_ORDER,
  EDUCATION_ARTICLES,
  EDUCATION_REVIEW_STATUS,
} from "./content";

/**
 * Learn — education-only surface (PRD §1.5/§5/§9). Describes published research with
 * sources; recommends no substance, dose, or combination. Gated behind its own flag
 * pending clinical+legal review; research-peptide articles additionally require
 * compounded mode. Articles are grouped by category to stay scannable.
 */
export function Education() {
  const setScreen = useAppStore((s) => s.setScreen);
  const educationEnabled = useAppStore((s) => s.educationEnabled);
  const compoundedEnabled = useAppStore((s) => s.compoundedEnabled);
  const openId = useAppStore((s) => s.educationArticleId);
  const setOpen = useAppStore((s) => s.setEducationArticle);

  const visible = useMemo(
    () =>
      EDUCATION_ARTICLES.filter((a) => !a.compoundedOnly || compoundedEnabled),
    [compoundedEnabled],
  );
  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map(
        (cat) => [cat, visible.filter((a) => a.category === cat)] as const,
      ).filter(([, items]) => items.length > 0),
    [visible],
  );
  const open = visible.find((a) => a.id === openId) ?? null;

  if (!educationEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="font-display text-xl font-semibold text-text">Learn</h1>
        </header>
        <Card>
          <p className="text-sm text-muted">
            Educational content isn’t available yet.
          </p>
        </Card>
        <Button variant="ghost" onClick={() => setScreen("home")}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">Learn</h1>
        <p className="text-xs text-muted">
          Educational information only — not medical advice. Nothing here
          recommends a substance, dose, or combination.
        </p>
      </header>

      <Card>
        <p className="text-xs text-warning">{EDUCATION_REVIEW_STATUS}</p>
      </Card>

      {open ? (
        <>
          <Card title={open.title}>
            <div className="flex flex-col gap-3">
              {open.body.map((p, i) => (
                <p key={i} className="text-sm text-text">
                  {p}
                </p>
              ))}
              <p className="text-xs text-muted">Evidence: {open.evidence}</p>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted">Sources</span>
                {open.sources.map((s) =>
                  s.url ? (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent underline"
                    >
                      • {s.label}
                    </a>
                  ) : (
                    <span key={s.label} className="text-xs text-muted">
                      • {s.label}
                    </span>
                  ),
                )}
              </div>
            </div>
          </Card>
          <Button variant="ghost" onClick={() => setOpen(null)}>
            Back to topics
          </Button>
        </>
      ) : (
        groups.map(([category, items]) => (
          <div key={category} className="flex flex-col gap-2">
            <p className="text-xs text-muted">{category}</p>
            {items.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpen(a.id)}
                className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 text-left"
              >
                <span className="font-display text-sm text-text">{a.title}</span>
                <span className="text-xs text-muted">{a.summary}</span>
              </button>
            ))}
          </div>
        ))
      )}

      <Card>
        <p className="text-xs text-muted">
          This information is general and educational. It is not medical advice
          and recommends no substance, dose, or combination — discuss any
          decisions with your provider.
        </p>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
