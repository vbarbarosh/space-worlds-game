// The career lines (docs/scenario/README.md, Ways to play): five short chains of three chapters, one per way of
// playing, each opening at a rank and ending with a seat in the guild, a title with a lasting perk. A line's next
// chapter is offered at the station of its world (src/missions/career-<line>-<n>-<name>.md); the GOALS tab shows
// where each line stands.
const career_lines = [
    {id: 'trader', name: 'Trader', seat: 'The Merchants\' seat', rank: 1, perk: 'market prices 5% better wherever you are Established or higher'},
    {id: 'escort', name: 'Escort', seat: 'The Convoy Masters\' seat', rank: 2, perk: 'the freighters you escort have half again the hull; escorts and convoys pay 20% more'},
    {id: 'hunter', name: 'Hunter', seat: 'The Hunters\' seat', rank: 2, perk: 'bounties pay 25% more; every world\'s wanted list shows on the worlds map'},
    {id: 'warden', name: 'Warden of the lanes', seat: 'The Guards\' seat', rank: 3, perk: 'the guards of every world where you are Established or higher join your fights'},
    {id: 'surveyor', name: 'Surveyor', seat: 'The Cartographers\' seat', rank: 4, perk: 'contracts that open with a scan pay 25% more'},
];
// What a chapter does besides its stages when it is collected: the market war's other bidder remembers
const career_chapter_effects = {
    'career-trader-2-the-market-war.md': () => reputation_change(2, -2, 'market war', -4),
};

// A save's career lines: how many chapters of each are done (0 to 3)
function careers_sanitize(list)
{
    return Object.fromEntries(career_lines.map(v => [v.id, clamp(Math.round(Number(list?.[v.id]) || 0), 0, 3)]));
}

function career_seat(id)
{
    return (campaign.careers?.[id] || 0) >= 3;
}

// A line's next chapter, or null once its seat is yours
function career_next(line)
{
    return career_chapters.find(v => (v.career === line.id) && (v.step === (campaign.careers?.[line.id] || 0) + 1)) || null;
}

// The career chapters this station offers: each open line's next one whose world this is, once your rank opens it
function career_offers()
{
    const rank = pilot_rank();
    const out = [];
    for (const line of career_lines) {
        const next = career_next(line);
        if (next && (next.world === campaign.world) && (rank >= line.rank)) {
            out.push({...clone(next), label: `${line.name} ${next.step} / 3 · ${next.title}`});
        }
    }
    return out;
}

// A career chapter collected: the line moves on, its effect if it has one, and the third gives the seat
function career_chapter_done(m)
{
    const line = career_lines.find(v => v.id === m.career);
    if (!line) {
        return;
    }
    campaign.careers = careers_sanitize(campaign.careers);
    campaign.careers[line.id] = Math.max(campaign.careers[line.id], m.step || 0);
    career_chapter_effects[m.file]?.();
    play_log_event('career', {line: line.id, step: campaign.careers[line.id]});
    if (career_seat(line.id)) {
        show_toast(`${line.seat.toUpperCase()} IS YOURS`, line.perk.toUpperCase(), 6, 'info');
    }
}

// What a seat adds to a contract's pay: escorts for the Convoy Masters, bounties for the Hunters, scans for the
// Cartographers
function career_reward_k(m)
{
    const kinds = (m.stages || [m]).map(v => v.type);
    let k = 1;
    if (career_seat('escort') && kinds.includes('escort')) {
        k *= 1.2;
    }
    if (career_seat('hunter') && (m.bounty || /bounty/i.test(m.title))) {
        k *= 1.25;
    }
    if (career_seat('surveyor') && ['scan', 'survey'].includes(kinds[0])) {
        k *= 1.25;
    }
    return k;
}

// The Merchants' seat on a market price, where you are Established or higher: 5% less to buy, 5% more to sell
function career_price_k(id, side)
{
    if (!career_seat('trader') || (reputation_of(id) < reputation_tiers.find(v => v.id === 'established').min)) {
        return 1;
    }
    return (side === 'buy') ? 0.95 : 1.05;
}

// How far from you the guards look for raiders to fight: the Guards' seat brings them from much farther, where you are
// Established or higher (guards.js)
function career_guard_reach()
{
    return (career_seat('warden') && (reputation_of() >= reputation_tiers.find(v => v.id === 'established').min)) ? 1600 : 550;
}

// The GOALS tab's career lines: each with its chapters done, then its seat, its next chapter and where, or the rank
// it waits for
function careers_panel_element()
{
    const panel = document.createElement('div');
    panel.className = 'goal-panel';
    panel.innerHTML = '<span class="eyebrow eyebrow--muted">Career lines</span>';
    const rank = pilot_rank();
    for (const line of career_lines) {
        const done = campaign.careers?.[line.id] || 0;
        const next = career_next(line);
        const text = career_seat(line.id)
            ? `${line.seat}: ${line.perk}`
            : (rank < line.rank)
                ? `From rank ${rank_names[line.rank]} · ends with ${line.seat.replace(/^The /, 'the ')}`
                : `Next: ${next.title}, at ${worlds[next.world].station} · ends with ${line.seat.replace(/^The /, 'the ')}`;
        const row = document.createElement('div');
        row.className = `career-line${career_seat(line.id) ? ' is-seated' : ''}`;
        row.innerHTML = `<div><b>${line.name}</b><p class="small">${ui_escape(text)}</p></div>${ui_progress_html(3, done, `${done} / 3`)}`;
        panel.append(row);
    }
    return panel;
}
