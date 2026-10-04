# World Explorer: documentation

What the game is built on, how it is balanced, and what it asks of the
player. Each file names the code it describes, so a change knows where to
look.

## Inspiration

The game's inspiration is Microsoft's *Freelancer* (2003): a pilot who docks
at stations, takes contracts, trades between worlds and jumps through gates.

## Pages

- [principles.md](principles.md): the rules the game keeps everywhere (what
  is solid, keys and buttons, seeded maps, the arcade apart from the
  campaign). A change that breaks one changes this file first.
- [balance.md](balance.md): every number that sets difficulty and economy,
  arcade and campaign: worlds, raiders, ships, weapons, modules, salvage,
  prices, elites, flagships, scoring, and where each lives.
- [goals.md](goals.md): contracts and their stages, story chapters, side
  contracts, goals; how they are offered and what they pay.
- [objects.md](objects.md): every kind of object in space and its purpose,
  with the ones that have none yet.
- [placement.md](placement.md): where the station, gates and portals stand,
  and why; `bin/map-check` holds every world to it.
- [scenario/](scenario/README.md): the story, its acts and chapters
  ([chapters.md](scenario/chapters.md)), and the planned career lines,
  reputation and world guards.
- [agent/](agent/README.md): the instructions for a coding agent that plays
  the campaign as your rival.
- [playtest-2026-10-05.md](playtest-2026-10-05.md): the arcade played by bots, judged, problems ranked.
- [designer/missiles.md](designer/missiles.md): the designer's brief for the
  homing missiles, their motors and module icons.
