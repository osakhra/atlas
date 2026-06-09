export type Category = "lived" | "vacationed" | "work" | "planned";
export type Tier = "continent" | "country" | "state" | "island" | "city" | "poi";

export interface Place {
  id: string;            // kebab-case, globally unique, e.g. "amman"
  name: string;
  tier: Tier;
  lat?: number;          // required for leaves; parents may omit (centroid)
  lng?: number;
  category?: Category;   // leaves only
  note?: string;         // owner-supplied only, never generated
  bestSpots?: string[];  // owner-supplied only, never generated
  children?: Place[];
}
