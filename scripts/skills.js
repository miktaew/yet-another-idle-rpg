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
    this.rewards = skill_data.rewards; //leveling rewards (and levels on which they are given)
    /*
    if skill_group is defined, rewards will be based on it and setting them here will have no effect

    as most of skills will provide some bonus anyway, there's no need to give stat reward at every single level
    and might instead give them, let's say, every 5 levels
    */

    this.xp_scaling = typeof skill_data.xp_scaling !== "undefined" && skill_data.xp_scaling > 1? skill_data.xp_scaling : 1.6;
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
                        message += `<br><br> Thanks to [${this.skill_group}] reaching new milestone, ${character.name} gained: `;
                    } else {
                        message += `<br><br> Thanks to ${this.name()} reaching new milestone, ${character.name} gained: `;
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

        if(this.skill_group) { //only skill_group rewards
            for(let i = skill_groups[this.skill_group].highest_level + 1; i <= level; i++) {
                if(skill_groups[this.skill_group].rewards.milestones[i]) {
                    stats = skill_groups[this.skill_group].rewards.milestones[i].stats;
    
                    Object.keys(stats).forEach(function(stat) {
                        gains[stat] = (gains[stat] + stats[stat]) || stats[stat]; 
                    });
                }

                skill_groups[this.skill_group].highest_level++;
            }
            
        } else { //only normal 
            for(let i = this.current_level + 1; i <= level; i++) {
                if(this.rewards?.milestones[i]) {
                    stats = this.rewards.milestones[i].stats;
    
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
    this.highest_level  = 0;
}

const stat_names = {"strength": "str",
                    "health": "hp",
                    "agility": "agl",
                    "dexterity": "dex",
                    "magic": "magic",
                    "attack_speed": "atk spd",
                    "crit_rate": "crit rate",
                    "crit_multiplier": "crit dmg"};

//get all unlocked leveling rewards, formatted to string
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

//get rewards for next lvl, formatted to string
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

function get_next_skill_milestone(skill_id){
    if(skills[skill_id].rewards){
        return Object.keys(skills[skill_id].rewards.milestones).find(
            level => level > skills[skill_id].current_level);
    } else if(skills[skill_id].skill_group){
        return Object.keys(skill_groups[skills[skill_id].skill_group].rewards.milestones).find(
            level => level > skill_groups[skills[skill_id].skill_group].highest_level);
    }

}

function format_skill_rewards(milestone){
    // num: { stats: {stat1, stat2... }}
    const stats = Object.keys(milestone.stats);
    var formatted = `+${milestone.stats[stats[0]]} ${stat_names[stats[0]]}`;
    for(let i = 1; i < stats.length; i++) {
        formatted += `, +${milestone.stats[stats[i]]} ${stat_names[stats[i]]}`;
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

    skills["Evasion"] = new Skill({skill_id: "Evasion", 
                                names: {0: "Evasion [Basic]", 15: "Evasion [Intermediate]", 30: "Evasion [Advanced]", 40: "Evasion [Master]", 50: "Evasion [Absolute"},                                
                                description:"Ability to evade attacks", 
                                max_level_coefficient: 2,
                                base_xp_cost: 20,
                                get_effect_description: ()=> {
                                    return `Multiplies your evasion chance by ${Math.round(skills["Evasion"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                rewards: {
                                    milestones: {
                                        2: {
                                            stats: {
                                                "agility": 1,
                                            }
                                        },
                                        4: {
                                            stats: {
                                                "agility": 1,
                                            }
                                        },
                                        6: {
                                            stats: {
                                                "agility": 2,
                                            }
                                        },
                                        8: {
                                            stats: {
                                                "agility": 2,
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "agility": 3,
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

//weapon skills
(function(){
    skills["Swords"] = new Skill({skill_id: "Swords", 
                                skill_group: "weapon skills",
                                names: {0: "Sword"}, 
                                description: "The noble art of swordsmanship", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with swords by ${Math.round(skills["Swords"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Axes"] = new Skill({skill_id: "Axes", 
                                skill_group: "weapon skills",
                                names: {0: "Axe"}, 
                                description: "Ability to fight with use of axes", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with axes by ${Math.round(skills["Axes"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Spears"] = new Skill({skill_id: "Spears", 
                                skill_group: "weapon skills",
                                names: {0: "Spear"}, 
                                description: "The ability to fight with the most deadly weapon in the history", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with spears by ${Math.round(skills["Spears"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Blunt weapons"] = new Skill({skill_id: "Blunt weapons", 
                                        skill_group: "weapon skills",
                                        names: {0: "Blunt weapons"}, 
                                        description: "Ability to fight with use of blunt weapons", 
                                        get_effect_description: ()=> {
                                            return `Multiplies damage dealt with blunt weapons by ${Math.round(skills["Blunt weapons"].get_coefficient("multiplicative")*1000)/1000}`;
                                        },
                                        max_level_coefficient: 8});

    skills["Daggers"] = new Skill({skill_id: "Daggers",
                                skill_group: "weapon skills",
                                names: {0: "Dagger"},
                                description: "The looked upon art of fighting (and stabbing) with daggers",
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with daggers by ${Math.round(skills["Daggers"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Wands"] = new Skill({skill_id: "Wands", 
                                skill_group: "weapon skills",
                                names: {0: "Wand"}, 
                                description: "Ability to cast spells with magic wands, increases damage dealt", 
                                get_effect_description: ()=> {
                                    return `Multiplies damage dealt with wands by ${Math.round(skills["Wands"].get_coefficient("multiplicative")*1000)/1000}`;
                                },
                                max_level_coefficient: 8});

    skills["Staffs"] = new Skill({skill_id: "Staffs", 
                                skill_group: "weapon skills",
                                names: {0: "Staff"}, 
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
                                description: "Even simple act of plowing field requires some skill",
                                base_xp_cost: 40,
                                max_level: 10,
                                max_level_coefficient: 2,
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
                                                "strength": 2,
                                                "dexterity": 1,
                                            }
                                        },
                                        8: {
                                            stats: {
                                                "strength": 2,
                                                "dexterity": 2,
                                            }
                                        },
                                        10: {
                                            stats: {
                                                "strength": 4,
                                                "dexterity": 3,
                                            }
                                        }
                                    }
                                }});

})();

//activity related
(function(){
    //sleeping goes here
})();



export {skills, skill_groups, get_unlocked_skill_rewards, get_next_skill_milestone};
