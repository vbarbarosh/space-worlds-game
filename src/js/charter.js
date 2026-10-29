// The Expedition Charter's signatures (docs/scenario/README.md, The goal): a world signs once it trusts you, and the
// signature stays whatever comes after. Act II goes back through the eight worlds to win them: its chapter in a world
// opens once you are Established there, and collecting it makes the world sign and trust you; a world that comes to
// trust you sooner signs then. The last chapter, Eclipse's, founds the guild.
const charter_act_two = 8;

// A save's signatures: the worlds it lists, the worlds Trusted now, and the worlds whose act II chapter is behind it
// (a save from before the signatures)
function charter_sanitize(list)
{
    const signed = new Set((Array.isArray(list) ? list : []).filter(v => Number.isInteger(v) && worlds[v]));
    for (let i = 0; i < worlds.length; ++i) {
        if ((campaign.reputation?.[i] >= reputation_tiers.at(-1).min) || story.slice(charter_act_two, campaign.story || 0).some(v => v.world === i)) {
            signed.add(i);
        }
    }
    return [...signed].sort((a, b) => a - b);
}

function charter_signed(id)
{
    return (campaign.signed || []).includes(id);
}

// A world signs: once, told with the count
function charter_sign(id)
{
    if (charter_signed(id)) {
        return;
    }
    campaign.signed = [...(campaign.signed || []), id].sort((a, b) => a - b);
    play_log_event('signature', {world: id, count: campaign.signed.length});
    show_toast(`${worlds[id].name.toUpperCase()} SIGNS THE CHARTER`, `${campaign.signed.length} OF ${worlds.length} SIGNATURES`, 5, 'info');
}

// What a story chapter still waits for before it can be taken: an act II chapter, Established in its world
// ({text, have, need}), or null when it is open
function charter_chapter_lock(index)
{
    const m = story[index];
    if (!m || (index < charter_act_two)) {
        return null;
    }
    const need = reputation_tiers.find(v => v.id === 'established').min;
    const have = reputation_of(m.world);
    return (have >= need) ? null : {text: `Needs Established in ${worlds[m.world].name}`, have, need};
}

// A chapter collected: its world's reputation, +2 in act I; in act II the world signs and trusts you from now on
function charter_chapter_done(index)
{
    const m = story[index];
    if (!m) {
        return;
    }
    if (index < charter_act_two) {
        reputation_change(m.world, 2, 'chapter');
        return;
    }
    reputation_change(m.world, Math.max(2, reputation_tiers.at(-1).min - reputation_of(m.world)), 'chapter');
    charter_sign(m.world);
}

// The GOALS tab's Charter: a seal per world, filled in its colour once it has signed
function charter_html()
{
    const seals = worlds.map((v, i) => `<i class="seal${charter_signed(i) ? ' is-signed' : ''}" style="--world:var(--w-${world_slug(i)})" title="${v.name}${charter_signed(i) ? ' has signed' : ': not yet'}"></i>`).join('');
    return `<span class="eyebrow eyebrow--muted">The Charter · ${(campaign.signed || []).length} of ${worlds.length} signed</span><div class="charter-seals">${seals}</div>`;
}
