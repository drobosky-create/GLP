import { useState } from "react";
import { useAppStore } from "../../state/store";
import { COMPOUNDS, compoundById } from "../../lib/peptides";
import { Button, Card, Field, Select, TextInput } from "../../components/Form";

const DAY = 86_400_000;
const VIAL_COMPOUNDS = COMPOUNDS.filter((c) => c.mode !== "prescribed");

function dateInputValue(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function msFromDate(value: string): number {
  return new Date(`${value}T00:00`).getTime();
}
function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Vial inventory (Phase 7, compounded mode). Tracks recon/discard dates. */
export function Vials() {
  const vials = useAppStore((s) => s.vials);
  const addVial = useAppStore((s) => s.addVial);
  const setScreen = useAppStore((s) => s.setScreen);

  const now = Date.now();
  const [compoundId, setCompoundId] = useState(VIAL_COMPOUNDS[0]?.id ?? "");
  const [strength, setStrength] = useState("");
  const [bac, setBac] = useState("");
  const [reconAt, setReconAt] = useState(dateInputValue(now));
  const [discardAfter, setDiscardAfter] = useState(
    dateInputValue(now + 28 * DAY),
  );

  const canAdd = compoundId !== "" && Number(strength) > 0 && Number(bac) > 0;

  const onAdd = async () => {
    if (!canAdd) return;
    await addVial({
      compoundId,
      strengthMg: Number(strength),
      bacWaterMl: Number(bac),
      reconAt: msFromDate(reconAt),
      discardAfter: msFromDate(discardAfter),
    });
    setStrength("");
    setBac("");
  };

  const daysLeft = (ms?: number): number | null =>
    ms == null ? null : Math.ceil((ms - Date.now()) / DAY);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Vial inventory
        </h1>
        <p className="text-xs text-muted">
          For informational and tracking purposes only.
        </p>
      </header>

      <Card title="Add a vial">
        <div className="flex flex-col gap-3">
          <Field label="Compound">
            <Select
              value={compoundId}
              onChange={(e) => setCompoundId(e.target.value)}
            >
              {VIAL_COMPOUNDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Strength (mg)">
              <TextInput
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 10"
              />
            </Field>
            <Field label="BAC water (mL)">
              <TextInput
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={bac}
                onChange={(e) => setBac(e.target.value)}
                placeholder="e.g. 2"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reconstituted">
              <TextInput
                type="date"
                value={reconAt}
                onChange={(e) => setReconAt(e.target.value)}
              />
            </Field>
            <Field label="Discard after">
              <TextInput
                type="date"
                value={discardAfter}
                onChange={(e) => setDiscardAfter(e.target.value)}
              />
            </Field>
          </div>
          <Button onClick={onAdd} disabled={!canAdd}>
            Add vial
          </Button>
        </div>
      </Card>

      <Card title="Your vials">
        {vials.length === 0 ? (
          <p className="text-sm text-muted">No vials tracked yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {vials.map((v) => {
              const conc = v.bacWaterMl > 0 ? v.strengthMg / v.bacWaterMl : 0;
              const left = daysLeft(v.discardAfter);
              return (
                <li
                  key={v.id}
                  className="flex flex-col rounded-md border border-border p-3"
                >
                  <span className="text-sm text-text">
                    {compoundById(v.compoundId)?.displayName ?? v.compoundId} ·{" "}
                    {v.strengthMg} mg / {v.bacWaterMl} mL ({conc.toFixed(1)} mg/mL)
                  </span>
                  <span className="text-xs text-muted">
                    Recon {fmtDate(v.reconAt)}
                    {left != null
                      ? left >= 0
                        ? ` · discard in ${left} day${left === 1 ? "" : "s"}`
                        : ` · expired ${-left} day${left === -1 ? "" : "s"} ago`
                      : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
