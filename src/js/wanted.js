// The wanted lists (docs/scenario/README.md, Ways to play: the hunter): each world's raiders have three named aces with
// a price on them, one after another. From rank Pathfinder a world's station offers the bounty on the first still
// free; destroyed, the ace is struck off and the next takes its place. The Hunters' seat shows every list on the
// worlds map (careers.js).
const wanted_lists = [
    ['Red Kestrel', 'Iron Mags', 'Captain Sable'],
    ['the Bramble Queen', 'Needle', 'Old Rootrot'],
    ['Sirocco', 'Grit Halloran', 'the Dust Widow'],
    ['Arc Lyra', 'Overload', 'Static Marrow'],
    ['Prefect Varn', 'the Anvil', 'Colonel Ash'],
    ['Rime', 'Sentinel Hale', 'the White Hush'],
    ['Cinder Rook', 'Brand', 'Legate Pyre'],
    ['the Pale Marshal', 'Nadir', 'Umbra Six'],
];
// An ace's hull against a plain commander's
const wanted_ace_hull = 1.3;

// A save's lists: how many aces of each world are struck off (0 to 3)
function wanted_sanitize(list)
{
    return worlds.map((v, i) => clamp(Math.round(Number(list?.[i]) || 0), 0, wanted_lists[i].length));
}

// World id's ace still free at the top of its list, or null once all three are struck off
function wanted_ace(id)
{
    return wanted_lists[id][campaign.wanted?.[id] || 0] || null;
}

// The bounty this station offers on its world's ace: find its trail, then bring it down
function wanted_offer(id, level)
{
    const ace = wanted_ace(id);
    if (!ace) {
        return null;
    }
    const n = level - 1;
    const name = ace.replace(/^the /, 'The ');
    return {
        title: `Wanted: ${name}`,
        description: `${name} flies for the ${worlds[id].faction}, and ${worlds[id].station} has put a price on them: ${wanted_lists[id].length - (campaign.wanted?.[id] || 0)} left on its wanted list.`,
        premium: 1.6,
        bounty: true,
        wanted: id,
        stages: [
            stage('scan', id, 14 + n, `Pick up ${ace}'s trail`, {beacon: 2}),
            stage('elite', id, 1, `Bring down ${ace}`, {ace}),
        ],
    };
}

// A wanted bounty collected: the ace is struck off its list, and the next one takes its place
function wanted_done(m)
{
    if (!Number.isInteger(m.wanted)) {
        return;
    }
    campaign.wanted = wanted_sanitize(campaign.wanted);
    campaign.wanted[m.wanted] = Math.min(wanted_lists[m.wanted].length, campaign.wanted[m.wanted] + 1);
    const next = wanted_ace(m.wanted);
    show_toast('STRUCK FROM THE WANTED LIST', next ? `NEXT ON ${worlds[m.wanted].name.toUpperCase()}'S LIST: ${next.toUpperCase()}` : `${worlds[m.wanted].name.toUpperCase()}'S LIST IS CLEAR`, 5, 'info');
}

// A named ace spawned for an elite stage: tougher than a plain commander, and its name on its plate (target_plate_name)
function wanted_ace_make(enemy, ace)
{
    enemy.ace = ace;
    enemy.hp = enemy.max_hp = enemy.max_hp*wanted_ace_hull;
}
