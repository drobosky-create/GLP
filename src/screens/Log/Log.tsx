import { useMemo, useState } from "react";
import { useAppStore, nowMs } from "../../state/store";
import { compoundsForMode, compoundById } from "../../lib/peptides";
import {
  Button,
  Card,
  DateTimeField,
  Field,
  Select,
  TextInput,
  formatWhen,
} from "../../components/Form";
import { INJECTION_SITES, suggestNextSite } from "../InjectionSite/sites";

function siteLabel(siteId?: string): string {
  if (!siteId) return "No site";
  const site = INJECTION_SITES.find((s) => s.id === siteId);
  return site ? `${site.region} (${site.side})` : siteId;
}

/** Dose log (MVP §3 item 1) — log a dose against a catalog compound + site. */
export function Log() {
  const mode = useAppStore((s) => s.mode);
  const doseEvents = useAppStore((s) => s.doses);
  const logDose = useAppStore((s) => s.logDose);
  const deleteDose = useAppStore((s) => s.deleteDose);

  const compounds = useMemo(
    () => compoundsForMode(mode ?? "prescribed"),
    [mode],
  );

  const [compoundId, setCompoundId] = useState(compounds[0]?.id ?? "");
  const selected = compounds.find((c) => c.id === compoundId) ?? compounds[0];
  const unit = selected?.doseUnit ?? "mg";
  const [dose, setDose] = useState("");
  const [at, setAt] = useState(nowMs());
  const suggested = suggestNextSite(doseEvents);
  const [injectionSite, setInjectionSite] = useState<string>(suggested ?? "");

  const isOral = selected?.route === "oral";
  const doseValue = Number(dose);
  const canSubmit = compoundId !== "" && dose !== "" && doseValue > 0;

  const onSubmit = async () => {
    if (!canSubmit || !selected) return;
    const doseMg = selected.doseUnit === "mcg" ? doseValue / 1000 : doseValue;
    await logDose({
      compoundId,
      doseMg,
      at,
      injectionSite: isOral ? undefined : injectionSite || undefined,
    });
    setDose("");
    setAt(nowMs());
  };

  const displayDose = (doseMg: number, compoundId: string): string => {
    const c = compoundById(compoundId);
    if (c?.doseUnit === "mcg") return `${Math.round(doseMg * 1000)} mcg`;
    return `${doseMg} mg`;
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Log a dose">
        <div className="flex flex-col gap-3">
          <Field label="Medication">
            <Select
              value={compoundId}
              onChange={(e) => setCompoundId(e.target.value)}
            >
              {compounds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                  {c.brandNames?.length ? ` — ${c.brandNames.join(", ")}` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`Dose (${unit})`}>
            <TextInput
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="0"
            />
          </Field>

          <DateTimeField label="When" value={at} onChange={setAt} />

          {!isOral ? (
            <Field label="Injection site">
              <Select
                value={injectionSite}
                onChange={(e) => setInjectionSite(e.target.value)}
              >
                <option value="">No site</option>
                {INJECTION_SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.region} ({s.side})
                    {s.id === suggested ? " — suggested" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Button onClick={onSubmit} disabled={!canSubmit}>
            Log dose
          </Button>
        </div>
      </Card>

      <Card title="Recent doses">
        {doseEvents.length === 0 ? (
          <p className="text-sm text-muted">No doses logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {doseEvents.slice(0, 20).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-text">
                    {compoundById(d.compoundId)?.displayName ?? d.compoundId} ·{" "}
                    {displayDose(d.doseMg, d.compoundId)}
                  </span>
                  <span className="text-xs text-muted">
                    {formatWhen(d.at)} · {siteLabel(d.injectionSite)}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => deleteDose(d.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
