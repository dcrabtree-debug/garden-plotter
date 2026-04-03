export type Relationship = 'friend' | 'foe' | 'neutral';

export interface CompanionEdge {
  plantA: string;
  plantB: string;
  relationship: Relationship;
  reason: string;
  source: string;
}

export type CompanionMap = Map<string, Map<string, CompanionEdge>>;
