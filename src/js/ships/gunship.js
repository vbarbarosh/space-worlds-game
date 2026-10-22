const ship_gunship = {
    ship: {
        id: 'gunship',
        name: 'Bastion Gunship',
        role: 'Heavy assault',
        price: 2300,
        rank: 3,
        opens: 3,
        hull: 250,
        shield: 70,
        speed: 0.88,
        handling: 0.85,
        cargo: 65,
        radius: 21,
        damage: 1,
        // the arcade's reactor: the power its module levels may draw, one more a world cleared (src/js/arcade_power.js)
        power: 7,
        mounts: ['medium', 'medium', 'heavy'],
        color: blue,
        shape: 4,
        // its engine: src/sounds/engine_gunship.mp3, one loop of this many seconds (flight_engine_play)
        engine_loop: 6,
        description: 'Two medium guns and a heavy one on an armored hull. Built for ambushes and blockades.',
    },
    hull_profile: {radiation: 0.55, traction: 1.7, braking: 1.4, cooling: 0.4, turbo: 1.05, endurance: 2},
};
