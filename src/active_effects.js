const effect_templates = {}; 
//templates, since some effects will appear across multiple items but with different durations

class ActiveEffect {
    /**
     * 
     * @param {Object} effect_data
     * @param {String} effect_data.name
     * @param {String} [effect_data.id]
     * @param {Number} effect_data.duration
     * @param {Object} effect_data.effects {stats}
     */
    constructor({name, id, duration, effects}) {
        this.name = name;
        this.id = id || name;
        this.duration = duration ?? 0;
        this.effects = effects;
    }
}

effect_templates["Basic meal"] = new ActiveEffect({
    name: "Basic meal",
    effects: {
        stats: {
            stamina_regeneration_flat: {flat: 1},
        }
    }
});

effect_templates["Weak healing powder"] = new ActiveEffect({
    name: "Weak healing powder",
    effects: {
        stats: {
            health_regeneration_flat: {flat: 1},
        }
    }
});
effect_templates["Weak healing potion"] = new ActiveEffect({
    name: "Weak healing potion",
    effects: {
        stats: {
            health_regeneration_flat: {flat: 6},
            health_regeneration_percent: {flat: 1},
        }
    }
});

effect_templates["Cheap meat meal"] = new ActiveEffect({
    name: "Cheap meat meal",
    effects: {
        stats: {
            stamina_regeneration_flat: {flat: 2},
        }
    }
});
effect_templates["Slight food poisoning"] = new ActiveEffect({
    name: "Slight food poisoning",
    effects: {
        stats: {
            health_regeneration_flat: {flat: -0.5},
        }
    }
});

export {effect_templates, ActiveEffect};