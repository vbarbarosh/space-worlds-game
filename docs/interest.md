# What makes the arcade interesting, and how it is measured

The author, 2026-10-30: "make the arcade mode more interesting ... a game
is five minutes a world, and those five minutes must be engaging". This
page says what "interesting" means here, from game design, and how
`bin/playtest` measures it in every world the bot flies.

## What game design says

- **The interest curve** (Jesse Schell, *The Art of Game Design*): interest
  over time has a hook at the start, peaks that rise with valleys between
  them, and a climax at the end. A flat line, however high, bores.
- **Build-up, peak, rest** (Left 4 Dead's AI director, Michael Booth,
  Valve): the director watches each player's intensity, lets it build to a
  peak, holds it a few seconds, then gives a rest before the next build-up.
  A rest is part of the design, not a gap in it.
- **Peaks motivate** (a study of difficulty curves in a shooter, 67
  players, [HAL hal-03847459](https://hal.archives-ouvertes.fr/hal-03847459)):
  of the curves tried, the one with peaks had the strongest effect on
  motivation; a biosensor study found the most engaging moments often
  follow a calm stretch.
- **Interesting decisions** (Sid Meier): a game is a series of choices
  with something at stake: a prize to go for or leave, a risk to take.
- **Novelty** (Raph Koster, *A Theory of Fun*): play is learning a pattern;
  once it is learned, the same pattern bores, so something new has to come.

## The measures

`bin/playtest` takes a sample each second of a world's time and notes the
first time each new thing shows (news). From them, per world
(`interest_of` in `bin/playtest`):

| Measure | What it counts | Aim |
|---|---|---|
| tension | raiders within 700 m (a flagship as 4), hull and shield lost in the last 3 s, low hull; 0 to 1, smoothed over 5 s | |
| peaks | how often tension climbs past 0.65 after falling under 0.35, in five minutes | 3 to 7 |
| spread | how much tension varies (its standard deviation) | 0.22 or more |
| climax | the flagship's tension over the rest of the world's | 1.3 or more |
| dead | the share of seconds with no raider within 900 m | 5% or less |
| lull | the longest stretch with tension under 0.2 | |
| news | new things: a raider type close by, an elite, an event, the flagship and its second half; the longest gap between them | 45 s or less |
| choices | prizes offered to go for or leave (a convoy, an ace), in five minutes | 3 or more |
| close calls | the hull under 30% and back over 50% with no death, in five minutes | 2 |
| no reward | the longest stretch with no kill and no salvage | |

**The score**, 0 to 100, is the mean of seven parts, each 0 to 1 against
its aim: peaks, spread, climax, dead, news, choices and close calls.
`bin/playtest` prints it per world under the run's table, with the run's
mean, and writes each world's measures and its tension curve (a value
every 5 s) into the run's JSON as `interest`.

The bot is not a person: it does not get bored or excited. The measures
count what a person would feel through: how often the fight builds and
lets go, how long nothing happens, how long nothing new comes, how many
choices there are. They say where to look; flying the world says whether
it worked.

## Measured

The arcade before and after its pace, headlines and stakes (2026-10-31;
the numbers and the steps between: [balance.md](balance.md#the-arcades-pace)):

| NORMAL, Free | before | after |
|---|---|---|
| interest | 39 | 63 |
| seconds with no raider within 900 m | 42% | 23% |
| tension's peaks in five minutes | 1.3 | 2.5 |
| the longest stretch with nothing new | 111 s | 65 s |
| prizes on offer in five minutes | 1.3 | 3.2 |
| runs won of 4 | 4 | 4 |

Scroll went from 50 to 61, CHILL from 33 to 52, OVERLOAD from 51 to 66.
Close calls stay near none: the bot uses a repair kit below half its hull,
so it seldom falls under 30% and comes back.

