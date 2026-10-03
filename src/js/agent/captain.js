// The agent's hook: bin/captain reads the game state and the news through window.captain; it acts through the page's own buttons and keys.
const captain_news = [];
const captain_base_show_toast = show_toast;

show_toast = function (title, sub, duration) {
    captain_news.push({n: captain_news.length + 1, time: Math.round(run_time), title, sub});
    if (captain_news.length > 500) {
        captain_news.shift();
    }
    captain_base_show_toast(title, sub, duration);
};
window.captain = {status: captain_status, news: captain_news_since};

function captain_status()
{
    const out = {mode: arcade.active ? 'arcade' : 'campaign', state};
    if (!player || (state === 'menu')) {
        return out;
    }
    const fleet = ensure_career();
    const ship = current_ship();
    const context = guide_context();
    out.world = worlds[campaign.world].name;
    out.world_rules = current_world_rules().name;
    out.docked = state === 'upgrade';
    out.near_station = distance(player, station) < 230;
    out.salvage = salvage;
    out.score = score;
    out.hull = Math.ceil(player.hp) + ' / ' + hull_max();
    out.shield = Math.ceil(player.shield) + ' / ' + shield_max();
    out.energy = Math.round(player.energy);
    out.heat = Math.round(player.heat || 0);
    out.radiation_dose = Math.round(player.radiation_dose || 0);
    out.ship = ship.name;
    out.ships_owned = fleet.ships;
    out.weapon = current_weapon().name + ' T' + weapon_level();
    out.rank = rank_names[pilot_rank()];
    out.xp = campaign.xp;
    out.reputation = campaign.reputation[campaign.world] || 0;
    out.cargo = {...campaign.cargo, capacity: cargo_capacity()};
    out.supplies = {...supplies};
    out.contracts = [];
    for (const contract of campaign.contracts) {
        out.contracts.push({
            id: contract.id,
            title: contract.title,
            type: contract.type,
            world: worlds[contract.world].name,
            stage: contract.stages ? contract.stages[contract.stage_index].title : null,
            progress: Math.floor(contract.progress) + ' / ' + contract.target,
            ready: !!contract.ready,
            reward: contract.reward,
        });
    }
    out.objective = context.goal ? {title: context.title, kind: context.kind, distance: Math.round(distance(player, context.goal))} : null;
    out.autopilot = guide_flying;
    out.enemies_near = enemies.filter(v => (v.hp > 0) && (distance(v, player) < 900)).length;
    out.run_time = format_time(run_time);
    return out;
}

function captain_news_since(n)
{
    return captain_news.filter(v => v.n > n);
}
