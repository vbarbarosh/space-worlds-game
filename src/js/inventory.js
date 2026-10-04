document.getElementById('quick_drones').addEventListener('click', drones_toggle);
for (const key of ['medkit', 'emp', 'stasis']) {
    document.getElementById(`quick_${key}`).addEventListener('click', function () {
        use_supply(key);
    });
}
function base_render_inventory()
{
    el.inventory_grid.replaceChildren();
    const cards = upgrade_options.filter(v => upgrades[v.key] > 0).concat(supply_options);
    for (const v of cards) {
        const is_supply = supplies[v.key] !== undefined;
        const level = is_supply ? `×${supplies[v.key]} aboard` : `Level ${upgrades[v.key]} of ${v.cap}`;
        el.inventory_grid.append(ui_card({
            tags: ui_badge(level),
            title: v.title,
            text: v.description,
            art: `<span class="glyph">${v.icon}</span>`,
        }));
    }
}

function toggle_inventory()
{
    if (state === 'inventory') {
        state = inventory_return;
        set_hidden(el.inventory_overlay, true);
        if (state === 'paused') {
            set_hidden(el.pause_overlay, false);
        }
        el.inventory_button.focus();
        return;
    }
    if (!['playing', 'paused'].includes(state)) {
        return;
    }
    inventory_return = state;
    set_hidden(el.pause_overlay, true);
    state = 'inventory';
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    joystick.active = false;
    mouse_drive.active = false;
    mouse_drive.following = false;
    render_inventory();
    set_hidden(el.inventory_overlay, false);
    document.getElementById('close_inventory').focus();
}
el.inventory_button.addEventListener('click', toggle_inventory);
document.getElementById('close_inventory').addEventListener('click', toggle_inventory);
