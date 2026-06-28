import { useMemo, useState } from "react";
import { useAppStore } from "../../state/store";
import { COMPOUNDS, getCompound } from "../../lib/peptides";
import { Button, Card, Field, TextInput } from "../../components/Form";

/**
 * Stacks — USER-DEFINED groupings of catalog compounds (PRD §1.5/§9). The user names
 * a stack and picks the compounds; the app stores and reflects that choice and
 * NOTHING ELSE. It ships no preloaded or recommended stacks and never suggests a
 * combination — that would cross the neutrality firewall.
 */
export function Stacks() {
  const setScreen = useAppStore((s) => s.setScreen);
  const stacks = useAppStore((s) => s.stacks);
  const saveStack = useAppStore((s) => s.saveStack);
  const deleteStack = useAppStore((s) => s.deleteStack);
  const compoundedEnabled = useAppStore((s) => s.compoundedEnabled);
  const educationEnabled = useAppStore((s) => s.educationEnabled);

  const choices = useMemo(
    () =>
      COMPOUNDS.filter((c) => compoundedEnabled || c.mode !== "compounded"),
    [compoundedEnabled],
  );

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const canSave = name.trim() !== "" && selected.length > 0;

  const onSave = async () => {
    if (!canSave) return;
    await saveStack(name.trim(), selected);
    setName("");
    setSelected([]);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          My stacks
        </h1>
        <p className="text-xs text-muted">
          Your own groupings of the compounds you track. Tally never suggests a
          stack — these are entirely yours.
        </p>
      </header>

      <Card title="Create a stack">
        <div className="flex flex-col gap-3">
          <Field label="Name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My morning routine"
            />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">Include compounds</span>
            <div className="flex flex-col gap-1">
              {choices.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-border p-2"
                >
                  <span className="text-sm text-text">{c.displayName}</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-accent"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                </label>
              ))}
            </div>
          </div>
          <Button onClick={onSave} disabled={!canSave}>
            Save stack
          </Button>
        </div>
      </Card>

      <Card title="Your stacks">
        {stacks.length === 0 ? (
          <p className="text-sm text-muted">No stacks yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stacks.map((stack) => (
              <li
                key={stack.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="flex flex-col">
                  <span className="font-display text-sm text-text">
                    {stack.name}
                  </span>
                  <span className="text-xs text-muted">
                    {stack.compoundIds
                      .map((id) => getCompound(id)?.displayName ?? id)
                      .join(" · ")}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => deleteStack(stack.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {educationEnabled ? (
        <Button variant="ghost" onClick={() => setScreen("education")}>
          Learn about stacks
        </Button>
      ) : null}

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
