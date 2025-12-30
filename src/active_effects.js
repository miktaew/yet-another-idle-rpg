
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
    constructor({name, id, duration, effects, tags, potency, group_tags, affected_by_travel = true}) {
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
        this.affected_by_travel = affected_by_travel;
        this.tags = tags || {};
        this.group_tags = group_tags || {}; //used for grouping and prioritizing highest in group; instead of simple 'true', values are Numbers with higher = more important
        this.tags["effect"] = true;
        this.potency = potency || 0;
        //todo: implement buff/debuff removal; use potency to check if effect A should remove effect B (the stronger survives)
        //or make it work with group_tags instead?
    }
}

//weather effects
(()=>{
    effect_templates["Wet"] = new ActiveEffect({
        name: "Wet",
        effects: {
            stats: {
                cold_tolerance: {flat: -5},
            }
        },
    });

    effect_templates["Cold"] = new ActiveEffect({
        name: "Cold",
        effects: {
            stats: {
                stamina_efficiency: {multiplier: 0.8},
                strength: {multiplier: 0.9},
            }
        },
        group_tags: {cold: 1},
    });
    effect_templates["Very cold"] = new ActiveEffect({
        name: "Very cold",
        effects: {
            stats: {
                stamina_efficiency: {multiplier: 0.6},
                dexterity: {multiplier: 0.8},
                agility: {multiplier: 0.8},
                strength: {multiplier: 0.8},
            }
        },
        group_tags: {cold: 2},
    });
    effect_templates["Freezing"] = new ActiveEffect({
        name: "Freezing",
        effects: {
            stats: {
                stamina_efficiency: {multiplier: 0.3},
                dexterity: {multiplier: 0.6},
                agility: {multiplier: 0.6},
                strength: {multiplier: 0.6},
                health_regeneration_flat: {multiplier: 0.6},
                health_regeneration_percent: {multiplier: 0.6},
            },
            xp_multipliers: {
                all: 0.6,
            }
        },
        group_tags: {cold: 3},
    });
    effect_templates["Hypothermia"] = new ActiveEffect({
        name: "Hypothermia",
        effects: {
            stats: {
                stamina_efficiency: {multiplier: 0.1},
                dexterity: {multiplier: 0.3},
                agility: {multiplier: 0.3},
                strength: {multiplier: 0.4},
                health_regeneration_flat: {multiplier: 0.2},
                health_regeneration_percent: {multiplier: 0.2},
            },
            xp_multipliers: {
                all: 0.3,
            }
        },
        group_tags: {cold: 4},
    });
})();
/////////////////////////////////////////

//consumables' effects
(()=>{
    effect_templates["Basic meal"] = new ActiveEffect({
        name: "Basic meal",
        effects: {
            stats: {
                stamina_regeneration_flat: {flat: 0.5},
            }
        },
        tags: {"buff": true, "food": true},
    });

    effect_templates["Well hydrated"] = new ActiveEffect({
        name: "Well hydrated",
        effects: {
            stats: {
                stamina_regeneration_flat: {flat: 1},
            }
        },
        tags: {"buff": true, "food": true},
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
                stamina_regeneration_flat: {flat: 1},
            }
        },
        tags: {"buff": true, "food": true},
    });
    effect_templates["Simple meat meal"] = new ActiveEffect({
        name: "Simple meat meal",
        effects: {
            stats: {
                stamina_regeneration_flat: {flat: 1},
                health_regeneration_flat: {flat: 1},
            }
        },
        tags: {"buff": true, "food": true},
    });
    effect_templates["Decent meat meal"] = new ActiveEffect({
        name: "Decent meat meal",
        effects: {
            stats: {
                stamina_regeneration_flat: {flat: 2},
                health_regeneration_flat: {flat: 2},
            }
        },
        tags: {"buff": true, "food": true},
    });
    effect_templates["Hot meal"] = new ActiveEffect({
        name: "Hot meal",
        effects: {
            stats: {
                cold_tolerance: {flat: 3},
            }
        },
        tags: {"buff": true, "food": true},
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
})();

effect_templates["Recovering"] = new ActiveEffect({
    name: "Recovering",
    effects: {
        xp_multipliers: {
            all: 0.2,
        }
    },
    tags: {"debuff": true},
    affected_by_travel: false,
});

//export reward
effect_templates["Spark of Inspiration"] = new ActiveEffect({
    name: "Spark of Inspiration",
    effects: {
        xp_multipliers: {
            all: 1.5,
        }
    },
    tags: {"buff": true},
    affected_by_travel: false,
});



export {effect_templates, ActiveEffect};