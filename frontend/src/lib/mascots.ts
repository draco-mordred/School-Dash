// Mascot profile pictures — users who prefer not to upload a real photo can
// pick one of 30 mascots as their avatar in Account Settings. Stored in the
// existing User.profileImage field as "mascot:<id>" so no backend/model
// change is required; every avatar renderer checks for the prefix.
export interface MascotAvatar {
  id: string;
  emoji: string;
  name: string;
}

export const MASCOT_PREFIX = "mascot:";

export const MASCOT_AVATARS: MascotAvatar[] = [
  { id: "fox", emoji: "🦊", name: "Fox" },
  { id: "panda", emoji: "🐼", name: "Panda" },
  { id: "penguin", emoji: "🐧", name: "Penguin" },
  { id: "lion", emoji: "🦁", name: "Lion" },
  { id: "tiger", emoji: "🐯", name: "Tiger" },
  { id: "koala", emoji: "🐨", name: "Koala" },
  { id: "bear", emoji: "🐻", name: "Bear" },
  { id: "rabbit", emoji: "🐰", name: "Rabbit" },
  { id: "cow", emoji: "🐮", name: "Cow" },
  { id: "frog", emoji: "🐸", name: "Frog" },
  { id: "owl", emoji: "🦉", name: "Owl" },
  { id: "turtle", emoji: "🐢", name: "Turtle" },
  { id: "octopus", emoji: "🐙", name: "Octopus" },
  { id: "unicorn", emoji: "🦄", name: "Unicorn" },
  { id: "dog", emoji: "🐶", name: "Dog" },
  { id: "cat", emoji: "🐱", name: "Cat" },
  { id: "monkey", emoji: "🐵", name: "Monkey" },
  { id: "parrot", emoji: "🦜", name: "Parrot" },
  { id: "elephant", emoji: "🐘", name: "Elephant" },
  { id: "giraffe", emoji: "🦒", name: "Giraffe" },
  { id: "hedgehog", emoji: "🦔", name: "Hedgehog" },
  { id: "dolphin", emoji: "🐬", name: "Dolphin" },
  { id: "whale", emoji: "🐳", name: "Whale" },
  { id: "crocodile", emoji: "🐊", name: "Crocodile" },
  { id: "dino", emoji: "🦕", name: "Dino" },
  { id: "bee", emoji: "🐝", name: "Bee" },
  { id: "butterfly", emoji: "🦋", name: "Butterfly" },
  { id: "ladybug", emoji: "🐞", name: "Ladybug" },
  { id: "hamster", emoji: "🐹", name: "Hamster" },
  { id: "wolf", emoji: "🐺", name: "Wolf" },
];

export const isMascotProfile = (value?: string | null): boolean =>
  typeof value === "string" && value.startsWith(MASCOT_PREFIX);

// Returns the mascot emoji for a "mascot:<id>" profileImage, else null.
export const getMascotEmoji = (value?: string | null): string | null => {
  if (!isMascotProfile(value)) return null;
  const id = String(value).slice(MASCOT_PREFIX.length).trim();
  const found = MASCOT_AVATARS.find((m) => m.id === id);
  return found ? found.emoji : null;
};
