"use strict";

import { enemy_templates, Enemy } from "./enemies.js";
import { skills } from "./skills.js";
import { current_game_time } from "./game_time.js";
import { activities } from "./activities.js";
import { get_total_skill_level } from "./character.js";
const locations = {}; //contains all the created locations
const location_types = {};

const favourite_locations = {};

class Location {
    constructor({
                name, 
                id,
                description, 
                connected_locations = [], 
                is_unlocked = true, 
                is_finished = false,
                dialogues = [], 
                traders = [],
                types = [], //{type, xp per tick}
                housing = {},
                light_level = "normal",
                getDescription,
                background_noises = [],
                getBackgroundNoises,
                crafting = null,
                tags = {},
            }) {
        // always a safe zone

        this.name = name; //needs to be the same as key in locations
        this.id = id || name;
        this.description = description;
        this.getDescription = getDescription || function(){return description;}
        this.background_noises = background_noises;
        this.getBackgroundNoises = getBackgroundNoises || function(){return background_noises;}
        this.connected_locations = connected_locations; 
        //[{location: Location, custom_text: text that replaces 'Go to [X]', time_needed: Number}]
        this.is_unlocked = is_unlocked;
        this.is_finished = is_finished; //for when it's in any way or form "completed" and player shouldn't be allowed back
        this.dialogues = dialogues;
        this.traders = traders;
        this.activities = {};
        this.actions = {};
        this.types = types;
        this.housing = housing;
        /*
            housing: {
                is_unlocked: Boolean, 
                sleeping_xp_per_tick: Number,
                text_to_start: String
            }
        */

        this.light_level = light_level; //not really used for this type
        this.crafting = crafting;
        this.tags = tags;
        this.tags["safe_zone"] = true;
        /* 
        crafting: {
            is_unlocked: Boolean, 
            use_text: String, 
            tiers: {
                crafting: Number,
                forging: Number,
                smelting: Number,
                cooking: Number,
                alchemy: Number,
            }
        },
         */
    }
}

class Combat_zone {
    constructor({name, 
                id,
                 description, 
                 getDescription,
                 is_unlocked = true, 
                 is_finished = false,
                 types = [], //{type, xp_gain}
                 enemy_groups_list = [],
                 enemies_list = [], 
                 enemy_group_size = [1,1],
                 enemy_count = 30,
                 enemy_stat_variation = 0,
                 parent_location, 
                 leave_text,
                 first_reward = {},
                 repeatable_reward = {},
                 rewards_with_clear_requirement = [],
                 otherUnlocks,
                 unlock_text,
                 is_challenge = false,
                 tags = {},
                }) {

        this.name = name;
        this.id = id || name;
        this.unlock_text = unlock_text;
        this.description = description;
        this.getDescription = getDescription || function(){return description;}
        this.otherUnlocks = otherUnlocks || function() {return;} //try not to use it if possible
        this.is_unlocked = is_unlocked;
        this.is_finished = is_finished;
        this.types = types; //special properties of the location, e.g. "narrow" or "dark"
        this.enemy_groups_list = enemy_groups_list; //predefined enemy teams, names only
        this.enemies_list = enemies_list; //possible enemies (to be used if there's no enemy_groups_list), names only
        this.enemy_group_size = enemy_group_size; // [min, max], used only if enemy_groups_list is not provided
        if(!this.enemy_groups_list){
            if(this.enemy_group_size[0] < 1) {
                this.enemy_group_size[0] = 1;
                console.error(`Minimum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[0]} and was corrected to lowest value possible of 1`);
            }
            if(this.enemy_group_size[0] > 8) {
                this.enemy_group_size[0] = 8;
                console.error(`Minimum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[0]} and was corrected to highest value possible of 8`);
            }
            if(this.enemy_group_size[1] < 1) {
                this.enemy_group_size[1] = 1;
                console.error(`Maximum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[1]} and was corrected to lowest value possible of 1`);
            }
            if(this.enemy_group_size[1] > 8) {
                this.enemy_group_size[1] = 8;
                console.error(`Maximum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[1]} and was corrected to highest value possible of 8`);
            }
        }
        this.enemy_count = enemy_count; //how many enemy groups need to be killed for the clearing reward

        if(this.enemy_groups_list.length == 0 && this.enemies_list.length == 0 ) {
            throw new Error(`No enemies provided for zone "${this.name}"`);
        }

        this.enemy_groups_killed = 0; //killcount for clearing

        this.enemy_stat_variation = enemy_stat_variation; // e.g. 0.1 means each stat can go 10% up/down from base value; random for each enemy in group
        if(this.enemy_stat_variation < 0) {
            this.enemy_stat_variation = 0;
            console.error(`Stat variation for enemies in zone "${this.name}" is set to unallowed value and was corrected to a default 0`);
        }

        this.parent_location = parent_location;
        if(!locations[this.parent_location.id]) {
            throw new Error(`Couldn't add parent location "${this.parent_location.name}" to zone "${this.name}"`)
        }

        this.leave_text = leave_text; //text on option to leave
        this.first_reward = first_reward; //reward for first clear
        this.repeatable_reward = repeatable_reward; //reward for each clear, including first; all unlocks should be in this, just in case
        this.rewards_with_clear_requirement = rewards_with_clear_requirement; //rewards that are only given on N-th clear

        this.is_challenge = is_challenge;
        //challenges can be completed only once 

        //skills and their xp gain on every tick, based on location types;
        this.gained_skills = this.types
            ?.map(type => {return {skill: skills[location_types[type.type].stages[type.stage || 1].related_skill], xp: type.xp_gain}})
            .filter(skill => skill.skill);
       
        const temp_types = this.types.map(type => type.type);
        if(temp_types.includes("bright")) {
            this.light_level = "bright";
        }
        else if(temp_types.includes("dark")) {
            this.light_level = "dark";
        } else {
            this.light_level = "normal";
        }

        this.tags = tags;
        this.tags["Combat zone"] = true;
    }

    get_next_enemies() {

        const enemies = [];
        let enemy_group = [];

        if(this.enemy_groups_list.length > 0) { // PREDEFINED GROUPS EXIST

            const index = Math.floor(Math.random() * this.enemy_groups_list.length);
            enemy_group = this.enemy_groups_list[index]; //names

        } else {  // PREDEFINED GROUPS DON'T EXIST

            const group_size = this.enemy_group_size[0] + Math.floor(Math.random() * (this.enemy_group_size[1] - this.enemy_group_size[0]));
            for(let i = 0; i < group_size; i++) {
                enemy_group.push(this.enemies_list[Math.floor(Math.random() * this.enemies_list.length)]);
            }
        }
 
        for(let i = 0; i < enemy_group.length; i++) {
            const enemy = enemy_templates[enemy_group[i]];
            let newEnemy;
            if(this.enemy_stat_variation != 0) {

                const variation = Math.random() * this.enemy_stat_variation;

                const base = 1 + variation;
                const vary = 2 * variation;
                newEnemy = new Enemy({
                                        name: enemy.name, 
                                        description: enemy.description, 
                                        xp_value: enemy.xp_value,
                                        stats: {
                                            health: Math.round(enemy.stats.health * (base - Math.random() * vary)),
                                            attack: Math.round(enemy.stats.attack * (base - Math.random() * vary)),
                                            agility: Math.round(enemy.stats.agility * (base - Math.random() * vary)),
                                            dexterity: Math.round(enemy.stats.dexterity * (base - Math.random() * vary)),
                                            magic: Math.round(enemy.stats.magic * (base - Math.random() * vary)),
                                            intuition: Math.round(enemy.stats.intuition * (base - Math.random() * vary)),
                                            attack_speed: Math.round(enemy.stats.attack_speed * (base - Math.random() * vary) * 100) / 100,
                                            attack_count: Math.round((enemy.stats.attack_count || 1) * (base - Math.random() * vary)),
                                            defense: Math.round(enemy.stats.defense * (base - Math.random() * vary))
                                        },
                                        loot_list: enemy.loot_list,
                                        add_to_bestiary: enemy.add_to_bestiary,
                                        size: enemy.size,
                                    });

            } else {
                newEnemy = new Enemy({name: enemy.name, 
                    description: enemy.description, 
                    xp_value: enemy.xp_value,
                    stats: {
                        health: enemy.stats.health,
                        attack: enemy.stats.attack,
                        agility: enemy.stats.agility,
                        dexterity: enemy.stats.dexterity,
                        magic: enemy.stats.magic,
                        intuition: enemy.stats.intuition,
                        attack_speed: enemy.stats.attack_speed,
                        attack_count: enemy.stats.attack_count || 1,
                        defense: enemy.stats.defense
                    },
                    loot_list: enemy.loot_list,
                    add_to_bestiary: enemy.add_to_bestiary,
                    size: enemy.size
                });
            }
            newEnemy.is_alive = true;
            enemies.push(newEnemy); 
        }
        return enemies;
    }

    //calculates total penalty with and without hero skills
    //launches on every combat action
    get_total_effect() {
        const effects = {multipliers: {}, flats: {}};
        const hero_effects = {multipliers: {}, flats: {}};
        
        //iterate over types of location
        for(let i = 0; i < this.types.length; i++) {
            const type = location_types[this.types[i].type].stages[this.types[i].stage];

            if(!type.related_skill || !type.effects) { 
                continue; 
            }

            //iterate over effects each type has 

            Object.keys(type.effects).forEach(stat => { 
                if(type.effects[stat].multiplier) {
                    effects.multipliers[stat] = (effects.multipliers[stat] || 1) * type.effects[stat].multiplier;
                
                    hero_effects.multipliers[stat] = (hero_effects.multipliers[stat] || 1) * get_location_type_penalty(this.types[i].type, this.types[i].stage, stat, "multiplier");
                }

                if(type.effects[stat].flat) {
                    effects.flats[stat] = (effects.flats[stat] || 0) + type.effects[stat].flat;
                
                    hero_effects.flats[stat] = (hero_effects.flats[stat] || 0) + get_location_type_penalty(this.types[i].type, this.types[i].stage, stat, "flat");
                }

            })
        }

        

        return {base_penalty: effects, hero_penalty: hero_effects};
    }
}

class Challenge_zone extends Combat_zone {
    constructor({name, 
        description, 
        getDescription,
        is_unlocked = true, 
        types = [], //{type, xp_gain}
        enemy_groups_list = [],
        enemies_list = [], 
        enemy_group_size = [1,1],
        enemy_count = 30,
        parent_location, 
        leave_text,
        first_reward = {},
        repeatable_reward = {},
        otherUnlocks,
        is_finished,
        unlock_text,
       }) 
    {
        super(
            {   
                name, 
                description, 
                getDescription, 
                is_unlocked, 
                types, 
                enemy_groups_list, 
                enemies_list, 
                enemy_group_size, 
                enemy_count, 
                enemy_stat_variation: 0, 
                parent_location,
                leave_text,
                first_reward,
                repeatable_reward,
                is_challenge: true,
                otherUnlocks,
                is_finished,
                unlock_text
            }
        )
    }
}

class LocationActivity{
    constructor({activity_name, 
                 starting_text, 
                 get_payment = ()=>{return 1},
                 is_unlocked = true, 
                 working_period = 60,
                 infinite = false,
                 availability_time,
                 skill_xp_per_tick = 1,
                 unlock_text,
                 gained_resources,
                 require_tool = false,
                })
    {
        this.activity_name = activity_name; //name of activity from activities.js
        this.starting_text = starting_text; //text displayed on button to start action

        this.get_payment = get_payment;
        this.is_unlocked = is_unlocked;
        this.unlock_text = unlock_text;
        this.working_period = working_period; //if exists -> time that needs to be worked to earn anything; only for jobs
        this.infinite = infinite; //if true -> can be done 24/7, otherwise requires availability time
        if(this.infinite && availability_time) {
            console.error("Activity is set to be available all the time, so availability_time value will be ignored!");
        }
        if(!this.infinite && !availability_time) {
            throw new Error("LocationActivities that are not infinitely available, require a specified time of availability!");
        }
        this.availability_time = availability_time; //if not infinite -> hours between which it's available
        
        this.skill_xp_per_tick = skill_xp_per_tick; //skill xp gained per game tick (default -> 1 in-game minute)

        this.require_tool = require_tool; //if false, can be started without tool equipped

        this.gained_resources = gained_resources; 
        //{scales_with_skill: boolean, resource: [{name, ammount: [[min,max], [min,max]], chance: [min,max]}], time_period: [min,max], skill_required: [min_efficiency, max_efficiency]}
        //every 2-value array is oriented [starting_value, value_with_required_skill_level], except for subarrays of ammount (which are for randomizing gained item count) and for skill_required
        //                                                                                   (ammount array itself follows the mentioned orientation)
        //value start scaling after reaching min_efficiency skill lvl, before that they are just all at min
        //skill required refers to level of every skill
        //if scales_with_skill is false, scalings will be ignored and first value will be used
        }

    getActivityEfficiency = function() {
        let skill_modifier = 1;
        if(this.gained_resources.scales_with_skill){
            let skill_level_sum = 0;
            for(let i = 0; i < activities[this.activity_name].base_skills_names?.length; i++) {
                skill_level_sum += Math.min(
                    this.gained_resources.skill_required[1]-this.gained_resources.skill_required[0]+1, Math.max(0,get_total_skill_level(activities[this.activity_name].base_skills_names[i])-this.gained_resources.skill_required[0]+1)
                )/(this.gained_resources.skill_required[1]-this.gained_resources.skill_required[0]+1);
            }
            skill_modifier = (skill_level_sum/(activities[this.activity_name].base_skills_names?.length || 1));
        }
        const gathering_time_needed = Math.floor(this.gained_resources.time_period[0]*(this.gained_resources.time_period[1]/this.gained_resources.time_period[0])**skill_modifier);

        const gained_resources = [];

        for(let i = 0; i < this.gained_resources.resources.length; i++) {

            const chance = this.gained_resources.resources[i].chance[0]*(this.gained_resources.resources[i].chance[1]/this.gained_resources.resources[i].chance[0])**skill_modifier;
            const min = Math.round(this.gained_resources.resources[i].ammount[0][0]*(this.gained_resources.resources[i].ammount[1][0]/this.gained_resources.resources[i].ammount[0][0])**skill_modifier);
            const max = Math.round(this.gained_resources.resources[i].ammount[0][1]*(this.gained_resources.resources[i].ammount[1][1]/this.gained_resources.resources[i].ammount[0][1])**skill_modifier);
            gained_resources.push({name: this.gained_resources.resources[i].name, count: [min,max], chance: chance});
        }

        return {gathering_time_needed, gained_resources};
    }
}

class LocationAction{
    /**
     * 
     * @param {Object} data
     * @param {Object} data.conditions [{stats, skills, [items_by_id: {item_id: {count, remove?}}], money: {number, remove?}}]
     */
    constructor({
        starting_text,
        action_id,
        action_name,
        description,
        action_text,
        success_text,
        failure_texts = {},
        required = {},
        conditions = [],
        rewards = {},
        attempt_duration = 0,
        success_chances = [1,1],
        is_unlocked = false,
        repeatable = false,
        check_conditions_on_finish = true,
    }) {
        this.starting_text = starting_text; //text on the button to start
        this.action_name = action_name || starting_text;
        this.action_id = action_id;
        this.description = description; //description on hover
        this.action_text = action_text; //text displayed during action animation
        this.failure_texts = failure_texts; //text displayed on failure
        if(!this.failure_texts.conditional_loss) {
            this.failure_texts.conditional_loss = [];
        }
        if(!this.failure_texts.random_loss) {
            this.failure_texts.random_loss = [];
        }
        if(!this.failure_texts.unable_to_begin) {
            this.failure_texts.unable_to_begin = [];
        }
        /*  conditional_loss - conditions not met
            random_loss - conditions (at least 1st part) were met, but didn't roll high enough on success chance
        */
        this.success_text = success_text; //text displayed on success
                                          //if action is supposed to be "impossible" for narrative purposes, just make it finish without unlocks and with text that says it failed
        
        this.required = required; //things needed to be able to make an attempt
        //{stats, skills, items_by_id: {'item_id': {count, remove_on_success?, remove_on_fail?}}, money: {Number, remove_on_success?, remove_on_fail?}}
        if(conditions.length > 2) {
            throw new Error('LocationAction cannot have more than 2 sets of conditions!');
        }
        this.conditions = conditions; 
        //things needed to succeed
        //either single set of values or two sets, one for minimum chance provided and one for maximum
        //two-set approach does not apply to items, so it only checks them for conditions[0]
        //if applicable, items get removed both on failure and or success - if action requires them, it's better to have guaranteed success
        /* 
            {
                money: {
                    number: Number, //how much money to require
                    remove: Boolean //if should be removed from inventory (false -> its kept)
                }
                stats: [
                    "stat_id": Number //required stat
                ],

                skills: [
                    "skill_id": Number //required level
                ],
                items_by_id: 
                [
                    {
                        "item_id": {
                            count: Number,
                            remove: Boolean
                    }
                ]
            }
        */
        this.check_conditions_on_finish = check_conditions_on_finish; //means an action with duration can be attempted even if conditions are not met
        this.rewards = rewards; //{unlocks, money, items,move_to}?
        this.attempt_duration = attempt_duration; //0 means instantaneous, otherwise there's a progress bar
        this.success_chances = success_chances; 
        //chances to succeed; to guarantee that multiple attempts will be needed, just make a few consecutive actions with same text
        this.is_unlocked = is_unlocked;
        this.is_finished = false; //really same as is_locked but with a more fitting name
        this.repeatable = repeatable;
    }

    /**
     * @returns {Number} the degree at which conditions are met. 0 means failure (some requirement is not met at all),
     * everything else is for calculating final success chance (based on minimal and maximal chance, with 1 meaning that it's just the maximal).
     * Items do not get fuzzy treatment, they are either all met or not.
     */
    get_conditions_status(character) {
        return this.process_conditions(this.conditions, character);
        
    }

    /**
     * @returns {Boolean} if start conditions are met
     */
    can_be_started(character) {
        return this.process_conditions([this.required], character);
    }

    /**
     * Analyzes passed conditions, returns their status (0 or 1 if 1-length array, fuzzier value if 2-length array)
     * @param {*} character 
     * @param {*} condition 
     */
    process_conditions(conditions, character) {
        let met = 1;

        if(conditions.length == 0) {
            return 1;
        }

        //check money
        if(conditions[0].money && character.money < conditions[0].money) {
            met = 0;
            return met;
        } else if(conditions[1]?.money && conditions[1].money > conditions[0].money && character.money < conditions[1].money) {
            met *= (character.money - conditions[0].money)/(conditions[1].money - conditions[0].money);
        }

        if(!met) {
            return met;
        }
        //check skills
        if(conditions[0].skills) {
            Object.keys(conditions[0].skills).forEach(skill_id => {
                if(get_total_skill_level(skill_id) < conditions[0].skills[skill_id]) {
                    met = 0;
                } else if(conditions[1]?.skills && conditions[1].skills[skill_id] > conditions[0].skills[skill_id] && get_total_skill_level(skill_id) < conditions[1].skills[skill_id]) {
                    met *= (get_total_skill_level(skill_id) - conditions[0].skills[skill_id])/(conditions[1].skills[skill_id] - conditions[0].skills[skill_id]);
                }
            });
        }

        if(!met) {
            return met;
        }
        //check items
        if(conditions[0].items_by_id) {
            Object.keys(conditions[0].items_by_id).forEach(item_id => {
                let found = false;
                //iterate through inventory, set found to true if id is present and count is enough
                Object.keys(character.inventory).forEach(item_key => {
                    if(found) {
                        return;
                    }
                    
                    const {id} = JSON.parse(item_key);
                    if(id === item_id && character.inventory[item_key].count >= conditions[0].items_by_id[item_id].count) {
                        found = true;
                    }
                });

                if(!found) {
                    met = 0;
                }
            });
        }
        if(!met) {
            return met;
        }
        //checks stats
        if(conditions[0].stats) {
            Object.keys(conditions[0].stats).forEach(stat_key => {
                if(character.stats.full[stat_key] < conditions[0].stats[stat_key]) {
                    met = 0;
                } else if(conditions[1]?.stats && conditions[1].stats[stat_key] > conditions[0].stats[stat_key] && character.stats.full[stat_key] < conditions[1].stats[stat_key]) {
                    met *= (character.stats.full[stat_key] - conditions[0].stats[stat_key])/(conditions[1].stats[stat_key] - conditions[0].stats[stat_key]);
                }
            });
        }

        return met;
    }
}

class LocationType{
    constructor({name, related_skill, stages = {}}) {
        this.name = name;

        if(related_skill) {
            if(!skills[related_skill]) {
                throw new Error(`No such skill as "${related_skill}"`);
            }
            else { 
                this.related_skill = related_skill; //one per each; skill xp defined in location/combat_zone
            }
        }
        this.stages = stages; //up to 3
        /* 
        >number<: {
            description,
            related_skill,
            effects
        }

        */
    }
}

function get_location_type_penalty(type, stage, stat, category) {
    
    const skill = skills[location_types[type].stages[stage].related_skill];

    //maybe give all stages a range of skill lvls where they start scaling and where they get fully nullified?

    if(category === "multiplier") {
        const base = location_types[type].stages[stage].effects[stat].multiplier;
    
        return base**(1- get_total_skill_level(skill.skill_id)/skill.max_level);
    } else if(category === "flat") {
        const base = location_types[type].stages[stage].effects[stat].flat;

        return base*(1-get_total_skill_level(skill.skill_id)/skill.max_level)**0.66667;
    } else {
        throw new Error(`Unsupported category of stat effects "${category}", should be either "flat" or "multiplier"!`);
    }
    
}

//create location types
(function(){ 
    location_types["bright"] = new LocationType({
        name: "bright",
        stages: {
            1: {
                description: "A place that's always lit, no matter the time of the day",
            },
            2: {
                description: "An extremely bright place, excessive light makes it hard to keep eyes open",
                related_skill: "Dazzle resistance",
                effects: {
                    attack_points: {multiplier: 0.5},
                    evasion_points: {multiplier: 0.5},
                }
            },
            3: {
                description: "A place with so much light that an average person would go blind in an instant",
                related_skill: "Dazzle resistance",
                effects: {
                    attack_points: {multiplier: 0.1},
                    evasion_points: {multiplier: 0.1},
                }
            }
        }
    });
    location_types["dark"] = new LocationType({
        name: "dark",
        stages: {
            1: {
                description: "It's dark here, comparable to a bright night",
                related_skill: "Night vision",
                //no effects here, since in this case they are provided via the overall "night" penalty
            },
            2: {
                description: "An extremely dark place, darker than most of the nights",
                related_skill: "Night vision",
                effects: {
                    //they dont need to be drastic since they apply on top of 'night' penalty
                    attack_points: {multiplier: 0.8},
                    evasion_points: {multiplier: 0.8},
                }
            },
            3: {
                description: "Pure darkness with not even a tiniest flicker of light",
                related_skill: "Presence sensing",
                effects: {
                    attack_points: {multiplier: 0.15},
                    evasion_points: {multiplier: 0.15},
                }
            }
        }
    });
    location_types["narrow"] = new LocationType({
        name: "narrow",
        stages: {
            1: {
                description: "A narrow area where there's not much place for maneuvering",
                related_skill: "Tight maneuvers",
                effects: {
                    evasion_points: {multiplier: 0.5},
                }
            },
            2: {
                description: "A very tight and narrow area where there's not much place for maneuvering",
                related_skill: "Tight maneuvers",
                effects: {
                    evasion_points: {multiplier: 0.333},
                }        
            }
        }
    });
    location_types["open"] = new LocationType({
        name: "open",
        stages: {
            1: {
                description: "A completely open area where attacks can come from any direction",
                related_skill: "Spatial awareness",
                effects: {
                    evasion_points: {multiplier:  0.75},
                }
            },
            2: {
                description: "An area that's completely open and simultanously obstructs your view, making it hard to predict where an attack will come from",
                related_skill: "Spatial awareness",
                effects: {
                    evasion_points: {multiplier: 0.5},
                }
            }
        }
    });
    location_types["hot"] = new LocationType({
        name: "hot",
        stages: {
            1: {
                description: "High temperature makes it hard to breath",
                related_skill: "Heat resistance",
                effects: {
                    attack_points: {multiplier: 0.5},
                    evasion_points: {multiplier: 0.5},
                    stamina: {multiplier: 0.8},
                }
            },
            2: {
                description: "It's so hot that just being here is painful",
                related_skill: "Heat resistance",
                effects: {
                    attack_points: {multiplier: 0.3},
                    evasion_points: {multiplier: 0.3},
                    stamina: {multiplier: 0.5},
                }
            },
            3: {
                description: "Temperature so high that wood ignites by itself",
                related_skill: "Heat resistance",
                effects: {
                    attack_points: {multiplier: 0.1},
                    evasion_points: {multiplier: 0.1},
                    stamina: {multiplier: 0.3},
                }
            }
        }
    });
    location_types["cold"] = new LocationType({
        name: "cold",
        stages: {
            1: {
                description: "Cold makes your energy seep out...",
                related_skill: "Cold resistance",
                effects: {
                    stamina: {multiplier: 0.5},
                }
            },
            2: {
                description: "So cold...",
                related_skill: "Cold resistance",
                effects: {
                    attack_points: {multiplier: 0.7},
                    evasion_points: {multiplier: 0.7},
                    stamina: {multiplier: 0.2},
                }
            },
            3: {
                description: "This place is so cold, lesser beings would freeze in less than a minute...",
                related_skill: "Cold resistance",
                effects: {
                    attack_points: {multiplier: 0.5},
                    evasion_points: {multiplier: 0.5},
                    stamina: {multiplier: 0.1},
                }
            }
        }
    });
    location_types["thin air"] = new LocationType({
        name: "thin air",
        stages: {
            1: {
                description: "Place with thinner air, which negatively impacts your body",
                related_skill: "Breathing",
                effects: {
                    stamina_efficiency: {multiplier: 0.5},
                    agility: {multiplier: 0.8},
                    strength: {multiplier: 0.8},
                    dexterity: {multiplier: 0.8},
                    intuition: {multiplier: 0.8},
                }
            },
            2: {
                description: "Place with very thin air, heavily affecting your body",
                related_skill: "Breathing",
                effects: {
                    stamina_efficiency: {multiplier: 0.1},
                    agility: {multiplier: 0.5},
                    strength: {multiplier: 0.5},
                    dexterity: {multiplier: 0.5},
                    intuition: {multiplier: 0.5},
                }
            }
        }
    });
    location_types["eldritch"] = new LocationType({
        name: "eldritch",
        stages: {
            1: {
                description: "This place brings a strong sense of unease",
                related_skill: "Strength of mind",
                effects: {
                    agility: {multiplier: 0.8},
                    dexterity: {multiplier: 0.8},
                    intuition: {multiplier: 0.5},
                    stamina_efficiency: {multiplier: 0.75},
                    health_loss_flat: {flat: -5},
                }
            },
            2: {
                description: "This place goes against the laws of the world",
                related_skill: "Strength of mind",
                effects: {
                    agility: {multiplier: 0.3},
                    dexterity: {multiplier: 0.3},
                    intuition: {multiplier: 0.2},
                    stamina_efficiency: {multiplier: 0.5},
                    health_loss_flat: {flat: -50},
                }
            }
        }
    });
})();

//create locations and zones
(function(){ 
    locations["Village"] = new Location({ 
        getDescription: function() {
            if(locations["Infested field"].enemy_groups_killed >= 5 * locations["Infested field"].enemy_count) { 
                return "Medium-sized village, built next to a small river at the foot of the mountains. It's surrounded by many fields, a few of them infested by huge rats, which, while an annoyance, don't seem possible to fully eradicate. Other than that, there's nothing interesting around";
            }
            else if(locations["Infested field"].enemy_groups_killed >= 2 * locations["Infested field"].enemy_count) {
                return "Medium-sized village, built next to a small river at the foot of the mountains. It's surrounded by many fields, many of them infested by huge rats. Other than that, there's nothing interesting around";
            } else {
                return "Medium-sized village, built next to a small river at the foot of the mountains. It's surrounded by many fields, most of them infested by huge rats. Other than that, there's nothing interesting around"; 
            }
        },
        getBackgroundNoises: function() {
            let noises = ["*You hear some rustling*"];
            if(current_game_time.hour > 4 && current_game_time.hour <= 20) {
                noises.push("Anyone seen my cow?", "Mooooo!", "Tomorrow I'm gonna fix the roof", "Look, a bird!");

                if(locations["Infested field"].enemy_groups_killed <= 3) {
                    noises.push("These nasty rats almost ate my cat!");
                }
            }

            if(current_game_time.hour > 3 && current_game_time.hour < 10) {
                noises.push("♫♫ Heigh ho, heigh ho, it's off to work I go~ ♫♫", "Cock-a-doodle-doo!");
            } else if(current_game_time.hour > 18 && current_game_time.hour < 22) {
                noises.push("♫♫ Heigh ho, heigh ho, it's home from work I go~ ♫♫");
            } 

            return noises;
        },
        dialogues: ["village elder", "village guard", "old craftsman"],
        traders: ["village trader"],
        name: "Village", 
        crafting: {
            is_unlocked: true, 
            use_text: "Try to craft something", 
            tiers: {
                crafting: 1,
                forging: 1,
                smelting: 1,
                cooking: 1,
                alchemy: 1,
            }
        },
    });

    locations["Shack"] = new Location({
        connected_locations: [{location: locations["Village"], custom_text: "Go outside to [Village]", time_needed: 15}],
        description: "This small shack was the only spare building in the village. It's surprisingly tidy.",
        name: "Shack",
        is_unlocked: false,
        housing: {
            is_unlocked: true,
            text_to_sleep: "Take a nap",
            sleeping_xp_per_tick: 1},
    })

    locations["Village"].connected_locations.push({location: locations["Shack"]});
    //remember to always add it like that, otherwise travel will be possible only in one direction and location might not even be reachable

    locations["Infested field"] = new Combat_zone({
        description: "Field infested with wolf rats. You can see the grain stalks move as these creatures scurry around.", 
        enemy_count: 15, 
        enemies_list: ["Starving wolf rat", "Wolf rat"],
        types: [{type: "open", stage: 1, xp_gain: 1}],
        enemy_stat_variation: 0.1,
        is_unlocked: false, 
        name: "Infested field", 
        parent_location: locations["Village"],
        first_reward: {
            xp: 10,
            reputation: {"village": 20},
        },
        repeatable_reward: {
            textlines: [
                {dialogue: "village elder", lines: ["cleared field"]},
            ],
            xp: 5,
        },
        rewards_with_clear_requirement: [
            {
                required_clear_count: 1,
                reputation: {"village": 10},
            },
            {
                required_clear_count: 4,
                reputation: {"village": 30},
            },
            {
                required_clear_count: 10,
                reputation: {"village": 50},
            }
        ]
    });
    locations["Village"].connected_locations.push({location: locations["Infested field"]});

    locations["Nearby cave"] = new Location({ 
        connected_locations: [{location: locations["Village"], custom_text: "Go outside and to the [Village]"}], 
        getDescription: function() {
            if(locations["Pitch black tunnel"].enemy_groups_killed >= locations["Pitch black tunnel"].enemy_count) { 
                return "A big cave at the base of a steep mountain, near the village. There are old storage sheds outside and signs of mining inside. Groups of fluorescent mushrooms cover the cave walls, providing a dim light. Your efforts have secured a decent space and many of the tunnels. It seems like you almost reached the deepest part.";
            }
            else if(locations["Hidden tunnel"].enemy_groups_killed >= locations["Hidden tunnel"].enemy_count) { 
                return "A big cave at the base of a steep mountain, near the village. There are old storage sheds outside and signs of mining inside. Groups of fluorescent mushrooms cover the walls, providing a dim light. Your efforts have secured a major space and some tunnels, but there are still more places left to clear out.";
            }
            else if(locations["Cave depths"].enemy_groups_killed >= locations["Cave depths"].enemy_count) { 
                return "A big cave at the base of a steep mountain, near the village. There are old storage sheds outside and signs of mining inside. Groups of fluorescent mushrooms cover the walls, providing a dim light. Your efforts have secured a decent space and even a few tunnels, yet somehow you can still hear the sounds of the wolf rats.";
            }
            else if(locations["Cave room"].enemy_groups_killed >= locations["Cave room"].enemy_count) {
                return "A big cave at the base of a steep mountain, near the village. There are old storage sheds outside and signs of mining inside. Groups of fluorescent mushrooms cover the walls, providing a dim light. Your efforts have secured some space, but you can hear more wolf rats in some deeper tunnels.";
            } else {
                return "A big cave at the base of a steep mountain, near the village. There are old storage sheds outside and signs of mining inside. Groups of fluorescent mushrooms cover the walls, providing a dim light. You can hear sounds of wolf rats from the nearby room.";
            }
        },
        getBackgroundNoises: function() {
            let noises = ["*You hear rocks rumbling somewhere*", "Squeak!", ];
            return noises;
        },
        name: "Nearby cave",
        is_unlocked: false,
    });
    locations["Village"].connected_locations.push({location: locations["Nearby cave"]});
    //remember to always add it like that, otherwise travel will be possible only in one direction and location might not even be reachable

    locations["Cave room"] = new Combat_zone({
        description: "It's full of rats. At least the glowing mushrooms provide some light.", 
        enemy_count: 25, 
        types: [{type: "narrow", stage: 1,  xp_gain: 3}, {type: "bright", stage:1}],
        enemies_list: ["Wolf rat"],
        enemy_group_size: [2,3],
        enemy_stat_variation: 0.2,
        is_unlocked: true, 
        name: "Cave room", 
        leave_text: "Go back to entrance",
        parent_location: locations["Nearby cave"],
        first_reward: {
            xp: 20,
        },
        repeatable_reward: {
            locations: [{location: "Cave depths"}],
            xp: 10,
            activities: [{location:"Nearby cave", activity:"weightlifting"}, {location:"Nearby cave", activity:"mining"}, {location:"Village", activity:"balancing"}],
        },
        rewards_with_clear_requirement: [
            {
                required_clear_count: 1,
                reputation: {"village": 10},
            },
            {
                required_clear_count: 4,
                reputation: {"village": 20},
            },
        ]
    });
    locations["Nearby cave"].connected_locations.push({location: locations["Cave room"]});

    locations["Cave depths"] = new Combat_zone({
        description: "It's dark. And full of rats.", 
        enemy_count: 40,
        types: [{type: "narrow", stage: 1,  xp_gain: 3}, {type: "dark", stage: 2, xp_gain: 3}],
        enemies_list: ["Wolf rat"],
        enemy_group_size: [5,8],
        enemy_stat_variation: 0.2,
        is_unlocked: false, 
        name: "Cave depths", 
        leave_text: "Climb out",
        parent_location: locations["Nearby cave"],
        first_reward: {
            xp: 30,
        },
        repeatable_reward: {
            textlines: [{dialogue: "village elder", lines: ["cleared cave"]}],
            xp: 15,
        },
        rewards_with_clear_requirement: [
            {
                required_clear_count: 4,
                locations: [{location: "Suspicious wall"}],
                reputation: {"village": 40},
            }
        ],
    });
    
    locations["Hidden tunnel"] = new Combat_zone({
        description: "There is, in fact, even more rats here.", 
        enemy_count: 50, 
        types: [{type: "narrow", stage: 1,  xp_gain: 3}, {type: "dark", stage: 3, xp_gain: 1}],
        enemies_list: ["Elite wolf rat"],
        enemy_group_size: [2,2],
        enemy_stat_variation: 0.2,
        is_unlocked: false, 
        name: "Hidden tunnel", 
        leave_text: "Retreat for now",
        parent_location: locations["Nearby cave"],
        first_reward: {
            xp: 100,
        },
        repeatable_reward: {
            locations: [{location: "Pitch black tunnel"}],
            xp: 50,
            activities: [{location:"Nearby cave", activity:"mining2"}],
        },
        unlock_text: "As the wall falls apart, you find yourself in front of a new tunnel, leading even deeper. And of course, it's full of wolf rats."
    });
    locations["Pitch black tunnel"] = new Combat_zone({
        description: "There is no light here. Only rats.", 
        enemy_count: 50, 
        types: [{type: "narrow", stage: 1,  xp_gain: 6}, {type: "dark", stage: 3, xp_gain: 3}],
        enemies_list: ["Elite wolf rat"],
        enemy_group_size: [6,8],
        enemy_stat_variation: 0.2,
        is_unlocked: false, 
        name: "Pitch black tunnel", 
        leave_text: "Retreat for now",
        parent_location: locations["Nearby cave"],
        first_reward: {
            xp: 200,
        },
        repeatable_reward: {
            xp: 100,
            activities: [{location:"Nearby cave", activity: "climbing"}],
            actions: [{location: "Nearby cave", action: "climb the mountain"}],
        },
        rewards_with_clear_requirement: [
            {
                required_clear_count: 4,
                locations: [{location: "Mysterious gate"}],
            }
        ],

        unlock_text: "As you keep going deeper, you barely notice a pitch black hole. Not even a tiniest speck of light reaches it."
    });

    locations["Mysterious gate"] = new Combat_zone({
        description: "It's dark. And full of rats.", 
        enemy_count: 50, 
        types: [{type: "dark", stage: 3, xp_gain: 5}],
        enemies_list: ["Elite wolf rat guardian"],
        enemy_group_size: [6,8],
        enemy_stat_variation: 0.2,
        is_unlocked: false,
        name: "Mysterious gate", 
        leave_text: "Get away",
        parent_location: locations["Nearby cave"],
        first_reward: {
            xp: 500,
        },
        repeatable_reward: {
            xp: 250,
            activities: [{location:"Nearby cave", activity:"meditating"}, {location:"Nearby cave", activity:"mining3"}],
            actions: [{action: "open the gate", location:"Nearby cave"}]
        },
        unlock_text: "After a long and ardous fight, you reach a chamber that ends with a massive stone gate. You can see it's guarded by some kind of wolf rats, but much bigger than the ones you fought until now."
    });

    locations["Nearby cave"].connected_locations.push(
        {location: locations["Cave depths"]}, 
        {location: locations["Hidden tunnel"], custom_text: "Enter the [Hidden tunnel]"}, 
        {location: locations["Pitch black tunnel"], custom_text: "Go into the [Pitch black tunnel]"},
        {location: locations["Mysterious gate"], custom_text: "Go to the [Mysterious gate]"}
    );

    locations["Writhing tunnel"] = new Combat_zone({
        description: "The walls are moving...", 
        enemy_count: 50, 
        types: [{type: "dark", stage: 3, xp_gain: 5}, {type: "narrow", stage: 2, xp_gain: 5}, {type: "eldritch", stage: 1, xp_gain: 1}],
        enemies_list: ["Wall rat"],
        enemy_group_size: [4,4],
        enemy_stat_variation: 0.2,
        is_unlocked: false,
        name: "Writhing tunnel", 
        leave_text: "Run away...",
        parent_location: locations["Nearby cave"],
        first_reward: {
            xp: 2500,
        },
        repeatable_reward: {
            xp: 1250,
            locations: [{location: "Mysterious depths"}]
        },
        unlock_text: "You see something. You struggle to comprehend it. When you finally understand, you regret it. It might have been better to be born blind."
    });

    locations["Nearby cave"].connected_locations.push({location: locations["Writhing tunnel"]});

    locations["Mysterious depths"] = new Location({ //not yet unlockable
        connected_locations: [{location: locations["Nearby cave"], custom_text: "Climb back up to the main level of [Nearby cave]"}], 
        getDescription: function() {
            return  `You find yourself in a large chamber with smooth walls and vaulted ceiling. The floor is covered in square tiles in the center, yet you cannot help but notice that all these squares make a circle, in some impossible to understand way.
There's another gate on the wall in front of you, but you have a strange feeling that you won't be able to open it with brute strength.`;
        },
        getBackgroundNoises: function() {
            let noises = ["*You hear rocks rumbling somewhere*", "Squeak!", "*Air vibrates in an impossible to describe manner*", "*You feel an immense sense of something being wrong*", '"All these squares make a circle... All these squares make a circle..."'];
            return noises;
        },
        name: "Mysterious depths",
        is_unlocked: false,
        unlock_text: "You manage to find a way to another chamber."
    });

    locations["Nearby cave"].connected_locations.push({location: locations["Mysterious depths"], custom_text: "Climb down to [Mysterious depths]"});

    locations["Forest road"] = new Location({ 
        connected_locations: [{location: locations["Village"]}],
        description: "Old trodden road leading through a dark forest, the only path connecting village to the town. You can hear some animals from the surrounding woods.",
        name: "Forest road",
        getBackgroundNoises: function() {
            let noises = ["*You hear some rustling*", "Roar!", "*You almost tripped on some roots*", "*You hear some animal running away*"];

            return noises;
        },
        is_unlocked: false,
    });
    locations["Village"].connected_locations.push({location: locations["Forest road"], custom_text: "Leave the village towards [Forest road]"});

    locations["Forest"] = new Combat_zone({
        description: "Forest surrounding the village, a dangerous place", 
        enemies_list: ["Starving wolf", "Young wolf"],
        types: [{type: "narrow", stage: 1, xp_gain: 1}],
        enemy_count: 30, 
        enemy_stat_variation: 0.2,
        name: "Forest", 
        parent_location: locations["Forest road"],
        first_reward: {
            xp: 40,
        },
        repeatable_reward: {
            xp: 20,
            locations: [{location:"Deep forest"}],
            activities: [{location:"Forest road", activity: "herbalism"}],
        },
    });
    locations["Forest road"].connected_locations.push({location: locations["Forest"], custom_text: "Leave the safe path and walk into the [Forest]"});

    locations["Deep forest"] = new Combat_zone({
        description: "Deeper part of the forest, a dangerous place", 
        enemies_list: ["Wolf", "Starving wolf", "Young wolf"],
        types: [{type: "narrow", stage: 1, xp_gain: 2}],
        enemy_count: 50, 
        enemy_group_size: [2,3],
        enemy_stat_variation: 0.2,
        is_unlocked: false,
        name: "Deep forest", 
        parent_location: locations["Forest road"],
        first_reward: {
            xp: 70,
        },
        repeatable_reward: {
            xp: 35,
            flags: ["is_deep_forest_beaten"],
            activities: [{location:"Forest road", activity: "woodcutting"}],
        }
    });
    locations["Forest road"].connected_locations.push({location: locations["Deep forest"], custom_text: "Venture into the [Deep forest]"});

    locations["Forest clearing"] = new Combat_zone({
        description: "A surprisingly big clearing hidden in the northern part of the forest, covered with very tall grass and filled with a mass of wild boars",
        enemies_list: ["Boar"],
        enemy_count: 50,
        enemy_group_size: [4,7],
        is_unlocked: false,
        enemy_stat_variation: 0.2,
        name: "Forest clearing", 
        types: [{type: "open", stage: 2, xp_gain: 3}],
        parent_location: locations["Forest road"],
        first_reward: {
            xp: 200,
        },
        repeatable_reward: {
            xp: 100,
            textlines: [{dialogue: "farm supervisor", lines: ["defeated boars"]}],
            activities: [{location: "Forest road", activity: "woodcutting2"}],
        }
    });
    locations["Forest road"].connected_locations.push({location: locations["Forest clearing"], custom_text: "Go towards the [Forest clearing] in the north"});

    locations["Town outskirts"] = new Location({ 
        connected_locations: [{location: locations["Forest road"], custom_text: "Return to the [Forest road]"}],
        description: "The town is surrounded by a tall stone wall. The only gate seems to be closed, with a lone guard outside. You can see farms to the north and slums to the south.",
        name: "Town outskirts",
        is_unlocked: true,
        dialogues: ["gate guard"],
    });
    locations["Forest road"].connected_locations.push({location: locations["Town outskirts"], custom_text: "Go towards the [Town outskirts]"});

    locations["Slums"] = new Location({ 
        connected_locations: [{location: locations["Town outskirts"]}],
        getDescription: function() {
            if(locations["Gang hideout"].is_finished) {
                return "A wild settlement next to city walls, filled with decaying buildings, poverty, and occasional thieves";
            }

            return "A wild settlement next to city walls, filled with decaying buildings, poverty, and violent criminals";
        },
        name: "Slums",
        is_unlocked: true,
        dialogues: ["suspicious man"],
        traders: ["suspicious trader", "suspicious trader 2"],
        getBackgroundNoises: function() {
            let noises = ["Cough cough", "*You hear someone sobbing*", "*You see someone sleeping in an alleyway.*"];
            
            if(current_game_time.hour > 4 && current_game_time.hour <= 20) {
                noises.push("Please, do you have a coin to spare?");
            } else {
                if(!locations["Gang hideout"].is_finished) {
                    noises.push("*Sounds of someone getting repeatedly stabbed*", "Scammed some fools for money today, time to get drunk!");
                }
            }
            if(!locations["Gang hideout"].is_finished) {
                noises.push("*You hear a terrified scream.*");
            } else {
                noises.push("You're the one who took out that gang, aren't you? Thank you so much.", "Things got a lot better since those thugs left...");
            }
            return noises;
        },
    });
    locations["Town farms"] = new Location({ 
        connected_locations: [{location: locations["Town outskirts"]}],
        description: "Semi-private farms under jurisdiction of the city council. Full of life and sounds of heavy work.",
        name: "Town farms",
        is_unlocked: true,
        dialogues: ["farm supervisor"],
        getBackgroundNoises: function() {
            let noises = [];
            if(current_game_time.hour > 4 && current_game_time.hour <= 20) {
                noises.push("Mooooo!", "Look, a bird!", "Bark bark!", "*You notice a goat staring at you menacingly*", "Neigh!", "Oink oink");
            } else {
                noises.push("*You can hear some rustling*", "*You can hear snoring workers*");
            }

            if(current_game_time.hour > 3 && current_game_time.hour < 10) {
                noises.push("♫♫ Heigh ho, heigh ho, it's off to work I go~ ♫♫", "Cock-a-doodle-doo!");
            } else if(current_game_time.hour > 18 && current_game_time.hour < 22) {
                noises.push("♫♫ Heigh ho, heigh ho, it's home from work I go~ ♫♫");
            } 

            return noises;
        },
    });
    locations["Gang hideout"] = new Combat_zone({ 
        description: "Hideout of a local gang. Old building with a labirynth of narrow corridors.", 
        enemies_list: ["Slums thug"],
        types: [{type: "narrow", stage: 2, xp_gain: 3}, {type: "dark", stage: 1, xp_gain: 3}],
        enemy_count: 30,
        is_unlocked: false,
        enemy_group_size: [4,5],
        enemy_stat_variation: 0.1,
        name: "Gang hideout", 
        parent_location: locations["Slums"],
        first_reward: {
            xp: 1000,
            reputation: {slums: 200, town: 50},
        },
        repeatable_reward: {
            traders: [{trader: "suspicious trader 2", skip_message: true}],
            textlines: [{dialogue: "suspicious man", lines: ["defeated gang", "behave 3"]}],
            locks: {
                traders: ["suspicious trader"],
                locations: ["Gang hideout"],
                textlines: {"suspicious man": ["behave 2"]},
            }, 
            move_to: {location: "Slums"},
        },
    });
    locations["Slums"].connected_locations.push({location: locations["Gang hideout"]});

    locations["Town square"] = new Location({ 
        connected_locations: [{location: locations["Town outskirts"]}],
        description: "The town's center of life, connected to all the markets, guilds, and other important places",
        name: "Town square",
        is_unlocked: false,
        getBackgroundNoises: function() {
            let noises = [];
            return noises;
        },
    });

    locations["Town outskirts"].connected_locations.push({location: locations["Town farms"]}, {location: locations["Slums"]}, {location: locations["Town square"]});

    locations["Cat café"] = new Location({ 
        connected_locations: [{location: locations["Town square"]}],
        description: `A cat café in the center of town. There are multiple kitties of all kinds, but two females especially catch your eyes
 - a chubby mackerel tabby with a white belly and neck, and a slender tortoishell that seems blind on the right eye. There's a single worker in the café, a man with with long ponytail and glasses.`,
        name: "Cat café",
        is_unlocked: true,
        getBackgroundNoises: function() {
            let noises = ["Meow", "Nya", "Mrrr", "Mrrrp meow", "*A cat jumps on your lap*", "*A cat brushes on your leg*"];
            return noises;
        },
    });

    locations["Town square"].connected_locations.push({location: locations["Cat café"]});

    locations["Mountain path"] = new Location({
        connected_locations: [{location: locations["Nearby cave"], custom_text: "Climb down to [Nearby Cave]"}],
        description: "A treacherus path high above the village",
        name: "Mountain path",
        is_unlocked: false,
        getBackgroundNoises: function() {
            let noises = ["You hear a rock tumble and fall down. It takes a very long time to hit the ground...", "Strong wind whooshes past you"];
            return noises;
        },
        unlock_text: "Thanks to your hard effort, you reached a narrow safe spot where you can rest a bit.",
    });
    locations["Nearby cave"].connected_locations.push({location: locations["Mountain path"], custom_text: "Climb up to [Mountain path]"});

    locations["Small flat area in mountains"] = new Location({
        connected_locations: [{location: locations["Mountain path"]}],
        description: "A piece of flatland somewhere in the mountains, very high above the village. It's not that big, but more than enough for a camp.",
        name: "Small flat area in mountains",
        is_unlocked: false,
        getBackgroundNoises: function() {
            let noises = ["You hear a rock tumble and fall down. It takes a very long time to hit the ground...", "Strong wind whooshes past you", "A pair of birds flies right above you"];
            return noises;
        },
        unlock_text: "You finally got to a place where a camp can be established",
    });
    locations["Mountain path"].connected_locations.push({location: locations["Small flat area in mountains"]});
    
    locations["Mountain camp"] = new Location({
        connected_locations: [{location: locations["Nearby cave"], custom_text: "Climb down to [Nearby cave]"}],
        description: "A nice safe camp in mountains created by you, a perfect base for further exploration.",
        name: "Mountain camp",
        housing: {
            is_unlocked: true,
            sleeping_xp_per_tick: 8,
            text_to_sleep: "Take a nap on the bedroll",
        },
        is_unlocked: false,
        getBackgroundNoises: function() {
            let noises = ["You hear a rock tumble and fall down. It takes a very long time to hit the ground...", "Strong wind whooshes past you", "A pair of birds flies right above you"];
            return noises;
        },
    });
    locations["Nearby cave"].connected_locations.push({location: locations["Mountain camp"]});
    locations["Mountain path"].connected_locations.push({location: locations["Mountain camp"]});

    locations["Gentle mountain slope"] = new Combat_zone({
        description: "A surprisingly gentle clearing, with a herd of angry goats protecting it.",
        enemies_list: ["Angry mountain goat"],
        enemy_count: 50,
        enemy_group_size: [3,4],
        is_unlocked: false,
        enemy_stat_variation: 0.2,
        name: "Gentle mountain slope", 
        types: [{type: "open", stage: 1, xp_gain: 5}, {type: "thin air", stage: 1, xp_gain: 3}],
        parent_location: locations["Mountain camp"],
        first_reward: {
            xp: 2000,
        },
        repeatable_reward: {
            xp: 1000,
        }
    });
    locations["Mountain camp"].connected_locations.push({location: locations["Gentle mountain slope"]});
})();

//challenge zones
(function(){
    locations["Sparring with the village guard (heavy)"] = new Challenge_zone({
        description: "He's showing you a technique that makes his attacks slow but deadly",
        enemy_count: 1, 
        enemies_list: ["Village guard (heavy)"],
        enemy_group_size: [1,1],
        is_unlocked: false, 
        name: "Sparring with the village guard (heavy)", 
        leave_text: "Give up",
        parent_location: locations["Village"],
        first_reward: {
            xp: 30,
            reputation: {"village": 10},
        },
        repeatable_reward: {
            textlines: [{dialogue: "village guard", lines: ["heavy"]}],
        },
        unlock_text: "You can now spar with the guard (heavy stance) in the Village"
    });
    locations["Sparring with the village guard (quick)"] = new Challenge_zone({
        description: "He's showing you a technique that makes his attacks slow but deadly",
        enemy_count: 1, 
        enemies_list: ["Village guard (quick)"],
        enemy_group_size: [1,1],
        is_unlocked: false, 
        name: "Sparring with the village guard (quick)", 
        leave_text: "Give up",
        parent_location: locations["Village"],
        first_reward: {
            xp: 30,
            reputation: {"village": 10},
        },
        repeatable_reward: {
            textlines: [{dialogue: "village guard", lines: ["quick"]}],
        },
        unlock_text: "You can now spar with the guard (quick stance) in the Village"
    });
    locations["Village"].connected_locations.push(
        {location: locations["Sparring with the village guard (heavy)"], custom_text: "Spar with the guard [heavy]"},
        {location: locations["Sparring with the village guard (quick)"], custom_text: "Spar with the guard [quick]"}
    );

    locations["Suspicious wall"] = new Challenge_zone({
        description: "It can be broken with enough force, you can feel it", 
        enemy_count: 1, 
        types: [],
        enemies_list: ["Suspicious wall"],
        enemy_group_size: [1,1],
        enemy_stat_variation: 0,
        is_unlocked: false, 
        name: "Suspicious wall", 
        leave_text: "Leave it for now",
        parent_location: locations["Nearby cave"],
        repeatable_reward: {
            locations: [{location: "Hidden tunnel"}],
            textlines: [{dialogue: "village elder", lines: ["new tunnel"]}],
            xp: 20,
        },
        unlock_text: "At some point, one of wolf rats tries to escape through a previously unnoticed hole in a nearby wall. There might be another tunnel behind it!"
    });
    locations["Nearby cave"].connected_locations.push({location: locations["Suspicious wall"], custom_text: "Try to break the suspicious wall"});

    locations["Fight off the assailant"] = new Challenge_zone({
        description: "He attacked you out of nowhere", 
        enemy_count: 1, 
        types: [],
        enemies_list: ["Suspicious man"],
        enemy_group_size: [1,1],
        enemy_stat_variation: 0,
        is_unlocked: false, 
        name: "Fight off the assailant", 
        leave_text: "Run away for now",
        parent_location: locations["Slums"],
        repeatable_reward: {
            textlines: [{dialogue: "suspicious man", lines: ["defeated"]}],
            xp: 40,
        },
        unlock_text: "Defend yourself!"
    });
    locations["Slums"].connected_locations.push({location: locations["Fight off the assailant"], custom_text: "Fight off the suspicious man"});

    locations["Fight the angry mountain goat"] = new Challenge_zone({
        description: "It won't let you pass...",
        enemy_count: 1, 
        types: [{type: "narrow", stage: 1, xp_gain: 1}, {type: "thin air", stage: 1, xp_gain: 3}],
        enemies_list: ["Angry-looking mountain goat"],
        enemy_group_size: [1,1],
        enemy_stat_variation: 0,
        is_unlocked: false, 
        name: "Fight the angry mountain goat", 
        leave_text: "Run away and hope it won't follow",
        parent_location: locations["Mountain path"],
        repeatable_reward: {
            locations: [{location: "Small flat area in mountains"}],
            xp: 500,
        },
        unlock_text: "Defend yourself!"
    });
    locations["Mountain path"].connected_locations.push({location: locations["Fight the angry mountain goat"], custom_text: "Fight the angry goat"});
})();

//add activities
(function(){
    locations["Village"].activities = {
        "fieldwork": new LocationActivity({
            activity_name: "fieldwork",
            starting_text: "Work on the fields",
            get_payment: () => {
                return 10 + Math.round(15 * get_total_skill_level("Farming")/skills["Farming"].max_level);
            },
            is_unlocked: false,
            working_period: 60*2,
            availability_time: {start: 6, end: 20},
            skill_xp_per_tick: 1, 
        }),
        "running": new LocationActivity({
            activity_name: "running",
            infinite: true,
            starting_text: "Go for a run around the village",
            skill_xp_per_tick: 1,
            is_unlocked: false,
        }),
        "weightlifting": new LocationActivity({
            activity_name: "weightlifting",
            infinite: true,
            starting_text: "Try to carry some bags of grain",
            skill_xp_per_tick: 1,
            is_unlocked: false,
        }),
        "balancing": new LocationActivity({
            activity_name: "balancing",
            infinite: true,
            starting_text: "Try to keep your balance on rocks in the river",
            unlock_text: "All this fighting while surrounded by stone and rocks gives you a new idea",
            skill_xp_per_tick: 1,
            is_unlocked: false,
        }),
        "meditating": new LocationActivity({
            activity_name: "meditating",
            infinite: true,
            starting_text: "Sit down and meditate",
            skill_xp_per_tick: 1,
            is_unlocked: true,
        }),
        "patrolling": new LocationActivity({
            activity_name: "patrolling",
            starting_text: "Go on a patrol around the village.",
            get_payment: () => {return 30},
            is_unlocked: false,
            infinite: true,
            working_period: 60*2,
            skill_xp_per_tick: 1
        }),
        "woodcutting": new LocationActivity({
            activity_name: "woodcutting",
            infinite: true,
            starting_text: "Gather wood on the outskirts",
            skill_xp_per_tick: 1,
            is_unlocked: true,
            gained_resources: {
                resources: [{name: "Piece of rough wood", ammount: [[1,1], [1,3]], chance: [0.5, 1]}], 
                time_period: [20, 10],
                skill_required: [0, 10],
                scales_with_skill: true,
            },
            require_tool: true,
        }),
    };
    locations["Nearby cave"].activities = {
        "weightlifting": new LocationActivity({
            activity_name: "weightlifting",
            infinite: true,
            starting_text: "Try lifting some of the rocks",
            skill_xp_per_tick: 4,
            is_unlocked: false,
            unlock_text: "After the fight, you realize there's quite a lot of rocks of different sizes that could be used for exercises",
        }),
        "climbing": new LocationActivity({
            activity_name: "climbing",
            infinite: true,
            starting_text: "Attempt climbing the mountain walls outside",
            skill_xp_per_tick: 1,
            is_unlocked: false,
            unlock_text: "As you descend deeper and deeper, a sudden thought strikes you - what if you instead tried going up?",
        }),
        "meditating": new LocationActivity({
            activity_name: "meditating",
            infinite: true,
            starting_text: "Sit down and meditate in front of the gate",
            skill_xp_per_tick: 4,
            is_unlocked: false,
            unlock_text: "As you finish fighting your enemies and it becomes quiet, you feel a strange sense of tranquility. This spot in front of the mysterious gate, surrounded by calm and darkness, seems perfect to sit down and focus your mind."
        }),
        "mining": new LocationActivity({
            activity_name: "mining",
            infinite: true,
            starting_text: "Mine the strange looking iron vein",
            skill_xp_per_tick: 1,
            is_unlocked: false,
            gained_resources: {
                resources: [{name: "Low quality iron ore", ammount: [[1,1], [1,3]], chance: [0.4, 0.8]}], 
                time_period: [60, 30],
                skill_required: [0, 10],
                scales_with_skill: true,
            },
            unlock_text: "As you clear the area of wolf rats, you notice a vein of an iron ore",
        }),
        "mining2": new LocationActivity({
            activity_name: "mining",
            infinite: true,
            starting_text: "Mine the deeper iron vein",
            skill_xp_per_tick: 5,
            is_unlocked: false,
            gained_resources: {
                resources: [{name: "Iron ore", ammount: [[1,1], [1,3]], chance: [0.3, 0.7]}],
                time_period: [90, 40],
                skill_required: [7, 17],
                scales_with_skill: true,
            },
            unlock_text: "Going deeper, you find a vein of an iron ore that seems to be of much higher quality",
        }),
        "mining3": new LocationActivity({
            activity_name: "mining",
            infinite: true,
            starting_text: "Mine the atratan vein",
            skill_xp_per_tick: 10,
            is_unlocked: false,
            gained_resources: {
                resources: [{name: "Atratan ore", ammount: [[1,1], [1,3]], chance: [0.3, 0.7]}],
                time_period: [120, 60],
                skill_required: [12, 25],
                scales_with_skill: true,
            },
            unlock_text: "As you finish the fight and get a time to look around, you notice a metal vein of different color than iron. You recall another ore called Atratan, this must be it.",
        }),
    };
    locations["Forest road"].activities = {
        "running": new LocationActivity({
            activity_name: "running",
            infinite: true,
            starting_text: "Go for a run through the forest",
            skill_xp_per_tick: 4,
        }),
        "woodcutting": new LocationActivity({
            activity_name: "woodcutting",
            infinite: true,
            starting_text: "Gather wood from nearby trees",
            skill_xp_per_tick: 5,
            is_unlocked: false,
            gained_resources: {
                resources: [{name: "Piece of wood", ammount: [[1,1], [1,3]], chance: [0.3, 1]}],
                time_period: [90, 40],
                skill_required: [7, 17],
                scales_with_skill: true,
            },
        }),
        "woodcutting2": new LocationActivity({
            activity_name: "woodcutting",
            infinite: true,
            starting_text: "Gather wood from sturdy trees",
            skill_xp_per_tick: 10,
            is_unlocked: false,
            gained_resources: {
                resources: [{name: "Piece of ash wood", ammount: [[1,1], [1,3]], chance: [0.3, 1]}],
                time_period: [120, 60],
                skill_required: [12, 25],
                scales_with_skill: true,
            },
            unlock_text: "Finishing your fight, you notice that the trees on the side of the clearing look really healthy and sturdy, they could be a useful material.",
        }),
        "herbalism": new LocationActivity({
            activity_name: "herbalism",
            infinite: true,
            starting_text: "Gather useful herbs throughout the forest",
            skill_xp_per_tick: 2,
            is_unlocked: false,
            gained_resources: {
                resources: [
                    {name: "Oneberry", ammount: [[1,1], [1,1]], chance: [0.1, 0.5]},
                    {name: "Golmoon leaf", ammount: [[1,1], [1,1]], chance: [0.1, 0.7]},
                    {name: "Belmart leaf", ammount: [[1,1], [1,1]], chance: [0.1, 0.7]}
                ], 
                time_period: [120, 45],
                skill_required: [0, 10],
                scales_with_skill: true,
            },
            require_tool: true,
        }),
    };
    locations["Town farms"].activities = {
        "fieldwork": new LocationActivity({
            activity_name: "fieldwork",
            starting_text: "Work on the fields",
            get_payment: () => {
                return 20 + Math.round(20 * get_total_skill_level("Farming")/skills["Farming"].max_level);
            },
            is_unlocked: false,
            working_period: 60*2,
            availability_time: {start: 6, end: 20},
            skill_xp_per_tick: 2,
        }),
        "animal care": new LocationActivity({
            activity_name: "animal care",
            infinite: true,
            starting_text: "Take care of local sheep in exchange for some wool",
            skill_xp_per_tick: 3,
            is_unlocked: false,
            gained_resources: {
                resources: [
                    {name: "Wool", ammount: [[1,1], [1,3]], chance: [0.1, 1]},
                ], 
                time_period: [120, 60],
                skill_required: [0, 10],
                scales_with_skill: true,
            },
        }),
    };
    locations["Mountain camp"].activities = {
        "herbalism": new LocationActivity({
            activity_name: "herbalism",
            infinite: true,
            starting_text: "Search for useful herbs on the mountainside",
            skill_xp_per_tick: 6,
            is_unlocked: false,
            gained_resources: {
                resources: [
                    {name: "Silver thistle", ammount: [[1,1], [1,1]], chance: [0.1, 0.5]},
                ], 
                time_period: [120, 60],
                skill_required: [7, 17],
                scales_with_skill: true,
            },
            require_tool: true,
        }),
    }
})();

//add actions
(function(){
    locations["Nearby cave"].actions = {
        "open the gate": new LocationAction({
            action_id: "open the gate",
            starting_text: "Try to push the mysterious gate open",
            description: "It's an ancient massive gate, but maybe with enough strength and training you could actually manage to push it at least a tiny bit to create enough space to walk through.",
            action_text: "Huffing and puffing",
            success_text: "When you are almost ready to give up, you hear the ancient hinges creak, as the gate slowly moves. Finally, you can continue deeper!",
            failure_texts: {
                conditional_loss: ["Despite trying your best, you can feel that you are just too weak for it. You should get stronger first."],
            },
            conditions: [
                {
                    stats: {
                        strength: 150,
                    }
                }
            ],
            attempt_duration: 10,
            success_chances: [1],
            rewards: {
                locations: [{location: "Writhing tunnel"}],
            },
        }),
        "climb the mountain": new LocationAction({
            action_id: "climb the mountain",
            starting_text: "Try to climb up the mountain",
            description: "It is an ardous task that will require some good long rope and actual skill in climbing, together with good physical abilities. It will take some time, so you need to make sure you won't run out of energy halfway through.",
            action_text: "Climbing up",
            success_text: "Somehow you did it, you climbed all the way up! Thanks to the rope you tied on your way, further trips up and down will be much easier.",
            failure_texts: {
                conditional_loss: ["Despite trying your best, you can feel that you won't manage to do it without more training"],
                random_loss: [
                    "You almost had it, but at some point you grabbed a rock that turned out to be unstable. Be more careful next time!", 
                    "You were really close, but a gust of wind at a bad moment knocked you off balance.",
                    "You failed to notice a falling rock and got knocked down."
                ],
                unable_to_begin: ["While seemingly prepared, you realize you're missing an important accessory - some nice long rope is gonna be a necessity for this, especially if you want to go back down at some point."],
            },
            required: {
                items_by_id: {"Coil of rope": {count: 1, remove_on_success: true}},
            },
            conditions: [
                {
                    skills: {
                        "Climbing": 7,
                    },
                    stats: {
                        strength: 50,
                        agility: 50,
                        max_stamina: 50,
                    }
                },
                {
                    skills: {
                        "Climbing": 12,
                    },
                    stats: {
                        strength: 120,
                        agility: 120,
                        max_stamina: 50,
                    }
                }
            ],
            attempt_duration: 60,
            success_chances: [0.3, 1],
            rewards: {
                locations: [{location: "Mountain path"}],
                move_to: {location: "Mountain path"},
            },
        }),
    };
    locations["Mountain path"].actions = {
        "explore": new LocationAction({
            action_id: "explore",
            starting_text: "Explore the area",
            description: "Now that you are here, it's time to find if there's anything worthy of your time. Too bad you couldn't do it beforehand.",
            action_text: "Looking around",
            success_text: "The good news: you noticed a nice little piece of flat land that would be perfect for a camp. The bad news: there's a very angry-looking mountain goat blocking your way.",
            failure_texts: {
                random_loss: [
                    "You looked under rocks and between the bushes, but you found nothing. Keep looking!", 
                    "You looked and looked, but you couldn't find anything. Rest a bit and go back to it!",
                ],
            },
            conditions: [],
            is_unlocked: true,
            attempt_duration: 60,
            success_chances: [0.6],
            rewards: {
                locations: [{location: "Fight the angry mountain goat"}],
            },
        }),
    };
    locations["Small flat area in mountains"].actions = {
        "create camp": new LocationAction({
            action_id: "create camp",
            starting_text: "Establish a camp here",
            description: "Prepare a tent, a fireplace, and a storage here to create a new base. It will be necessary before exploring further up the mountains.",
            action_text: "Working",
            success_text: "After a few hours of hard work, your camp is ready. You can rest here before venturing further in the mountains",
            conditions: [
                {
                    items_by_id: {"Camping supplies": {count: 1, remove: true}},
                }
            ],
            is_unlocked: true,
            check_conditions_on_finish: false,
            failure_texts: {
                conditional_loss: ["You lack camping supplies!"],
            },
            attempt_duration: 180,
            success_chances: [1],
            rewards: {
                locations: [{location: "Mountain camp"}],
                move_to: {location: "Mountain camp"},
                locks: {
                    locations: ["Mountain path", "Small flat area in mountains"],
                }
            },
        }),
    },
    locations["Mountain camp"].actions = {
        "explore1": new LocationAction({
            action_id: "explore1",
            starting_text: "Explore the area further",
            description: "With the camp created, it's time to keep exploring",
            action_text: "Looking around",
            success_text: "You find a reasonably gentle mountain slope with green grass and... more angry goats. At least they seem slightly smaller.",
            failure_texts: {
                random_loss: [
                    "You looked under rocks and between the bushes, but you found nothing. Keep looking!", 
                    "You looked and looked, but you couldn't find anything. Rest a bit and go back to it!",
                ],
            },
            conditions: [],
            is_unlocked: true,
            attempt_duration: 60,
            success_chances: [0.6],
            rewards: {
                locations: [{location: "Gentle mountain slope"}],
                actions: [{location:"Mountain camp", action: "explore2"}]
            },
        }),
        "explore2": new LocationAction({
            action_id: "explore2",
            starting_text: "Keep exploring",
            description: "You have a feeling that there must be something more of value than just goats.",
            action_text: "Looking around",
            success_text: "You notice some plants, that you soon recognize as a potent healing ingredient that was mentioned to you by that old craftsman. It's gonna be useful if you know proper recipes.",
            failure_texts: {
                random_loss: [
                    "You looked under rocks and between the bushes, but you found nothing. Keep looking!", 
                    "You looked and looked, but you couldn't find anything. Rest a bit and go back to it!",
                ],
                conditional_loss: [
                    "You spot a lot of curious plants. You have a hunch that at least some of them must be useful for something, but you fail to recognize any of them. If only you knew more about herbs..."
                ]
            },
            conditions: [
                {
                        
                    skills: {
                            "Herbalism": 6,
                        },
                },
                {
                        skills: {
                            "Herbalism": 10,
                        },
                }
            ],
            is_unlocked: false,
            attempt_duration: 60,
            success_chances: [0.5],
            rewards: {
                activities: [{location:"Mountain camp", activity:"herbalism"}],
            },
        }),
    }
    locations["Forest road"].actions = {
        "search for boars": new LocationAction({
            action_id: "search for boars",
            starting_text: "Search forest for the clearing with boars",
            description: "It might take some time and a few attempts, but you are sure you can manage",
            action_text: "Searching the forest",
            success_text: "There they are! You see a clearing with tall grass and hear unmistakeable grunts and squeals",
            failure_texts: {
                random_loss: [
                    "You search for some time, but end up with nothing. Next time you will try a slightly different direction",
                ],
            },
            attempt_duration: 90,
            success_chances: [0.5],
            rewards: {
                locations: [{location: "Forest clearing"}],
            },
        }),
    };
})();

//setup ids
(function(){
    Object.keys(locations).forEach(location_key => {
        Object.keys(locations[location_key].activities || {}).forEach(activity_key => {
            locations[location_key].activities[activity_key].activity_id = activity_key;
        });
    });
})();
export {locations, location_types, get_location_type_penalty, favourite_locations};