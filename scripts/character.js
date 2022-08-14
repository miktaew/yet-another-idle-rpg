import { skills } from "./skills.js";

//player character
const base_xp_cost = 10;
const character = {name: "Hero", titles: {}, 
                   stats: {
                           max_health: 40, 
                           health: 40, 
                           max_stamina: 40,
                           stamina: 40,
                           max_mana: 0,
                           mana: 0,
                           strength: 8, 
                           agility: 8, 
                           dexterity: 8, 
                           intuition: 8,
                           magic: 0, 
                           attack_speed: 1, 
                           crit_rate: 0.1, 
                           crit_multiplier: 1.2, 
                           attack_power: 0, 
                           defense: 0
                        },
                   // crit damage is a multiplier; defense should be only based on worn armor and/or skills (incl magic);
                   combat_stats: {attack_points: 0, evasion_points: 0, block_chance: 0},
                   full_stats: {}, //base stats (including skill bonuses) + bonuses from equipment, multiplied by multipliers
                   multipliers: {}, //multipliers based on skills
                   full_multipliers: {}, //multipliers based on skills * multipliers from equipment
                   inventory: {},
                   equipment: {head: null, torso: null, 
                               arms: null, ring: null, 
                               weapon: null, "off-hand": null,
                               legs: null, feet: null, 
                               amulet: null},
                    money: 0, 
                    xp: {current_level: 0, total_xp: 0, current_xp: 0, xp_to_next_lvl: base_xp_cost, 
                         total_xp_to_next_lvl: base_xp_cost, base_xp_cost: base_xp_cost, xp_scaling: 1.7},
                };

character.base_stats = character.stats;
character.starting_xp = character.xp;

character.add_xp = function add_xp(xp_to_add) {
        character.xp.total_xp += xp_to_add;

        if(xp_to_add + character.xp.current_xp < character.xp.xp_to_next_lvl) { // no levelup
                character.xp.current_xp += xp_to_add;
        }
        else { //levelup
                var level_after_xp = 0;
                
                while(character.xp.total_xp >= character.xp.total_xp_to_next_lvl) {
                        level_after_xp += 1;
                        
                        character.xp.total_xp_to_next_lvl = Math.round(character.xp.base_xp_cost * (1 - character.xp.xp_scaling ** (level_after_xp + 1))/(1 - character.xp.xp_scaling));
                } //calculates lvl reached after adding xp

                var total_xp_to_previous_lvl = Math.round(character.xp.base_xp_cost * (1 - character.xp.xp_scaling ** level_after_xp)/(1 - character.xp.xp_scaling));
                //xp needed for current lvl, same formula but for n-1

                const gains = character.get_level_bonus(level_after_xp);

                character.xp.xp_to_next_lvl = character.xp.total_xp_to_next_lvl - total_xp_to_previous_lvl;
                character.xp.current_level = level_after_xp;
                character.xp.current_xp = character.xp.total_xp - total_xp_to_previous_lvl;		
                
                return `${character.name} is getting stronger. Reached level ${character.xp.current_level} ${gains}`;
        }
}

/**
 * gets bonuses to stats based on current level and level passed as param
 * @param {Number} level 
 * @returns stats bonuses from leveling
 */
character.get_level_bonus = function get_level_bonus(level) {

        var gained_hp = 0;
        var gained_str = 0;
        var gained_agi = 0;
        var gained_dex = 0;
        var gained_int = 0;

        for(let i = character.xp.current_level + 1; i <= level; i++) {
                if(i % 2 == 1) {
                        gained_str += Math.floor(1+(i/10));
                        gained_agi += Math.floor(1+(i/10));
                        gained_dex += Math.floor(1+(i/10));
                        gained_int += Math.floor(1+(i/10));

                        character.stats.strength += Math.floor(1+(i/10));
                        character.stats.agility += Math.floor(1+(i/10));
                        character.stats.dexterity += Math.floor(1+(i/10));
                        character.stats.intuition += 1;
                }
                gained_hp += 10 * Math.floor(1+(i/10));

                character.stats.max_health += 10 * Math.floor(1+(i/10));
                character.stats.health = character.stats.max_health;
                
        }

        var gains = `<br>HP increased by ${gained_hp}`;
        if(gained_str > 0) {
                gains += `<br>Strength increased by ${gained_str}`;
        }
        if(gained_agi > 0) {
                gains += `<br>Agility increased by ${gained_agi}`;
        }
        if(gained_dex > 0) {
                gains += `<br>Dexterity increased by ${gained_dex}`;
        }
        if(gained_int > 0) {
                gains += `<br>Intuition increased by ${gained_int}`;
        }
        
        return gains;
}

/**
 * adds skill bonuses to character stats
 * @param {{stats, multipliers}} bonuses 
 */
character.add_bonuses = function add_bonuses({stats = {}, multipliers = {}}) {
        Object.keys(stats).forEach(function (stat) {
                character.stats[stat] += stats[stat];
        });
        Object.keys(multipliers).forEach(function (multiplier) {
                character.multipliers[multiplier] = (bmultipliers[multiplier] * (character.multipliers[multiplier] || 1)) || 1;
        });
}

/**
 * adds stat bonuses from equipment and certain skills
 */
character.update_stats = function update_stats() {
    const missing_health = (character.full_stats["max_health"] - character.full_stats["health"]) || 0;   
    const missing_stamina = (character.full_stats["max_stamina"] - character.full_stats["stamina"]) || 0;   
    const missing_mana = (character.full_stats["max_mana"] - character.full_stats["mana"]) || 0;   
    //to avoid fully restoring all whenever this function is called

    Object.keys(character.stats).forEach(function(stat){
        if(stat === "attack_power") {
            return;
        }

        character.full_stats[stat] = character.stats[stat];
        character.full_multipliers[stat] = character.multipliers[stat] || 1;

        if(stat !== "defense") {
                Object.keys(character.equipment).forEach(function(key) {
                        if(character.equipment[key]?.getStats()[stat]?.flat) {
                                character.full_stats[stat] += character.equipment[key].getStats()[stat].flat;
                        }
                }); //calculate stats based on equipment
        
                
                Object.keys(character.equipment).forEach(function(key) {
                        if(character.equipment[key]?.getStats()[stat]?.multiplier) {
                                character.full_multipliers[stat] *= character.equipment[key].getStats()[stat].multiplier;
                        }
                });

                character.full_stats[stat] *= (character.full_multipliers[stat] || 1);

                if(stat === "health") {
                        character.full_stats["health"] = Math.max(1, character.full_stats["max_health"] - missing_health);
                } else if(stat === "stamina") {
                        //directly add bonus from running skill
                        character.full_stats["max_stamina"] *= skills["Running"].get_coefficient("multiplicative");
                        character.full_stats["stamina"] = Math.max(0, character.full_stats["max_stamina"] - missing_stamina);
                } else if(stat === "mana") {
                        character.full_stats["mana"] = Math.max(0, character.full_stats["max_mana"] - missing_mana);
                } 
        } else {
                Object.keys(character.equipment).forEach(function(key) {
                        if(character.equipment[key]?.getDefense) {
                                character.full_stats[stat] += character.equipment[key].getDefense();
                        }
                });
        }
        
        character.full_stats[stat] = Math.round(10*character.full_stats[stat])/10;
    });

    if(character.equipment.weapon != null) { 
        character.stats.attack_power = (character.full_stats.strength/10) * character.equipment.weapon.getAttack();
    } 
    else {
        character.stats.attack_power = character.full_stats.strength/10;
    }

    character.full_stats.attack_power = character.stats.attack_power;
}

character.get_stamina_multiplier = function get_stamina_multiplier() {
        if(character.full_stats.stamina < 10) {
                return 0.5 + skills["Persistence"].get_level_bonus();
        }
        return 1;
}

character.get_attack_speed = function get_attack_speed() {
        return character.full_stats.attack_speed * character.get_stamina_multiplier();
}

character.get_attack_power = function get_attack_power() {
        return character.full_stats.attack_power * character.get_stamina_multiplier();
}

/**
 * 
 * @param {*}
 * @returns [actual damage taken, if character should faint] 
 */
character.take_damage = function take_damage({damage_value, damage_type = "physical", damage_element, can_faint = true, give_skill_xp = true}) {
        /*
        damage types: "physical", "elemental", "magic"
        each with it's own defense on equipment (and potentially spells)
        */

        /*
        TODO:
                - damage types
                - damage elements (for elemental damage type)
                - resistance skills
        */
        let fainted;

        const damage_taken = Math.round(10*Math.max(damage_value - character.full_stats.defense, 1))/10;

        character.full_stats.health -= damage_taken;

        if(character.full_stats.health <= 0 && can_faint) {
                fainted = true;
                character.full_stats.health = 0;
        } else {
                fainted = false;
        }

        if(give_skill_xp) {
                //TODO
        }

        return {damage_taken, fainted};
}

export {character};
