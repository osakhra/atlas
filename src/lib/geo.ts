import type { Place, Tier } from './types';
import { places } from '@/data/places';

/** Returns all leaf places (nodes with no children) in document order. */
export function flattenPlaces(tree: Place[]): Place[] {
  const result: Place[] = [];
  for (const node of tree) {
    if (!node.children || node.children.length === 0) {
      result.push(node);
    } else {
      result.push(...flattenPlaces(node.children));
    }
  }
  return result;
}

/** Recursively searches the tree (any node, leaf or branch) by id. Returns null if not found. */
export function findPlace(id: string, tree: Place[] = places): Place | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findPlace(id, node.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * For a leaf (has lat/lng), returns its own coordinates.
 * For a non-leaf, returns the mean lat/lng of all descendant leaves.
 * Returns null if a non-leaf has no descendant leaves with coordinates (shouldn't happen with this dataset).
 */
export function centroidOf(place: Place): { lat: number; lng: number } | null {
  if (!place.children || place.children.length === 0) {
    if (place.lat === undefined || place.lng === undefined) return null;
    return { lat: place.lat, lng: place.lng };
  }

  const leaves = flattenPlaces(place.children);
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  for (const leaf of leaves) {
    if (leaf.lat === undefined || leaf.lng === undefined) continue;
    sumLat += leaf.lat;
    sumLng += leaf.lng;
    count += 1;
  }

  if (count === 0) return null;

  return { lat: sumLat / count, lng: sumLng / count };
}

/** Camera altitude (globe.gl pointOfView units) per tier. */
export function altitudeForTier(tier: Tier): number {
  switch (tier) {
    case 'continent':
      return 1.6;
    case 'country':
      return 1.0;
    case 'state':
      return 0.6;
    case 'island':
      return 0.45;
    case 'city':
      return 0.32;
    case 'poi':
      return 0.24;
  }
}
