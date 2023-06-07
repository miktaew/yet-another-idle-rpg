const skills = {};
const skill_groups = {};

import { character } from "./character.js";

/*    
TODO:
    - nightvision skill (lessening penalty in dark areas / at night)
    - elemental resistances for:
        - lessening environmental penalties (mostly affecting stamina maybe?)
        - lessening elemental dmg (first need to implement damage types)
    - skill for fighting in open areas 
    (maybe give bonus block/evasion chance on basis of character becoming more aware of their surroundings)
    - skill for fighting in tight areas (lessening penalty for such areas + some agility and dexterity bonuses)

    - hidden_until -> xp needed for skill to officialy be unlocked (still gains xp when hidden)
    - locked -> skill needs another action to unlock (doesnt gain xp)


*/

class Skill {
    constructor({ skill_id, 
                  names, 
                  description, 
                  max_level = 60, 
                  max_level_coefficient = 1, 
                  max_level_bonus = 0, 
                  base_xp_cost = 40, 
                  visibility_treshold = 10,
                  get_effect_description = () => { return ''; }, 
                  skill_group = null, 
                  rewards, 
                  xp_scaling = 1.7,
                }) 
    {
        this.skill_id = skill_id;
        this.names = names; // put only {0: name} to have skill always named the same, no matter the level
        this.description = description;
        this.current_level = 0; //initial lvl
        this.max_level = max_level; //max possible lvl, dont make it too high
        this.max_level_coefficient = max_level_coefficient; //multiplicative bonus for levels
        this.max_level_bonus = max_level_bonus; //other type bonus for levels
        this.current_xp = 0; // how much of xp_to_next_lvl there is currently
        this.total_xp = 0; // total collected xp, on loading calculate lvl based on this (so to not break skills if scaling ever changes)
        this.base_xp_cost = base_xp_cost; //xp to go from lvl 1 to lvl 2
        this.visibility_treshold = visibility_treshold < base_xp_cost ? visibility_treshold : base_xp_cost; 
        //xp needed for skill to become visible and to get "unlock" message; try to keep it less than xp needed for lvl
        this.xp_to_next_lvl = base_xp_cost; //for display only
        this.total_xp_to_next_lvl = base_xp_cost; //total xp needed to lvl up
        this.get_effect_description = get_effect_description;
        this.skill_group = skill_group;
        this.rewards = rewards; //leveling rewards (and levels on which they are given)

        /*
        if skill_group is defined, rewards will be based on it and setting them here will have no effect
    
        as most of skills will provide some bonus anyway, there's no need to give stat reward at every single level
        and might instead give them, let's say, every 5 levels
        */

        this.xp_scaling = xp_scaling > 1 ? xp_scaling : 1.6;
        //how many times more xp needed for next level
    }

    name() {
        const keys = Object.keys(this.names);
        if (keys.length == 1) {
            return (this.names[keys[0]]);
        }
        else {
            var rank_name;
            for (var i = 0; i <= keys.length; i++) {
                if (this.current_level >= parseInt(keys[i])) {
                    rank_name = this.names[keys[i]];
                }
                else {
                    break;
                }
            }
            return rank_name;
        }
    };

    add_xp(xp_to_add) {
        if(xp_to_add == 0) {
            return;
        }

        this.total_xp += xp_to_add;

        if (this.current_level < this.max_level) { //not max lvl

            if (xp_to_add + this.current_xp < this.xp_to_next_lvl) { // no levelup
                this.current_xp += xp_to_add;
            }
            else { //levelup
                
                var level_after_xp = 0;

                while (this.total_xp >= this.total_xp_to_next_lvl) {

                    level_after_xp += 1;
                    this.total_xp_to_next_lvl = Math.round(this.base_xp_cost * (1 - this.xp_scaling ** (level_after_xp + 1)) / (1 - this.xp_scaling));
                } //calculates lvl reached after adding xp

                //probably could be done much more efficiently, but it shouldn't be a problem anyway
                var total_xp_to_previous_lvl = Math.round(this.base_xp_cost * (1 - this.xp_scaling ** level_after_xp) / (1 - this.xp_scaling));
                //xp needed for current lvl, same formula but for n-1
                var gains;
                if (level_after_xp < this.max_level) { //wont reach max lvl
                    gains = this.get_bonus_stats(level_after_xp);
                    this.xp_to_next_lvl = this.total_xp_to_next_lvl - total_xp_to_previous_lvl;
                    this.current_level = level_after_xp;
                    this.current_xp = this.total_xp - total_xp_to_previous_lvl;
                }
                else { //will reach max lvl
                    gains = this.get_bonus_stats(this.max_level);
                    this.current_level = this.max_level;
                    this.total_xp_to_next_lvl = "Already reached max lvl";
                    this.current_xp = "Max";
                    this.xp_to_next_lvl = "Max";
                }

                if(this.skill_group && level_after_xp > skill_groups[this.skill_group].highest_level) { //if highest level of skill group was surpassed, increase it
                    skill_groups[this.skill_group].highest_level = level_after_xp;
                }

                var message = `${this.name()} has reached level ${this.current_level}`;

                if (!Object.keys(gains.stats).length == 0) { 
                    if (this.skill_group) { 
                        message += `<br><br> Thanks to [${this.skill_group}] reaching new milestone, ${character.name} gained: `;
                    } else {
                        message += `<br><br> Thanks to ${this.name()} reaching new milestone, ${character.name} gained: `;
                    }

                    if (gains.stats) {
                        Object.keys(gains.stats).forEach(function (stat) {
                            message += `<br> +${gains.stats[stat]} ${stat_names[stat]}`;
                        });
                    }
                    if (gains.multipliers) {
                        Object.keys(gains.multipliers).forEach(function (multiplier) {
                            message += `<br> x${gains.multipliers[multiplier]} ${stat_names[multiplier]}`;
                        });
                    }
                }
                return message;
            }
        }
    };

    /**
     * @description only called on leveling
     * @param {*} level 
     * @returns 
     */
    get_bonus_stats(level) {
        //add stats to character
        //returns all the stats so they can be logged in message_log 
        const gains = { stats: {}, multipliers: {} };
        var stats;
        var multipliers;

        if (this.skill_group) { //only skill_group rewards
            for (let i = skill_groups[this.skill_group].highest_level + 1; i <= level; i++) {
                if (skill_groups[this.skill_group].rewards.milestones[i]) {
                    stats = skill_groups[this.skill_group].rewards.milestones[i].stats;
                    multipliers = skill_groups[this.skill_group].rewards.milestones[i].multipliers;
                    if (stats) {
                        Object.keys(stats).forEach(function (stat) {
                            gains.stats[stat] = (gains.stats[stat] + stats[stat]) || stats[stat];
                        });
                    }
                    if (multipliers) {
                        Object.keys(multipliers).forEach(function (multiplier) {
                            gains.multipliers[multiplier] = (gains.multipliers[multiplier] * multipliers[multiplier]) || multipliers[multiplier];
                        });
                    }
                }
            }

        } else { //only normal 
            for (let i = this.current_level + 1; i <= level; i++) {
                if (this.rewards?.milestones[i]) {
                    stats = this.rewards.milestones[i].stats;
                    multipliers = this.rewards.milestones[i].multipliers;
                    if (stats) {
                        Object.keys(stats).forEach(function (stat) {
                            gains.stats[stat] = (gains.stats[stat] + stats[stat]) || stats[stat];
                        });
                    }
                    if (multipliers) {
                        Object.keys(multipliers).forEach(function (multiplier) {
                            gains.multipliers[multiplier] = (gains.multipliers[multiplier] * multipliers[multiplier]) || multipliers[multiplier];
                        });
                    }
                }
            }
        }

        if (gains.multipliers) {
            Object.keys(gains.multipliers).forEach((multiplier) => {
                gains.multipliers[multiplier] = Math.round(100 * gains.multipliers[multiplier]) / 100;
            });
        }

        character.add_bonuses(gains);

        return gains;
    };

    get_coefficient(scaling_type) {
        //maybe lvl as param, with current lvl being used if it's undefined?

        switch (scaling_type) {
            case "flat":
                return 1 + Math.round((this.max_level_coefficient - 1) * this.current_level / this.max_level * 1000) / 1000;
            case "multiplicative":
                return Math.round(Math.pow(this.max_level_coefficient, this.current_level / this.max_level) * 1000) / 1000;
                break;
            default: //same as on multiplicative
                return Math.round(Math.pow(this.max_level_coefficient, this.current_level / this.max_level) * 1000) / 1000;
                break;
        }
    };
    get_level_bonus() {
        return this.max_level_bonus * this.current_level / this.max_level;
    };
}

class SkillGroup {
    constructor({ rewards }) {
        this.rewards = rewards;
        this.highest_level = 0;
    }
}

const stat_names = {"strength": "str",
                    "health": "hp",
                    "max_health": "hp", //same as for "health"
                    "max_stamina": "stamina",
                    "agility": "agl",
                    "dexterity": "dex",
                    "magic": "magic",
                    "attack_speed": "atk spd",
                    "crit_rate": "crit rate",
                    "crit_multiplier": "crit dmg"};

/**
 * @param {String} skill_id key from skills object
 * @returns all unlocked leveling rewards, formatted to string
 */
function get_unlocked_skill_rewards(skill_id) {
    var unlocked_rewards = '';
    
    if(skills[skill_id].skill_group){ //skill group
        const milestones = Object.keys(skill_groups[skills[skill_id].skill_group].rewards.milestones).filter(level => level <= skill_groups[skills[skill_id].skill_group].highest_level);
        if(milestones.length > 0) {
            unlocked_rewards = `Skill group rewards:<br>lvl ${milestones[0]}: ${format_skill_rewards(skill_groups[skills[skill_id].skill_group].rewards.milestones[milestones[0]])}`;
            for(let i = 1; i < milestones.length; i++) {
                unlocked_rewards += `<br>\n\nlvl ${milestones[i]}: ${format_skill_rewards(skill_groups[skills[skill_id].skill_group].rewards.milestones[milestones[i]])}`;
            } 
        }

    } else if(skills[skill_id].rewards){ //no skill group but rewards
        const milestones = Object.keys(skills[skill_id].rewards.milestones).filter(level => level <= skills[skill_id].current_level);
        if(milestones.length > 0) {
            unlocked_rewards = `lvl ${milestones[0]}: ${format_skill_rewards(skills[skill_id].rewards.milestones[milestones[0]])}`;
            for(let i = 1; i < milestones.length; i++) {
                unlocked_rewards += `<br>\n\nlvl ${milestones[i]}: ${format_skill_rewards(skills[skill_id].rewards.milestones[milestones[i]])}`;
            }
        }
    } else { //no skill group and no rewards
        return '';
    }

    return unlocked_rewards;
}

/**
 * get rewards for next lvl
 * @param {String} skill_id key used in skills object
 * @returns rewards for next level, formatted to a string
 */
function get_next_skill_reward(skill_id) {
    if(skills[skill_id].current_level !== "Max!") {
        var rewards;
        if(!skills[skill_id].skill_group){ //no skill group
            rewards = skills[skill_id].rewards.milestones[get_next_skill_milestone(skill_id)];
        } else if(skills[skill_id].skill_group){ //skill group
            rewards = skill_groups[skills[skill_id].skill_group].rewards.milestones[get_next_skill_milestone(skill_id)];
        } else {
            return '';
        }
        //I feel like I'm missing some obviously easier way of doing it

        if(rewards) {
            return format_skill_rewards(rewards);
        } else {
            return '';
        }
    } else {
        return '';
    }
}

/**
 * 
 * @param {*} skill_id key used in skills object
 * @returns next lvl at which skill has any rewards
 */
function get_next_skill_milestone(skill_id){
    if(skills[skill_id].rewards){
        return Object.keys(skills[skill_id].rewards.milestones).find(
            level => level > skills[skill_id].current_level);
    } else if(skills[skill_id].skill_group){
        return Object.keys(skill_groups[skills[skill_id].skill_group].rewards.milestones).find(
            level => level > skill_groups[skills[skill_id].skill_group].highest_level);
    }

}

/**
 * @param milestone milestone from object rewards - {stats: {stat1, stat2... }} 
 * @returns rewards formatted to a nice string
 */
function format_skill_rewards(milestone){
    var formatted = '';
    if(milestone.stats) {
        const stats = Object.keys(milestone.stats);
        
        formatted = `+${milestone.stats[stats[0]]} ${stat_names[stats[0]]}`;
        for(let i = 1; i < stats.length; i++) {
            formatted += `, +${milestone.stats[stats[i]]} ${stat_names[stats[i]]}`;
        }
    }

    if(milestone.multipliers) {
        const multipliers = Object.keys(milestone.multipliers);
        if(formatted) {
            formatted += `, x${milestone.multipliers[multipliers[0]]} ${stat_names[multipliers[0]]}`;
        } else {
            formatted = `x${milestone.multipliers[multipliers[0]]} ${stat_names[multipliers[0]]}`;
        }
        for(let i = 1; i < multipliers.length; i++) {
            formatted += `, x${milestone.multipliers[multipliers[i]]} ${stat_names[multipliers[i]]}`;
        }
    }
    return formatted;
}

skill_groups["weapon skills"] = new SkillGroup({
    rewards: {
        milestones: {
            3: {
                stats: {
                    "strength": 1,
                    "dexterity": 1,
                }
            },
            5: {
                stats: {
                    "strength": 2,
                    "dexterity": 2,
                },
                multipliers: {
                    "strength": 1.1,
                    "dexterity": 1.1,
                }
            },
            7: {
                stats: {
                    "strength": 2,
                    "dexterity": 2,
                }
            },
            10: {
                stats: {
                    "strength": 3,
                    "dexterity": 3,
                },
                multipliers: {
                    "strength": 1.1,
                    "dexterity": 1.1,
                }
            },
            12: {
                stats: {
                    "strength": 4,
                    "dexterity": 4,
                }
            },
            15: {
                stats: {
                    "strength": 5,
                    "dexterity": 5,
                },
                multipliers: {
                    "strength": 1.1,
                    "dexterity": 1.1,
                }
            },
            17: {
                stats: {
                    "strength": 6,
                    "dexterity": 6,
                }
            },
            20: {
                stats: {
                    "strength": 8,
                    "dexterity": 8,
                },
                multipliers: {
                    "strength": 1.1,
                    "dexterity": 1.1,
                }
            }
        }
    }
});

//basic combat skills
(function(){
    skills["Combat"] = new Skill({skill_id: "Combat", 
                                names: {0: "Combat"}, 
                                description: "Overall combat ability", 
                                max_level_coefficient: 2,
                                get_effect_description: ()=> {
                                    return `Multiplies hit chance by ${Math.round(skills["Combat"].get_coefficient("multiplicative")*1000)/1000}`;
                                }});
    
    skills["Pest killer"] = new Skill({skill_id: "Pest killer", 
                                names: {0: "Pest killer"}, 
                                description: "Small enemies might not seem very dangerous, but it's not that easy to hit them!", 
                                max_level_coefficient: 2,
                                get_effect_description: ()=> {
                                    return `Multiplies hit chance against small-type enemies by ${Math.round(skills["Pest killer"].get_coefficient("multiplicative")*1000)/1000}`;
                                }});    
                                
    skills["Giant slayer"] = new Skill({skill_id: "Giant slayer", 
                                names: {0: "Giant slayer"}, 
                                description: "Large opponents might seem scary, but just don't get hit and you should be fine!", 
                                max_level_coefficient: 2,
                                get_effect_description: ()=> {
                                    return `Multiplies evasion against large-type enemies by ${Math.round(skills["Giant slayer"].get_coefficient("multiplicative")*1000)/1000}`;
                                }});

    skills["Evasion"] = new Skill({skill_id: "Evasion", 
                                names: {0: "Evasion"},                                
                                description:"Ability to evade attacks", 
                                max_level_coefficient: 2,
                                base_xp_cost: 20,
                                get_effect_description: ()=> {
                                    return `Multiplies your evasion chance by ${Math.round(skills["Evasion"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                "agility": 1,
                                            }
                                        },
                                        3: {
                                            stats: {
                                                "agility": 1,
                                            }
                                        },
                                        5: {
                                            stats: {
                                                "agility": 2,
                                            },
                                            multipliers: {
                                                "agility": 1.1,
                                            }
                                        },
                                        7: {
                                            stats: {
                                                "agility": 2,
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "agility": 3,
                                            },
                                            multipliers: {
                                                "agility": 1.1,
                                            }
                                        }
                                    }
                                }
                            });
    skills["Shield blocking"] = new Skill({skill_id: "Shield blocking", 
                                    names: {0: "Shield blocking"}, 
                                    description: "Ability to block attacks with shield", 
                                    max_level: 20, 
                                    max_level_coefficient: 4,
                                    get_effect_description: ()=> {
                                        return `Increases block chance by flat ${Math.round(skills["Shield blocking"].get_coefficient("flat")*100)/100}%`;
                                    }});
    
     skills["Unarmed"] = new Skill({skill_id: "Unarmed", 
                                    names: {0: "Unarmed"}, 
                                    description: "It's definitely, unquestionably, undoubtedly better to just use a weapon. But sure, why not?",
                                    get_effect_description: ()=> {
                                        return `Multiplies damage dealt in unarmed combat by ${Math.round(skills["Unarmed"].get_coefficient("multiplicative")*1000)/1000}`;
                                    },
                                    max_level_coefficient: 64, //even with 8x more it's still gonna be worse than just using a weapon lol
                                    rewards: {
                                        milestones: {
                                            2: {
                                                stats: {
                                                    "strength": 1,
                                                }
                                            },
                                            4: {
                                                stats: {
                                                    "strength": 1,
                                                    "dexterity": 1,
                                                }
                                            },
                                            6: {
                                                stats: {
                                                    "strength": 1,
                                                    "dexterity": 1,
                                                    "agility": 1,
                                                }
                                            },
                                            8: {
                                                stats: {
                                                    "strength": 1,
                                                    "dexterity": 1,
                                                    "agility": 1,
                                                }
                                            },
                                            10: {
                                                stats: {
                                                    "strength": 2,
                                                    "dexterity": 1,
                                                    "agility": 1,
                                                }
                                            }
                                        }
                                    }});                                
})();

//environment related skills
(function(){
    skills["Spatial awareness"] = new Skill({
                                            skill_id: "Spatial awareness", 
                                            names: {0: "Spatial awareness"}, 
                                            description: "Understanding where you are in relation to other creatures and objects", 
                                            get_effect_description: ()=> {
                                                return `Reduces environmental penalty in open areas by ${Math.round(10*skills["Spatial awareness"].current_level*100/skills["Spatial awareness"].max_level)/10}%`;
                                            }});
    skills["Tight maneuvers"] = new Skill({
                                        skill_id: "Tight maneuvers", 
                                        names: {0: "Tight maneuvers"}, 
                                        description: "Learn how to fight in narrow environment, where there's not much space for dodging attacks", 
                                        get_effect_description: ()=> {
                                            return `Reduces environmental penalty in narrow areas by ${Math.round(10*skills["Tight maneuvers"].current_level*100/skills["Tight maneuvers"].max_level)/10}%`;
                                        }});
    skills["Night vision"] = new Skill({
                                    skill_id: "Night vision",
                                    names: {0: "Night vision"},
                                    description: "Ability to see in darkness",
                                    base_xp_cost: 300,
                                    xp_scaling: 1.8,
                                    max_level: 10,
                                    get_effect_description: () => {
                                        return `Reduces darkness penalty by ${Math.round(10*skills["Night vision"].current_level*100/skills["Night vision"].max_level)/10}%`;
                                    }

    });
    skills["Heat resistance"] = new Skill({
        skill_id: "Heat resistance",
        names: {0: "Heat resistance"},
        description: "Ability to survive and function in high temperatures",
        base_xp_cost: 100,
        xp_scaling: 1.8,
        max_level: 40,
        get_effect_description: () => {
            return `Reduces penalty from hot locations`;
        }
    });
    skills["Cold resistance"] = new Skill({
        skill_id: "Cold resistance",
        names: {0: "Cold resistance"},
        description: "Ability to survive and function in low temperatures",
        base_xp_cost: 100,
        xp_scaling: 1.8,
        max_level: 40,
        get_effect_description: () => {
            return `Reduces penalty from cold locations`;
        }
    });

    skills["Dazzle resistance"] = new Skill({
        skill_id: "Dazzle resistance",
        names: {0: "Dazzle resistance"},
        description: "Don't look at the sun, it's bad for your eyes",
        base_xp_cost: 60,
        max_level: 30,
        get_effect_description: ()=> {
            return `Reduces hit and evasion penalty in super bright areas`;
        },
        max_level_bonus: 0.5
    });
})();

//weapon skills
(function(){
    skills["Swords"] = new Skill({skill_id: "Swords", 
                                skill_group: "weapon skills",
                                names: {0: "Swordsmanship"}, 
                                description: "The noble art of swordsmanship", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with swords by ${Math.round(skills["Swords"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Axes"] = new Skill({skill_id: "Axes", 
                                skill_group: "weapon skills",
                                names: {0: "Axe combat"}, 
                                description: "Ability to fight with use of axes", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with axes by ${Math.round(skills["Axes"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Spears"] = new Skill({skill_id: "Spears", 
                                skill_group: "weapon skills",
                                names: {0: "Spearmanship"}, 
                                description: "The ability to fight with the most deadly weapon in the history", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with spears by ${Math.round(skills["Spears"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Hammers"] = new Skill({skill_id: "Hammers", 
                                        skill_group: "weapon skills",
                                        names: {0: "Hammer combat"}, 
                                        description: "Ability to fight with use of battle hammers. Why bother trying to cut someone, when you can just crack all their bones?", 
                                        get_effect_description: ()=> {
                                            return `Multiplies damage dealt with battle hammers by ${Math.round(skills["Hammers"].get_coefficient("multiplicative")*1000)/1000}`;
                                        },
                                        max_level_coefficient: 8});

    skills["Daggers"] = new Skill({skill_id: "Daggers",
                                skill_group: "weapon skills",
                                names: {0: "Dagger combat"},
                                description: "The looked upon art of fighting (and stabbing) with daggers",
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with daggers by ${Math.round(skills["Daggers"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Wands"] = new Skill({skill_id: "Wands", 
                                skill_group: "weapon skills",
                                names: {0: "Wand casting"}, 
                                description: "Ability to cast spells with magic wands, increases damage dealt", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with wands by ${Math.round(skills["Wands"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Staffs"] = new Skill({skill_id: "Staffs", 
                                skill_group: "weapon skills",
                                names: {0: "Staff casting"}, 
                                description: "Ability to cast spells with magic staffs, increases damage dealt", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealth with staffs by ${Math.round(skills["Staffs"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});
})();

//work related
(function(){
    skills["Farming"] = new Skill({skill_id: "Farming", 
                                names: {0: "Farming"}, 
                                description: "Even a simple action of plowing some fields, can be done better with skills and experience",
                                base_xp_cost: 40,
                                max_level: 10,
                                max_level_coefficient: 2,
                                rewards: {
                                    milestones: {
                                        2: {
                                            stats: {
                                                "strength": 1,
                                                max_stamina: 3,
                                            },
                                        },
                                        4: {
                                            stats: {
                                                "strength": 1,
                                                "dexterity": 1,
                                                max_stamina: 3,
                                            }
                                        },
                                        6: {
                                            stats: {
                                                "strength": 2,
                                                "dexterity": 1,
                                                max_stamina: 3,
                                            }
                                        },
                                        8: {
                                            stats: {
                                                "strength": 3,
                                                "dexterity": 1,
                                                max_stamina: 3,
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "strength": 5,
                                                "dexterity": 2,
                                                max_stamina: 5,
                                            },
                                            multipliers: {
                                                "strength": 1.2,
                                                "dexterity": 1.1,
                                            }
                                        }
                                    }
                                }});

})();

//non-work activity related
(function(){
    skills["Sleeping"] = new Skill({skill_id: "Sleeping",
                                    names: {0: "Sleeping"}, 
                                    description: "Good, regular sleep is the basis of getting stronger and helps your body heal.",
                                    base_xp_cost: 1000,
                                    xp_scaling: 2,
                                    max_level: 10,
                                    max_level_coefficient: 2.5,    
                                    rewards: {
                                        milestones: {
                                            2: {
                                                stats: {
                                                    "max_health": 10,
                                                },
                                                multipliers: {
                                                    "max_health": 1.1,
                                                }
                                            },
                                            4: {
                                                stats: {
                                                    "max_health": 20,
                                                },
                                                multipliers: {
                                                    "max_health": 1.1,
                                                }
                                            },
                                            6: {
                                                stats: {
                                                    "max_health": 40,
                                                },
                                                multipliers: {
                                                    "max_health": 1.1,
                                                }
                                            },
                                            8: {
                                                stats: {
                                                    "max_health": 80,
                                                },
                                                multipliers: {
                                                    "max_health": 1.1,
                                                }
                                            },
                                            10: {
                                                stats: {
                                                    "max_health": 160,
                                                },
                                                multipliers: {
                                                    "max_health": 1.1,
                                                }
                                            }
                                        }
                                    }
                                });
    skills["Running"] = new Skill({skill_id: "Running",
                                  description: "Great way to improve the efficiency of the body",
                                  names: {0: "Running"},
                                  max_level: 50,
                                  max_level_coefficient: 4,
                                  base_xp_cost: 50,
                                  rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                agility: 1,
                                            },
                                        },
                                        3: {
                                            stats: {
                                                agility: 1,
                                            }
                                        },
                                        5: {
                                            stats: {
                                                agility: 1,
                                            },
                                            multipliers: {
                                                agility: 1.1,
                                                max_stamina: 1.05,
                                            }
                                        },
                                        7: {
                                            stats: {
                                                agility: 2,
                                            },
                                        },
                                        10: {
                                            stats: {
                                                agility: 2,
                                            },
                                            multipliers: {
                                                agility: 1.1,
                                                max_stamina: 1.05,
                                            }
                                        }
                                    }
                                  },
                                  get_effect_description: ()=> {
                                    let value = skills["Running"].get_coefficient("multiplicative");
                                    if(value >= 100) {
                                        value = Math.round(value);
                                    } else if(value >= 10 && value < 100) {
                                        value = Math.round(value*10)/10; 
                                    } else {
                                        value = Math.round(value*100)/100;
                                    }
                                    return `Multiplies max stamina by ${value}`;
                                  },
                                  
                                });
    skills["Weightlifting"] = new Skill({skill_id: "Weightlifting",
    description: "No better way to get stronger than by lifting heavy things",
    names: {0: "Weightlifting"},
    max_level: 50,
    max_level_coefficient: 4,
    base_xp_cost: 50,
    rewards: {
      milestones: {
          1: {
              stats: {
                  strength: 1,
              },
          },
          3: {
              stats: {
                  strength: 1,
              }
          },
          5: {
              stats: {
                  strength: 1,
              },
              multipliers: {
                  strength: 1.1,
                  max_stamina: 1.05,
              }
          },
          7: {
              stats: {
                  strength: 2,
              },
          },
          10: {
              stats: {
                  strength: 2,
              },
              multipliers: {
                  strength: 1.1,
                  max_stamina: 1.05,
              }
          }
      }
    },
    get_effect_description: ()=> {
      let value = skills["Weightlifting"].get_coefficient("multiplicative");
      if(value >= 100) {
          value = Math.round(value);
      } else if(value >= 10 && value < 100) {
          value = Math.round(value*10)/10; 
      } else {
          value = Math.round(value*100)/100;
      }
      return `Multiplies strength by ${value}`;
    },
    
  });
})();

//crafting skills
skill_groups["crafting skills"] = new SkillGroup({
    rewards: {
        milestones: {
            1: {
                stats: {
                    dexterity: 1,
                }
            },
            3: {
                stats: {
                    dexterity: 1,
                },
            },
            5: {
                stats: {
                    dexterity: 2,
                },
            },
            7: {
                stats: {
                    dexterity: 2,
                },
            },
            10: {
                stats: {
                    dexterity: 3,
                },
            }
        }
    }
});
(function(){
    skills["Weapon crafting"] = new Skill({
        skill_id: "Weapon crafting", 
        names: {0: "Weapon crafting"}, 
        skill_group: "crafting skills",
        description: "Ability to craft weapons",
        base_xp_cost: 20,
        max_level: 40,

    });
    skills["Armor crafting"] = new Skill({
        skill_id: "Armor crafting", 
        names: {0: "Armor crafting"}, 
        skill_group: "crafting skills",
        description: "Ability to create protective equipment",
        base_xp_cost: 20,
        max_level: 40,
    });
})();

//defensive skills
(function(){
    skills["Iron skin"] = new Skill({
        skill_id: "Iron skin",
        names: {0: "Tough skin", 5: "Wooden skin", 10: "Iron skin"},
        description: "As it gets damaged, your skin regenerates to be tougher and tougher",
        base_xp_cost: 80,
        max_level: 30,
        max_level_bonus: 30,
        get_effect_description: ()=> {
            return `Increases base defense by ${Math.round(skills["Iron skin"].get_level_bonus())}`;
        },
        rewards: {
            milestones: {
                3: {
                    multipliers: {
                        max_health: 1.01,
                    }
                },
                5: {
                    multipliers: {
                        max_health: 1.03,
                    }
                },
                7: {
                    multipliers: {
                        max_health: 1.01,
                    }
                },
                10: {
                    multipliers: {
                        max_health: 1.05,
                    }
                }
            }
        }
    }); 
})();

//character skills and resistances
(function(){
    skills["Persistence"] = new Skill({
        skill_id: "Persistence",
        names: {0: "Persistence"},
        description: "Being tired is not a reason to give up",
        base_xp_cost: 60,
        max_level: 30,
        get_effect_description: ()=> {
            return `Reduces low stamina penalty by ${Math.round(skills["Persistence"].get_level_bonus()*100000)/1000} percentage points`;
        },
        max_level_bonus: 0.3
    });
    skills["Perception"] = new Skill({
        skill_id: "Perception", 
        names: {0: "Perception"}, 
        description: "Better grasp on your senses allows you to notice small and hidden things", 
        max_level_coefficient: 2,
        get_effect_description: ()=> {
            return `Increase crit rate and chance to find items when foraging`;
        }}); 
})();

//miscellaneous skills
(function(){
    skills["Haggling"] = new Skill({
        skill_id: "Haggling",
        names: {0: "Haggling"},
        description: "The art of the deal",
        base_xp_cost: 100,
        max_level: 25,
        get_effect_description: ()=> {
            return `Lowers trader cost multiplier to ${Math.round((1 - skills["Haggling"].get_level_bonus())*100)}% of original value`;
        },
        max_level_bonus: 0.5
    });
    
})();

export {skills, skill_groups, get_unlocked_skill_rewards, get_next_skill_milestone};
