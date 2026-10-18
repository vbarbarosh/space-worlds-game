const ship_scout = {
    ship: {
        id: 'scout',
        name: 'Wisp Scout',
        role: 'Exploration',
        price: 0,
        rank: 0,
        opens: 0,
        hull: 100,
        shield: 0,
        speed: 1,
        handling: 1,
        cargo: 40,
        radius: 12,
        damage: 1,
        // the arcade's reactor: the power its module levels may draw, one more a world cleared (src/js/arcade_power.js)
        power: 4,
        mounts: ['light'],
        color: cyan,
        shape: 0,
        description: 'Your first ship, balanced. Low running costs and responsive flight.',
    },
    hull_profile: {radiation: 0, traction: 1, braking: 1, cooling: 0, turbo: 1, endurance: 0},
};
