
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
    constructor({name, id, duration, effects, tags, potency}) {
        this.name = name;
        this.id = id || name;
        this.duration = duration ?? 0;
        this.effects = effects;
        if(!this.effects.bonus_skill_levels) {
            this.effects.bonus_skill_levels = {};
        }
        if(!this.effects.stats) {
            this.effects.stats = {};
        }
        this.tags = tags || {};
        this.tags["effect"] = true;
        this.potency = potency || 0;
        //todo: implement buff/debuff removal; use potency to check if effect A should remove effect B (the stronger survives)
    }
}

effect_templates["Basic meal"] = new ActiveEffect({
    name: "Basic meal",
    effects: {
        stats: {
            stamina_regeneration_flat: {flat: 1},
        }
    },
    tags: {"buff": true},
});

effect_templates["Weak healing powder"] = new ActiveEffect({
    name: "Weak healing powder",
    effects: {
        stats: {
            health_regeneration_flat: {flat: 2},
        }
    },
    tags: {"buff": true, "medicine": true},
});
effect_templates["Healing powder"] = new ActiveEffect({
    name: "Healing powder",
    effects: {
        stats: {
            health_regeneration_flat: {flat: 5},
        }
    },
    tags: {"buff": true, "medicine": true},
});
effect_templates["Weak healing potion"] = new ActiveEffect({
    name: "Weak healing potion",
    effects: {
        stats: {
            health_regeneration_flat: {flat: 8},
            health_regeneration_percent: {flat: 1},
        }
    },
    tags: {"buff": true, "medicine": true},
});
effect_templates["Healing potion"] = new ActiveEffect({
    name: "Healing potion",
    effects: {
        stats: {
            health_regeneration_flat: {flat: 20},
            health_regeneration_percent: {flat: 2},
        }
    },
    tags: {"buff": true, "medicine": true},
});
effect_templates["Weak healing balm"] = new ActiveEffect({
    name: "Weak healing balm",
    effects: {
        stats: {
            health_regeneration_flat: {flat: 5},
            health_regeneration_percent: {flat: 0.5},
        }
    },
    tags: {"buff": true, "medicine": true},
});

effect_templates["Cheap meat meal"] = new ActiveEffect({
    name: "Cheap meat meal",
    effects: {
        stats: {
            stamina_regeneration_flat: {flat: 2},
        }
    },
    tags: {"buff": true},
});
effect_templates["Simple meat meal"] = new ActiveEffect({
    name: "Simple meat meal",
    effects: {
        stats: {
            stamina_regeneration_flat: {flat: 3},
            health_regeneration_flat: {flat: 1},
        }
    },
    tags: {"buff": true},
});
effect_templates["Slight food poisoning"] = new ActiveEffect({
    name: "Slight food poisoning",
    effects: {
        stats: {
            health_loss_flat: {flat: -0.5},
        }
    },
    tags: {"debuff": true, "poison": true},
});

export {effect_templates, ActiveEffect};