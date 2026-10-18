// The break between two worlds of an arcade run, after the cleared screen and before the depot: first a card to take
// (arcade_cards.js), then the next world, of the two the route offers (arcade_route.js), on the route's map. A card or
// a world is chosen by a click or its number (1 to 3), and taken with Enter or the button; the depot comes after,
// with the world chosen as the one it launches to.
const arcade_break = {step: 'pick', cards: [], offers: [], chosen: -1, won: [], at: 0};
// a key this soon after the break opens is the cleared screen's
const arcade_break_grace = 0.25;

document.getElementById('brk_body').addEventListener('click', function (event) {
    const choice = event.target.closest('[data-choice]');
    if (choice && !choice.disabled) {
        arcade_break_choose(Number(choice.dataset.choice));
    }
});
document.getElementById('brk_body').addEventListener('dblclick', function (event) {
    if (event.target.closest('[data-choice]:not(:disabled)')) {
        arcade_break_go();
    }
});
document.getElementById('brk_go').addEventListener('click', arcade_break_go);
addEventListener('keydown', function (event) {
    if ((state !== 'arcade_break') || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }
    if ((performance.now() - arcade_break.at)/1000 < arcade_break_grace) {
        return;
    }
    const count = (arcade_break.step === 'pick') ? arcade_break.cards.length : arcade_break.offers.length;
    const n = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].indexOf(event.code) % 3;
    if ((n >= 0) && (n < count)) {
        event.preventDefault();
        arcade_break_choose(n);
    }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
        event.preventDefault();
        // the next one that can be taken that way, round the end; from none, the first (or the last)
        const way = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1;
        let next = arcade_break.chosen;
        for (let i = 0; i < count; ++i) {
            next = (next < 0) ? ((way > 0) ? 0 : count - 1) : (next + way + count) % count;
            if (arcade_break_open_choice(next)) {
                arcade_break_choose(next);
                break;
            }
        }
    }
    else if (event.code === 'Enter') {
        event.preventDefault();
        arcade_break_go();
    }
});

// Opens the break after the world just cleared: three cards drawn, the gamble won in it said at the top
function arcade_break_open(won = [])
{
    state = 'arcade_break';
    stop_turbo();
    keys.clear();
    mouse_drive_suspend();
    joystick.active = false;
    arcade_break.step = 'pick';
    arcade_break.cards = arcade_cards_draw();
    arcade_break.offers = arcade_route_offers();
    arcade_break.chosen = -1;
    arcade_break.won = won;
    arcade_break.at = performance.now();
    arcade_break_fill();
    set_hidden(document.getElementById('arcade_break'), false);
    document.getElementById('brk_go').focus();
}

// Whether choice i of this step can be taken: a card within the salvage, any world offered
function arcade_break_open_choice(i)
{
    return (arcade_break.step === 'pick') ? arcade_card_affordable(arcade_break.cards[i]) : (i < arcade_break.offers.length);
}

function arcade_break_choose(i)
{
    if (!arcade_break_open_choice(i)) {
        return;
    }
    arcade_break.chosen = i;
    sfx('pickup');
    arcade_break_fill();
}

// Enter or the button: the card chosen taken, then the world chosen, then the depot
function arcade_break_go()
{
    if ((state !== 'arcade_break') || (arcade_break.chosen < 0)) {
        return;
    }
    if (arcade_break.step === 'pick') {
        if (!arcade_card_take(arcade_break.cards[arcade_break.chosen])) {
            return;
        }
        sfx('upgrade');
        arcade_break.step = 'route';
        // one way on is no choice: it is chosen
        arcade_break.chosen = (arcade_break.offers.length === 1) ? 0 : -1;
        arcade_break_fill();
        return;
    }
    const world = arcade_break.offers[arcade_break.chosen];
    arcade.between_worlds.next = world;
    play_log_event('route', {from: worlds[campaign.world].name, to: worlds[world].name, offered: arcade_break.offers.map(v => worlds[v].name)});
    set_hidden(document.getElementById('arcade_break'), true);
    arcade_depot_open();
}

// The break's frame (its step, the salvage, a gamble won) and the step's choices
function arcade_break_fill()
{
    const pick = arcade_break.step === 'pick';
    const here = arcade_level();
    document.getElementById('brk_eyebrow').textContent = `Arcade · ${worlds[campaign.world].name} cleared · world ${here + 1} of ${arcade_worlds}`;
    document.getElementById('brk_title').textContent = pick ? 'Take a card' : (arcade_break.offers.length > 1) ? 'Choose the next world' : 'The way on';
    document.getElementById('brk_wallet').textContent = ui_number(salvage);
    for (const v of document.querySelectorAll('#brk_steps li')) {
        v.classList.toggle('is-on', v.dataset.step === arcade_break.step);
        v.classList.toggle('is-done', !pick && (v.dataset.step === 'pick'));
    }
    const won = document.getElementById('brk_won');
    won.innerHTML = (pick && arcade_break.won.length) ? arcade_break.won.map(v => `<span class="badge badge--gold">Won</span><b>${ui_escape(arcade_card_def(v.id).title)}</b><span>${ui_escape(arcade_card_face(v).lines[1][1])}</span>`).join('') : '';
    set_hidden(won, !won.innerHTML);
    const body = document.getElementById('brk_body');
    body.innerHTML = pick ? arcade_break_cards_html() : arcade_break_route_html();
    const chosen = arcade_break.chosen;
    const go = document.getElementById('brk_go');
    go.disabled = chosen < 0;
    const label = (chosen < 0)
        ? (pick ? 'Choose a card' : 'Choose a world')
        : pick ? `Take ${arcade_card_def(arcade_break.cards[chosen].id).title}` : `To the depot · then ${worlds[arcade_break.offers[chosen]].name}`;
    go.innerHTML = `<span>${ui_escape(label)}</span><span class="key">Enter</span>`;
    document.getElementById('brk_hint').textContent = pick
        ? 'Click a card or press its number; Enter takes it.'
        : (arcade_break.offers.length > 1) ? 'Either way the raiders are as strong: they grow with the step, not the world.' : (arcade_break.offers[0] === arcade_worlds - 1) ? `${worlds[arcade_break.offers[0]].name} is the last world.` : `${worlds[arcade_break.offers[0]].name} is the only world for this step.`;
}

// The three cards: each a button with its number, kind, how long it lasts, glyph, title, lines and price
function arcade_break_cards_html()
{
    const cards = arcade_break.cards.map(function (card, i) {
        const face = arcade_card_face(card);
        const short = !arcade_card_affordable(card);
        const price = face.price ? `<span class="pc-price${short ? ' is-short' : ''}">${short ? `Need ◆ ${ui_number(face.price - salvage)} more` : `◆ ${ui_number(face.price)}`}</span>` : '';
        const lines = face.lines.map(v => `<div class="is-${v[2]}"><dt>${v[0]}</dt><dd>${ui_escape(v[1])}${v[3] ? `<small>${ui_escape(v[3])}</small>` : ''}</dd></div>`).join('');
        const chosen = i === arcade_break.chosen;
        return `<button type="button" class="pick-card is-${face.kind}${chosen ? ' is-chosen' : ''}" data-choice="${i}" aria-pressed="${chosen}"${short ? ' disabled' : ''}><span class="pc-head"><span class="key">${i + 1}</span><span class="pc-kind">${face.kind_name}</span><span class="pc-lasts">${face.lasts}</span></span><span class="pc-glyph" aria-hidden="true">${face.icon ? `<img src="${face.icon}" alt="">` : face.glyph}</span><b class="pc-title">${ui_escape(face.title)}</b><dl class="pc-lines">${lines}</dl>${price}</button>`;
    });
    return `<div class="pick-cards">${cards.join('')}</div>`;
}

// The route's map, then a card for each world offered: its planet, name, the step, its raiders' gun, its rules
function arcade_break_route_html()
{
    const offers = arcade_break.offers;
    const chosen = (arcade_break.chosen >= 0) ? offers[arcade_break.chosen] : -1;
    const step = arcade_level() + 2;
    const worlds_html = offers.map(function (world, i) {
        const card = arcade_route_card(world);
        const on = world === chosen;
        const last = world === arcade_worlds - 1;
        return `<button type="button" class="route-card${on ? ' is-chosen' : ''}" data-choice="${i}" aria-pressed="${on}" style="--world:var(--w-${world_slug(world)})"><span class="rc-head"><span class="key">${i + 1}</span><span class="rc-step">World ${step} of ${arcade_worlds}${last ? ' · the last' : ''}</span></span><span class="rc-world"><img src="${arcade_route_planet(world)}" alt=""><b>${ui_escape(worlds[world].name)}</b></span><dl class="rc-lines"><div><dt>Raiders</dt><dd>${ui_escape(card.gun)}</dd></div></dl><span class="rc-rules">${card.rules.map(v => ui_badge(ui_escape(ui_sentence(v)))).join('')}</span></button>`;
    });
    return `<div class="route-map">${arcade_route_map_html(offers, chosen)}</div><div class="route-cards${(offers.length === 1) ? ' is-one' : ''}">${worlds_html.join('')}</div>`;
}
