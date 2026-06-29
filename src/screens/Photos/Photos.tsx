import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../state/store";
import { canAccess } from "../../lib/billing";
import { pickComparison } from "../../lib/photos";
import { Button, Card, formatWhen } from "../../components/Form";

/** Photo progress (Phase fast-follow) — Pro via canAccess("photo_progress"). */
export function Photos() {
  const entitlement = useAppStore((s) => s.entitlement);
  const photos = useAppStore((s) => s.photos);
  const addProgressPhoto = useAppStore((s) => s.addProgressPhoto);
  const deleteProgressPhoto = useAppStore((s) => s.deleteProgressPhoto);
  const refreshPhotos = useAppStore((s) => s.refreshPhotos);
  const setScreen = useAppStore((s) => s.setScreen);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refreshPhotos();
  }, [refreshPhotos]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    try {
      await addProgressPhoto(file, Date.now());
    } finally {
      setBusy(false);
    }
  };

  if (!canAccess("photo_progress", entitlement)) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-semibold text-text">
            Photo progress
          </h1>
          <p className="text-xs text-muted">
            Side-by-side progress photos, stored privately on your device.
          </p>
        </header>
        <Card title="A premium feature">
          <p className="mb-3 text-sm text-muted">
            Photo progress is part of Premium.
          </p>
          <Button onClick={() => setScreen("paywall")}>
            Start free trial to unlock
          </Button>
        </Card>
        <Button variant="ghost" onClick={() => setScreen("home")}>
          Back to Home
        </Button>
      </div>
    );
  }

  const comparison = pickComparison(photos);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Photo progress
        </h1>
        <p className="text-xs text-muted">
          Stored privately on your device — never shared out.
        </p>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      <Button onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? "Adding…" : "Add a photo"}
      </Button>

      {comparison ? (
        <Card title="First vs latest">
          <div className="grid grid-cols-2 gap-2">
            <figure className="flex flex-col gap-1">
              <img
                src={comparison.first.url}
                alt="First progress photo"
                className="w-full rounded-md border border-border object-cover"
              />
              <figcaption className="text-xs text-muted">
                {formatWhen(comparison.first.at)}
              </figcaption>
            </figure>
            <figure className="flex flex-col gap-1">
              <img
                src={comparison.latest.url}
                alt="Latest progress photo"
                className="w-full rounded-md border border-border object-cover"
              />
              <figcaption className="text-xs text-muted">
                {formatWhen(comparison.latest.at)}
              </figcaption>
            </figure>
          </div>
        </Card>
      ) : null}

      <Card title="All photos">
        {photos.length === 0 ? (
          <p className="text-sm text-muted">No photos yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {photos.map((p) => (
              <li key={p.id} className="flex flex-col gap-1">
                <img
                  src={p.url}
                  alt={`Progress photo from ${formatWhen(p.at)}`}
                  className="w-full rounded-md border border-border object-cover"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{formatWhen(p.at)}</span>
                  <button
                    type="button"
                    onClick={() => deleteProgressPhoto(p.id)}
                    className="text-xs text-muted underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
