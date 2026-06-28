import { useState } from "react";
import { useAppStore } from "../../state/store";
import { COMPOUNDS, getCompound } from "../../lib/peptides";
import { Button, Card, Field, Select, TextInput } from "../../components/Form";

const DAY_MS = 86_400_000;

// Compounded users reconstitute compounds flagged compounded/both.
const VIAL_COMPOUNDS = COMPOUNDS.filter((c) => c.mode !== "prescribed");

function dateInputValue(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function isoFromDate(value: string): string {
  return new Date(`${value}T00:00`).toISOString();
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Vial inventory (Phase 7, compounded mode). Tracks recon/discard dates only. */
export function Vials() {
  const vials = useAppStore((s) => s.vials);
  const addVial = useAppStore((s) => s.addVial);
  const deleteVial = useAppStore((s) => s.deleteVial);
  const setScreen = useAppStore((s) => s.setScreen);

  const todayIso = new Date().toISOString();
  const [compoundId, setCompoundId] = useState(VIAL_COMPOUNDS[0]?.id ?? "");
  const [strength, setStrength] = useState("");
  const [bac, setBac] = useState("");
  const [reconDate, setReconDate] = useState(dateInputValue(todayIso));
  const [discardAfter, setDiscardAfter] = useState(
    dateInputValue(new Date(Date.now() + 28 * DAY_MS).toISOString()),
  );

  const canAdd = compoundId !== "" && Number(strength) > 0 && Number(bac) > 0;

  const onAdd = async () => {
    if (!canAdd) return;
    await addVial({
      compoundId,
      strengthMg: Number(strength),
      bacWaterMl: Number(bac),
      reconDate: isoFromDate(reconDate),
      discardAfter: isoFromDate(discardAfter),
    });
    setStrength("");
    setBac("");
  };

  const daysLeft = (iso: string): number =>
    Math.ceil((Date.parse(iso) - Date.now()) / DAY_MS);

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
                value={reconDate}
                onChange={(e) => setReconDate(e.target.value)}
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
              const compound = getCompound(v.compoundId);
              const conc = v.bacWaterMl > 0 ? v.strengthMg / v.bacWaterMl : 0;
              const left = daysLeft(v.discardAfter);
              return (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-text">
                      {compound?.displayName ?? v.compoundId} · {v.strengthMg} mg
                      / {v.bacWaterMl} mL ({conc.toFixed(1)} mg/mL)
                    </span>
                    <span className="text-xs text-muted">
                      Recon {fmtDate(v.reconDate)} ·{" "}
                      {left >= 0
                        ? `discard in ${left} day${left === 1 ? "" : "s"}`
                        : `expired ${-left} day${left === -1 ? "" : "s"} ago`}
                    </span>
                  </div>
                  <Button variant="ghost" onClick={() => deleteVial(v.id)}>
                    Delete
                  </Button>
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
