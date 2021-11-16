var skills = {};

function Skill(skill_data) {
    this.skill_id = skill_data.skill_id;
    this.names = skill_data.names; // put only {0: name} to have skill always named the same, no matter the level
    this.description = skill_data.description;
    this.current_level = 0; //initial lvl
    this.max_level = skill_data.max_level; //max possible lvl, dont make it too high
    this.max_level_coefficient = skill_data.max_level_coefficient;
    this.current_xp = 0; // how much of xp_to_next_lvl there is currently
    this.total_xp = 0; // total collected xp, on loading calculate lvl based on this (so to not break skills if scaling ever changes)
    this.base_xp_cost = skill_data.base_xp_cost; //xp to go from lvl 1 to lvl 2
    this.xp_to_next_lvl = this.base_xp_cost; //for display only
    this.total_xp_to_next_lvl = this.base_xp_cost; //total xp needed to lvl up
    this.get_effect_description = skill_data.get_effect_description;

    if("xp_scaling" in skill_data) {
        this.xp_scaling = skill_data.xp_scaling; //More than 1; too high value will make progress extremely slow
    }
    else {
        this.xp_scaling = 2;
    }

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
                

                var total_xp_to_previous_lvl = Math.round(this.base_xp_cost * (1 - this.xp_scaling ** level_after_xp)/(1 - this.xp_scaling));
                //xp needed for current lvl, same formula but for n-1

                if(level_after_xp < this.max_level ) { //wont reach max lvl
                    this.xp_to_next_lvl = this.total_xp_to_next_lvl - total_xp_to_previous_lvl;
                    this.current_level = level_after_xp;
                    this.current_xp = this.total_xp - total_xp_to_previous_lvl;
                }		
                else { //will reach max lvl
                    this.current_level = this.max_level;
                    this.total_xp_to_next_lvl = "Already reached max lvl";
                    this.current_xp = "Max";
                    this.xp_to_next_lvl = "Max";
                }		
                
                return `${this.name()} has reached level ${this.current_level}`;
            }
        } 
    }

    this.get_bonus_stats = function() { 
        //will need a method in main.js to add all bonuses to character
        //iterate over bonuses, summing all up to the current level
        //flat bonuses + stat multiplier; total stat multiplier starting at 1 and bonuses being additive; simply multiplying (base value + flat bonus)

    }

    this.get_coefficient = function(scaling_type) { //get multiplier from skill based on max possible multiplier and current skill level
        //maybe lvl as param, with current lvl being used if it's undefined?

        switch(scaling_type) {
            case "flat":
                return Math.round(this.max_level_coefficient * this.current_level/this.max_level * 1000)/1000;
            case "multiplicative": 
                return Math.round(Math.pow(this.max_level_coefficient, this.current_level/this.max_level)*1000)/1000;
                break;
            default:  //same as on multiplicative
                return Math.round(Math.pow(this.max_level_coefficient, this.current_level/this.max_level)*1000)/1000;
                break;
        }
    } 
}

//basic combat skills
skills["Combat"] = new Skill({skill_id: "Combat", 
                            names: {0: "Combat"}, 
                            description: "Overall combat ability, increases chance to hit", 
                            max_level: 100, 
                            base_xp_cost: 100, 
                            xp_scaling: 2,
                            max_level_coefficient: 4,
                            get_effect_description: ()=> {
                                return `Multiplies your hit chance by ${Math.round(skills["Combat"].get_coefficient("multiplicative")*1000)/1000}`;
                            }});

skills["Evasion"] = new Skill({skill_id: "Evasion", 
                               names: {0: "Evasion [Basic]", 20: "Evasion [Intermediate]", 40: "Evasion [Advanced]", 60: "Evasion [Master]", 80: "Evasion [Absolute"},                                
                               description:" Ability to evade attacks, increases evasion chance", 
                               max_level: 100, 
                               base_xp_cost: 100, 
                               xp_scaling: 2, 
                               max_level_coefficient: 2,
                               get_effect_description: ()=> {
                                   return `Multiplies your evasion chance by ${Math.round(skills["Evasion"].get_coefficient("multiplicative")*1000)/1000}`;
                               }});
skills["Blocking"] = new Skill({skill_id: "Blocking", 
                                names: {0: "Shield blocking"}, 
                                description: "Ability to block attacks with shield, increases block chance", 
                                max_level: 20, 
                                base_xp_cost: 100, 
                                xp_scaling: 2, 
                                max_level_coefficient: 4,
                                get_effect_description: ()=> {
                                    return `Increases your block chance by flat ${Math.round(skills["Blocking"].get_coefficient("flat")*100)/100}%`;
                                }});

//weapon skills
skills["Swords"] = new Skill({skill_id: "Swords", 
                              names: {0: "Sword [Basics]"}, 
                              description: "Ability to fight with use of swords, increases damage dealt", 
                              max_level: 100, 
                              base_xp_cost: 100, 
                              xp_scaling: 2, 
                              max_level_coefficient: 10});

skills["Axes"] = new Skill({skill_id: "Axes", 
                            names: {0: "Axe [Basics]"}, 
                            description: "Ability to fight with use of axes, increases damage dealt", 
                            max_level: 100, 
                            base_xp_cost: 100, 
                            xp_scaling: 2, 
                            max_level_coefficient: 10});

skills["Spears"] = new Skill({skill_id: "Spears", 
                              names: {0: "Spear [Basics]"}, 
                              description: "Ability to fight with use of spears, increases damage dealt", 
                              max_level: 100, 
                              base_xp_cost: 100, 
                              xp_scaling: 2, 
                              max_level_coefficient: 10});

skills["Blunt weapons"] = new Skill({skill_id: "Blunt weapons", 
                                     names: {0: "Blunt weapons [Basics]"}, 
                                     description: "Ability to fight with use of blunt weapons, increases damage dealt", 
                                     max_level: 100, 
                                     base_xp_cost: 100, 
                                     xp_scaling: 2, 
                                     max_level_coefficient: 10});

skills["Wands"] = new Skill({skill_id: "Wands", 
                             names: {0: "Wand [Basics]"}, 
                             description: "Ability to cast spells with magic wands, increases damage dealt", 
                             max_level: 100, 
                             base_xp_cost: 100, 
                             xp_scaling: 2, 
                             max_level_coefficient: 10});

skills["Staffs"] = new Skill({skill_id: "Staffs", 
                              names: {0: "Staff [Basics]"}, 
                              description: "Ability to cast spells with magic staffs, increases damage dealt", 
                              max_level: 100, 
                              base_xp_cost: 100, 
                              xp_scaling: 2, 
                              max_level_coefficient: 10});


export {skills};