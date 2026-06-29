import { useMemo, useState } from "react";
import { useAppStore } from "../../state/store";
import {
  reconstitute,
  mcgToMg,
  type ReconResult,
  type SyringeType,
} from "../../lib/recon";
import { Button, Card, Field, Select, TextInput } from "../../components/Form";

const SYRINGES: SyringeType[] = ["U-100", "U-50", "U-40"];

/**
 * Reconstitution calculator (Phase 7, compounded mode). Flag-gated upstream; shows a
 * persistent "calculator only — verify with your provider" notice (Ref §2.3). It
 * computes from the user's own inputs via the verified core and recommends nothing.
 */
export function Reconstitution() {
  const setScreen = useAppStore((s) => s.setScreen);

  const [vial, setVial] = useState("");
  const [bac, setBac] = useState("");
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState<"mg" | "mcg">("mg");
  const [syringe, setSyringe] = useState<SyringeType>("U-100");

  const result = useMemo<ReconResult | null>(() => {
    const v = Number(vial);
    const b = Number(bac);
    const d = Number(dose);
    if (!(v > 0) || !(b > 0) || !(d > 0)) return null;
    try {
      return reconstitute({
        vialStrengthMg: v,
        bacWaterMl: b,
        desiredDoseMg: doseUnit === "mcg" ? mcgToMg(d) : d,
        syringe,
      });
    } catch {
      return null;
    }
  }, [vial, bac, dose, doseUnit, syringe]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Reconstitution calculator
        </h1>
        <p className="text-xs text-muted">
          For informational and tracking purposes only.
        </p>
      </header>

      <Card title="Inputs">
        <div className="flex flex-col gap-3">
          <Field label="Vial strength (mg)">
            <TextInput
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={vial}
              onChange={(e) => setVial(e.target.value)}
              placeholder="e.g. 5"
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desired dose">
              <TextInput
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="e.g. 0.25"
              />
            </Field>
            <Field label="Unit">
              <Select
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as "mg" | "mcg")}
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
              </Select>
            </Field>
          </div>
          <Field label="Syringe">
            <Select
              value={syringe}
              onChange={(e) => setSyringe(e.target.value as SyringeType)}
            >
              {SYRINGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {result ? (
        <Card title="Result">
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">Draw</span>
              <span className="font-display text-text">
                {Math.round(result.units * 2) / 2} units ({result.syringe})
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Dose volume</span>
              <span className="text-text">{result.doseVolumeMl.toFixed(2)} mL</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Concentration</span>
              <span className="text-text">
                {result.concentrationMgPerMl.toFixed(2)} mg/mL
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Doses per vial</span>
              <span className="text-text">{Math.floor(result.dosesPerVial)}</span>
            </li>
          </ul>
          {result.exceedsSyringe ? (
            <p className="mt-3 text-sm text-warning">
              This dose volume exceeds one {result.syringe} syringe — split or
              adjust with your provider.
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <p className="text-xs text-muted">
          Calculator only — verify with your provider. This is not medical advice
          and recommends no substance or dose.
        </p>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
