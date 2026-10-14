# World Explorer: world identity and arcade gameplay review

Reviewed 15 October 2026 at source commit
`0a786dc44eb1127da8d137c1e26c4c30799ee16f`.

**Recommendation: build each world around a different decision, and make its
encounters require that decision.** The game already contains substantial
mechanical variety, especially its bosses. The problem is that much of this
variety is optional, distant from the fight, expressed as numerical penalties,
or wrapped in the same objective. More artwork, enemies, or damage alone will
not address that problem.

Start with three contrasting prototypes: **Dustfall's destructible routes,
Ion Reach's storm harvesting, and Cryosphere's momentum rescue**. Prove that
players change how they fly before expanding the design to all eight worlds.
All new mechanics below are proposals, not implemented features.

## Scope and evidence

This is a gameplay design review, not a full code, performance, or security
audit. It covers all eight world definitions, environmental behavior, map
generation, arcade encounters/events/progression, bosses, targeting, and the
campaign's mission structure. Races are outside the main scope, but shared
physics must preserve their existing behavior.

Work performed:

- Read the README, design principles, relevant rulebook instructions, balance
  and object documentation, scenario plans, and the source files linked below.
- Ran `bin/build` successfully before inspection and after adding this note.
- Ran the existing Chromium bot on the current production build:
  `bin/playtest --mode=normal --seeds=1,2 --label=world-review-2026-10-15 --minutes=3`,
  then the same command with `--mode=chill --seeds=1` and
  `--mode=overload --seeds=1`. The first launch required installing the missing
  Playwright Chromium browser; the subsequent four trials completed.
- Inspected runtime map inventories for all eight arcade worlds and rendered
  and viewed their opening combat scenes at 1440 × 900. Each scene starts with
  the Scout and advances two seconds through direct simulation calls. These
  isolated scenes are not representative late-run loadouts or UI timing tests.
- Probed Ion Reach's local storm charging, the arcade shield-removal event,
  and radiation recovery near the depot. The inspection recorded no page errors.

The bot circles the nearest enemy, dodges, collects loot, uses supplies, and
buys upgrades using a fixed policy. Its rendering is suppressed. It does not
measure enjoyment, understand the intended world fantasy, or represent a
human beginner. Four trials cannot establish win rates or weapon balance.
The campaign was reviewed through source and documentation, not played to
completion. No human usability study, exhaustive boss/loadout comparison,
mobile test, layout check, map check, or performance benchmark was run for
this documentation-only change.

Local supporting artifacts are in `data/playtest/world-review-2026-10-15/`
and `data/world-review-2026-10-15/`: four run JSON files, `inspection.json`,
eight `arcade-<0..7>-wave1.png` screenshots, and a copy of the inspection
script, `inspect.cjs`. The script ran initially from
`/tmp/world-review-probe.cjs`; its saved copy can be run with
`node data/world-review-2026-10-15/inspect.cjs`. These are ignored generated
files. The important evidence is reproduced here so the note stands alone.

## What the current game actually does

### The worlds are mechanically different, but the player can often ignore the difference

The following are existing systems, not features to add again. Sources:
[world definitions](../src/js/worlds/),
[environment generation](../src/js/environment.js),
[flight/environment updates](../src/js/flight.js), and
[boss designs](../src/js/bosses.js).

| World | Existing mechanical identity | Why it can still feel familiar |
|---|---|---|
| Haven | Responsive handling, faster shield recharge, passive pulse charge; Crescent strafes and gapped rings | A suitable baseline, but its enemy-clearing objective becomes the template everywhere |
| Verdant | Currents move ships, pickups and ore; passive repair; drifting spores and brood boss | Currents alter movement without a regular objective that rewards using them |
| Dustfall | Inertia, weaker gravity, ore cover damaged by hostile fire, extra mined cargo; charging Sawtooth | Mining yield matters to campaign; ordinary arcade waves still ask for kills |
| Ion Reach | Faster shots, fast shield recharge, timed local storms exchange shield for pulse; sweeping spokes and boss pods | Storms need not be visited; a separate global event can erase shields altogether |
| Obsidian | Slower flight, planetary pull, stronger gravity, armor and railgun pressure; locked sights and lanes | Much of the identity is increased resistance and punishment rather than a new objective |
| Cryosphere | Long drift, faster cannon, slow shield recovery; rotating boss plates and frost nova | Outside the boss, its signature often reads as another version of Dustfall's slippery flight |
| Nova Forge | Automatic weapon heat/lockout, turbo heat, flare zones; flame, slag and Furnace core exposure | Heat can interrupt the same shooting loop without offering a sufficiently explicit tactical choice |
| Eclipse | Pulse drain, energy cost for turbo, shorter magnet reach, strong gravity; blinking Eye and singularity | Several penalties stack; ordinary encounters do not give the player a distinctive new opportunity |

Keep these foundations. In particular, bosses already have different movement,
attack cycles, telegraphs, phase changes and exposure windows. “Add unique
bosses” would miss work that is already present.

### Arcade repeats the same objective 24 times

In [arcade.js](../src/js/arcade.js), `arcade_waves` is 3, the wave names are
SCOUTS, ASSAULT and FLAGSHIP, and `arcade_update` waits for both the spawn
budget and all living enemies to run out. Every world follows that structure.
On Normal, `arcade_wave_size` gives Haven 13/17/21 scheduled raiders and Eclipse
27/31/35, before flagships, escorts, events and splitting enemies.

More significantly, `arcade_squad_spawn` chooses wave-one enemies using the
same 70% chaser / 30% shooter draw in every world. Their weapons and stats
still differ, but the full faction mix and elites do not establish the world's
identity immediately. Squadron formations are shared; many spawns are positioned
640 m from the player, wherever the player happens to be.

**Consequence:** the reliable instruction is “circle enemies until the counter
is empty.” The stage rarely gives a reason to go somewhere, manipulate
something, choose a route, or stop killing and leave. A surviving distant
enemy can also delay the end after the interesting part is over.

**Change:** replace the first two generic waves with authored encounter goals;
retain the existing flagship as the climax. Introduce the local mechanic in
the opening encounter, combine it with a threat in the second, and let the boss
test it. Reuse this teaching rhythm while varying the actual actions and
completion conditions.

### Map generation can remove the promised terrain

The runtime inventory found the following in every arcade world:

- A 7,200 × 5,600 m arena, a central depot, 12 mining fields, six local portal
  endpoints, and 132 cache pickups representing 22 cache clusters.
- **Zero map black holes, including in Eclipse.** Boss-created wells are
  separate and still exist.
- Different rock placement/counts, but the same broad collection of objects.

Sources: [map.js](../src/js/map.js), `base_generate_map`;
[campaign.js](../src/js/campaign.js), `visual_base_generate_map`;
[gravity.js](../src/js/gravity.js), `place_gravity_wells` at line 59.
The shared placement path protects the station, gates, beacons and combat
zone. A hole that cannot satisfy the clearances is omitted. This is especially
restrictive inside the compact arcade arena, including protection for campaign
objects which arcade does not use as objectives.

Ion Reach generated four storms. Their centers were approximately 1.52–2.64 km
from the initial player position, with radii of 330–370 m. Nova Forge generated
three flare zones at similar distances. A player fighting nearby squadrons is
not required to enter either. “Strong tides” and “storm charging” can therefore
be absent from much of the ordinary action.

**Change:** author the tactical arrangement first: rock corridors in Dustfall,
storm routes in Ion Reach, firing lanes in Obsidian, and a safe route around
an actual gravity feature in Eclipse. A common outer arena size is fine if
the usable space plays differently. Preserve the campaign's seeded geography;
do not randomize its map on revisits or simply remove safety clearances.
Give arcade its own relevant placement requirements and assert that each
signature feature exists, is reachable, and leaves a viable escape route.

### Events repeat, and some remove agency

[arcade_events.js](../src/js/arcade_events.js) defines five events for eight
worlds, with one randomly selected during wave two. Verdant and Dustfall share
the same two choices in reverse order; Nova Forge and Eclipse have identical
pools. The convoy is an unarmed enemy freighter to destroy for loot, not a
friendly escort objective.

The `ion_storm` event sets `player.shield = 0` every update throughout the wave.
It can occur in Ion Reach, Obsidian and Cryosphere. `dust_blind` removes the
minimap for the wave. These events change difficulty, but provide little
specific counterplay. Global shield removal also undercuts Ion Reach's more
interesting local shield-for-energy exchange.

A direct probe confirmed the difference: one second inside a local discharge
changed pulse from 20 to 34 and shield from 60 to 48; the global event immediately
changed shield from 60 to zero regardless of position.

**Change:** localize the threat and give it an answer. A storm front can be
crossed during a lull or harvested at a cost; a jammer can conceal enemy
contacts until destroyed while preserving terrain and objective markers.
Give every world a guaranteed signature encounter. Random extras should vary
that encounter, not decide whether its identity appears at all.

### The current balance is more varied than the older report suggests

These are current bot observations, not population statistics:

| Trial | Outcome | Game time for completed run | Salvage left | Bot's shop-exhaustion condition |
|---|---|---:|---:|---|
| Normal, seed 1 | Won, no deaths | 720 s | 1,353 | Never reached |
| Normal, seed 2 | Won, no deaths | 509 s | 3,469 | Nova Forge, 7.7 min |
| Chill, seed 1 | Won, no deaths | 583 s | 7,164 | Nova Forge, 8.6 min |
| Overload, seed 1 | Stopped after three deaths in Haven | Not a completed run | 243 | Never reached |

The shop condition means owning the Cruiser and capping applicable modules;
it does not mean owning every ship and weapon. Death retries reset the run
clock to a snapshot, so the Overload headline clock is not total attempt time.

Both Normal victories kept plasma weapons throughout, adding mounts and
upgrades. That demonstrates a viable general strategy; it does **not** prove
plasma is strongest or that other weapons are useless. The same bot's Normal
seed-one Obsidian fight cost 976 combined hull/shield damage, versus 333 in
seed two. Repairs and regeneration mean cumulative damage is not starting hull.
Chill's run lost no hull after Haven, although shields continued taking damage.

The [5 October playtest](../docs/playtest-2026-10-05.md) is useful historical
context, but its “middle worlds are harmless / shop empties early” conclusions
must not be copied as current facts. World-based unlocks now exist in
[tech.js](../src/js/tech.js), and the current bosses have substantial variety.

**Change:** test specialization and encounter design before globally raising
enemy HP or prices. Give a general build a viable, slower or less rewarding
solution, and a specialist a different attractive solution. Difficulty should
change pressure and forgiveness while keeping the world's interesting mechanic
available on Chill too. Investigate Overload's opening separately with more
seeds and players; one failed bot run does not justify a blanket nerf.

### Campaign mission text promises more specificity than its objectives enforce

The campaign already has multi-stage stories, world-specific contracts,
resources, trade, mining, escorts, interception and the Leviathan lure. It is
not just arcade with different labels.

However, [operations.js](../src/js/operations.js) uses a common implementation
for many evocatively named stages. `operation_point` at line 233 selects a
beacon or combat zone. `update_operations` at line 302 advances a defend timer
near the point and a recover timer after enemies are cleared. “Hold beacon
beta through the storm” does not itself require a storm phase or harvested
charge. Many enemy waves alternate chasers and shooters.

**Change:** make at least one main and one repeatable mission per world depend
on its actual mechanic. Storm cartography should sample a discharge; a refinery
mission should involve a route through breakable terrain. Avoid adding more
mission names backed by the same timer.

### Automatic combat limits some otherwise attractive ideas

[update.js](../src/js/update.js), around lines 235–269, selects the nearest
enemy, considers approaching debris and arcade ore, then calls `guns_fire`.
Pointer aiming can influence orientation, but there is no general explicit
target-priority or hold-fire command in this loop. In
[flight.js](../src/js/flight.js), `fire` automatically accumulates Nova Forge
heat and stops firing when overheated; turbo also stops the guns.

**Consequence:** “preserve this cover,” “shoot the support ship first,” and
“save a burst for the opening” must be achievable through the controls.
Otherwise they are instructions the automatic system can undermine.

**Change:** keep automatic firing as the accessible default. First make
position and line of sight meaningful. Prototype an optional focus-target
button and hold-fire button only where needed, both with visible keys and
touch equivalents. Focus must release sensibly when the target dies or leaves
range. A heat design should also work through cooling positions and routing,
without demanding a new aiming skill from every player.

## A distinct identity for every world

The following proposals extend existing mechanics. Each world should have a
recognizable action, an opportunity as well as a hazard, and at least two
reasonable approaches. Numerical targets require playtesting.

### Haven: intercept and protect

**Player's decision:** intercept the threatening wing or chase the valuable
raider escaping in the other direction.

Make Haven a busy harbor with short, readable traffic lanes and an optional
rescue tender. Raiders announce which lane they will attack. A new player can
stay with the tender; an experienced player can cut off the attackers and
collect a bonus. This gives responsive handling a purpose and makes the world
feel inhabited. Keep the opening generous and avoid a fragile mandatory escort
before the player learns movement.

For campaign, a successful rescue restores a specific local service or offers
a named follow-up job. In arcade, save the tender for a capped repair reward;
losing it costs that reward, not the run. The existing Crescent then tests
reading a line and moving into a gap. Reuse escort and intercept systems, with
a short route rather than the campaign's full loading/unloading journey.

### Verdant: ride the current and contain the swarm

**Player's decision:** ride a current to get ahead of drifting spores, or brake
and clear a safe route through them.

Concentrate existing currents into clearly marked streams with calmer pockets.
Introduce a small number of visible brood pods carried by those streams. They
announce hatching; reaching or destroying them early prevents a bounded brood.
Let currents deliver salvage toward the player as well as carry threats.

Campaign's resin harvest can require intercepting drifting resource packets
before they reach a nest. Arcade's objective is to stop a finite brood convoy
from crossing a marked boundary, rather than clear another fixed kill count.
The Thorn Beetle already combines currents, spores and brood: use the opening
encounters to teach those relationships. Avoid endless spawning or a passive
healing pocket that becomes the best place to wait forever.

### Dustfall: reshape the battlefield

**Player's decision:** preserve a rock wall against missiles, or break it to
open a shorter route and release salvage.

Arrange ore into a few deliberate corridors and pockets. Give breakable
sections obvious damage states. Marauder launchers occupy a route behind that
cover; the player can flank through a longer gap or break a passage. Missile
impacts gradually change the route for both sides.

Campaign's refinery run can choose a fast exposed passage or a sheltered route
for a valuable load. Arcade can require disabling two launcher positions and
reaching the exit, leaving surviving escorts behind. The Sawtooth's existing
charges then threaten the cover the player has learned to use.

This needs control over automatic ore fire. It also needs an explicit campaign
decision: shot-destructible ore currently differs between modes, as recorded
in [principles.md](../docs/principles.md). Preserve mining reserves or specify
what destruction yields before extending arcade rock damage into campaign.

### Ion Reach: harvest and discharge

**Player's decision:** spend shields to charge quickly in a storm, or take
longer to charge safely while fending off enemies.

Place one active objective beside a storm so the exchange is visible immediately.
Show its calm, warning and discharge stages in the world. Let a charged pulse
power a relay or disrupt a linked enemy formation. Provide a slower safe charge
source so an empty shield or weak loadout does not create a dead end.

Campaign's cartography samples the storm at the right phase and changes which
local relay routes work. Arcade has the player gather and discharge energy at
two nodes in a chosen order; node completion ends the encounter without hunting
every straggler. The Storm Wheel already offers spokes and shield pods; a
stored charge can create an extra exposure opportunity, while ordinary damage
remains viable. Replace the global shield-zero event with this local bargain.

### Obsidian: breach a defended position

**Player's decision:** take the quick exposed firing lane, or flank a slower
route to destroy the formation's support.

Make this the deliberate siege world. Place armored formations around a small
number of visible shield or command emitters. Their connections explain what
they protect. Rail sights lock before firing, giving a clear moment to move
between cover. Heavy handling makes route commitment matter.

Campaign's blockade should actually obstruct a lane until its supporting
positions are broken; reopening that lane persists on the fixed map. Arcade
ends the breach when its command objective falls, not when all escorts die.
The Iron Stair already teaches locked sights and broadside lanes; retain it.
Allow attacking armor directly at greater cost, so lacking a railgun never
invalidates a run. If emitters are solid and destructible, give them consistent
collision and visible health for both player and enemy interactions.

### Cryosphere: commit to a trajectory

**Player's decision:** take a fast drifting intercept or brake early for a
safer rendezvous.

Differentiate ice from Dustfall through precision movement, not just a larger
inertia modifier. Arrange wide curved lanes and moving rescue capsules. Pick
up a capsule by matching its motion briefly, then carry it to a broad recovery
zone; avoid stationary “hold for 60 seconds” capture. Use visible stopping
distance guidance during the introduction. A safer, longer lane remains open.

Campaign's lost-pilgrim mission becomes a rescue using these rendezvous, with
a permanent recovered crew or service. Arcade asks for a finite number of
rescues while Sentinels approach along predictable intercept paths. Lost
capsules reduce a bonus or trigger a bounded replacement opportunity rather
than softlock the stage. The Frost Crystal's moving plate gaps and nova already
provide a suitable final test of planned movement. Stabilizers should help,
without completely erasing the world's identity.

### Nova Forge: choose when to commit heat

**Player's decision:** fight near the limit for a short advantage or rotate
through cooling lanes before the next dangerous attack.

Add explicit cooling locations and readable flare shadows to the existing heat
system. Test a modest benefit for operating hot, with a clear approach to
overheat, so heat is something to manage rather than only a firing interruption.
Ensure automatic fire can be controlled through positioning; test the optional
hold-fire control described above before depending on deliberate bursts.

Campaign can involve extracting a reactor during a flare cycle with alternate
safe cooling stops. Arcade asks the player to disable vent regulators in an
order that opens or closes cooling routes. The existing Furnace then pressures
those routes with slag and flame. It should remain possible to win cautiously
without a cooling upgrade. Avoid filling every safe area at once or turning
cooling into an idle wait outside combat.

### Eclipse: navigate gravity and make the final commitment

**Player's decision:** save pulse for escape propulsion, or spend it to exploit
an opening while taking a longer safe route afterward.

Give the arena a real, intentionally placed gravity feature with an unmistakable
fatal core and a broad navigable rim. Put useful portal routes on opposite
sides. Skilled pilots can use the pull for an intercept; cautious pilots can
take the marked outer route. Black-hole cores remain fatal under the existing
principle; bounded boss wells must remain visibly distinct from them.

Campaign's archive return becomes a route decision with limited energy and
clearly announced pursuit. In arcade, cross to shut down two anchor objectives,
then fight the Eye in the space those actions reveal. Use at most two familiar
mechanics together in the finale, rather than all seven earlier hazards at once.
The existing Eye's beam, blink and singularity are a strong foundation. At zero
energy there must still be a traversable route; terrain must never require turbo
to escape after draining the resource that powers it.

## Rebuild arcade's rhythm

Keep the eight-world tour initially. Replacing its encounters is a smaller and
more testable change than simultaneously adding route branching, an endless
mode, permanent progression, and a new economy.

| World | Opening encounter | Second encounter | Existing climax to retain |
|---|---|---|---|
| Haven | Intercept a clearly marked raider lane | Choose to protect a tender or chase bonus salvage | Crescent: read the strafe, find the ring gap |
| Verdant | Ride a stream to catch one brood pod | Stop a finite drifting brood convoy | Thorn Beetle: spores and hatching |
| Dustfall | Break or go around one rock barrier | Breach two missile positions and reach the exit | Sawtooth: coasting charges |
| Ion Reach | Learn the shield-to-pulse exchange | Charge two nodes by safe or risky routes | Storm Wheel: spokes and pods |
| Obsidian | Cross a telegraphed firing lane | Flank or overpower a supported command position | Iron Stair: locks and broadsides |
| Cryosphere | Match motion with a rescue capsule | Recover capsules along two possible trajectories | Frost Crystal: plate gaps and nova |
| Nova Forge | Move between heat and cooling positions | Disable regulators to reshape cooling routes | Furnace: flame, slag and exposed core |
| Eclipse | Navigate the outer edge of a gravity feature | Choose a portal route and disable anchors | Eclipse Eye: pursuit beam and singularity |

Completion should follow the stated objective. Retreating escorts should not
hold a stage open after a breach succeeds. Any required object that escapes,
breaks, or becomes unreachable needs an explicit recovery/failure path. Optional
rescues and loot opportunities should expire visibly and never block progress.

Use the existing two-line mission card to show an action and its consequence:
“Charge the relay · Storm costs shields” or “Rescue 2 capsules · Match their
speed.” Demonstrate one mechanic with a forgiving first encounter. Preserve
the clear center of the HUD and avoid a new modal tutorial before every world.

Keep a brief safe interval and the existing depot transition. Target roughly
the current successful-run range of 8–12 minutes for an initial prototype,
including a separate measurement of shopping time; do not automatically add
minutes by making every new objective an escort or timed hold. Treat that
range as a pacing hypothesis, not a requirement validated by these bot runs.

For replayability, introduce a few authored variants per world's encounter:
different attack direction, which lane is open, or whether a bonus target
appears. The signature mechanic stays guaranteed. Do not shuffle the campaign's
geography. If seeded arcade runs are added, seed gameplay choices separately
from effects; the existing partial RNG separation is not enough to promise
identical replays yet.

### Make rewards support the new actions

The existing kill combo expires after four seconds
([combat.js](../src/js/combat.js), lines 345–349). A rescue or charging objective
can therefore be strategically correct but feel like losing score.

- Give finite objective completion bonuses and a separate optional mastery
  bonus: capsules saved, storm charge used, or a breach without losing cover.
  Pause or preserve the kill combo during required noncombat transitions.
- Cap objective rewards and reinforcement budgets. Repeatedly farming spawned
  broods or leaving a relay unfinished must not beat completing the encounter.
- Keep guaranteed completion income sufficient for basic repair and a viable
  next-world build. Make risky extras buy specialization, not mandatory survival.
- Use the existing depot's next-world information to describe the upcoming
  tactical choice. Prototype one mutually exclusive temporary fitting choice,
  such as extra storm capacity versus stronger shielding, before adding a whole
  new loot system. Keep mandatory counters available without random drops.
- Reward skill and alternate play styles on Chill; do not make uniqueness a
  punishment reserved for higher difficulties. Avoid permanent stat grinding
  as the first answer to replayability.

Arcade saves currently keep score, salvage and gear but restart the current
world at wave one (`arcade_snapshot` in [arcade.js](../src/js/arcade.js)). New
one-time objective rewards need a deliberate save policy. Prefer a complete
world-start checkpoint for an arcade retry, or save exact objective progress
and already-paid reward IDs. Otherwise repeated retries can repay completed
objectives. This is a design consequence of the current snapshot model, not
a reproduced reward-farming exploit in this review.

## Campaign: give returning worlds a reason to matter

Apply the same identity over longer journeys, with persistent consequences:
Haven's rescued traffic, Verdant's contained nest, Dustfall's opened route,
Ion Reach's working relay, Obsidian's broken blockade, Cryosphere's rescued
pilgrims, Nova Forge's stabilized cooling infrastructure, and Eclipse's archive
route. Make one such change visible in the world and map after its mission.

Existing maps preserve mined ore and collected caches; extend persistence with
small explicit world-state flags rather than replacing the map generator. Show
what changed and what new service or route it enables. Keep effects local and
bounded so a missed optional rescue does not permanently cripple a campaign.

The existing trade intel, world resources, and story are worth keeping. Tie a
few supply contracts to these visible changes rather than introducing an
unexplained economic simulation. Longer journeys should contain a route choice
or encounter; simply increasing map dimensions adds travel, not necessarily
exploration. More lore can explain a decision, but cannot substitute for it.

## Recommended order of work

| Priority | Work | Why this order | Relative effort |
|---|---|---|---|
| 1 | Add encounter objectives/completion rules and a way to inspect them in dev mode; preserve legacy saves | New world content needs an alternative to the universal kill-all gate | Medium |
| 1 | Prototype Dustfall, Ion Reach and Cryosphere with one encounter each | Tests terrain manipulation, resource timing and movement skill as distinct kinds of play | Medium to large |
| 1 | Put signature terrain on the objective route; verify reachability and input agency | A mechanic cannot distinguish a world if it is absent, avoidable without cost, or uncontrollable | Medium |
| 2 | Carry the successful prototypes through their second encounter and existing boss | Establishes a coherent world without rewriting eight bosses | Medium |
| 2 | Author the other five worlds; replace global denial events | Delivers variety across the full run using the proven structure | Large in aggregate |
| 2 | Rebalance objective income, repair access, combos and opening difficulty | Measurements now reflect the new actions rather than obsolete kill waves | Medium |
| 3 | Bind campaign contracts to these mechanics and persist visible outcomes | Makes exploration and return visits meaningful | Medium to large |
| 3 | Add encounter variants and optional run fittings | Improves replayability after the base encounters are fun | Medium |

These are relative scope estimates, not delivery dates. Avoid starting with a
global HP increase, more decorative assets, eight new resource meters, or a
large faction/reputation expansion. None directly tests the repetition problem.

Implementation can stay within the plain-script architecture. Add encounter
data alongside each world's existing definition, a shared lifecycle for start,
update, completion, failure and cleanup, and explicit mode-specific rewards.
Keep shared physical behavior consistent while leaving arcade pacing separate
from campaign contracts. Include any new scripts in `src/index.html` in the
required order. Existing boss attack components, escort logic, currents, zones,
ore damage and portal routing provide useful building blocks; they do not make
new objectives free of collision, persistence and control work.

## How to judge whether this is better

Before calling any prototype successful, test the actual player decision.
These are proposed acceptance checks, not checks already performed here.

1. **Recognizable behavior:** after a world, ask players what they did
   differently and why. Test short clips with world names/colors obscured.
   If the answer is only “enemies were stronger,” revise the encounter.
2. **Different successful strategies:** compare a generic circling bot with
   a bot that understands the objective, then observe beginners and experienced
   players. Track objective success, completion time and hull/supply cost.
   Specialist behavior should have a visible benefit; general builds should
   retain a viable fallback.
3. **Encounter engagement:** record whether players enter the signature area,
   exploit its opportunity, and respond to its warning. Also record time spent
   chasing the last irrelevant enemy, waiting without a decision, shopping,
   cooling, or traveling with no interaction.
4. **Fair failure:** exercise zero shields, zero pulse, no supplies, low hull,
   minimum viable gear, fast/slow ships, high damage, and an objective completed
   before all enemies spawn. Test every required target being destroyed,
   escaping or blocked; ensure the encounter recovers or ends clearly.
5. **Legibility and controls:** render long objective text, multiple urgent
   warnings, maximum counts, paused/resumed encounters, and narrow/touch screens.
   Look at the screenshots and keep crowded cases in the layout tests. Each
   new action needs a button with its key; warnings must not rely only on color.
6. **Consistent physics:** verify player/enemy shots and hulls obey the same
   cover rules, every destructible object shows health, effect fronts hit when
   they arrive, and moving objects never block the only exit. Recheck R-action
   spacing, portal exits, depot access and fixed campaign maps.
7. **Safe retries and bounded rewards:** save/load at each stage transition,
   restart after death, leave/re-enter a campaign world, and finish with an
   escaped optional target. Try farming a spawner, hiding by the depot, and
   repeatedly claiming a rescue. Confirm rewards cannot repeat unintentionally
   and entity counts remain bounded.
8. **Regression checks:** run `bin/build` after changes, `bin/layout-check`
   for HUD/screens, `bin/map-check` for maps and `bin/perf` for drawing/loop
   changes, plus `bin/lint` and targeted encounter tests. Recheck Races when
   shared movement or hazards change. Test all three arcade difficulties;
   preserve telegraph clarity when increasing pressure.

One specific camping interaction deserves attention: the runtime probe in
Ion Reach showed zero radiation rate and dose recovery from 50 to 44 after
one second at the depot. `radiation_rate` uses the station radius even in
arcade, while the depot dome excludes ships only from its smaller inner radius.
This is environmental protection, not immunity to combat. Do not design a new
objective around an assumption that all terrain costs apply uniformly near the
depot, and preserve the campaign's intentional station shelter.

The desired result is a player who remembers **a rescue, a drifting swarm, a
breach, a storm harvest, a siege, an intercept on ice, a heat gamble and a
gravity escape**—and can explain the choices that made each one different.
