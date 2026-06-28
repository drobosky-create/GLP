import { useMemo, useState } from "react";
import { useAppStore, nowIso, type LogDoseInput } from "../../state/store";
import { COMPOUNDS } from "../../lib/peptides";
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

const DOSE_UNITS: LogDoseInput["doseUnit"][] = ["mg", "mcg", "units"];

function siteLabel(siteId?: string): string {
  if (!siteId) return "No site";
  const site = INJECTION_SITES.find((s) => s.id === siteId);
  return site ? `${site.region} (${site.side})` : siteId;
}

/** Dose log (MVP §3 item 1) — log a dose against a catalog compound + site. */
export function Log() {
  const mode = useAppStore((s) => s.mode);
  const doseEvents = useAppStore((s) => s.doseEvents);
  const medications = useAppStore((s) => s.medications);
  const logDose = useAppStore((s) => s.logDose);
  const deleteDose = useAppStore((s) => s.deleteDose);

  const compounds = useMemo(
    () =>
      COMPOUNDS.filter((c) => mode === "compounded" || c.mode !== "compounded"),
    [mode],
  );

  const [compoundId, setCompoundId] = useState(compounds[0]?.id ?? "");
  const selected = compounds.find((c) => c.id === compoundId) ?? compounds[0];
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState<LogDoseInput["doseUnit"]>(
    selected?.doseUnit ?? "mg",
  );
  const [datetime, setDatetime] = useState(nowIso());
  const suggested = suggestNextSite(doseEvents);
  const [injectionSite, setInjectionSite] = useState<string>(suggested ?? "");

  const isOral = selected?.route === "oral";
  const doseValue = Number(dose);
  const canSubmit = compoundId !== "" && dose !== "" && doseValue > 0;

  const onSubmit = async () => {
    if (!canSubmit) return;
    await logDose({
      compoundId,
      dose: doseValue,
      doseUnit,
      datetime,
      injectionSite: isOral ? undefined : injectionSite || undefined,
    });
    setDose("");
    setDatetime(nowIso());
  };

  const nameForDose = (medicationId: string): string =>
    medications.find((m) => m.id === medicationId)?.name ?? "Dose";

  return (
    <div className="flex flex-col gap-4">
      <Card title="Log a dose">
        <div className="flex flex-col gap-3">
          <Field label="Medication">
            <Select
              value={compoundId}
              onChange={(e) => {
                setCompoundId(e.target.value);
                const c = compounds.find((x) => x.id === e.target.value);
                if (c) setDoseUnit(c.doseUnit);
              }}
            >
              {compounds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                  {c.brandNames?.length ? ` — ${c.brandNames.join(", ")}` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Dose">
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
            <Field label="Unit">
              <Select
                value={doseUnit}
                onChange={(e) =>
                  setDoseUnit(e.target.value as LogDoseInput["doseUnit"])
                }
              >
                {DOSE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <DateTimeField label="When" value={datetime} onChange={setDatetime} />

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
                    {nameForDose(d.medicationId)} · {d.dose} {d.doseUnit}
                  </span>
                  <span className="text-xs text-muted">
                    {formatWhen(d.datetime)} · {siteLabel(d.injectionSite)}
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
