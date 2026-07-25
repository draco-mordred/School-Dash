import RotationPlan from '../models/rotationPlan';

const DEFAULT_STOPWORDS = new Set([
  'posting', 'postings', 'clinical', 'and', '&', 'the', 'a', 'an', 'of', 'for', 'with', 'in', 'on'
]);

function normalizeWords(name: string) {
  if (!name) return [];
  // Replace ampersand with 'and', then split on non-word characters
  const cleaned = name.replace(/&/g, ' and ');
  const parts = cleaned.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function generateSpinBase(name: string) {
  const words = normalizeWords(name).map((w) => w.trim()).filter(Boolean);
  // filter stopwords but DO NOT remove 'junior' or 'senior'
  const strong = words.filter((w) => !DEFAULT_STOPWORDS.has(w.toLowerCase()));

  if (strong.length === 0 && words.length > 0) {
    // fallback to any words
    strong.push(...words);
  }

  const chosen = strong.slice(0, 3);

  // Build base: take first letter of each chosen word; if fewer than 3, pad by taking subsequent letters from last word
  let base = '';
  for (let i = 0; i < chosen.length; i++) {
    base += chosen[i][0] ? chosen[i][0].toUpperCase() : '';
  }

  if (base.length < 3 && chosen.length > 0) {
    const last = chosen[chosen.length - 1];
    let idx = 1; // we've already used first letter
    while (base.length < 3 && idx < last.length) {
      base += last[idx].toUpperCase();
      idx++;
    }
  }

  // final fallback: if still <3, pad with X
  while (base.length < 3) base += 'X';

  return base;
}

function formatSuffix(n: number) {
  if (n < 100) return n.toString().padStart(2, '0');
  return n.toString();
}

async function getExistingSpinsForClass(classId?: string) {
  if (!classId) return {} as Record<string, Set<number>>;
  const plans = await RotationPlan.find({ class: classId }).select('postings.spin postings.spinBase').lean();
  const map: Record<string, Set<number>> = {};
  for (const p of plans) {
    const postings = p.postings || [];
    for (const po of postings) {
      const base = po.spinBase;
      const spin = po.spin;
      if (!base || !spin) continue;
      // suffix is rest of spin after base
      const suffixStr = spin.slice(base.length);
      const n = Number(suffixStr);
      if (!Number.isNaN(n)) {
        map[base] = map[base] || new Set<number>();
        map[base].add(n);
      }
    }
  }
  return map;
}

export async function generatePostingSpinsForPayload(classId: string | undefined, postings: any[]) {
  const existing = await getExistingSpinsForClass(classId);
  const assigned: Record<string, Set<number>> = {};

  for (const p of postings) {
    const name = p.name || '';
    const base = generateSpinBase(name);
    p.spinBase = base;
    assigned[base] = assigned[base] || new Set<number>(existing[base] ? Array.from(existing[base]) : []);

    const currentSpin = typeof p.spin === 'string' && p.spin.startsWith(base) ? p.spin : undefined;
    if (currentSpin) {
      const suffix = Number(currentSpin.slice(base.length));
      if (!Number.isNaN(suffix)) {
        assigned[base].add(suffix);
        p.spin = currentSpin;
        continue;
      }
    }

    // find next available suffix
    let suffix = 0;
    while (assigned[base].has(suffix)) {
      suffix++;
    }
    assigned[base].add(suffix);
    p.spin = `${base}${formatSuffix(suffix)}`;
  }

  // after assigning posting spins, also assign department and unit spins deterministically
  assignDepartmentAndUnitSpins(postings);
  return postings;
}

export function assignDepartmentAndUnitSpins(postings: any[]) {
  // For each posting, enumerate unique departments and units and assign spins
  for (const p of postings) {
    const baseSpin = p.spin || p.spinBase || generateSpinBase(p.name || '');
    const deptMap: Record<string, number> = {};
    const unitMap: Record<string, Record<string, number>> = {}; // dept -> unitName -> index
    let deptCounter = 1;

    const groups = p.groups || [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i] || {};
      const groupObj = g.group || {};
      const deptName = (groupObj.department || 'DEFAULT').toString();
      if (!deptMap[deptName]) {
        deptMap[deptName] = deptCounter++;
        unitMap[deptName] = {};
      }
      const deptIndex = deptMap[deptName];
      const deptSpin = `${baseSpin}-DPT${String(deptIndex).padStart(3, '0')}`;
      groupObj.departmentSpin = deptSpin;

      const unitName = (groupObj.name || `Unit${i+1}`).toString();
      unitMap[deptName][unitName] = unitMap[deptName][unitName] || (Object.keys(unitMap[deptName]).length + 1);
      const unitIndex = unitMap[deptName][unitName];
      const unitSpin = `${baseSpin}-UNT${String(unitIndex).padStart(3, '0')}`;
      groupObj.unitSpin = unitSpin;

      // write back
      g.group = groupObj;
    }
  }
}

export default generatePostingSpinsForPayload;
