/** Item guardable en una lista personal (local). Los lugares en “Quiero ir” usan la API. */
export type SavedListItem =
  | { kind: "place"; googlePlaceId: string; photoUrl?: string; name?: string }
  | {
      kind: "visit";
      visitId: string;
      placeName?: string;
      photoUrl?: string;
    }
  | { kind: "group"; groupId: string; groupName?: string; photoUrl?: string };

export type SavedListRecord = {
  id: string;
  title: string;
  emoji: string;
  items: SavedListItem[];
  createdAt: string;
};
