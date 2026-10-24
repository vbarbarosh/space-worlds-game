# The three modes

Arcade, Races and Campaign: what each is, in the detail the README does
not carry. Every number lives in [balance.md](balance.md); each world as a
player sees it is in [worlds/](worlds/README.md).

## Arcade

One run through the eight worlds, about five minutes each: six waves, the
world's flagship in the last. No stations or contracts: a score, a combo
and a best score (salvage left at the end scores 10 points each).

### The raiders

Raiders come in squadrons; elites lead some of them, from Haven on (from
the second world on Chill). In the middle worlds a squadron fans out round
you, and marksmen aim where you will be, a dashed line showing their aim; a
share of the squadrons fly mixed, and each world's elites have a trick of
their own. A ship that explodes hurts what is close to it.

### The flagships

Each world's flagship is a fight of its own: its own attacks, each shown
before it lands, its own way of moving, a second half below 50%, and its
own way to be won:

- the Crescent (Haven) runs for a gate and gets away if it reaches it;
- nests shield the Thorn Beetle (Verdant);
- the Sawtooth (Dustfall) stuns itself on a rock it charges into;
- the Storm Wheel (Ion Reach) is hurt through the gaps of its turning shell;
- the Iron Stair (Obsidian) at one weak point at a time;
- the Frost Crystal (Cryosphere) while it glows;
- the Furnace's (Nova Forge) ring of fire closes in as it heats;
- the Eclipse Eye's dome opens only while you are at the black hole's edge
  with it.

### The worlds' tricks

Three worlds change the fight, in the arcade and the campaign alike:

- **Eclipse**, the gravity world: its black hole bends every shot, slings a
  ship that passes close, and swallows the raiders you lead into it.
- **Ion Reach**, the lightning world: an arc pylon strikes a ship that comes
  inside its ring once a gold ring has closed on it (1.1 s to get clear; 18
  damage, the shield first), and violet charge fields, most of them beside a
  pylon, fill the pulse while you stay in them.
- **Obsidian**, the magnetic world: its dark spires draw ships in within
  280 m and bend the shots that pass into themselves, yours and the raiders'
  alike, so a spire covers whoever keeps it between them and the guns; a
  spire is solid and nothing breaks it.

Each arcade world has a shape of its own: its size (from Nova Forge's 5.4 ×
5.4 km to Dustfall's 7.6 × 6.6 km) and proportions (Verdant 9.6 × 4.4 km
long, Obsidian 5.6 × 8 km tall), its station in the middle, at an end or
on a rim, and its rock fields strewn, in a band, a ring, a belt, columns or
outcrops.

### The depot and the reactor

The salvage you collect buys repairs, weapons, ships, supplies and modules
at the station's depot (R); each world opens more of them, and what is not
open yet says where it opens. A module level bought is yours for the run
but works only installed, and the ship's reactor powers only so many: its
own power (Wisp Scout 4 up to Aurora Cruiser 8) and one more for each world
cleared, so a run flies a build, not the whole shop (by Eclipse a cruiser
holds 15 of the 75 levels' 84 power). Hotter plasma, Rapid resonance and
Prism draw 2 a level, the rest 1. At the depot a level goes in or out for
free, so each world can fly its own build; a ship with a smaller reactor
takes out the newest levels and says so. Reactor tuning (600, 1200, 1800
salvage, three a run) adds a unit of power to every ship.

The same power drives the generator, 2 energy a second a unit and 5 more a
Generator level: it refills the shield first, 2 s after a hit, then the
turbo and the pulse, half each; energy cells pour into it, and kills do not
charge the pulse ([balance.md](balance.md#the-generator)). The support
levels do more in the arcade (drones that grow with the run, nanites that
mend under fire, shots that slip past an evasive ship), so a guns build, a
tank and an evasive pulse build each win about half the bot's runs
([balance.md](balance.md#the-arcades-power-budget)).

### Between worlds, lives and saves

A cleared world pays a fixed bonus, the weapon grows a tier, a cleared
screen shows the world's numbers, and the depot opens before the next
world. A run has three lives, shown at the top of the HUD: a death costs
one and retries its world from the first wave, as you began it, the depot
opening first so you can try another kit; the last ends the run, its score
against your best. A save keeps the score, salvage, gear and lives, and
loading it starts its world again from the first wave.

### Free and Scroll

The arcade comes in two kinds, picked on its menu row (T turns it); each
keeps its own best.

**Free** is the run above, the world open around you.

**Scroll** is the same run on a screen that moves on by itself, up, down,
left or right by the world, along a lane 16 to 19 km long (about 5 minutes
with its flagship), the world stretched along it with its rocks and caches.
Your ship flies anywhere in the view and the back edge pushes it on; the
raiders come from ahead, and one the back edge leaves behind is gone, as is
salvage it passes. No portals, and the depot opens between worlds only.
What a lane holds:

- one speed from a world's start to its end; there its cleared screen plays
  and the depot opens before the next world, with a card and the next world
  between them, as in Free;
- two raiders of its own: the chaser, which turns to you and fires once
  close, and the passer, which flies a straight line through the view, a
  sweep across it or a V down it, and fires only while you are inside its
  ring;
- the raiders with jobs in the chasers' lines, one more kind each world
  from Haven to Obsidian; the squadrons that are not passers come as the
  world's own mix has them: chasers, tanks leading a wall or a convoy,
  splitters, lancers lying in wait by the rocks ahead;
- the raiders built against the kit you bring, their hull following your
  guns' damage and their hits your hull, shield and armour, and firing
  faster world by world;
- squadrons that keep coming to the lane's end, elites leading every other
  one; each world's own gun (scatter, missiles, ion bolts or rail guns),
  and missiles among the passers;
- the world's flagship where the lane ends, the screen standing still, the
  world over once it is down: each world's flagship duel but Haven's chase,
  the flagship coming into view from ahead, the lane's raiders staying, its
  escorts guarding it;
- each world's trick along its lane: cliffs, pylons, spires, storms,
  Eclipse's black hole beside it;
- a wave-2 event with the lane's second half, placed for a lane, in the
  run's last world.

## Races

Ring races alone, at Easy, Normal or Hard, course after course from Haven
through the eight worlds; the start ship, no raiders, the rocks as solid as
ever. Two kinds: Steer, flown by hand, and Turbo, where the ship rides a
track by itself and you only press and let go of the turbo (too fast in a
bend, it spins off). After each: your place and time, then race again, the
next course or the menu. Nothing is saved; the play log records each race
([goals.md](goals.md#the-races-mode)).

## Campaign

The stations, contracts, trading and story chapters
([scenario/](scenario/README.md)). Ranks license ships and guns, and a rank
is experience: the hull of every raider you destroy (a Haven chaser 58, an
Eclipse tank 550, a flagship 10 500) and a contract's pay, so a ship is
earned in fights; the HANGAR and ARSENAL say what each needs and what you
have. Each world reached opens more ships, guns and module levels, as in
the arcade ([balance.md](balance.md), What each world opens).
