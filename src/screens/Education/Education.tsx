import { useState } from "react";
import { useAppStore } from "../../state/store";
import { Button, Card } from "../../components/Form";
import {
  EDUCATION_ARTICLES,
  EDUCATION_REVIEW_STATUS,
  type Article,
} from "./content";

/**
 * Learn — education-only surface (PRD §1.5/§5/§9). Describes general information;
 * recommends no substance, dose, or combination. Gated behind compounded mode,
 * which is itself gated pending legal review. Seed copy is draft pending review.
 */
export function Education() {
  const setScreen = useAppStore((s) => s.setScreen);
  const compoundedEnabled = useAppStore((s) => s.compoundedEnabled);
  const [open, setOpen] = useState<Article | null>(null);

  if (!compoundedEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
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
                {open.sources.map((s) => (
                  <span key={s} className="text-xs text-muted">
                    • {s}
                  </span>
                ))}
              </div>
            </div>
          </Card>
          <Button variant="ghost" onClick={() => setOpen(null)}>
            Back to topics
          </Button>
        </>
      ) : (
        <>
          {EDUCATION_ARTICLES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setOpen(a)}
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 text-left"
            >
              <span className="font-display text-sm text-text">{a.title}</span>
              <span className="text-xs text-muted">{a.summary}</span>
            </button>
          ))}
        </>
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
