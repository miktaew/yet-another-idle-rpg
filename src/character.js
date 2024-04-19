"use strict";

import { InventoryHaver } from "./inventory.js";
import { skills } from "./skills.js";
import { update_displayed_character_inventory, update_displayed_equipment, 
         update_displayed_stats, update_displayed_combat_stats,
         update_displayed_health, update_displayed_stamina, 
         update_displayed_skill_xp_gain, update_all_displayed_skills_xp_gain,
         update_displayed_xp_bonuses } from "./display.js";
import { current_location, current_stance } from "./main.js";
import { current_game_time } from "./game_time.js";
import { stances } from "./combat_stances.js";

class Hero extends InventoryHaver {
        constructor() {
                super();
        }
}

const base_block_chance = 0.75; //+20 from the skill

const character = new Hero();
character.name = "Hero";
character.titles = {};
character.base_stats = {
        max_health: 40, 
        health: 40, 
        max_stamina: 40,
        stamina: 40,
        stamina_efficiency: 1,
        max_mana: 0,
        mana: 0,
        mana_efficiency: 1,
        strength: 10, 
        agility: 10, 
        dexterity: 10, 
        intuition: 10,
        magic: 0, 
        attack_speed: 1, 
        crit_rate: 0.05, 
        crit_multiplier: 1.4, 
        attack_power: 0, 
        defense: 0,
        block_strength: 0,
};
character.combat_stats = {attack_points: 0, evasion_points: 0, block_chance: 0};

character.stats = {};
character.stats.full = {...character.base_stats};
character.stats.total_flat = {};
character.stats.total_multiplier = {};

character.stats.flat = {
        level: {},
        skills: {},
        equipment: {},
        skill_milestones: {},
        books: {}
};

character.stats.multiplier = {
        skills: {},
        skill_milestones: {},
        equipment: {},
        books: {},
        stance: {}
};

character.xp_bonuses = {};
character.xp_bonuses.total_multiplier = {
        hero: 1,
        all: 1,
        all_skill: 1,
};

character.xp_bonuses.multiplier = {
        skills: {},
        skill_milestones: {},
        equipment: {},
        books: {}
};

character.equipment = {
        head: null, torso: null, 
        arms: null, ring: null, 
        weapon: null, "off-hand": null,
        legs: null, feet: null, 
        amulet: null
};
character.money = 0;

const base_xp_cost = 10;
character.xp = {
        current_level: 0, total_xp: 0, current_xp: 0, xp_to_next_lvl: base_xp_cost, 
        total_xp_to_next_lvl: base_xp_cost, base_xp_cost: base_xp_cost, xp_scaling: 1.8
};
character.starting_xp = character.xp;

character.add_xp = function ({xp_to_add, use_bonus = true}) {
        if(use_bonus) {
                xp_to_add *= (character.xp_bonuses.total_multiplier.hero || 1) * (character.xp_bonuses.total_multiplier.all || 1);
        }
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

        let gained_hp = 0;
        let gained_stamina = 0;
        let gained_str = 0;
        let gained_agi = 0;
        let gained_dex = 0;
        let gained_int = 0;

        for(let i = character.xp.current_level + 1; i <= level; i++) {
                if(i % 2 == 1) {
                        gained_str += Math.ceil(i/10);
                        gained_int += Math.ceil(i/10);
                } else {
                        gained_agi += Math.ceil(i/10);
                        gained_dex += Math.ceil(i/10);
                }

                gained_hp += 10 * Math.ceil(i/10);
                gained_stamina += 5//5 * Math.ceil(i/10);
        }

        character.stats.flat.level.max_health = (character.stats.flat.level.max_health || 0) + gained_hp;
        character.stats.flat.level.health = character.stats.flat.level.max_health;
        character.stats.flat.level.max_stamina = (character.stats.flat.level.max_stamina || 0) + gained_stamina;
        character.stats.flat.level.stamina = character.stats.flat.level.max_stamina;
        character.stats.flat.level.strength = (character.stats.flat.level.strength || 0) + gained_str;
        character.stats.flat.level.intuition = (character.stats.flat.level.intuition || 0) + gained_int;
        character.stats.flat.level.agility = (character.stats.flat.level.agility || 0) + gained_agi;
        character.stats.flat.level.dexterity = (character.stats.flat.level.dexterity || 0) + gained_dex;

        let gains = `<br>HP increased by ${gained_hp}<br>Stamina increased by ${gained_stamina}`;
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
 * adds skill milestone bonuses to character stats
 * called when a new milestone is reached
 * @param {{flats, multipliers}} bonuses 
 */
character.stats.add_skill_milestone_bonus = function ({flats = {}, multipliers = {}, xp_multipliers = {}}) {
        Object.keys(character.base_stats).forEach(stat => {
                if(flats[stat]) {
                        character.stats.flat.skill_milestones[stat] = (character.stats.flat.skill_milestones[stat] || 0) + flats[stat];
                }
                if(multipliers[stat]) {
                        character.stats.multiplier.skill_milestones[stat] = (character.stats.multiplier.skill_milestones[stat] || 1) * multipliers[stat];
                }
        });

        if(xp_multipliers?.hero) {
                character.xp_bonuses.multiplier.skills.hero = (character.xp_bonuses.multiplier.skills.hero || 1) * xp_multipliers.hero;
        }
        if(xp_multipliers?.all) {
                character.xp_bonuses.multiplier.skills.all = (character.xp_bonuses.multiplier.skills.all || 1) * xp_multipliers.all;
        }
        if(xp_multipliers?.all_skill) {
                character.xp_bonuses.multiplier.skills.all_skill = (character.xp_bonuses.multiplier.skills.all_skill || 1) * xp_multipliers.all_skill;
        }

        Object.keys(skills).forEach(skill => {
                if(xp_multipliers[skill]) {
                        character.xp_bonuses.multiplier.skills[skill] = (character.xp_bonuses.multiplier.skills[skill] || 1) * xp_multipliers[skill];
                }
        });
}

/**
 * adds skill milestone bonuses to character stats
 * called when a new milestone is reached
 * @param {{flats, multipliers}} bonuses 
 */
character.stats.add_book_bonus = function ({multipliers = {}, xp_multipliers = {}}) {
        Object.keys(character.base_stats).forEach(stat => {
                if(multipliers[stat]) {
                        character.stats.multiplier.books[stat] = (character.stats.multiplier.books[stat] || 1) * multipliers[stat];
                }
        });
       
        if(xp_multipliers?.hero) {
                character.xp_bonuses.multiplier.skills.hero = (character.xp_bonuses.multiplier.skills.hero || 1) * xp_multipliers.hero;
        }
        if(xp_multipliers?.all) {
                character.xp_bonuses.multiplier.skills.all = (character.xp_bonuses.multiplier.skills.all || 1) * xp_multipliers.all;
        }
        if(xp_multipliers?.all_skill) {
                character.xp_bonuses.multiplier.skills.all_skill = (character.xp_bonuses.multiplier.skills.all_skill || 1) * xp_multipliers.all_skill;
        }

        Object.keys(skills).forEach(skill => {
                if(xp_multipliers[skill]) {
                        character.xp_bonuses.multiplier.skills[skill] = (character.xp_bonuses.multiplier.skills[skill] || 1) * xp_multipliers[skill];
                }
        });
}

/**
 * add all stat bonuses from equipment, including def/atk
 * called on equipment changes
 */
character.stats.add_all_equipment_bonus = function() {
        
        //reset as they will be recalculated
        character.stats.flat.equipment = {};
        character.stats.multiplier.equipment = {};

        //iterate over slots
        Object.keys(character.equipment).forEach(slot => {
                if(!character.equipment[slot]) {
                        return;
                }
                
                if(character.equipment[slot].getDefense) {
                        character.stats.flat.equipment.defense = (character.stats.flat.equipment.defense || 0) + character.equipment[slot].getDefense();
                }
                /*
                if(character.equipment[slot].getShieldStrength) {
                        character.stats.flat.equipment.block_strength = (character.stats.flat.equipment.block_strength || 0) + character.equipment[slot].getShieldStrength();
                }
                if(character.equipment[slot].getAttack) {
                        character.stats.multiplier.equipment.attack_power = (character.stats.multiplier.equipment.attack_power || 1) * character.equipment[slot].getAttack();
                }
                */
                let stats = character.equipment[slot].getStats()

                //iterate over stats in slotted item
                Object.keys(stats).forEach(stat => {
                        if(stats[stat].flat) {
                                character.stats.flat.equipment[stat] = (character.stats.flat.equipment[stat] || 0) + stats[stat].flat;
                        }

                        if(stats[stat].multiplier) {
                                character.stats.multiplier.equipment[stat] = (character.stats.multiplier.equipment[stat] || 1) * stats[stat].multiplier;
                        }
                });
        });

        //add unarmed speed bonus (technically a bonus from equipment, or rather lack of it)
        if(character.equipment.weapon == null) {
                character.stats.multiplier.equipment.attack_speed = (character.stats.multiplier.equipment.attack_speed || 1) * (skills["Unarmed"].get_coefficient("multiplicative")**0.5);
        } 
}

/**
 * add all non-milestone stat bonuses from skills
 * called in update_stats()
 * only a few skills really matter here
 */
character.stats.add_all_skill_level_bonus = function() {
        character.stats.flat.skills.defense = skills["Iron skin"].get_level_bonus();
        character.stats.multiplier.skills.stamina_efficiency = skills["Running"].get_coefficient("multiplicative");
        character.stats.multiplier.skills.strength = skills["Weightlifting"].get_coefficient("multiplicative");
        character.stats.multiplier.skills.block_strength = 1 + 5*skills["Shield blocking"].get_level_bonus();
        character.stats.multiplier.skills.agility = skills["Equilibrium"].get_coefficient("multiplicative");
}

/**
 * add all stat bonuses/penalties from stances
 * called in update_stats()
 * multipliers only 
 */
character.stats.add_all_stance_bonus = function() {
        const multipliers = stances[current_stance].getStats();
        Object.keys(character.base_stats).forEach(stat => {
                if(multipliers[stat]) {
                        character.stats.multiplier.stance[stat] = multipliers[stat] || 1;
                        //replacing instead of multiplying, since these come from singular source
                } else {
                        character.stats.multiplier.stance[stat] = 1;
                }
        });
}

/**
 * full stat recalculation, call whenever something changes
 */
character.update_stats = function () {
    const missing_health = Math.max((character.stats.full["max_health"] - character.stats.full["health"]), 0) || 0;   
    const missing_stamina = Math.max((character.stats.full["max_stamina"] - character.stats.full["stamina"]), 0) || 0;   
    const missing_mana = Math.max((character.stats.full["max_mana"] - character.stats.full["mana"]), 0) || 0;   
    //to avoid fully restoring all whenever this function is called

    character.stats.add_all_skill_level_bonus();
    character.stats.add_all_stance_bonus();

    Object.keys(character.stats.full).forEach(function(stat){
        //just sum all flats
        //then multiply them by all multipliers
        const stat_sum = 
                (character.stats.flat.level[stat] || 0) + (character.stats.flat.skills[stat] || 0) + (character.stats.flat.skill_milestones[stat] || 0) + (character.stats.flat.equipment[stat] || 0);

        const stat_mult = 
                (character.stats.multiplier.skills[stat] || 1) * (character.stats.multiplier.skill_milestones[stat] || 1) * (character.stats.multiplier.equipment[stat] || 1) * (character.stats.multiplier.stance[stat] || 1);

        character.stats.full[stat] = (character.base_stats[stat] + stat_sum) * stat_mult;

        character.stats.total_flat[stat] =  character.base_stats[stat] + stat_sum;
        character.stats.total_multiplier[stat] = stat_mult || 1;

        if(stat === "health") {
                character.stats.full["health"] = Math.max(1, character.stats.full["max_health"] - missing_health);
        }
        else if(stat === "stamina") {
                character.stats.full["stamina"] = Math.max(0, character.stats.full["max_stamina"] - missing_stamina);
        } else if(stat === "mana") {
                character.stats.full["mana"] = Math.max(0, character.stats.full["max_mana"] - missing_mana);
        }
    });

     
    if(character.equipment.weapon != null) { 
        character.stats.full.attack_power = (character.stats.full.strength/10) * character.equipment.weapon.getAttack() * character.stats.total_multiplier.attack_power;
    } 
    else {
        character.stats.full.attack_power = (character.stats.full.strength/10) * character.stats.total_multiplier.attack_power;
    }
    
    character.stats.total_flat.attack_power = character.stats.full.attack_power/character.stats.total_multiplier.attack_power;

    Object.keys(character.xp_bonuses.total_multiplier).forEach(bonus_target => {
        character.xp_bonuses.total_multiplier[bonus_target] = (character.xp_bonuses.multiplier.skills[bonus_target] || 1) * (character.xp_bonuses.multiplier.books[bonus_target] || 1); 
        //only this two sources as of now

        const bonus = character.xp_bonuses.total_multiplier[bonus_target];

        if(bonus != 1){
                if (bonus_target !== "hero") {
                        if(bonus_target === "all" || bonus_target === "all_skill") {
                                update_all_displayed_skills_xp_gain();
                        } else {
                                update_displayed_skill_xp_gain(skills[bonus_target]);
                        }
                }
                if(bonus_target === "hero" || bonus_target === "all") {
                        update_displayed_xp_bonuses();
                }
        }
    });
}

character.get_stamina_multiplier = function () {
        if(character.stats.full.stamina == 0) {
                return 0.5 + skills["Persistence"].get_level_bonus();
        }
        return 1;
}

character.get_attack_speed = function () {
        let spd = character.stats.full.attack_speed * character.get_stamina_multiplier();
        return spd;
}

character.get_attack_power = function () {
        return character.stats.full.attack_power * character.get_stamina_multiplier();
}

character.wears_armor = function () {
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
 * @returns [actual damage taken; Boolean if character should faint] 
 */
character.take_damage = function ({damage_value, can_faint = true, give_skill_xp = true}) {
        /*
        TODO:
                - damage types: "physical", "elemental", "magic"
                - each with it's own defense on equipment (and potentially spells)
                - damage elements (for elemental damage type)
                - resistance skills
        */
        let fainted;

        let damage_taken;
        if(damage_value < 1) {
                damage_taken = Math.max(Math.ceil(10*damage_value)/10, 0);
        }
        else {
                damage_taken = Math.round(10*Math.max(damage_value - character.stats.full.defense, 1))/10;
        }

        character.stats.full.health -= damage_taken;

        if(character.stats.full.health <= 0 && can_faint) {
                fainted = true;
                character.stats.full.health = 0;
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
        if(item) {
                unequip_item(item.equip_slot);
                character.equipment[item.equip_slot] = item;
        }
        update_displayed_equipment();
        update_displayed_character_inventory();
        character.stats.add_all_equipment_bonus();
        
        update_character_stats();
}

/**
 * equips item and removes it from inventory
 * @param item_info {name, id}
 */
 function equip_item_from_inventory({item_name, item_id}) {
        if(item_name in character.inventory) { //check if its in inventory, just in case
            //add specific item to equipment slot
            // -> id and name tell which exactly item it is, then also check slot in item object and thats all whats needed
            equip_item(character.inventory[item_name][item_id]);
            remove_from_character_inventory({item_name, item_id});

            update_character_stats();
        }
}
    
function unequip_item(item_slot) {
        if(character.equipment[item_slot] != null) {
                add_to_character_inventory([{item: character.equipment[item_slot]}]);
                character.equipment[item_slot] = null;
                update_displayed_equipment();
                update_displayed_character_inventory();
                character.stats.add_all_equipment_bonus();

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
 * updates character stats related to combat, things that are more situational and/or based on other stats, kept separately from them
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
            character.combat_stats.block_chance = base_block_chance + Math.round(skills["Shield blocking"].get_level_bonus() * 10000)/10000;
        }

        character.combat_stats.attack_points = 
                Math.sqrt(character.stats.full.intuition) * character.stats.full.dexterity 
                        * skills["Combat"].get_coefficient("multiplicative") * (effects?.hit_chance || 1) * light_modifier;
    
        if(character.equipment["off-hand"] == null || character.equipment["off-hand"].offhand_type !== "shield") {
            character.combat_stats.evasion_points = 
                character.stats.full.agility * Math.sqrt(character.stats.full.intuition) 
                        * skills["Evasion"].get_coefficient("multiplicative") * (effects?.evasion || 1) * light_modifier;
        }
    
        update_displayed_combat_stats();
}

function get_skill_xp_gain(skill_name) {
        return (character.xp_bonuses.total_multiplier.all_skill || 1) * (character.xp_bonuses.total_multiplier.all || 1) * (character.xp_bonuses.total_multiplier[skill_name] || 1);
}

function get_skills_overall_xp_gain() {
        return (character.xp_bonuses.total_multiplier.all_skill || 1) * (character.xp_bonuses.total_multiplier.all || 1)
}

function get_hero_xp_gain() {
        return (character.xp_bonuses.total_multiplier.hero || 1) * (character.xp_bonuses.total_multiplier.all || 1)
}

export {character, add_to_character_inventory, remove_from_character_inventory, equip_item_from_inventory, equip_item, 
        unequip_item, update_character_stats, update_combat_stats, get_skill_xp_gain, get_hero_xp_gain, get_skills_overall_xp_gain};
