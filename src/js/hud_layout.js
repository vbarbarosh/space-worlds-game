// The HUD's blocks (data-hud-safe) as rectangles on the canvas, in screen px: labels in the world keep clear of them,
// edge markers stop short of them, and the minimap is drawn inside its box. Kept fresh on resize, zoom and HUD changes.
const hud_layout = {rects: [], minimap: null, width: 0, height: 0};

hud_layout_watch();

function hud_layout_watch()
{
    const screen = document.getElementById('screen');
    const sizes = new ResizeObserver(hud_layout_update);
    sizes.observe(screen);
    for (const v of screen.querySelectorAll('[data-hud-safe]')) {
        sizes.observe(v);
    }
    new MutationObserver(hud_layout_update).observe(document.getElementById('hud_root'), {subtree: true, attributes: true, attributeFilter: ['class', 'hidden']});
    hud_layout_update();
}

function hud_layout_update()
{
    const screen = document.getElementById('screen').getBoundingClientRect();
    function rect_of(v) {
        const r = v.getBoundingClientRect();
        if ((r.width < 1) || (r.height < 1)) {
            return null;
        }
        return {left: r.left - screen.left, top: r.top - screen.top, right: r.right - screen.left, bottom: r.bottom - screen.top, width: r.width, height: r.height};
    }
    hud_layout.rects = Array.from(document.querySelectorAll('#hud_root [data-hud-safe]')).map(rect_of).filter(Boolean);
    hud_layout.minimap = rect_of(document.getElementById('minimap_button'));
    hud_layout.width = screen.width;
    hud_layout.height = screen.height;
}
