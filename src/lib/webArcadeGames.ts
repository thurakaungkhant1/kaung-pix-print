export interface WebArcadeGame {
  slug: string;
  name: string;
  category: string;
  emoji: string;
  gradient: string;
}

/**
 * Curated selection of online web games hosted on e.tubhai.com.
 * Thumbnails: https://e.tubhai.com/thumbs/{slug}_2.jpg
 * Play URL:   https://e.tubhai.com/game/{slug}
 */
export const WEB_ARCADE_GAMES: WebArcadeGame[] = [
  { slug: "snake-2048", name: "Snake 2048", category: "Puzzle", emoji: "🐍", gradient: "from-emerald-500 via-teal-500 to-cyan-400" },
  { slug: "bubble-blast", name: "Bubble Blast", category: "Casual", emoji: "🫧", gradient: "from-fuchsia-500 via-pink-500 to-rose-400" },
  { slug: "block-blast-master", name: "Block Blast Master", category: "Puzzle", emoji: "🧩", gradient: "from-indigo-500 via-purple-500 to-pink-500" },
  { slug: "parkour-runner-3d", name: "Parkour Runner 3D", category: "Action", emoji: "🏃", gradient: "from-orange-500 via-red-500 to-rose-500" },
  { slug: "pool-shoot-tournament", name: "Pool Shoot", category: "Sports", emoji: "🎱", gradient: "from-emerald-600 via-green-500 to-lime-400" },
  { slug: "basketball-superstars", name: "Basketball Stars", category: "Sports", emoji: "🏀", gradient: "from-amber-500 via-orange-500 to-red-500" },
  { slug: "grand-shift-auto", name: "Grand Shift Auto", category: "Racing", emoji: "🚗", gradient: "from-slate-600 via-zinc-600 to-neutral-500" },
  { slug: "mr-racer-car-racing", name: "MR Racer", category: "Racing", emoji: "🏎️", gradient: "from-rose-500 via-pink-500 to-orange-400" },
  { slug: "hazmob-fps-online-shooter", name: "Hazmob FPS", category: "Action", emoji: "🔫", gradient: "from-red-700 via-red-500 to-orange-500" },
  { slug: "deadly-descent-3d", name: "Deadly Descent 3D", category: "Action", emoji: "⛰️", gradient: "from-sky-600 via-blue-500 to-indigo-500" },
  { slug: "adventure-crazy-ramp-bike-stunt-game", name: "Bike Stunt", category: "Racing", emoji: "🏍️", gradient: "from-yellow-500 via-orange-500 to-red-500" },
  { slug: "crazy-bus-station", name: "Crazy Bus", category: "Simulation", emoji: "🚌", gradient: "from-yellow-400 via-amber-500 to-orange-500" },
  { slug: "dd-bubble-shooter-up", name: "Bubble Shooter", category: "Puzzle", emoji: "🎯", gradient: "from-pink-500 via-purple-500 to-indigo-500" },
  { slug: "nuts-bolts-game-wood-puzzle", name: "Nuts & Bolts", category: "Puzzle", emoji: "🔩", gradient: "from-amber-700 via-orange-600 to-red-600" },
  { slug: "hidden-object-clues-and-mysteries", name: "Hidden Object", category: "Puzzle", emoji: "🔍", gradient: "from-violet-600 via-purple-500 to-fuchsia-500" },
  { slug: "good-sort-master-triple-match", name: "Sort Master", category: "Casual", emoji: "🎨", gradient: "from-cyan-500 via-sky-500 to-blue-500" },
  { slug: "millionaire-life", name: "Millionaire Life", category: "Simulation", emoji: "💰", gradient: "from-yellow-400 via-yellow-500 to-amber-600" },
  { slug: "super-candy-jewels", name: "Candy Jewels", category: "Puzzle", emoji: "💎", gradient: "from-pink-400 via-fuchsia-500 to-purple-500" },
  { slug: "crowdgate", name: "CrowdGate", category: "Casual", emoji: "🚪", gradient: "from-teal-500 via-emerald-500 to-green-500" },
  { slug: "online-car-destruction-simulator-3d", name: "Car Destruction", category: "Action", emoji: "💥", gradient: "from-red-600 via-orange-600 to-yellow-500" },
  { slug: "gangsta-island-crime-city", name: "Gangsta Island", category: "Action", emoji: "🌆", gradient: "from-neutral-700 via-slate-600 to-zinc-500" },
  { slug: "obby-1-jump-per-click", name: "Obby Jump", category: "Action", emoji: "🦘", gradient: "from-lime-500 via-green-500 to-emerald-500" },
  { slug: "playground-man-ragdoll-show", name: "Ragdoll Show", category: "Casual", emoji: "🤸", gradient: "from-sky-400 via-blue-500 to-indigo-500" },
  { slug: "italian-brainrot-hunting-3d", name: "Brainrot Hunt", category: "Action", emoji: "🎮", gradient: "from-purple-600 via-pink-500 to-red-500" },
];

export const WEB_ARCADE_CATEGORIES = ["All", "Action", "Puzzle", "Racing", "Sports", "Casual", "Simulation"];

export const getGameThumb = (slug: string) => `https://e.tubhai.com/thumbs/${slug}_2.jpg`;
export const getGameEmbedUrl = (slug: string) => `https://e.tubhai.com/game/${slug}`;

export const findGame = (slug: string) => WEB_ARCADE_GAMES.find(g => g.slug === slug);
