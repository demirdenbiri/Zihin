export type Mood = "happy" | "sad" | "inspired" | "thoughtful" | "energetic" | "calm";

export type NoteCategory = "idea" | "inspiration" | "memory" | "status" | "reminder";

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Note {
  id: string;
  userId: string;
  content: string;
  mood?: Mood;
  location?: Location;
  category: NoteCategory;
  type: "regular" | "sticky";
  expiresAt?: string; // ISO string for self-destructing
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isVoice?: boolean;
  audioUrl?: string;
  isPoetic?: boolean;
  lyrics?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}
