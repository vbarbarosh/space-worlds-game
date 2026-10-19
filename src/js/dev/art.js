// The ships' look on the dev page (js/sprites.js): &art=painted draws the Nebula Strike prototype's painted ships and
// rocks, &art=drawn the game's own drawings, whatever Settings → Ships says
const dev_art = new URLSearchParams(location.search).get('art');

if ((dev_art === 'painted') || (dev_art === 'drawn')) {
    sprite_art = dev_art;
}
