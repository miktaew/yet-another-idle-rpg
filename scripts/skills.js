const skills = {};
const skill_groups = {};

import { character } from "./character.js";

function Skill(skill_data) {
    this.skill_id = skill_data.skill_id;
    this.names = skill_data.names; // put only {0: name} to have skill always named the same, no matter the level
    this.description = skill_data.description;
    this.current_level = 0; //initial lvl
    this.max_level = skill_data.max_level || 60; //max possible lvl, dont make it too high
    this.max_level_coefficient = skill_data.max_level_coefficient;
    this.current_xp = 0; // how much of xp_to_next_lvl there is currently
    this.total_xp = 0; // total collected xp, on loading calculate lvl based on this (so to not break skills if scaling ever changes)
    this.base_xp_cost = skill_data.base_xp_cost || 40; //xp to go from lvl 1 to lvl 2
    this.xp_to_next_lvl = this.base_xp_cost; //for display only
    this.total_xp_to_next_lvl = this.base_xp_cost; //total xp needed to lvl up
    this.get_effect_description = skill_data.get_effect_description;

    this.skill_group = skill_data.skill_group;
    this.rewards = skill_data.skill_rewards; //leveling rewards (and levels on which they are given)
    /*
    if skill_group is defined, rewards will be based on it and setting them here will have no effect

    as most of skills will provide some bonus anyway, there's no need to give stat reward at every single level
    and might instead give them, let's say, every 5 levels
    */

    this.xp_scaling = typeof skill_data.xp_scaling !== "undefined" && skill_data.xp_scaling > 1? skill_data.xp_scaling : 1.7;
    //how many times more xp needed for next level

    this.name = function() { // returns rank name of skill, based on current level
        const keys = Object.keys(skill_data.names);
        if(keys.length == 1) {
            return(this.names[keys[0]]);
        }
        else {
            var rank_name;
            for(var i = 0; i <= keys.length; i++)
            {
                if(this.current_level >= parseInt(keys[i])) {
                    rank_name = this.names[keys[i]];
                }
                else { 
                     break;
                }
            }
            return rank_name;
        }
    }

    this.add_xp = function(xp_to_add) { //for use when loading game saves, in cases scaling on something is changed
        this.total_xp += xp_to_add;

        if(this.current_level < this.max_level) { //not max lvl

            if(xp_to_add + this.current_xp < this.xp_to_next_lvl) { // no levelup
                this.current_xp += xp_to_add;
            }
            else { //levelup
                var level_after_xp = 0;

                while(this.total_xp >= this.total_xp_to_next_lvl) {

                    level_after_xp += 1;
                    this.total_xp_to_next_lvl = Math.round(this.base_xp_cost * (1 - this.xp_scaling ** (level_after_xp + 1))/(1 - this.xp_scaling));
                } //calculates lvl reached after adding xp
                //probably could be done much more efficiently, but it shouldn't be a problem anyway
                

                var total_xp_to_previous_lvl = Math.round(this.base_xp_cost * (1 - this.xp_scaling ** level_after_xp)/(1 - this.xp_scaling));
                //xp needed for current lvl, same formula but for n-1

                var gains;
                if(level_after_xp < this.max_level ) { //wont reach max lvl
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
                
                var message = `${this.name()} has reached level ${this.current_level}`;

                if(!Object.keys(gains).length == 0) {
                    if(this.skill_group) {
                        message += `<br><br> Thank's to [${this.skill_group}] reaching new milestone, ${character.name} gained: `;
                    } else {
                        message += `<br><br> Thank's to ${this.name()} reaching new milestone, ${character.name} gained: `;
                    }

                    Object.keys(gains).forEach(function(stat) {
                        message += `<br> +${gains[stat]} ${stat}`;
                    });
                }
                return message;
                //TODO: add gained stats ('gains' variable) to returned string
            }
        } 
    }

    this.get_bonus_stats = function(level) { 
        //add stats to character
        //returns all the stats so they can be logged in message_log 
        const gains = {};
        var stats;

        for(let i = this.current_level + 1; i <= level; i++) {
            if(this.skill_group) { //only skill_group rewards

                if(skill_groups[this.skill_group].rewards.milestones[i]) {
                    stats = skill_groups[this.skill_group].rewards.milestones[i].stats;
                    console.log(stats);
                    Object.keys(stats).forEach(function(stat) {
                        gains[stat] = (gains[stat] + stats[stat]) || stats[stat]; 
                    });
                }
            } else { //only normal rewards

                if(this.rewards?.milestones[i]) {
                    stats = this.rewards.milestones[i].stats;
                    console.log(stats);
                    Object.keys(stats).forEach(function(stat) {
                        gains[stat] = (gains[stat] + stats[stat]) || stats[stat]; 
                    });
                }
            }
        }

        Object.keys(gains).forEach(function (stat) {
            character.stats[stat] += gains[stat];
        });

        return gains;
    }

    this.get_coefficient = function(scaling_type) { //get multiplier from skill based on max possible multiplier and current skill level
        //maybe lvl as param, with current lvl being used if it's undefined?

        switch(scaling_type) {
            case "flat":
                return 1 + Math.round((this.max_level_coefficient - 1) * this.current_level/this.max_level * 1000)/1000;
            case "multiplicative": 
                return Math.round(Math.pow(this.max_level_coefficient, this.current_level/this.max_level)*1000)/1000;
                break;
            default:  //same as on multiplicative
                return Math.round(Math.pow(this.max_level_coefficient, this.current_level/this.max_level)*1000)/1000;
                break;
        }
    } 
}

function SkillGroup(skill_group_data) {
    this.rewards = skill_group_data.rewards;
}

skill_groups["weapon skills"] = new SkillGroup({
    rewards: {
        milestones: {
            5: {
                stats: {
                    "strength": 3,
                    "dexterity": 3,
                }
            },
            10: {
                stats: {
                    "strength": 5,
                    "dexterity": 5,
                }
            },
            15: {
                stats: {
                    "strength": 8,
                    "dexterity": 8,
                }
            },
            20: {
                stats: {
                    "strength": 12,
                    "dexterity": 12,
                }
            },
            25: {
                stats: {
                    "strength": 15,
                    "dexterity": 15,
                }
            },
            30: {
                stats: {
                    "strength": 20,
                    "dexterity": 20,
                }
            },
        }
    }
});


//basic combat skills
skills["Combat"] = new Skill({skill_id: "Combat", 
                            names: {0: "Combat"}, 
                            description: "Overall combat ability", 
                            max_level_coefficient: 2,
                            get_effect_description: ()=> {
                                return `Multiplies your hit chance by ${Math.round(skills["Combat"].get_coefficient("multiplicative")*1000)/1000}`;
                            }});

skills["Evasion"] = new Skill({skill_id: "Evasion", 
                               names: {0: "Evasion [Basic]", 15: "Evasion [Intermediate]", 30: "Evasion [Advanced]", 40: "Evasion [Master]", 50: "Evasion [Absolute"},                                
                               description:" Ability to evade attacks", 
                               max_level_coefficient: 2,
                               get_effect_description: ()=> {
                                   return `Multiplies your evasion chance by ${Math.round(skills["Evasion"].get_coefficient("multiplicative")*1000)/1000}`;
                               }});
skills["Shield blocking"] = new Skill({skill_id: "Shield blocking", 
                                names: {0: "Shield blocking"}, 
                                description: "Ability to block attacks with shield", 
                                max_level: 20, 
                                max_level_coefficient: 4,
                                get_effect_description: ()=> {
                                    return `Increases your block chance by flat ${Math.round(skills["Shield blocking"].get_coefficient("flat")*100)/100}%`;
                                }});

//weapon skills
skills["Swords"] = new Skill({skill_id: "Swords", 
                              skill_group: "weapon skills",
                              names: {0: "Sword [Basics]"}, 
                              description: "Ability to fight with use of swords, increases damage dealt", 
                              max_level_coefficient: 8});

skills["Axes"] = new Skill({skill_id: "Axes", 
                            skill_group: "weapon skills",
                            names: {0: "Axe [Basics]"}, 
                            description: "Ability to fight with use of axes, increases damage dealt", 
                            max_level_coefficient: 8});

skills["Spears"] = new Skill({skill_id: "Spears", 
                              skill_group: "weapon skills",
                              names: {0: "Spear [Basics]"}, 
                              description: "Ability to fight with use of spears, increases damage dealt", 
                              max_level_coefficient: 8});

skills["Blunt weapons"] = new Skill({skill_id: "Blunt weapons", 
                                     skill_group: "weapon skills",
                                     names: {0: "Blunt weapons [Basics]"}, 
                                     description: "Ability to fight with use of blunt weapons, increases damage dealt", 
                                     max_level_coefficient: 8});

skills["Daggers"] = new Skill({skill_id: "Daggers",
                               skill_group: "weapon skills",
                               names: {0: "Dagger [Basics]"},
                               description: "Ability to use daggers, increases damage dealt",
                               max_level_coefficient: 8});

skills["Wands"] = new Skill({skill_id: "Wands", 
                             skill_group: "weapon skills",
                             names: {0: "Wand [Basics]"}, 
                             description: "Ability to cast spells with magic wands, increases damage dealt", 
                             max_level_coefficient: 8});

skills["Staffs"] = new Skill({skill_id: "Staffs", 
                              skill_group: "weapon skills",
                              names: {0: "Staff [Basics]"}, 
                              description: "Ability to cast spells with magic staffs, increases damage dealt", 
                              max_level_coefficient: 8});


export {skills};