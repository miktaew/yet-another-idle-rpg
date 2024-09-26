"use strict";

const skills = {};
const skill_categories = {};

import {character} from "./character.js";
import {stat_names} from "./misc.js";

/*    
TODO:
    - elemental resistances for:
        - lessening environmental penalties of other types (mostly affecting stamina maybe?)
        - lessening elemental dmg (first need to implement damage types)
    - locked -> skill needs another action to unlock (doesnt gain xp)
*/

const weapon_type_to_skill = {
    "axe": "Axes",
    "dagger": "Daggers",
    "hammer": "Hammers",
    "sword": "Swords",
    "spear": "Spears",
    "staff": "Staffs",
    "wand": "Wands"
};

const which_skills_affect_skill = {};

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
                  parent_skill = null, 
                  rewards, 
                  xp_scaling = 1.8,
                  is_unlocked = true,
                  category,
                }) 
    {
        if(skill_id === "all" || skill_id === "hero" || skill_id === "all_skill") {
            //would cause problem with how xp_bonuses are implemented
            throw new Error(`Id "${skill_id}" is not allowed for skills`);
        }

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
        this.is_unlocked = is_unlocked;
        //xp needed for skill to become visible and to get "unlock" message; try to keep it less than xp needed for lvl
        this.xp_to_next_lvl = base_xp_cost; //for display only
        this.total_xp_to_next_lvl = base_xp_cost; //total xp needed to lvl up
        this.get_effect_description = get_effect_description;
        this.is_parent = false;
        if(!category) {
            console.warn(`Skill "${this.skill_id}" has no category defined and was defaulted to miscellaneous`);
            this.category = "Miscellaneous";
        } else {
            this.category = category;
            skill_categories[this.category] = this;
        }
        
        if(parent_skill) {
            if(skills[parent_skill]) {
                this.parent_skill = parent_skill;
                skills[parent_skill].is_parent = true;
            } else {
                throw new Error(`Skill "${parent_skill}" doesn't exist, so it can't be set as a parent skill`)
            }
        }

        this.rewards = rewards; //leveling rewards (and levels on which they are given)

        this.xp_scaling = xp_scaling > 1 ? xp_scaling : 1.6;
        //how many times more xp needed for next level
    }

    name() {
        if(this.visibility_treshold > this.total_xp) {
            return "?????";
        }
        
        const keys = Object.keys(this.names);
        if (keys.length == 1) {
            return (this.names[keys[0]]);
        }
        else {
            let rank_name;
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
    }

    add_xp({xp_to_add = 0}) {
        if(xp_to_add == 0 || !this.is_unlocked) {
            return;
        }
        xp_to_add = Math.round(xp_to_add*100)/100;

        this.total_xp = Math.round(100*(this.total_xp + xp_to_add))/100;
        if (this.current_level < this.max_level) { //not max lvl

            if (Math.round(100*(xp_to_add + this.current_xp))/100 < this.xp_to_next_lvl) { // no levelup
                this.current_xp = Math.round(100*(this.current_xp + xp_to_add))/100;
            }
            else { //levelup
                
                let level_after_xp = 0;
                let unlocks = {skills: []};

                //its alright if this goes over max level, it will be overwritten in a if-else below that
                while (this.total_xp >= this.total_xp_to_next_lvl) {

                    level_after_xp += 1;
                    this.total_xp_to_next_lvl = Math.round(100*this.base_xp_cost * (1 - this.xp_scaling ** (level_after_xp + 1)) / (1 - this.xp_scaling))/100;

                    if(this.rewards?.milestones[level_after_xp]?.unlocks?.skills) {
                        unlocks.skills.push(...this.rewards.milestones[level_after_xp].unlocks.skills);
                    }
                } //calculates lvl reached after adding xp
                //probably could be done much more efficiently, but it shouldn't be a problem anyway

                
                let total_xp_to_previous_lvl = Math.round(100*this.base_xp_cost * (1 - this.xp_scaling ** level_after_xp) / (1 - this.xp_scaling))/100;
                //xp needed for current lvl, same formula but for n-1

                if(level_after_xp == 0) { 
                    console.warn(`Something went wrong, calculated level of skill "${this.skill_id}" after a levelup was 0.`
                    +`\nxp_added: ${xp_to_add};\nprevious level: ${this.current_level};\ntotal xp: ${this.total_xp};`
                    +`\ntotal xp for that level: ${total_xp_to_previous_lvl};\ntotal xp for next level: ${this.total_xp_to_next_lvl}`);
                }

                let gains;
                if (level_after_xp < this.max_level) { //wont reach max lvl
                    gains = this.get_bonus_stats(level_after_xp);
                    this.xp_to_next_lvl = Math.round(100*(this.total_xp_to_next_lvl - total_xp_to_previous_lvl))/100;
                    this.current_level = level_after_xp;
                    this.current_xp = Math.round(100*(this.total_xp - total_xp_to_previous_lvl))/100;
                }
                else { //will reach max lvl
                    gains = this.get_bonus_stats(this.max_level);
                    this.current_level = this.max_level;
                    this.total_xp_to_next_lvl = "Already reached max lvl";
                    this.current_xp = "Max";
                    this.xp_to_next_lvl = "Max";
                }

                let message = `${this.name()} has reached level ${this.current_level}`;

                if (Object.keys(gains.stats).length > 0 || Object.keys(gains.xp_multipliers).length > 0) { 
                    message += `<br><br> Thanks to ${this.name()} reaching new milestone, ${character.name} gained: `;

                    if (gains.stats) {
                        Object.keys(gains.stats).forEach(stat => {
                            if(gains.stats[stat].flat) {
                                message += `<br> +${gains.stats[stat].flat} ${stat_names[stat].replace("_"," ")}`;
                            }
                            if(gains.stats[stat].multiplier) {
                                message += `<br> x${Math.round(100*gains.stats[stat].multiplier)/100} ${stat_names[stat].replace("_"," ")}`;
                            }   
                        });
                    }

                    if (gains.xp_multipliers) {
                        Object.keys(gains.xp_multipliers).forEach(xp_multiplier => {
                            let name;
                            if(xp_multiplier !== "all" && xp_multiplier !== "hero" && xp_multiplier !== "all_skill") {
                                name = skills[xp_multiplier].name();
                                if(!skills[xp_multiplier]) {
                                    console.warn(`Skill ${this.skill_id} tried to reward an xp multiplier for something that doesn't exist: ${xp_multiplier}. I could be a misspelled skill name`);
                                }
                            } else {
                                name = xp_multiplier.replace("_"," ");
                            }
                            message += `<br> x${Math.round(100*gains.xp_multipliers[xp_multiplier])/100} ${name} xp gain`;
                        });
                    }
                }

                return {message, gains, unlocks};
            }
        }
        return {};
    }

    /**
     * @description only called on leveling; calculates all the bonuses gained, so they can be added to hero and logged in message log
     * @param {*} level 
     * @returns bonuses from milestones
     */
    get_bonus_stats(level) {
        //probably should rename, since it's not just stats anymore
        const gains = {stats: {}, xp_multipliers: {}};

        let stats;
        let xp_multipliers;

        for (let i = this.current_level + 1; i <= level; i++) {
            if (this.rewards?.milestones[i]) {
                stats = this.rewards.milestones[i].stats;
                xp_multipliers = this.rewards.milestones[i].xp_multipliers;
                
                if(stats) {
                    Object.keys(stats).forEach(stat => {
                        if(!gains.stats[stat]) {
                            gains.stats[stat] = {};
                        }
                        if(stats[stat].flat) {
                            gains.stats[stat].flat = (gains.stats[stat].flat || 0) + stats[stat].flat;
                        }
                        if(stats[stat].multiplier) {
                            gains.stats[stat].multiplier =  (gains.stats[stat].multiplier || 1) * stats[stat].multiplier;
                        }
                        
                    });
                }

                if(xp_multipliers) {
                    Object.keys(xp_multipliers).forEach(multiplier => {
                        gains.xp_multipliers[multiplier] = (gains.xp_multipliers[multiplier] || 1) * xp_multipliers[multiplier];
                        if(which_skills_affect_skill[multiplier]) {
                            if(!which_skills_affect_skill[multiplier].includes(this.skill_id)) {
                                which_skills_affect_skill[multiplier].push(this.skill_id);
                            }
                        } else {
                            which_skills_affect_skill[multiplier] = [this.skill_id];
                        }
                       
                    });
                }
            }
        }
        
        Object.keys(gains.stats).forEach((stat) => {
            if(gains.stats[stat].multiplier) {
                gains.stats[stat].multiplier = Math.round(100 * gains.stats[stat].multiplier) / 100;
            }
        });
        
        return gains;
    }
    get_coefficient(scaling_type) { //starts from 1
        //maybe lvl as param, with current lvl being used if it's undefined?

        switch (scaling_type) {
            case "flat":
                return 1 + Math.round((this.max_level_coefficient - 1) * this.current_level / this.max_level * 1000) / 1000;
            case "multiplicative":
                return Math.round(Math.pow(this.max_level_coefficient, this.current_level / this.max_level) * 1000) / 1000;
            default: //same as on multiplicative
                return Math.round(Math.pow(this.max_level_coefficient, this.current_level / this.max_level) * 1000) / 1000;
        }
    }
    get_level_bonus() { //starts from 0
        return this.max_level_bonus * this.current_level / this.max_level;
    }
    get_parent_xp_multiplier() {
        if(this.parent_skill) {
            return (1.1**Math.max(0,skills[this.parent_skill].current_level-this.current_level));
        } else {
            return 1;
        }
    }
}

/**
 * @param {String} skill_id key from skills object
 * @returns all unlocked leveling rewards, formatted to string
 */
function get_unlocked_skill_rewards(skill_id) {
    let unlocked_rewards = '';
    
    if(skills[skill_id].rewards){ //rewards
        const milestones = Object.keys(skills[skill_id].rewards.milestones).filter(level => level <= skills[skill_id].current_level);
        if(milestones.length > 0) {
            unlocked_rewards = `lvl ${milestones[0]}: ${format_skill_rewards(skills[skill_id].rewards.milestones[milestones[0]])}`;
            for(let i = 1; i < milestones.length; i++) {
                unlocked_rewards += `<br>\n\nlvl ${milestones[i]}: ${format_skill_rewards(skills[skill_id].rewards.milestones[milestones[i]])}`;
            }
        }
    } else { //no rewards
        return '';
    }

    return unlocked_rewards;
}

/**
 * gets rewards for next lvl
 * @param {String} skill_id key used in skills object
 * @returns rewards for next level, formatted to a string
 */
/*
function get_next_skill_reward(skill_id) {
    if(skills[skill_id].current_level !== "Max!") {
        let rewards = skills[skill_id].rewards.milestones[get_next_skill_milestone(skill_id)];
        
        if(rewards) {
            return format_skill_rewards(rewards);
        } else {
            return '';
        }
    } else {
        return '';
    }
}
*/

/**
 * 
 * @param {*} skill_id key used in skills object
 * @returns next lvl at which skill has any rewards
 */
function get_next_skill_milestone(skill_id){
    let milestone;
    if(skills[skill_id].rewards){
        milestone = Object.keys(skills[skill_id].rewards.milestones).find(
            level => level > skills[skill_id].current_level);
    }
    return milestone;
}

/**
 * @param milestone milestone from object rewards - {stats: {stat1, stat2... }} 
 * @returns rewards formatted to a nice string
 */
function format_skill_rewards(milestone){
    let formatted = '';
    if(milestone.stats) {
        let temp = '';
        Object.keys(milestone.stats).forEach(stat => {
            if(milestone.stats[stat].flat) {
                if(formatted) {
                    formatted += `, +${milestone.stats[stat].flat} ${stat_names[stat]}`;
                } else {
                    formatted = `+${milestone.stats[stat].flat} ${stat_names[stat]}`;
                }
            }
            if(milestone.stats[stat].multiplier) {
                if(temp) {
                    temp += `, x${milestone.stats[stat].multiplier} ${stat_names[stat]}`;
                } else {
                    temp = `x${milestone.stats[stat].multiplier} ${stat_names[stat]}`;
                }
            }
        });
        if(formatted) {
            formatted += ", " + temp;
        } else {
            formatted = temp;
        }
    }

    if(milestone.xp_multipliers) {
        const xp_multipliers = Object.keys(milestone.xp_multipliers);
        let name;
        if(xp_multipliers[0] !== "all" && xp_multipliers[0] !== "hero" && xp_multipliers[0] !== "all_skill") {
            name = skills[xp_multipliers[0]].name();
        } else {
            name = xp_multipliers[0].replace("_"," ");
        }
        if(formatted) {
            formatted += `, x${milestone.xp_multipliers[xp_multipliers[0]]} ${name} xp gain`;
        } else {
            formatted = `x${milestone.xp_multipliers[xp_multipliers[0]]} ${name} xp gain`;
        }
        for(let i = 1; i < xp_multipliers.length; i++) {
            let name;
            if(xp_multipliers[i] !== "all" && xp_multipliers[i] !== "hero" && xp_multipliers[i] !== "all_skill") {
                name = skills[xp_multipliers[i]].name();
            } else {
                name = xp_multipliers[i].replace("_"," ");
            }
            formatted += `, x${milestone.xp_multipliers[xp_multipliers[i]]} ${name} xp gain`;
        }
    }
    if(milestone.unlocks) {
        const unlocked_skills = milestone.unlocks.skills;
        if(formatted) {
            formatted += `, <br> Unlocked skill "${milestone.unlocks.skills[0]}"`;
        } else {
            formatted = `Unlocked skill "${milestone.unlocks.skills[0]}"`;
        }
        for(let i = 1; i < unlocked_skills.length; i++) {
            formatted += `, "${milestone.unlocks.skills[i]}"`;
        }
    }
    return formatted;
}

//basic combat skills
(function(){
    skills["Combat"] = new Skill({skill_id: "Combat", 
                                names: {0: "Combat"}, 
                                category: "Combat",
                                description: "Overall combat ability", 
                                max_level_coefficient: 2,
                                base_xp_cost: 60,
                                get_effect_description: ()=> {
                                    return `Multiplies hit chance by ${Math.round(skills["Combat"].get_coefficient("multiplicative")*1000)/1000}`;
                                }});
    
    skills["Pest killer"] = new Skill({skill_id: "Pest killer", 
                                names: {0: "Pest killer", 15: "Pest slayer"}, 
                                description: "Small enemies might not seem very dangerous, but it's not that easy to hit them!", 
                                max_level_coefficient: 2,
                                category: "Combat",
                                base_xp_cost: 100,
                                get_effect_description: ()=> {
                                    return `Multiplies hit chance against small-type enemies by ${Math.round(skills["Pest killer"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                rewards:
                                {
                                    milestones: {
                                        1: {
                                            xp_multipliers: {
                                                Combat: 1.05,
                                            }
                                        },
                                        3: {
                                            stats: {
                                                dexterity: {flat: 1},
                                            },
                                            xp_multipliers: {
                                                Combat: 1.1,
                                            }
                                        },
                                        5: {
                                            stats: {
                                                dexterity: {multiplier: 1.05},
                                            },
                                            xp_multipliers: {
                                                Evasion: 1.1,
                                                "Shield blocking": 1.1,
                                            }
                                        }
                                    }
                                }
                            });    
                                
    skills["Giant slayer"] = new Skill({skill_id: "Giant slayer", 
                                names: {0: "Giant killer", 15: "Giant slayer"}, 
                                description: "Large opponents might seem scary, but just don't get hit and you should be fine!", 
                                max_level_coefficient: 2,
                                category: "Combat",
                                get_effect_description: ()=> {
                                    return `Multiplies evasion against large-type enemies by ${Math.round(skills["Giant slayer"].get_coefficient("multiplicative")*1000)/1000}`;
                                }});

    skills["Evasion"] = new Skill({skill_id: "Evasion", 
                                names: {0: "Evasion"},                                
                                description:"Ability to evade attacks", 
                                max_level_coefficient: 2,
                                base_xp_cost: 20,
                                category: "Combat",
                                get_effect_description: ()=> {
                                    return `Multiplies your evasion chance by ${Math.round(skills["Evasion"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                "agility": {flat: 1},
                                            }
                                        },
                                        3: {
                                            stats: {
                                                "agility": {flat: 1},
                                            },
                                            xp_multipliers: {
                                                Equilibrium: 1.05,
                                            }
                                        },
                                        5: {
                                            stats: {
                                                "agility": {
                                                    flat: 1,
                                                    multiplier: 1.05,
                                                }
                                            },
                                        },
                                        7: {
                                            stats: {
                                                "agility": {flat: 2},
                                            },
                                            xp_multipliers: {
                                                Equilibrium: 1.05,
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "agility": {
                                                    flat: 1,
                                                    multiplier: 1.05,
                                                }
                                            },
                                        }
                                    }
                                }
                            });
    skills["Shield blocking"] = new Skill({skill_id: "Shield blocking", 
                                    names: {0: "Shield blocking"}, 
                                    description: "Ability to block attacks with shield", 
                                    max_level: 30, 
                                    max_level_bonus: 0.2,
                                    category: "Combat",
                                    get_effect_description: ()=> {
                                        return `Increases block chance by flat ${Math.round(skills["Shield blocking"].get_level_bonus()*1000)/10}%. Increases blocked damage by ${Math.round(skills["Shield blocking"].get_level_bonus()*5000)/10}%`;
                                    }});
    
     skills["Unarmed"] = new Skill({skill_id: "Unarmed", 
                                    names: {0: "Unarmed", 10: "Brawling", 20: "Martial arts"}, 
                                    description: "It's definitely, unquestionably, undoubtedly better to just use a weapon instead of doing this. But sure, why not?",
                                    category: "Combat",
                                    get_effect_description: ()=> {
                                        return `Multiplies damage dealt in unarmed combat by ${Math.round(skills["Unarmed"].get_coefficient("multiplicative")*1000)/1000}. 
Multiplies attack speed and AP in unarmed combat by ${Math.round((skills["Unarmed"].get_coefficient("multiplicative")**0.3333)*1000)/1000}`;
                                    },
                                    max_level_coefficient: 64, //even with 8x more it's still gonna be worse than just using a weapon lol
                                    rewards: {
                                        milestones: {
                                            2: {
                                                stats: {
                                                    "strength": {flat: 1},
                                                },
                                                xp_multipliers: {
                                                    Weightlifting: 1.05,
                                                }
                                            },
                                            4: {
                                                stats: {
                                                    "strength": {flat: 1},
                                                    "dexterity": {flat: 1},
                                                }
                                            },
                                            6: {
                                                stats: {
                                                    "strength": {flat: 1},
                                                    "dexterity": {flat: 1},
                                                    "agility": {flat: 1},
                                                },
                                                xp_multipliers: {
                                                    Weightlifting: 1.1,
                                                }
                                            },
                                            8: {
                                                stats: {
                                                    "strength": {flat: 1},
                                                    "dexterity": {flat: 1},
                                                    "agility": {flat: 1},
                                                }
                                            },
                                            10: {
                                                stats: {
                                                    "strength": {flat: 2},
                                                    "dexterity": {flat: 1},
                                                    "agility": {flat: 1},
                                                },
                                                xp_multipliers: {
                                                    Running: 1.2,
                                                }
                                            },
                                            12: {
                                                stats: {
                                                    "strength": {flat: 2},
                                                    "dexterity": {flat: 2},
                                                    "agility": {flat: 2},
                                                }
                                            },
                                        }
                                    }});                                
})();

//combat stances
(function(){
    skills["Stance mastery"] = new Skill({skill_id: "Stance mastery", 
                                    names: {0: "Stance proficiency", 10: "Stance mastery"}, 
                                    description: "Knowledge on how to apply different stances in combat",
                                    base_xp_cost: 60,
                                    category: "Stance",
                                    max_level: 30,
                                    get_effect_description: ()=> {
                                        return `Increases xp gains of all combat stance skills of level lower than this, x1.1 per level of difference`;
                                    },
                                });
    skills["Quick steps"] = new Skill({skill_id: "Quick steps", 
                                names: {0: "Quick steps"}, 
                                parent_skill: "Stance mastery",
                                description: "A swift and precise technique that abandons strength in favor of greater speed", 
                                max_level_coefficient: 2,
                                base_xp_cost: 60,
                                category: "Stance",
                                max_level: 30,
                                get_effect_description: ()=> {
                                    return `Improves efficiency of the 'Quick Steps' stance`;
                                }});
    skills["Heavy strike"] = new Skill({skill_id: "Heavy strike", 
                                names: {0: "Crushing force"}, 
                                parent_skill: "Stance mastery",
                                description: "A powerful and dangerous technique that abandons speed in favor of overwhelmingly strong attacks", 
                                max_level_coefficient: 2,
                                base_xp_cost: 60,
                                category: "Stance",
                                max_level: 30,
                                get_effect_description: ()=> {
                                    return `Improves efficiency of the "Crushing force" stance`;
                                }});
    skills["Wide swing"] = new Skill({skill_id: "Wide swing", 
                                names: {0: "Broad arc"}, 
                                parent_skill: "Stance mastery",
                                description: "A special technique that allows striking multiple enemies at once, although at a cost of lower damage", 
                                max_level_coefficient: 2,
                                base_xp_cost: 60,
                                category: "Stance",
                                max_level: 30,
                                get_effect_description: ()=> {
                                    return `Improves efficiency of the "Broad arc" stance`;
                                }});
    skills["Defensive measures"] = new Skill({skill_id: "Defensive measures", 
                                names: {0: "Defensive measures"}, 
                                parent_skill: "Stance mastery",
                                description: "A careful technique focused much more on defense than on attacking", 
                                max_level_coefficient: 2,
                                base_xp_cost: 60,
                                category: "Stance",
                                max_level: 30,
                                get_effect_description: ()=> {
                                    return `Improves efficiency of the 'Defensive Measures' stance`;
                                }});
    skills["Berserker's stride"] = new Skill({skill_id: "Berserker's stride", 
                                names: {0: "Berserker's stride"}, 
                                parent_skill: "Stance mastery",
                                description: "A wild and dangerous technique that focuses on dealing as much damage as possible, while completely ignoring own defense", 
                                max_level_coefficient: 2,
                                base_xp_cost: 60,
                                category: "Stance",
                                max_level: 30,
                                get_effect_description: ()=> {
                                    return `Improves efficiency of the 'Berserker's Stride' stance`;
                                }});                  
    skills["Flowing water"] = new Skill({skill_id: "Flowing water", 
                                names: {0: "Flowing water"}, 
                                parent_skill: "Stance mastery",
                                description: "A wild and dangerous technique that focuses on dealing as much damage as possible, while completely ignoring own defense", 
                                max_level_coefficient: 2,
                                base_xp_cost: 60,
                                category: "Stance",
                                max_level: 30,
                                get_effect_description: ()=> {
                                    return `Improves efficiency of the 'Flowing Water' stance`;
                                }});         
                               
})();

//environment related skills
(function(){
    skills["Spatial awareness"] = new Skill({
                                            skill_id: "Spatial awareness", 
                                            names: {0: "Spatial awareness"}, 
                                            description: "Understanding where you are in relation to other creatures and objects", 
                                            get_effect_description: ()=> {
                                                return `Reduces environmental penalty in open areas by ^${Math.round(100-100*skills["Spatial awareness"].current_level/skills["Spatial awareness"].max_level)/100}`;
                                            },
                                            category: "Environmental",
                                            rewards: {
                                                milestones: {
                                                    3: {
                                                        xp_multipliers:{ 
                                                            Evasion: 1.1,
                                                            "Shield blocking": 1.1,
                                                        },
                                                    },
                                                    5: {
                                                        xp_multipliers: {
                                                            Combat: 1.1,
                                                        }
                                                    },
                                                    8: {
                                                        xp_multipliers: {
                                                            all_skill: 1.1,
                                                        }
                                                    }
                                                }
                                            }
                                        });
    skills["Tight maneuvers"] = new Skill({
                                        skill_id: "Tight maneuvers", 
                                        names: {0: "Tight maneuvers"}, 
                                        description: "Learn how to fight in narrow environment, where there's not much space for dodging attacks", 
                                        category: "Environmental",
                                        get_effect_description: ()=> {
                                            return `Reduces environmental penalty in narrow areas by ^${Math.round(100-100*skills["Tight maneuvers"].current_level/skills["Tight maneuvers"].max_level)/100}`;
                                        },
                                        rewards: {
                                            milestones: {
                                                3: {
                                                    xp_multipliers: {
                                                        Evasion: 1.1,
                                                        "Shield blocking": 1.1,
                                                    }
                                                },
                                                5: {
                                                    xp_multipliers: {
                                                        Combat: 1.1,
                                                    }
                                                },
                                            }
                                        }
                                    });
    skills["Night vision"] = new Skill({
                                    skill_id: "Night vision",
                                    names: {0: "Night vision"},
                                    description: "Ability to see in darkness",
                                    base_xp_cost: 600,
                                    xp_scaling: 1.9,
                                    max_level: 10,
                                    category: "Environmental",
                                    get_effect_description: () => {
                                        return `Reduces darkness penalty (except for 'pure darkness') by ^${Math.round(100-100*skills["Night vision"].current_level/skills["Night vision"].max_level)/100}`;
                                    },
                                    rewards: {
                                        milestones: {
                                            2: {
                                                stats: {
                                                    intuition: {flat: 1},
                                                }
                                            },
                                            3: {
                                                xp_multipliers: {
                                                    Evasion: 1.05,
                                                    "Shield blocking": 1.05,
                                                }
                                            },
                                            4: {
                                                stats: {
                                                    intuition: {flat: 1},
                                                },
                                                xp_multipliers: {
                                                   "Presence sensing": 1.05
                                                }

                                             },
                                            5: {    
                                                xp_multipliers: 
                                                {
                                                    Combat: 1.1,
                                                },
                                                stats: {
                                                    intuition: {multiplier: 1.05},
                                                }
                                            },
                                            6: {
                                                xp_multipliers: {
                                                    "Presence sensing": 1.1,
                                                }
                                            }
                                        }
                                    }
                            });
    skills["Presence sensing"] = new Skill({
                skill_id: "Presence sensing",
                names: {0: "Presence sensing"},
                description: "Ability to sense a presence without using your eyes",
                base_xp_cost: 60,
                xp_scaling: 2,
                max_level: 20,
                category: "Environmental",
                get_effect_description: () => {
                    return `Reduces extreme darkness penalty by ^${Math.round(100-100*skills["Presence sensing"].current_level/skills["Presence sensing"].max_level)/100}`;
                },
                rewards: {
                    milestones: {
                        1: {
                            stats: {
                                intuition: {flat: 1},
                            },
                            xp_multipliers: {
                                "Night vision": 1.1,
                            }
                        },
                        
                        2: {
                            xp_multipliers: {
                                Evasion: 1.1,
                                "Shield blocking": 1.1,
                            }
                        },
                        3: {
                            stats: {
                                intuition: {flat: 1},
                            },
                            xp_multipliers: {
                               "Combat": 1.1
                            }

                         },
                        4: {    
                            xp_multipliers: 
                            {
                                all_skill: 1.05,
                            },
                            stats: {
                                intuition: {multiplier: 1.1},
                            }
                        },
                        5: {
                            xp_multipliers: {
                                all: 1.05,
                            }
                        }
                    }
                }
            });
    skills["Heat resistance"] = new Skill({
        skill_id: "Heat resistance",
        names: {0: "Heat resistance"},
        description: "Ability to survive and function in high temperatures",
        base_xp_cost: 100,
        max_level: 40,
        category: "Environmental",
        get_effect_description: () => {
            return `Reduces penalty from hot locations`;
        }
    });
    skills["Cold resistance"] = new Skill({
        skill_id: "Cold resistance",
        names: {0: "Cold resistance"},
        description: "Ability to survive and function in low temperatures",
        base_xp_cost: 100,
        max_level: 40,
        category: "Environmental",
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
        category: "Environmental",
        get_effect_description: ()=> {
            return `Reduces hit and evasion penalty in super bright areas`;
        },
        max_level_bonus: 0.5
    });
})();

//weapon skills
(function(){
    skills["Weapon mastery"] = new Skill({skill_id: "Weapon mastery", 
                                    names: {0: "Weapon proficiency", 15: "Weapon mastery"}, 
                                    description: "Knowledge of all weapons",
                                    category: "Weapon",
                                    get_effect_description: ()=> {
                                        return `Increases xp gains of all weapon skills of level lower than this, x1.1 per level of difference`;
                                    },
                                });
    skills["Swords"] = new Skill({skill_id: "Swords", 
                                  parent_skill: "Weapon mastery",
                                  names: {0: "Swordsmanship"}, 
                                  category: "Weapon",
                                  description: "The noble art of swordsmanship", 
                                  get_effect_description: ()=> {
                                      return `Multiplies damage dealt with swords by ${Math.round(skills["Swords"].get_coefficient("multiplicative")*1000)/1000}.
Multiplies AP with swords by ${Math.round((skills["Swords"].get_coefficient("multiplicative")**0.3333)*1000)/1000}`;
                                  },
                                  rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        3: {
                                            stats: {
                                                "agility": {flat: 1},
                                            }
                                        },
                                        5: {
                                            stats: {
                                                "strength": {flat: 1},
                                                "crit_rate": {flat: 0.01},
                                            },
                                        },
                                        7: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "agility": {flat: 1},
                                                "crit_multiplier": {flat: 0.1}, 
                                            },
                                        },
                                        12: {
                                            stats: {
                                                "dexterity": {flat: 2},
                                            }
                                        },
                                    }
                                 },
                                 max_level_coefficient: 8
                            });

    skills["Axes"] = new Skill({skill_id: "Axes", 
                                parent_skill: "Weapon mastery",
                                names: {0: "Axe combat"}, 
                                category: "Weapon",
                                description: "Ability to fight with use of axes", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with axes by ${Math.round(skills["Axes"].get_coefficient("multiplicative")*1000)/1000}.
Multiplies AP with axes by ${Math.round((skills["Axes"].get_coefficient("multiplicative")**0.3333)*1000)/1000}`;
                                },
                                rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        3: {
                                            stats: {
                                                "strength": {flat: 1},
                                            }
                                        },
                                        5: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                                "strength": {flat: 1},
                                            },
    
                                        },
                                        7: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        10: {
                                            stats: {
                                                    "strength": {flat: 1.05},
                                            },
                                        },
                                        12: {
                                            stats: {
                                                "dexterity": {flat: 2},
                                            }
                                        },
                                    }
                                 },
                                max_level_coefficient: 8});

    skills["Spears"] = new Skill({skill_id: "Spears", 
                                parent_skill: "Weapon mastery",
                                names: {0: "Spearmanship"}, 
                                category: "Weapon",
                                description: "The ability to fight with the most deadly weapon in the history", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with spears by ${Math.round(skills["Spears"].get_coefficient("multiplicative")*1000)/1000}.
Multiplies AP with spears by ${Math.round((skills["Spears"].get_coefficient("multiplicative")**0.3333)*1000)/1000}`;
                                },
                                rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        3: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        5: {
                                            stats: {
                                                "strength": {flat: 1},
                                                "crit_rate": {flat: 0.01},
                                            },
                                        },
                                        7: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "strength": {flat: 1},
                                                "crit_multiplier": {flat: 0.1}, 
                                            },
                                        },
                                        12: {
                                            stats: {
                                                "dexterity": {flat: 2},
                                            }
                                        },
                                    }
                                 },
                                max_level_coefficient: 8});

    skills["Hammers"] = new Skill({skill_id: "Hammers", 
                                        parent_skill: "Weapon mastery",
                                        names: {0: "Hammer combat"}, 
                                        category: "Weapon",
                                        description: "Ability to fight with use of battle hammers. Why bother trying to cut someone, when you can just crack all their bones?", 
                                        get_effect_description: ()=> {
                                            return `Multiplies damage dealt with battle hammers by ${Math.round(skills["Hammers"].get_coefficient("multiplicative")*1000)/1000}.
Multiplies AP with hammers by ${Math.round((skills["Hammers"].get_coefficient("multiplicative")**0.3333)*1000)/1000}`;
                                        },
                                        rewards: {
                                            milestones: {
                                                1: {
                                                    stats: {
                                                        "strength": {flat: 1},
                                                    }
                                                },
                                                3: {
                                                    stats: {
                                                        "strength": {flat: 1},
                                                    }
                                                },
                                                5: {
                                                    stats: {
                                                        "strength": {flat: 1},
                                                        "dexterity": {flat: 1},
                                                    },
                                                },
                                                7: {
                                                    stats: {
                                                        "strength": {flat: 1},
                                                    }
                                                },
                                                10: {
                                                    stats: {
                                                        "strength": {flat: 1},
                                                        "dexterity": {flat: 1}, 
                                                    },
                                                },
                                                12: {
                                                    stats: {
                                                        "dexterity": {flat: 2},
                                                    }
                                                },
                                            }
                                         },
                                        max_level_coefficient: 8});

    skills["Daggers"] = new Skill({skill_id: "Daggers",
                                parent_skill: "Weapon mastery",
                                names: {0: "Dagger combat"},
                                category: "Weapon",
                                description: "The looked upon art of fighting (and stabbing) with daggers",
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with daggers by ${Math.round(skills["Daggers"].get_coefficient("multiplicative")*1000)/1000}.
Multiplies AP with daggers by ${Math.round((skills["Daggers"].get_coefficient("multiplicative")**0.3333)*1000)/1000}`;
                                },
                                rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        3: {
                                            stats: {
                                                "agility": {flat: 1},
                                            }
                                        },
                                        5: {
                                            stats: {
                                                "crit_multiplier": {flat: 0.1},
                                                "crit_rate": {flat: 0.01},
                                            },
                                        },
                                        7: {
                                            stats: {
                                                "dexterity": {flat: 1},
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "crit_rate": {flat: 0.02},
                                                "crit_multiplier": {flat: 0.1}, 
                                            },
                                        },
                                        12: {
                                            stats: {
                                                "dexterity": {flat: 2},
                                            }
                                        },
                                    }
                                 },
                                max_level_coefficient: 8});

    skills["Wands"] = new Skill({skill_id: "Wands", 
                                parent_skill: "Weapon mastery",
                                names: {0: "Wand casting"}, 
                                category: "Weapon",
                                description: "Ability to cast spells with magic wands, increases damage dealt", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with wands by ${Math.round(skills["Wands"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Staffs"] = new Skill({skill_id: "Staffs", 
                                parent_skill: "Weapon mastery",
                                names: {0: "Staff casting"}, 
                                category: "Weapon",
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
                                description: "Even a simple action of plowing some fields, can be performed better with skills and experience",
                                base_xp_cost: 40,
                                category: "Activity",
                                max_level: 10,
                                xp_scaling: 1.6,
                                max_level_coefficient: 2,
                                rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                max_stamina: {flat: 2},
                                            },
                                        },
                                        2: {
                                            stats: {
                                                strength: {flat: 1}
                                            },
                                        },
                                        3: {
                                            stats: {
                                                dexterity: {flat: 1},
                                                max_stamina: {flat: 2},
                                            }
                                        },
                                        4: {
                                            stats: {
                                                strength: {flat: 1},
                                                max_stamina: {flat: 2},
                                            }
                                        },
                                        5: {
                                            stats: {
                                                strength: {flat: 1},
                                                max_stamina: {flat: 2},
                                            },
                                            xp_multipliers: {
                                                "Herbalism": 1.05,
                                            }
                                        },
                                        6: {
                                            stats: {
                                                strength: {flat: 1},
                                            },
                                            xp_multipliers: {
                                                Weightlifting: 1.1,
                                            }
                                        },
                                        7: {
                                            stats: {
                                                dexterity: {flat: 1},
                                                max_stamina: {flat: 2},
                                            },
                                            xp_multipliers: {
                                                "Unarmed": 1.05,
                                            }
                                        },
                                        8: {
                                            stats: {
                                                strength: {flat: 1},
                                                max_stamina: {flat: 2},
                                            }
                                        },
                                        9: {
                                            stats: {
                                                strength: {flat: 1},
                                                dexterity: {flat: 1},
                                            },
                                        },
                                        10: {
                                            stats: {
                                                max_stamina: {flat: 4},
                                                strength: {multiplier: 1.05},
                                                dexterity: {multiplier: 1.05},
                                            },
                                            xp_multipliers: {
                                                "Unarmed": 1.1,
                                                "Herbalism": 1.1,
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
                                    visibility_treshold: 300,
                                    xp_scaling: 2,
                                    category: "Activity",
                                    max_level: 10,
                                    max_level_coefficient: 2.5,    
                                    rewards: {
                                        milestones: {
                                            2: {
                                                stats: {
                                                    "max_health": {
                                                        flat: 10,
                                                        multiplier: 1.05,
                                                    }
                                                },
                                                xp_multipliers: {
                                                    all: 1.05,
                                                }
                                            },
                                            4: {
                                                stats: {
                                                    "max_health": {
                                                        flat: 20,
                                                        multiplier: 1.05,
                                                    }
                                                },
                                                xp_multipliers: {
                                                    all: 1.05,
                                                },
                                            },
                                            5: {
                                                unlocks: {
                                                    skills: [
                                                        "Meditation"
                                                    ]
                                                }
                                            },
                                            6: {
                                                stats: {
                                                    "max_health": {
                                                        flat: 30,
                                                        multiplier: 1.05,
                                                    }
                                                },
                                                xp_multipliers: {
                                                    all: 1.05,
                                                    "Meditation": 1.1,
                                                }
                                            },
                                            8: {
                                                stats: {
                                                    "max_health": {
                                                        flat: 40,
                                                        multiplier: 1.05,
                                                    }
                                                },
                                                xp_multipliers: {
                                                    all: 1.05,
                                                }
                                            },
                                            10: {
                                                stats: {
                                                    "max_health": {
                                                        flat: 50,
                                                        multiplier: 1.1,
                                                    }
                                                },
                                                xp_multipliers: {
                                                    all: 1.1,
                                                    "Meditation": 1.1,
                                                }
                                            }
                                        }
                                    }
                                });
    skills["Meditation"] = new Skill({skill_id: "Meditation",
                                names: {0: "Meditation"}, 
                                description: "Focus your mind",
                                base_xp_cost: 200,
                                category: "Activity",
                                max_level: 30, 
                                is_unlocked: false,
                                visibility_treshold: 0,
                                rewards: {
                                    milestones: {
                                        2: {
                                            stats: {
                                                "intuition": {flat: 1},
                                            },
                                            xp_multipliers: {
                                                all: 1.05,
                                                "Presence sensing": 1.05,
                                            }
                                        },
                                        4: {
                                            stats: {
                                                "intuition": {
                                                    flat: 1, 
                                                    multiplier: 1.05
                                                }
                                            },
                                            xp_multipliers: {
                                                all: 1.05,
                                            }
                                        },
                                        5: {
                                            xp_multipliers: {
                                                "Sleeping": 1.1,
                                                "Presence sensing": 1.05,
                                            }
                                        },
                                        6: {
                                            stats: {
                                                "intuition": {
                                                    flat: 2,
                                                }
                                            },
                                        },
                                        8: {
                                            stats: {
                                                "intuition": {
                                                    multiplier: 1.05
                                                },
                                            },
                                            xp_multipliers: {
                                                all: 1.05,
                                                "Sleeping": 1.1,
                                                "Presence sensing": 1.05,
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "intuition": {
                                                    flat: 2,
                                                    multiplier: 1.05
                                                }
                                            },
                                            xp_multipliers: {
                                                all: 1.1,
                                                "Sleeping": 1.1,
                                                "Presence sensing": 1.1,
                                            }
                                        }
                                    }
                                }
                            });                            
    skills["Running"] = new Skill({skill_id: "Running",
                                  description: "Great way to improve the efficiency of the body",
                                  names: {0: "Running"},
                                  max_level: 50,
                                  category: "Activity",
                                  max_level_coefficient: 2,
                                  base_xp_cost: 50,
                                  rewards: {
                                    milestones: {
                                        1: {
                                            stats: {
                                                agility: {
                                                    flat: 1
                                                },
                                            }
                                        },
                                        3: {
                                            stats: {
                                                agility: {
                                                    flat: 1
                                                },
                                            }
                                        },
                                        5: {
                                            stats: {
                                                agility: {
                                                    flat: 1,
                                                },
                                                max_stamina: {
                                                    multiplier: 1.05,
                                                }
                                            },                                          
                                        },
                                        7: {
                                            stats: {
                                                agility: {
                                                    flat: 1,
                                                    multiplier: 1.05,
                                                }
                                            },
                                        },
                                        10: {
                                            stats: {
                                                agility: {
                                                    flat: 1,
                                                    multiplier: 1.05,
                                                },
                                                max_stamina: {
                                                    multiplier: 1.05,
                                                }
                                            },
                                        },
                                        12: {
                                            stats: {
                                                agility: {
                                                    flat: 2
                                                },
                                                max_stamina: {
                                                    flat: 5
                                                }
                                            },
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
                                    return `Multiplies stamina efficiency by ${value}`;
                                  },
                                  
                                });
    skills["Weightlifting"] = new Skill({skill_id: "Weightlifting",
    description: "No better way to get stronger than by lifting heavy things",
    names: {0: "Weightlifting"},
    max_level: 50,
    category: "Activity",
    max_level_coefficient: 4,
    base_xp_cost: 50,
    rewards: {
      milestones: {
          1: {
              stats: {
                strength: {
                    flat: 1
                },
              },
          },
          3: {
              stats: {
                strength: {
                    flat: 1
                },
              },
              xp_multipliers: {
                "Unarmed": 1.05,
              }
          },
          5: {
              stats: {
                strength: {
                    flat: 1,
                    multiplier: 1.05,
                },
                max_stamina: {
                    multiplier: 1.05,
                }
              },
          },
          7: {
              stats: {
                strength: {
                    flat: 1
                },
              },
              xp_multipliers: {
                "Unarmed": 1.1,
              }
          },
          10: {
              stats: {
                  strength: {
                    flat: 1, 
                    multiplier: 1.05
                },
                max_stamina: {
                    multiplier: 1.05,
                }
              },
          },
          12: {
            stats: {
                strength: {
                    flat: 2
                },
                max_stamina: {
                    flat: 5
                }
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
    skills["Equilibrium"] = new Skill({skill_id: "Equilibrium",
    description: "Nothing will throw you off your balance (at least the physical one)",
    names: {0: "Equilibrium"},
    category: "Activity",
    max_level: 50,
    max_level_coefficient: 4,
    base_xp_cost: 50,
    rewards: {
      milestones: {
          1: {
              stats: {
                agility: {flat: 1},
              },
          },
          3: {
              stats: {
                intuition: {flat: 1},
              }
          },
          5: {
              stats: {
                agility: {
                    flat: 1,
                    multiplier: 1.05,
                },
                strength: {flat: 1},
                max_stamina: {multiplier: 1.05},
              },
              xp_multipliers: {
                "Unarmed": 1.1,
              }
          },
          7: {
              stats: {
                intuition: {flat: 1},
              },
          },
          9: {
            stats: {
                strength: {flat: 1},
            }
          },
          10: {
              stats: {
                agility: {flat: 1},
                intuition: {multiplier: 1.05},
                max_stamina: {multiplier: 1.05},
              },
          },
          12: {
            stats: {
                agility: {flat: 1},
                strength: {flat: 1},
            }
          }
      }
    },
    get_effect_description: ()=> {
      let value = skills["Equilibrium"].get_coefficient("multiplicative");
      if(value >= 100) {
          value = Math.round(value);
      } else if(value >= 10 && value < 100) {
          value = Math.round(value*10)/10; 
      } else {
          value = Math.round(value*100)/100;
      }
      return `Multiplies agility by ${value}`;
    },
    
    });
})();

//resource gathering related
(function(){
    skills["Woodcutting"] = new Skill({skill_id: "Woodcutting", 
        names: {0: "Woodcutting"}, 
        description: "Get better with chopping the wood",
        category: "Activity",
        base_xp_cost: 10,
        visibility_treshold: 4,
        xp_scaling: 1.6,
    });

    skills["Mining"] = new Skill({skill_id: "Mining",
        names: {0: "Mining"}, 
        description: "Get better with mining the ores",
        category: "Activity",
        base_xp_cost: 10,
        visibility_treshold: 4,
        xp_scaling: 1.6,
    });

    skills["Herbalism"] = new Skill({skill_id: "Herbalism",
        names: {0: "Herbalism"}, 
        description: "Knowledge of useful plants and mushrooms",
        category: "Activity",
        base_xp_cost: 10,
        visibility_treshold: 4,
        xp_scaling: 1.6,
    });

    skills["Animal handling"] = new Skill({
        skill_id: "Animal handling",
        names: {0: "Animal handling"}, 
        description: "Knowledge and skills required to deal with a wide variety of animals",
        category: "Activity",
        base_xp_cost: 10,
        visibility_treshold: 4,
        xp_scaling: 1.6,
    });
})();

//crafting skills
(function(){
    skills["Crafting"] = new Skill({
        skill_id: "Crafting", 
        names: {0: "Crafting"}, 
        description: "The art of preparing different elements and assembling them together",
        category: "Crafting",
        base_xp_cost: 40,
        xp_scaling: 1.5,
        max_level: 60,
    });
    skills["Smelting"] = new Skill({
        skill_id: "Smelting", 
        names: {0: "Smelting"}, 
        description: "Turning raw ore into raw metal",
        category: "Crafting",
        base_xp_cost: 40,
        xp_scaling: 1.5,
        max_level: 60,
    });
    skills["Forging"] = new Skill({
        skill_id: "Forging", 
        names: {0: "Forging"}, 
        description: "Turning raw metal into something useful",
        category: "Crafting",
        base_xp_cost: 40,
        xp_scaling: 1.5,
        max_level: 60,
    });
    skills["Cooking"] = new Skill({
        skill_id: "Cooking", 
        names: {0: "Cooking"}, 
        description: "Making the unedible edible",
        category: "Crafting",
        base_xp_cost: 40,
        xp_scaling: 1.5,
        max_level: 60,
    });
    skills["Alchemy"] = new Skill({
        skill_id: "Alchemy", 
        names: {0: "Alchemy"}, 
        description: "Extracting and enhancing useful properties of the ingredies",
        category: "Crafting",
        base_xp_cost: 40,
        xp_scaling: 1.5,
        max_level: 60,
    });
})();

//defensive skills
(function(){
    skills["Iron skin"] = new Skill({
        skill_id: "Iron skin",
        category: "Combat",
        names: {0: "Tough skin", 5: "Wooden skin", 10: "Iron skin"},
        description: "As it gets damaged, your skin regenerates to be tougher and tougher",
        base_xp_cost: 400,
        xp_scaling: 1.9,
        max_level: 30,
        max_level_bonus: 30,
        get_effect_description: ()=> {
            return `Increases base defense by ${Math.round(skills["Iron skin"].get_level_bonus())}`;
        },
        rewards: {
            milestones: {
                3: {
                    stats: {
                        max_health: {multiplier: 1.01},
                    }
                },
                5: {
                    stats: {
                        max_health: {multiplier: 1.01},
                    }
                },
                7: {
                    stats: {
                        max_health: {multiplier: 1.02},
                    }
                },
                10: {
                    stats: {
                        max_health: {multiplier: 1.02},
                    }
                },
                12: {
                    stats: {
                        max_health: {multiplier: 1.02},
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
        category: "Character",
        max_level: 30,
        get_effect_description: ()=> {
            return `Increases low stamina stat multiplier to x${(50+Math.round(skills["Persistence"].get_level_bonus()*100000)/1000)/100} (originally x0.5)`;
        },
        rewards: {
            milestones: {
                2: {
                    stats: {
                        max_stamina: {flat: 5},
                    },
                    xp_multipliers: {
                        all_skill: 1.05,
                    }
                },
                4: {
                    stats: {
                        max_stamina: {flat: 5},
                    },
                    xp_multipliers: {
                        hero: 1.05,
                    }
                },
                6: {
                    stats: {
                        max_stamina: {flat: 10},
                    },
                    xp_multipliers: {
                        all: 1.05,
                    }
                },
                8: {
                    stats: {
                        max_stamina: {flat: 10},
                    },
                    xp_multipliers: {
                        all: 1.05,
                    }
                },
                10: {
                    stats: {
                        max_stamina: {flat: 10},
                    },
                    xp_multipliers: {
                        all: 1.05,
                    }
                }

            }
        },
        max_level_bonus: 0.3
    });
    skills["Perception"] = new Skill({
        skill_id: "Perception", 
        names: {0: "Perception"}, 
        description: "Better grasp on your senses allows you to notice small and hidden things, as well as to discern the true nature of what you obsere",
        
        category: "Character",max_level_coefficient: 2,
        get_effect_description: ()=> {
            return ``;
        },
        rewards: {
            milestones: {
                //todo when skill is in use somewhere
            }
        }
    }); 
    skills["Literacy"] = new Skill({
        skill_id: "Literacy", 
        names: {0: "Literacy"}, 
        description: "Ability to read and understand written text",
        category: "Character",
        base_xp_cost: 120,
        max_level: 10,
        xp_scaling: 2,
        get_effect_description: ()=> {
            return `Allows reading harder books`;
        },
        rewards: {
            milestones: {
                1: {
                    xp_multipliers: {
                        hero: 1.05,
                    }
                },
                2: {
                    xp_multipliers: {
                        all_skill: 1.05,
                    }
                }
            }
        }
    }); 
})();

//miscellaneous skills
(function(){
    skills["Haggling"] = new Skill({
        skill_id: "Haggling",
        names: {0: "Haggling"},
        description: "The art of the deal",
        category: "Character",
        base_xp_cost: 100,
        max_level: 25,
        get_effect_description: ()=> {
            return `Lowers trader cost multiplier to ${Math.round((1 - skills["Haggling"].get_level_bonus())*100)}% of original value`;
        },
        max_level_bonus: 0.5
    });
    
})();

export {skills, get_unlocked_skill_rewards, get_next_skill_milestone, weapon_type_to_skill, which_skills_affect_skill};
