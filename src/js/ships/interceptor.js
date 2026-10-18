const ship_interceptor = {
    ship: {
        id: 'interceptor',
        name: 'Viper Interceptor',
        role: 'Combat / evasion',
        price: 850,
        rank: 2,
        opens: 1,
        hull: 85,
        shield: 45,
        speed: 1.5,
        handling: 1.5,
        cargo: 25,
        radius: 10,
        damage: 1,
        // the arcade's reactor: the power its module levels may draw, one more a world cleared (src/js/arcade_power.js)
        power: 6,
        mounts: ['medium', 'medium'],
        color: pink,
        shape: 2,
        description: 'Quick and agile, with two medium guns on a small frame. Light hull demands careful flying.',
    },
    hull_profile: {radiation: 0.04, traction: 0.95, braking: 1.5, cooling: 0.05, turbo: 1.4, endurance: 1},
};
