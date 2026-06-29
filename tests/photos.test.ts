// photos.test.ts — the pure comparison picker for photo progress.
// Run: npx tsx tests/photos.test.ts   (exits non-zero on any failure)
import { pickComparison } from "../src/lib/photos";

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log((ok ? "PASS  " : "FAIL  ") + name);
  if (!ok) failures++;
};

check("null with zero photos", pickComparison([]) === null);
check("null with one photo", pickComparison([{ id: "a", at: 1 }]) === null);

const picked = pickComparison([
  { id: "b", at: 200 },
  { id: "a", at: 100 },
  { id: "c", at: 300 },
]);
check("first is earliest", picked?.first.id === "a");
check("latest is most recent", picked?.latest.id === "c");

console.log(failures === 0 ? "\nALL PHOTOS TESTS PASSED" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
