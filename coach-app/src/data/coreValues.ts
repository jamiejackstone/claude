export interface CoreValue {
  week: number;        // 1–13, FIXED — never reordered, same every term
  name: string;
  subtitle: string;
  coachNotes: string;  // head-coach guidance, verbatim from below
  reflectionQuestion: string;
}

export const CORE_VALUES: CoreValue[] = [
  {
    week: 1,
    name: "Respect",
    subtitle: "The Foundation",
    coachNotes: "Set the tone from the moment children arrive. Use names. Make eye contact. Listen when they speak. Expect the same in return — not because it is a rule, but because it is how this community works. Name respect when you see it: stop the session, point it out, make it the standard. The children who struggle most with it are usually the ones who need the most consistent modelling of it. Be patient. Be relentless.",
    reflectionQuestion: "Would every child in this session feel they were genuinely respected today — by me, and by their teammates?"
  },
  {
    week: 2,
    name: "Leadership",
    subtitle: "Finding Your Voice",
    coachNotes: "Distribute leadership deliberately. Give different children the chance to lead the warm-up, call the play, demonstrate a skill. Name it when you see it — even in its smallest forms: 'The way you just picked up your teammate — that is leadership.' Never let only the loudest or most confident children be seen as the leaders. Find the quiet leaders and name them too. Every child should leave knowing they led something today.",
    reflectionQuestion: "Did every child in my session today have at least one moment where they led something — and did I name it?"
  },
  {
    week: 3,
    name: "Fair Play",
    subtitle: "Integrity First",
    coachNotes: "Model fair play visibly. If you make a wrong call, own it and correct it in front of the children — that is the most powerful fair play lesson you will ever teach. Celebrate the own foul call loudly: stop the session and name it as the standard we hold here. Help children develop the language of respectful disagreement. Never let win-at-any-cost behaviour pass without address. The culture of your court is set by what you allow.",
    reflectionQuestion: "Did I give the children a clear picture today of what integrity in competition looks like — and did I live it myself?"
  },
  {
    week: 4,
    name: "Teamwork",
    subtitle: "Winning Together",
    coachNotes: "Highlight the unseen contributions. The screen. The defensive rotation. The pass that created the pass. Name these as loudly as you name the basket. Choose and adapt drills that are impossible to complete without genuine cooperation — and make sure every child in the session understands why. When 'hero ball' appears, redirect it immediately — not with blame, but with a question: 'What does the team need right now?'",
    reflectionQuestion: "Did I find and celebrate at least one moment of true teamwork today — the kind that had nothing to do with scoring?"
  },
  {
    week: 5,
    name: "Balance",
    subtitle: "Healthy Mind and Body",
    coachNotes: "Check in. Not just 'are you warmed up?' but 'how are you doing?' Notice when a child is unsettled — distracted, anxious, overwhelmed — and acknowledge it. Build moments of calm into sessions alongside the intensity: the quiet team briefing before a drill, the composed reset after a mistake, the still moment of reflection at the close. You are not just coaching their body. You are coaching the whole child in front of you.",
    reflectionQuestion: "Did I coach the whole person today — body and mind?"
  },
  {
    week: 6,
    name: "Confidence",
    subtitle: "Courage to Try",
    coachNotes: "Create success moments for every child, not just the most able. Give specific positive feedback — not 'well done' but 'the way you drove baseline there was brave.' Never make a child feel foolish for trying and failing. The attempt is the point. Stretch every child just beyond their comfort zone — that is where confidence lives. The shy child who tries something new in your session and pulls it off is doing some of the most important work in the room.",
    reflectionQuestion: "Did every child leave today feeling slightly more capable — more confident — than when they arrived?"
  },
  {
    week: 7,
    name: "Fun",
    subtitle: "The Heart of the Game",
    coachNotes: "Bring real energy — not performed enthusiasm, but the genuine kind that comes from loving what you do. Deliver sessions where laughter is possible. If something is not working, pivot — do not grind through a joyless session because it is on the plan. The plan serves the session, not the other way around. The most important question you ask yourself after every session is not 'did they improve?' It is: were they smiling?",
    reflectionQuestion: "Would the children in my session today describe it as one of the best hours of their week?"
  },
  {
    week: 8,
    name: "Perseverance",
    subtitle: "The Bounce Back",
    coachNotes: "Celebrate the Bounce Back explicitly and loudly — every time a child misses and immediately resets, name it. Create situations that require recovery: drills where failure is expected, games where coming from behind is possible. Do not rescue a child from difficulty too quickly — let them sit in it for a moment, then coach them through it. Model it yourself: 'That did not go how I planned. Here is what we are doing differently.' Your response to your own setbacks teaches them more than any coaching cue.",
    reflectionQuestion: "Did I let the children struggle a little today — and did I coach them through it, rather than around it?"
  },
  {
    week: 9,
    name: "Community",
    subtitle: "Connection through basketball",
    coachNotes: "Know every name. Notice every absence. Create ritual — a consistent way to start and end sessions, language that is specific to your group, moments of genuine connection beyond the drills. When new children arrive, build in a real moment of welcome. When children are struggling socially, notice it and respond. The court should feel like the safest, warmest room in their week. Protect that.",
    reflectionQuestion: "Would every child in my session describe this as a place where they truly belong?"
  },
  {
    week: 10,
    name: "Inclusion",
    subtitle: "A Place for You",
    coachNotes: "Deliver and adapt sessions so that every child can succeed — not just the most able. Watch for children who are drifting quietly and bring them back in. Never let a child be made to feel lesser by their peers without addressing it directly. Actively celebrate different styles of play, different starting points, different personalities. Make sure every child leaves having contributed something that was seen and valued.",
    reflectionQuestion: "Is there any child in my session who felt less welcome, less seen, or less valued than the others today — and if so, what am I going to do about it?"
  },
  {
    week: 11,
    name: "Growth",
    subtitle: "The Hero's Mindset",
    coachNotes: "Give feedback that references growth specifically: 'That is so much better than last week — I have watched you work on that.' Never compare children to each other — always compare them to themselves. Teach children to self-coach: 'What are you working on today? How will you know if it worked?' Set the expectation that every session contains progress. The child who leaves knowing exactly what they improved is developing the Hero's Mindset.",
    reflectionQuestion: "Did every child leave today knowing specifically what they improved — and why it matters?"
  },
  {
    week: 12,
    name: "Accountability",
    subtitle: "Owning the Play",
    coachNotes: "Own your own mistakes as a coach — visibly, without excuse, in front of the children. This is the single most powerful accountability lesson you will ever teach them. Hold children to their commitments consistently and kindly: 'You said you were going to box out every time — I am watching for it.' Do not accept deflection without gently redirecting it: 'I hear you — and what could you have done differently?' The team that holds itself to account, without the coach having to enforce every standard, is a team ready to achieve something.",
    reflectionQuestion: "Did I model accountability today in a way the children could actually see — not just talk about it?"
  },
  {
    week: 13,
    name: "Love",
    subtitle: "Bigger Than Basketball",
    coachNotes: "This is the last week of term. Make it count. Make it joyful, celebratory, and reflective in equal measure. Give every child a specific moment of personal recognition — something they did this term that you saw, that mattered, that you will remember. Ask them: what do you love about this? Their answers will tell you everything about how well you have done your job. And then ask yourself the same question — because if you still love it, they will feel it. And if they feel it, they will come back.",
    reflectionQuestion: "Does every child in my session know — genuinely know — that I love this game, that I love coaching them, and that this is a place where people look out for each other?"
  }
];
