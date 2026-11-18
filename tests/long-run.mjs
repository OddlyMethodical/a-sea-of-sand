import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { SandField } from '../app/sediment.ts';

// Load the same wind and fast-forward settings used in the browser.
const source = fs.readFileSync(new URL('../app/wind.ts', import.meta.url), 'utf8');
const module = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText.replace("'./sediment'", JSON.stringify(new URL('../app/sediment.ts', import.meta.url).href));
const { makeState, cycleStepLimit, windAt } = await import('data:text/javascript;base64,' + Buffer.from(module).toString('base64'));

function countSummits(field) {
  const { height, size } = field;
  const at = (x, z) => ((z + size) % size) * size + (x + size) % size;
  let count = 0;
  for (let i = 0; i < height.length; i++) {
    if (height[i] <= 10) continue;
    const x = i % size, z = Math.floor(i / size);
    let highest = true, rim = Infinity;
    for (let dz = -15; highest && dz <= 15; dz++) {
      for (let dx = -15; dx <= 15; dx++) {
        const squaredDistance = dx * dx + dz * dz;
        if (squaredDistance > 225) continue;
        const j = at(x + dx, z + dz);
        if (height[j] > height[i] || (height[j] === height[i] && j < i)) {
          highest = false;
          break;
        }
        if (squaredDistance >= 196) rim = Math.min(rim, height[j]);
      }
    }
    if (highest && height[i] - rim >= 8) count++;
  }
  return count;
}

const state = Object.assign(makeState(), { speed: 1000, strength: 2, direction: 340, variableWind: true });
const field = new SandField();
const maxStep = cycleStepLimit(state);
for (const checkpoint of [600, 3000, 10000, 33528]) {
  while (field.cycles < checkpoint - 1e-8) {
    const step = Math.min(maxStep, checkpoint - field.cycles);
    const phase = (field.cycles + step / 2) * 2 * Math.PI / 240;
    const wind = windAt(state, phase);
    field.step(wind.strength, wind.direction, step);
  }
  const summits = countSummits(field);
  assert.ok(summits >= 20, `Only ${summits} distinct summits at cycle ${checkpoint}`);
  assert.ok(Math.abs(field.volume() / field.initialVolume - 1) < 1e-10);
  console.log({ cycles: checkpoint, summits });
}
