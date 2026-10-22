// A small blast (a missile's, a mine's, a drone dying): a recording (src/sounds/), the world's kind of explosion
// (blast_set)
const sfx_blast = {
    limit: 0.07,
    play: function (note, air, t, clip) {
        const r = 0.93 + Math.random()*0.14;
        if (blast_set() === 'deep') {
            clip('explosion_deep_small', 0.1, r);
        }
        else {
            clip('explosion_small', 0.135, r);
        }
    },
};

// The world's kind of explosion: 'deep' (heavy, low: Obsidian, Eclipse) or 'medium' (every other world), by its
// music's `explosions`
function blast_set()
{
    const v = world_audio[campaign.world];
    return (v && v.explosions) || 'medium';
}
