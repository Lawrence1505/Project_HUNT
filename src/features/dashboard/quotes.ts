/** Curated discipline / growth quotes for the Dashboard "Quote of the Day". */

export interface DailyQuote {
  text: string;
  author: string;
}

export const QUOTES: DailyQuote[] = [
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Will Durant",
  },
  {
    text: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: "James Clear",
  },
  {
    text: "Suffer the pain of discipline or suffer the pain of regret.",
    author: "Jim Rohn",
  },
  {
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
  },
  {
    text: "Waste no more time arguing what a good man should be. Be one.",
    author: "Marcus Aurelius",
  },
  {
    text: "He who conquers himself is the mightiest warrior.",
    author: "Confucius",
  },
  {
    text: "First we make our habits, then our habits make us.",
    author: "John Dryden",
  },
  {
    text: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier",
  },
  {
    text: "Motivation gets you going, but discipline keeps you growing.",
    author: "John C. Maxwell",
  },
  {
    text: "You will never change your life until you change something you do daily.",
    author: "John C. Maxwell",
  },
  {
    text: "Hard choices, easy life. Easy choices, hard life.",
    author: "Jerzy Gregorek",
  },
  {
    text: "A river cuts through rock not because of its power, but because of its persistence.",
    author: "James N. Watkins",
  },
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "It is not the mountain we conquer, but ourselves.",
    author: "Edmund Hillary",
  },
  {
    text: "The best time to plant a tree was twenty years ago. The second best time is now.",
    author: "Proverb",
  },
  {
    text: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery",
  },
  {
    text: "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.",
    author: "Stephen King",
  },
  {
    text: "What you do every day matters more than what you do once in a while.",
    author: "Gretchen Rubin",
  },
  {
    text: "Whether you think you can or you think you can't, you're right.",
    author: "Henry Ford",
  },
  {
    text: "Don't count the days; make the days count.",
    author: "Muhammad Ali",
  },
];

/** Deterministic pick by day-of-year — same quote all day, new one tomorrow. */
export function quoteOfTheDay(now: Date = new Date()): DailyQuote {
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86_400_000
  );
  return QUOTES[((dayOfYear % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
