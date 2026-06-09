// Validates src/data/places.ts. Runs as `prebuild` before every `npm run
// build`, so it must exit 0 on success and exit 1 (with a clear message)
// on failure.

// @ts-ignore -- Node 24 type-stripping (ESM) requires explicit .ts
// extensions on relative specifiers; the app's tsconfig (bundler resolution)
// disallows them for type-checking. Both are correct in their own context.
import type { Place } from '../src/lib/types.ts';
// @ts-ignore -- see above
import { places } from '../src/data/places.ts';

const VALID_TIERS = new Set(['continent', 'country', 'state', 'island', 'city', 'poi']);
const MAX_DEPTH = 6;

const errors: string[] = [];
let totalNodes = 0;
let leafCount = 0;
let maxDepth = 0;
const seenIds = new Map<string, number>();

function walk(nodes: Place[], depth: number): void {
  maxDepth = Math.max(maxDepth, depth);

  for (const node of nodes) {
    totalNodes += 1;

    if (!node.name || node.name.trim() === '') {
      errors.push(`Node with id "${node.id}" has an empty name.`);
    }

    if (!VALID_TIERS.has(node.tier)) {
      errors.push(`Node "${node.id}" has invalid tier "${node.tier}".`);
    }

    if (!node.id || node.id.trim() === '') {
      errors.push(`Node "${node.name}" has an empty id.`);
    } else {
      const count = seenIds.get(node.id) ?? 0;
      seenIds.set(node.id, count + 1);
    }

    const isLeaf = !node.children || node.children.length === 0;

    if (isLeaf) {
      leafCount += 1;
      if (node.lat === undefined || node.lng === undefined) {
        errors.push(`Leaf "${node.id}" is missing lat/lng.`);
      }
      if (!node.category) {
        errors.push(`Leaf "${node.id}" is missing a category.`);
      }
    } else if (node.children) {
      walk(node.children, depth + 1);
    }
  }
}

walk(places, 1);

for (const [id, count] of seenIds) {
  if (count > 1) {
    errors.push(`Duplicate id "${id}" appears ${count} times.`);
  }
}

if (maxDepth > MAX_DEPTH) {
  errors.push(`Tree depth ${maxDepth} exceeds maximum of ${MAX_DEPTH}.`);
}

if (errors.length > 0) {
  console.error('check-data: FAILED');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('check-data: OK');
console.log(`  total places: ${totalNodes}`);
console.log(`  leaf places: ${leafCount}`);
console.log(`  unique ids: ${seenIds.size}`);
console.log(`  tree depth: ${maxDepth}`);
