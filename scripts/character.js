"use strict";

import { InventoryHaver } from "./inventory.js";
import { skills } from "./skills.js";
import { update_displayed_character_inventory, update_displayed_equipment, 
         update_displayed_stats, update_displayed_combat_stats,
         update_displayed_health, update_displayed_stamina } from "./display.js";
import { current_location } from "./main.js";
import { current_game_time } from "./game_time.js";

//player character
const base_xp_cost = 10;


class Hero extends InventoryHaver {
        constructor() {
                super();
        }
}

const character = new Hero();
character.name = "Hero";
character.titles = {};
character.stats = {
        max_health: 40, 
        health: 40, 
        max_stamina: 40,
        stamina: 40,
        max_mana: 0,
        mana: 0,
        strength: 10, 
        agility: 10, 
        dexterity: 10, 
        intuition: 10,
        magic: 0, 
        attack_speed: 1, 
        crit_rate: 0.1, 
        crit_multiplier: 1.2, 
        attack_power: 0, 
        defense: 0
};
character.combat_stats = {attack_points: 0, evasion_points: 0, block_chance: 0};
character.full_stats = {}; //base stats (including skill bonuses) + bonuses from equipment, multiplied by multipliers
character.multipliers = {};//multipliers based on skills 
character.full_multipliers = {}; //multipliers based on skills * multipliers from equipment
character.equipment = {
        head: null, torso: null, 
        arms: null, ring: null, 
        weapon: null, "off-hand": null,
        legs: null, feet: null, 
        amulet: null
};
character.money = 0;
character.xp = {
        current_level: 0, total_xp: 0, current_xp: 0, xp_to_next_lvl: base_xp_cost, 
        total_xp_to_next_lvl: base_xp_cost, base_xp_cost: base_xp_cost, xp_scaling: 1.9
};

character.base_stats = character.stats;
character.starting_xp = character.xp;

character.add_xp = function (xp_to_add) {
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
character.get_level_bonus = function (level) {

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
character.add_bonuses = function ({stats = {}, multipliers = {}}) {
        Object.keys(stats).forEach(function (stat) {
                character.stats[stat] += stats[stat];
        });
        Object.keys(multipliers).forEach(function (multiplier) {
                character.multipliers[multiplier] = (multipliers[multiplier] * (character.multipliers[multiplier] || 1)) || 1;
        });
}

/**
 * adds stat bonuses from equipment and certain skills
 */
character.update_stats = function () {
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
                } else if(stat === "mana") {
                        //character.full_stats["mana"] = Math.max(0, character.full_stats["max_mana"] - missing_mana); //done a bit later
                } else if(stat === "strength") {
                        character.full_stats["strength"] *= skills["Weightlifting"].get_coefficient("multiplicative");
                }
        } else {
                Object.keys(character.equipment).forEach(function(key) {
                        if(character.equipment[key]?.getDefense) {
                                character.full_stats[stat] += character.equipment[key].getDefense();
                        }
                });
        }
        
        if(stat === "stamina") {
                character.full_stats["stamina"] = Math.round(10*Math.max(0, character.full_stats["max_stamina"] - missing_stamina))/10;
                character.full_stats["max_stamina"] = Math.round(10*character.full_stats["max_stamina"])/10;
        } else if(stat === "mana") {
                character.full_stats["mana"] = Math.round(10*Math.max(0, character.full_stats["max_mana"] - missing_mana))/10;
                character.full_stats["max_mana"] = Math.round(10*character.full_stats["max_mana"])/10;
        }
        else if(stat === "crit_rate") {
                character.full_stats[stat] = Math.round(1000*character.full_stats[stat])/1000;
        }
        else if(stat === "crit_dmg") {
                character.full_stats[stat] = Math.round(100*character.full_stats[stat])/100;
        }
        else {
                character.full_stats[stat] = Math.round(10*character.full_stats[stat])/10;
        }
    });

    if(character.equipment.weapon != null) { 
        character.stats.attack_power = (character.full_stats.strength/10) * character.equipment.weapon.getAttack();
    } 
    else {
        character.stats.attack_power = character.full_stats.strength/10;
    }

    character.full_stats.attack_power = character.stats.attack_power;
}

character.get_stamina_multiplier = function () {
        if(character.full_stats.stamina == 0) {
                return 0.5 + skills["Persistence"].get_level_bonus();
        }
        return 1;
}

character.get_attack_speed = function () {
        return character.full_stats.attack_speed * character.get_stamina_multiplier();
}

character.get_attack_power = function () {
        return character.full_stats.attack_power * character.get_stamina_multiplier();
}

character.wears_armor = () => {
        if(
                (!character.equipment.head || character.equipment.head.getDefense() == 0) &&
                (!character.equipment.torso || character.equipment.torso.getDefense() == 0) &&
                (!character.equipment.arms || character.equipment.arms.getDefense() == 0) &&
                (!character.equipment.legs || character.equipment.legs.getDefense() == 0) &&
                (!character.equipment.feet || character.equipment.feet.getDefense() == 0)
            )
        {
                return false;
        } else {
                return true;
        }
}

/**
 * 
 * @param {*}
 * @returns [actual damage taken, if character should faint] 
 */
character.take_damage = function ({damage_value, damage_type = "physical", damage_element, can_faint = true, give_skill_xp = true}) {
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
                //TODO give xp to resistance skills when taking damge
        }

        return {damage_taken, fainted};
}

character.get_character_money = function () {
        return character.money;
}

function add_to_character_inventory(items) {
        character.add_to_inventory(items);
        update_displayed_character_inventory();
}

function remove_from_character_inventory({item_name, item_count, item_id}) {
        character.remove_from_inventory({item_name, item_count, item_id});
        update_displayed_character_inventory();
}

/**
 * @description equips passed item, doesn't do anything more with it;
 * don't call this one directly (except for when loading save data), but via equip_item_from_inventory()
 * @param: game item object
 */
function equip_item(item) {
        unequip_item(item.equip_slot);
        character.equipment[item.equip_slot] = item;
        update_displayed_equipment();
        update_displayed_character_inventory();
        update_character_stats();	
}

/**
 * equips item and removes it from inventory
 * @param item_info {name, id}
 */
 function equip_item_from_inventory({item_name, item_id}) {
        if(character.inventory.hasOwnProperty(item_name)) { //check if its in inventory, just in case
            //add specific item to equipment slot
            // -> id and name tell which exactly item it is, then also check slot in item object and thats all whats needed
            equip_item(character.inventory[item_name][item_id]);
            remove_from_character_inventory({item_name, item_id});
        }
}
    
function unequip_item(item_slot) {
        if(character.equipment[item_slot] != null) {
                add_to_character_inventory([{item: character.equipment[item_slot]}]);
                character.equipment[item_slot] = null;
                update_displayed_equipment();
                update_displayed_character_inventory();
                update_character_stats();
        }
}

/**
 * updates character main stats (health, strength, etc), stats dependant on enemy are updated in update_combat_stats()
 */
 function update_character_stats() { //updates character stats

        character.update_stats();
    
        update_displayed_stats();
        update_displayed_health();
        update_displayed_stamina();
        //update_displayed_mana();
        update_combat_stats();
}

/**
 * updates character stats related to combat
 */
 function update_combat_stats() {

        let effects = {};
        let light_modifier = 1;
        
        if(current_location) {
                if(!("connected_locations" in current_location)) {
                        effects = current_location.get_total_effect().hero_penalty.multipliers;
                }

                if(current_location.light_level === "dark" || current_location.light_level === "normal" && (current_game_time.hour >= 20 || current_game_time.hour <= 3)) {
                        light_modifier = 0.5 + 0.5*skills["Night vision"].current_level/skills["Night vision"].max_level;
                }
        }

        

        if(character.equipment["off-hand"] != null && character.equipment["off-hand"].offhand_type === "shield") { //HAS SHIELD
            character.combat_stats.evasion_points = null;
            character.combat_stats.block_chance = Math.round(0.4 * skills["Shield blocking"].get_coefficient("flat") * 10000)/10000;
        }

    
        character.combat_stats.attack_points = 
                Math.sqrt(character.full_stats.intuition) * character.full_stats.dexterity 
                        * skills["Combat"].get_coefficient("multiplicative") * (effects?.hit_chance || 1) * light_modifier;
    
        if(character.equipment["off-hand"] == null || character.equipment["off-hand"].offhand_type !== "shield") {
            character.combat_stats.evasion_points = 
                character.full_stats.agility * Math.sqrt(character.full_stats.intuition) 
                        * skills["Evasion"].get_coefficient("multiplicative") * (effects?.evasion || 1) * light_modifier;
        }
    
        update_displayed_combat_stats();
}

export {character, add_to_character_inventory, remove_from_character_inventory, equip_item_from_inventory, equip_item, 
        unequip_item, update_character_stats, update_combat_stats};
