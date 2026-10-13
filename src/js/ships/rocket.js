// The felt rocket: Feltmere's own ship and the only one that can enter it (expedition.only); an all-rounder between the
// scout and the courier, with a stronger turbo. Its art is a stand-in cut from the concept sheet.
const ship_rocket = {
    ship: {
        id: 'rocket',
        name: 'Felt Rocket',
        role: 'All-rounder',
        price: 400,
        rank: 1,
        hull: 130,
        shield: 15,
        speed: 1.1,
        handling: 1.1,
        cargo: 60,
        radius: 13,
        damage: 1,
        mounts: ['light', 'light'],
        color: '#e8553f',
        shape: 1,
        description: 'A needle-felted toy rocket: the only ship that can enter Feltmere. Balanced, two light guns and a strong turbo.',
    },
    hull_profile: {radiation: 0.1, traction: 1.05, braking: 1.1, cooling: 0.05, turbo: 1.15, endurance: 2},
};
