
export const CORE_VALUES = [
  "Respect",
  "Leadership",
  "Fair Play",
  "Teamwork",
  "Health",
  "Confidence",
  "Fun",
  "Perseverance"
] as const;

export type CoreValue = typeof CORE_VALUES[number];

export const CORE_VALUE_QUOTES: Record<CoreValue, { younger: string; older: string }> = {
  "Respect": {
    younger: "Respect means listening to your coach and being kind to your teammates. We treat everyone how we want to be treated!",
    older: "Respect is the foundation of the game. It's about valuing your teammates, your opponents, and the officials, regardless of the score."
  },
  "Leadership": {
    younger: "Being a leader means helping a friend who is stuck and showing everyone how to do their best with a big smile!",
    older: "Leadership isn't about being in charge; it's about taking care of those in your charge and inspiring them through your actions."
  },
  "Fair Play": {
    younger: "Fair play means following the rules and being honest. It's more important to play fair than it is to win!",
    older: "Fair play is about integrity. It's competing with everything you have while maintaining total honesty and sportsmanship."
  },
  "Teamwork": {
    younger: "Teamwork is like a puzzle—we all have a special piece to add! When we work together, we can do amazing things.",
    older: "Individual talent wins games, but teamwork and intelligence win championships. We are stronger together than we are alone."
  },
  "Health": {
    younger: "Eating healthy food and staying active keeps our bodies strong like superheroes! Drinking water is our secret power.",
    older: "Your body is your most important piece of equipment. Fuel it with good food and rest so you can perform at your peak."
  },
  "Confidence": {
    younger: "Confidence is believing in yourself! Even if something is hard, keep trying and tell yourself 'I can do it!'",
    older: "Confidence comes from preparation. Trust the work you've put in, and don't be afraid to take the shot when it's your turn."
  },
  "Fun": {
    younger: "The best part of basketball is having fun with your friends! Let's play with joy and keep our energy high.",
    older: "Never lose the joy of the game. We play our best when we're enjoying the process and the competition."
  },
  "Perseverance": {
    younger: "Perseverance means not giving up! If you miss a shot, just try again. Every mistake is a chance to learn.",
    older: "Perseverance is failing 19 times and succeeding the 20th. It's the grit to keep going when things get tough."
  }
};
