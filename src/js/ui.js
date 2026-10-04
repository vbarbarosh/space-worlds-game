// Builders for the designer's UI kit (css/ui-kit.css): buttons with their key chip and price, badges, gun sizes,
// tiers and cards, made the same way on every screen that has moved onto the kit (a container with the class ui).

// A kit button: its label, a gold price chip, then its key chip, quiet, so the verb is read first; kind '', 'primary',
// 'ghost' or 'danger'; size '', 'sm' or 'lg'
function ui_button({label, key = '', price = null, kind = '', size = '', disabled = false, title = '', on = null})
{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = ['btn', kind && `btn-${kind}`, size && `btn-${size}`].filter(Boolean).join(' ');
    const chip = key ? `<span class="key">${key}</span>` : '';
    b.innerHTML = `<span>${label}</span>${(price !== null) ? `<span class="price">${ui_number(price)}</span>` : ''}${chip}`;
    b.disabled = disabled;
    if (title) {
        b.title = title;
    }
    if (on) {
        b.addEventListener('click', on);
    }
    return b;
}

// Numbers as the kit writes them: thin groups of three (2 482)
function ui_number(v)
{
    return Math.round(v).toLocaleString('en-US').replace(/,/g, ' ');
}

// Text made safe to put in HTML
function ui_escape(text)
{
    return String(text).replace(/[&<>"]/g, v => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[v]);
}

function ui_badge(text, kind = '')
{
    return `<span class="badge${kind ? ` badge--${kind}` : ''}">${text}</span>`;
}

// A world's badge in its own colour
function ui_world_badge(id)
{
    return `<span class="badge badge--world" style="--world:var(--w-${world_slug(id)})">${worlds[id].name}</span>`;
}

// A gun's size, told by one, two or three bars as well as the word
function ui_size(size)
{
    return `<span class="size size--${size}">${size[0].toUpperCase()}${size.slice(1)}</span>`;
}

// A tier as five pips
function ui_tier(n)
{
    return `<span class="tier" data-t="${n}">T${n}<i><b></b><b></b><b></b><b></b><b></b></i></span>`;
}

const ui_lock_svg = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h-1.8V5a1.7 1.7 0 0 0-3.4 0v2z"/><rect x="3" y="7" width="10" height="7.5" rx="1.6"/></svg>';

// A kit card: tags, title, one line of text, stats, then the foot with a note and the action, in that order.
// state: '', 'is-equipped', 'is-selected', 'is-goal', 'is-locked' or 'is-done'
function ui_card({tags = '', title, text = '', stats = [], note = '', action = null, state = '', art = ''})
{
    const c = document.createElement('div');
    c.className = `card${state ? ` ${state}` : ''}`;
    const head = `${tags ? `<div class="meta">${tags}</div>` : ''}<h4 class="h-card">${title}</h4>${text ? `<p class="small" style="margin:0">${text}</p>` : ''}`;
    c.innerHTML = art ? `<div class="item"><div class="art">${art}</div><div class="txt">${head}</div></div>` : head;
    if (stats.length) {
        c.insertAdjacentHTML('beforeend', `<dl class="stats">${stats.map(v => `<div><dt>${v[0]}</dt><dd>${v[1]}</dd></div>`).join('')}</dl>`);
    }
    const foot = document.createElement('div');
    foot.className = 'foot';
    foot.innerHTML = note ? `<span class="small">${note}</span>` : '<span></span>';
    if (action) {
        foot.append(action);
    }
    c.append(foot);
    return c;
}

// A kit button from one of today's capitalised labels: BUY · ◆ 350 becomes Buy with a price chip
function ui_button_from_label(text, options)
{
    const priced = /^(.*?)\s*·\s*◆\s*([\d\s]+)$/.exec(text);
    const label = (priced ? priced[1] : text).toLowerCase().replace(/^\w/, v => v.toUpperCase());
    return ui_button({label, price: priced ? Number(priced[2].replace(/\s/g, '')) : null, ...options});
}

// A progress track of `count` segments, `done` of them filled, with a label at its end
function ui_progress_html(count, done, label)
{
    const bars = [];
    for (let i = 0; i < count; ++i) {
        bars.push((i < done) ? '<b class="done"></b>' : '<b></b>');
    }
    return `<div class="prog"><div class="track">${bars.join('')}</div>${label ? `<span class="lbl">${label}</span>` : ''}</div>`;
}

// One of today's shop cards (.shop-item: a glyph and title, a level line, a description, a button) as a kit item
// card. The button element itself moves over, restyled, so its handler stays; the guide's data-key goes too.
function ui_shop_item(old)
{
    const heading = old.querySelector('b')?.textContent || '';
    const glyph = /^\S+\s+/.test(heading) && !/^[A-Za-z]/.test(heading) ? heading.split(/\s+/)[0] : '';
    const title = glyph ? heading.slice(glyph.length).trim() : heading.trim();
    const level = old.querySelector('.item-level')?.textContent || '';
    const icon = old.dataset.icon;
    const c = ui_card({
        tags: (level ? ui_badge(level.toLowerCase().replace(/^\w/, v => v.toUpperCase())) : '') + (old.dataset.part ? ui_badge('On ship', 'cyan') : ''),
        title,
        text: old.querySelector('p')?.textContent || '',
        art: icon ? `<img src="${icon}" alt="">` : glyph ? `<span class="glyph">${glyph}</span>` : '',
        state: old.classList.contains('wanted') ? 'is-goal' : '',
    });
    delete old.dataset.icon;
    delete old.dataset.part;
    const foot = c.querySelector('.foot');
    for (const b of old.querySelectorAll('button')) {
        ui_kit_button(b);
        foot.append(b);
    }
    Object.assign(c.dataset, old.dataset);
    return c;
}

// Restyles one of today's buttons in place as a small kit button: BUY · ◆ 350 becomes Buy with a price chip
function ui_kit_button(b)
{
    const made = ui_button_from_label(b.textContent.trim(), {size: 'sm'});
    b.className = made.className;
    b.innerHTML = made.innerHTML;
}
