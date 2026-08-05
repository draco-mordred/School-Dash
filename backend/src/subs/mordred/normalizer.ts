import Department from '../../models/departments';

const STOP_WORDS = new Set(['department', 'dept', 'unit', 'of', 'the', 'and', '&', 'a', 'an']);

function normalizeString(input: string) {
  if (!input || typeof input !== 'string') return '';
  let s = input.toLowerCase().trim();
  s = s.replace(/[^a-z0-9\s&]+/g, '');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

function buildVariants(input: string) {
  const normalized = normalizeString(input);
  if (!normalized) return [];

  const variants = new Set<string>();
  variants.add(normalized);

  const withoutPrefix = normalized.replace(/^department\s+of\s+|^dept\.?\s+|^unit\s+/i, '').trim();
  if (withoutPrefix) variants.add(withoutPrefix);

  const compact = normalized.replace(/\s+/g, '');
  if (compact) variants.add(compact);

  const compactWithoutPrefix = withoutPrefix.replace(/\s+/g, '');
  if (compactWithoutPrefix) variants.add(compactWithoutPrefix);

  const commaClean = normalized.replace(/&/g, ' ').replace(/\s+/g, ' ').trim();
  if (commaClean) {
    variants.add(commaClean);
    variants.add(commaClean.replace(/\s+/g, ''));
  }

  const tokens = commaClean.split(/\s+/).filter(Boolean);
  const importantTokens = tokens.filter((token) => !STOP_WORDS.has(token));

  if (importantTokens.length) {
    variants.add(importantTokens.join(' '));
    variants.add(importantTokens.join(''));
    variants.add(importantTokens.map((token) => token[0]).join(''));
  }

  return Array.from(variants);
}

function hasAliasMatch(identifier: string, department: any) {
  const identifierVariants = buildVariants(identifier);
  if (!identifierVariants.length) return false;

  const docVariants = new Set<string>([
    ...buildVariants(department.name || ''),
    ...buildVariants(department.code || ''),
    ...buildVariants(department.departmentID || ''),
  ]);

  for (const variant of identifierVariants) {
    if (docVariants.has(variant)) {
      return true;
    }
  }

  return false;
}

export async function resolveDepartmentByIdentifier(identifier: string) {
  if (!identifier) return null;
  const normalized = normalizeString(identifier);

  const byId = await Department.findOne({ $or: [ { _id: identifier }, { departmentID: identifier }, { code: identifier } ] }).lean();
  if (byId) return byId;

  const all = await Department.find({}).lean();
  for (const d of all) {
    if (hasAliasMatch(identifier, d)) return d;
  }

  return null;
}

export { normalizeString };
