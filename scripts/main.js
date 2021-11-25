"use strict";

import { Game_time } from "./game_time.js";
import { Item, item_templates } from "./items.js";
import { locations } from "./locations.js";
import { skills } from "./skills.js";
import { dialogues } from "./dialogues.js";

//player character
const character = {name: "Hero", titles: {}, 
                stats: {max_health: 100, health: 100, strength: 1, agility: 5, magic: 0, attack_speed: 1, crit_rate: 0.1, crit_multiplier: 1.2, attack_power: 0,
                        hit_chance: 0, evasion_chance: 0, block_chance: 0, defense: 0},
                // crit damage is a multiplier; defense should be only based on worn armor and/or magic skills;
                inventory: {},
                equipment: {head: null, torso: null, 
                            arms: null, ring: null, 
                            weapon: null, offhand: null,
                            legs: null, feet: null, 
                            amulet: null}};

//equipment slots, keep same order as in character eq slots
const equipment_slots_divs = {head: document.getElementById("head_slot"), torso: document.getElementById("torso_slot"),
                            arms: document.getElementById("arms_slot"), ring: document.getElementById("ring_slot"),
                            weapon: document.getElementById("weapon_slot"), offhand: document.getElementById("offhand_slot"),
                            legs: document.getElementById("legs_slot"), feet: document.getElementById("feet_slot"),
                            amulet: document.getElementById("amulet_slot")
                            };		
                            
const stats_divs = {strength: document.getElementById("strength_slot"), agility: document.getElementById("agility_slot"),
                    magic: document.getElementById("magic_slot"), attack_speed: document.getElementById("attack_speed_slot"),
                    attack_power: document.getElementById("attack_power_slot"), defense: document.getElementById("defense_slot"),
                    crit_rate: document.getElementById("crit_rate_slot"), crit_multiplier: document.getElementById("crit_multiplier_slot")
                    };

const other_combat_divs = {hit_chance: document.getElementById("hit_chance_slot"), defensive_action: document.getElementById("defensive_action_slot"),
                           defensive_action_chance: document.getElementById("defensive_action_chance_slot")
                          };

const skill_bar_divs = {};

//current enemy
var current_enemy = null;
//additional attacks for combat
var additional_hero_attacks = 0;
var additional_enemy_attacks = 0;
//current location
var current_location;
//resting, true -> health regenerates
var is_resting = true;

var save_period = 60;
//ticks between saves, 60 = ~1 minute
var save_counter = 0;

var time_variance = 0;
//how much deviated was duration of a tick
var time_variance_accumulator = 0;
//accumulates deviations
var start_date;
var end_date;

var current_dialogue = null;


const tickrate = 1;
//how many ticks per second
//best leave it at 1, as less is rather slow, and more makes ticks noticably unstable


//enemy crit stats
const enemy_crit_chance = 0.1;
const enemy_crit_damage = 2; //multiplier, not a flat bonus

//character healt display
const current_health_value_div = document.getElementById("character_health_value");
const current_health_bar = document.getElementById("character_healthbar_current");

//enemy health display
const current_enemy_health_value_div = document.getElementById("enemy_health_value");
const current_enemy_health_bar = document.getElementById("enemy_healthbar_current");
//enemy info
const enemy_info_div = document.getElementById("enemy_info_div");
const enemy_stats_div = document.getElementById("enemy_stats_div");
const enemy_name_div = document.getElementById("enemy_name_div");

const enemy_count_div = document.getElementById("enemy_count_div");

//inventory display
const inventory_div = document.getElementById("inventory_content_div");

//character name
const name_field = document.getElementById("character_name_field");
name_field.value = character.name;

const message_log = document.getElementById("message_log_div");
const time_field = document.getElementById("time_div");

const action_div = document.getElementById("location_actions_div");

const location_name_div = document.getElementById("location_name_div");
const location_description_div = document.getElementById("location_description_div");

//game time (years, months, days, hours, minutes)
const current_game_time = new Game_time({year: 954, month: 4, day: 1, hour: 8, minute: 0, day_count: 0});
time_field.innerHTML = current_game_time.toString();

// button testing cuz yes
document.getElementById("test_button").addEventListener("click", () => 
{
    locations["Infested field"].enemies_killed = 30;
    get_location_rewards(locations["Infested field"]);

    //console.log(skills["Combat"].get_effect_description());
});

name_field.addEventListener("change", () => character.name = name_field.value.toString().trim().length>0?name_field.value:"Hero");

function capitalize_first_letter(some_string) {
    return some_string.charAt(0).toUpperCase() + some_string.slice(1);
}

function change_location(location_name) {
    var location = locations[location_name];
    var action;
    clear_action_div();
    if(typeof current_location !== "undefined" && current_location.name !== location.name ) { 
        //so it's not called when initializing the location on page load or when it's called when new location is unlocked
        log_message(`[ Entering ${location.name} ]`, "message_travel");
    }
    
    if("connected_locations" in location) { // basically means it's a normal location and not a combat zone (as combat zone has only "parent")
        enemy_info_div.style.opacity = 0;
        enemy_count_div.style.opacity = 0;

        for(let i = 0; i < location.dialogues.length; i++) { //add buttons for starting dialogues (displaying their textlines on click will be in another method?)
            if(dialogues[location.dialogues[i]].is_unlocked == false || dialogues[location.dialogues[i]].is_finished) { //skip if dialogue is not available
                continue;
            } 
            
            const dialogue_div = document.createElement("div");
            dialogue_div.innerHTML = dialogues[location.dialogues[i]].starting_text;
            dialogue_div.classList.add("start_dialogue");
            dialogue_div.setAttribute("data-dialogue", location.dialogues[i]);
            dialogue_div.setAttribute("onclick", "start_dialogue(this.getAttribute('data-dialogue'));");
            action_div.appendChild(dialogue_div);
        }

        for(let i = 0; i < location.connected_locations.length; i++) { //add butttons to change location

            if(location.connected_locations[i].location.is_unlocked == false) { //skip if not unlocked
                continue;
            }

            action = document.createElement("div");
            
            if("connected_locations" in location.connected_locations[i].location) {// check again if connected location is normal or combat
                action.classList.add("travel_normal");
                if("custom_text" in location.connected_locations[i]) {
                    action.innerHTML = location.connected_locations[i].custom_text;
                }
                else {
                    action.innerHTML = "Go to " + location.connected_locations[i].location.name;
                }
            } else {
                action.classList.add("travel_combat");
                if("custom_text" in location.connected_locations[i]) {
                    action.innerHTML = location.connected_locations[i].custom_text;
                }
                else {
                    action.innerHTML = "Enter the " + location.connected_locations[i].location.name;
                }
            }
            action.classList.add("action_travel");
            action.setAttribute("data-travel", location.connected_locations[i].location.name);
            action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");

            action_div.appendChild(action);

            if(typeof current_location !== "undefined" && "parent_location" in current_location) { // previous was combat, new is normal
                clear_enemy_and_enemy_info();
                update_combat_stats();
            }
        }
    } else { //so if entering combat zone
        enemy_count_div.style.opacity = 1;
        enemy_info_div.style.opacity = 1;
        enemy_count_div.children[0].children[1].innerHTML = location.enemy_count - location.enemies_killed % location.enemy_count;

        action = document.createElement("div");
        action.classList.add("travel_normal", "action_travel");
        action.innerHTML = "Go back to " + location.parent_location.name;
        action.setAttribute("data-travel", location.parent_location.name);
        action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");

        action_div.appendChild(action);
    }

    current_location = location;
    location_name_div.innerHTML = current_location.name;
    location_description_div.innerHTML = current_location.description;
}

function start_dialogue(dialogue_name) {
    //initialize dialogue options
    current_dialogue = dialogues[dialogue_name];

    clear_action_div();
    Object.keys(current_dialogue.textlines).forEach(function(key) { //add buttons for textlines
            if(!(current_dialogue.textlines[key].is_unlocked == false || current_dialogue.textlines[key].is_finished)) { //do only if text_line is not unavailable
                const textline_div = document.createElement("div");
                textline_div.innerHTML = `"${current_dialogue.textlines[key].name}"`;
                textline_div.classList.add("dialogue_textline");
                textline_div.setAttribute("data-textline", key);
                textline_div.setAttribute("onclick", `start_textline(this.getAttribute('data-textline'))`);
                action_div.appendChild(textline_div);
            }
    });

    const end_dialogue_div = document.createElement("div");
    end_dialogue_div.innerHTML = current_dialogue.ending_text;
    end_dialogue_div.classList.add("end_dialogue_button");
    end_dialogue_div.setAttribute("onclick", "end_dialogue()");
    action_div.appendChild(end_dialogue_div);

    //ending dialogue -> just do: change_location(current_location.name);
}

function end_dialogue() {
    current_dialogue = null;
    change_location(current_location.name);
}

function start_textline(textline_key){
    const textline = current_dialogue.textlines[textline_key];
    //TODO: log a message when unlocking new location?
    //maybe another method for this

    log_message(`> > ${textline.name}`, "dialogue_question")
    log_message(textline.text, "dialogue_answer");

    for(let i = 0; i < textline.unlocks.textlines.length; i++) { //unlocking textlines
        const dialogue_name = textline.unlocks.textlines[i].dialogue;
        for(let j = 0; j < textline.unlocks.textlines[i].lines.length; j++) {
            dialogues[dialogue_name].textlines[textline.unlocks.textlines[i].lines[j]].is_unlocked = true;
        }
    }

    for(let i = 0; i < textline.unlocks.locations.length; i++) { //unlocking locations
        unlock_location(locations[textline.unlocks.locations[i]]);
    }

    for(let i = 0; i < textline.locks_lines.length; i++) { //locking textlines
        current_dialogue.textlines[textline.locks_lines[i]].is_finished = true;
    }

    start_dialogue(current_dialogue.name);
}

function clear_action_div() {
    while(action_div.lastElementChild) {
        action_div.removeChild(action_div.lastElementChild);
    }
}

function get_new_enemy() {
    current_enemy = current_location.get_next_enemy();
    enemy_stats_div.innerHTML = `Str: ${current_enemy.stats.strength} | Agl: ${current_enemy.stats.agility}
    | Def: ${current_enemy.stats.defense} | Atk speed: ${current_enemy.stats.attack_speed.toFixed(1)}`

    enemy_name_div.innerHTML = current_enemy.name;

    update_displayed_enemy_health();

    //also show magic if not 0?
}

//single tick of fight
function do_combat() {
    if(current_enemy == null) {
        get_new_enemy();
        update_combat_stats();
        return;
    }

    //todo: separate formulas for physical and magical weapons
    //and also need magic weapons before that...

    var hero_base_damage = character.stats.attack_power;
    var enemy_base_damage = current_enemy.stats.strength;

    var damage_dealt;

    var critted;

    var partially_blocked;

    var hero_defense = 0; //will be a sum of armor from worn equipment + maybe a bonus from some magic stuff

    if(character.stats.attack_speed > current_enemy.stats.attack_speed) {
        additional_hero_attacks += (character.stats.attack_speed/current_enemy.stats.attack_speed - 1);
        additional_enemy_attacks = 0;
    } else if (character.stats.attack_speed < current_enemy.stats.attack_speed) {
        additional_enemy_attacks += (current_enemy.stats.attack_speed/character.stats.attack_speed - 1);
        additional_hero_attacks = 0;
    }
    

    for(let i = 0; i <= additional_hero_attacks; i++) { //hero attacks
        if(i > 0) {
            additional_hero_attacks -= 1;
        }

        if(character.stats.hit_chance > Math.random()) {//hero's attack hits
            add_xp_to_skill(skills["Combat"], current_enemy.xp_value, true);
            if(character.equipment.weapon != null) {
                add_xp_to_skill(skills[`${capitalize_first_letter(character.equipment.weapon.weapon_type)}s`], current_enemy.xp_value, true); 
            }

            damage_dealt = Math.round(hero_base_damage * (1.2 - Math.random() * 0.4) 
                                      * skills[`${capitalize_first_letter(character.equipment.weapon.weapon_type)}s`].get_coefficient());
            //small randomization by up to 20% + bonus from skill
            
            if(character.stats.crit_rate > Math.random()) {
                damage_dealt = Math.round(damage_dealt * character.stats.crit_multiplier);
                critted = true;
            }
            else {
                critted = false;
            }
            
            damage_dealt = Math.max(damage_dealt - current_enemy.stats.defense, 1);

            current_enemy.stats.health -= damage_dealt;
            if(critted) {
                log_message(current_enemy.name + " was critically hit for " + damage_dealt + " dmg", "enemy_attacked_critically");
            }
            else {
                log_message(current_enemy.name + " was hit for " + damage_dealt + " dmg", "enemy_attacked");
            }

            if(current_enemy.stats.health <= 0) {
                current_enemy.stats.health = 0; 
                update_displayed_enemy_health();
                //just to not go negative on displayed health

                log_message(character.name + " has defeated " + current_enemy.name, "enemy_defeated");
                var loot = current_enemy.get_loot();
                if(loot.length > 0) {
                    log_loot(loot);
                    add_to_inventory(loot);
                }
                current_location.enemies_killed += 1;
                if(current_location.enemies_killed > 0 && current_location.enemies_killed % current_location.enemy_count == 0) {
                    get_location_rewards(current_location);
                } 

                enemy_count_div.children[0].children[1].innerHTML = current_location.enemy_count - current_location.enemies_killed % current_location.enemy_count;

                current_enemy = null;
                additional_enemy_attacks = 0;
                return;
            }

            update_displayed_enemy_health();
        } else {
            log_message(character.name + " has missed");
        }
    }

    for(let i = 0; i <= additional_enemy_attacks; i++) { //enemy attacks
        if(i > 0) {
            additional_enemy_attacks -= 1;
        }

        damage_dealt = Math.round(enemy_base_damage * (1.2 - Math.random() * 0.4));
        partially_blocked = false;


        if(character.equipment.offhand != null && character.equipment.offhand.offhand_type === "shield") { //HAS SHIELD
            if(character.equipment.offhand.shield_strength >= damage_dealt) {
                if(character.stats.block_chance > Math.random()) {//BLOCKED THE ATTACK
                    add_xp_to_skill(skills["Blocking"], current_enemy.xp_value, true);
                    log_message(character.name + " has blocked the attack");
                    continue;
                 }
            }
            else { 
                if(character.stats.block_chance - 0.3 > Math.random()) { //PARTIALLY BLOCKED THE ATTACK
                    add_xp_to_skill(skills["Blocking"], current_enemy.xp_value, true);
                    damage_dealt -= character.equipment.offhand.shield_strength;
                    partially_blocked = true;
                    //FIGHT GOES LIKE NORMAL, but log that it was partially blocked
                }
            }
        }
        else { // HAS NO SHIELD
            if(character.stats.evasion_chance > Math.random()) { //EVADED ATTACK
                add_xp_to_skill(skills["Evasion"], current_enemy.xp_value, true);
                log_message(character.name + " has evaded the attack");
                continue;
            }
        }
                
        if(enemy_crit_chance > Math.random())
        {
            damage_dealt *= enemy_crit_damage;
            damage_dealt = Math.max(damage_dealt - hero_defense, 1);
            character.stats.health -= damage_dealt;
            if(partially_blocked) {
                log_message(character.name + " partially blocked the attack, but was critically hit for " + damage_dealt + " dmg", "hero_attacked_critically");
            } 
            else {
                log_message(character.name + " was critically hit for " + damage_dealt + " dmg", "hero_attacked_critically");
            }
        } else {
            damage_dealt = Math.max(damage_dealt - hero_defense, 1);
            character.stats.health -= damage_dealt;
            if(partially_blocked) {
                log_message(character.name + " partially blocked the attack and was hit for " + damage_dealt + " dmg", "hero_attacked");
            }
            else {
                log_message(character.name + " was hit for " + damage_dealt + " dmg", "hero_attacked");
            }
        }

        if(character.stats.health <= 0) {
            log_message(character.name + " has lost consciousness", "hero_defeat");

            if(character.stats.health < 0) {
                character.stats.health = 0;
            }
            update_displayed_health();
            additional_hero_attacks = 0;
            current_enemy = null;
            change_location(current_location.parent_location.name);
            return;
        }
        update_displayed_health();
    }

    /* 
     enemy is in a global variable
     if killed, uses method of Location object to assign a random new enemy (of ones in Location) to that variable;
    
     
     attack dmg either based on strength + weapon stat, or some magic stuff?
     maybe some weapons will be str based and will get some small bonus from magic if player has proper skill unlocked
     (something like "weapon aura"), while others (wands and staffs) will be based purely on magic
     single stat "magic" + multiple related skills?
     also should offer a bit better scaling than strength, so worse at beginning but later on gets better?
     also a magic resistance skill for player
     */

}


function add_xp_to_skill(skill, xp_to_add, should_info) 
{
    if(skill.total_xp == 0) 
    { //creates new skill bar
        skill_bar_divs[skill.skill_id] = document.createElement("div");

        const skill_bar_max = document.createElement("div");
        const skill_bar_current = document.createElement("div");
        const skill_bar_text = document.createElement("div");
        const skill_bar_name = document.createElement("div");
        const skill_bar_xp = document.createElement("div");

        const skill_tooltip = document.createElement("div");
        const tooltip_xp = document.createElement("div");
        const tooltip_desc = document.createElement("div");
        const tooltip_effect = document.createElement("div");
        

        skill_bar_max.classList.add("skill_bar_max");
        skill_bar_current.classList.add("skill_bar_current");
        skill_bar_text.classList.add("skill_bar_text");
        skill_bar_name.classList.add("skill_bar_name");
        skill_bar_xp.classList.add("skill_bar_xp");
        skill_tooltip.classList.add("skill_tooltip");

        skill_bar_text.appendChild(skill_bar_name);
        skill_bar_text.append(skill_bar_xp);

        skill_tooltip.appendChild(tooltip_xp);
        skill_tooltip.appendChild(tooltip_desc);
        skill_tooltip.appendChild(tooltip_effect);

        tooltip_desc.innerHTML = skill.description;
        if(typeof skill.get_effect_description !== "undefined")
        {
            tooltip_effect.innerHTML = `${skill.get_effect_description()}`;
        }
        
        
        skill_bar_max.appendChild(skill_bar_text);
        skill_bar_max.appendChild(skill_bar_current);
        skill_bar_max.appendChild(skill_tooltip);

        skill_bar_divs[skill.skill_id].appendChild(skill_bar_max);
        document.getElementById("skill_list_div").appendChild(skill_bar_divs[skill.skill_id]);
    } 

    const level_up = skill.add_xp(xp_to_add);

    /*
    skill_bar divs: 
        skill -> children (1): 
            skill_bar_max -> children(3): 
                skill_bar_text -> children(2):
                    skill_bar_name,
                    skill_bar_xp
                skill_bar_current, 
                skill_tooltip -> children(2):
                    tooltip_xp,
                    tooltip_desc
    */

    skill_bar_divs[skill.skill_id].children[0].children[0].children[0].innerHTML = `${skill.name()} : level ${skill.current_level}`;
    //skill_bar_name
    skill_bar_divs[skill.skill_id].children[0].children[0].children[1].innerHTML = `${100*Math.round(skill.current_xp/skill.xp_to_next_lvl*1000)/1000}%`;
    //skill_bar_xp
    skill_bar_divs[skill.skill_id].children[0].children[1].style.width = `${100*skill.current_xp/skill.xp_to_next_lvl}%`;
    //skill_bar_current

    skill_bar_divs[skill.skill_id].children[0].children[2].children[0].innerHTML = `${skill.current_xp}/${skill.xp_to_next_lvl}`;
    //tooltip_xp
    
    if(typeof level_up !== "undefined" && (typeof should_info === "undefined" || should_info))
    {
        log_message(level_up, "message_skill_leveled_up");
        update_character_stats();
    } 
    else 
    {
        if(typeof level_up !== "undefined" && typeof skill.get_effect_description !== "undefined")
        {
            skill_bar_divs[skill.skill_id].children[0].children[2].children[2].innerHTML = `${skill.get_effect_description()}`;
        }
    }

    //TODO: sort displayed skills
}

function get_location_rewards(location) {
    if(location.enemies_killed == location.enemy_count) { //first clear
        for(let i = 0; i < location.rewards.locations.length; i++) { //unlock locations
            unlock_location(location.rewards.locations[i])
        }

        for(let i = 0; i < location.rewards.textlines.length; i++) { //unlock textlines and dialogues
            for(let j = 0; j < location.rewards.textlines[i].lines.length; j++) {
                dialogues[location.rewards.textlines[i].dialogue].textlines[location.rewards.textlines[i].lines[j]].is_unlocked = true;
                //TODO: log message like "you should talk to X"
            }
        }
    }

    /*
    TODO: give other rewards
    */
}

function unlock_location(location) {
    location.is_unlocked = true;
    log_message(`You can now go to ${location.name}`, "location_unlocked");
}

//single tick of resting
function do_resting() {
    if(character.stats.health < character.stats.max_health)
    {
        var resting_heal_ammount = 1; //leave this flat and let it serve as passive regeneration, but also add sleeping that will heal faster and scale with level
        character.stats.health += (resting_heal_ammount);
        update_displayed_health();
    }
}


//writes message to the message log
function log_message(message_to_add, message_type) {
    if(typeof message_to_add === 'undefined') {
        return;
    }

    var message = document.createElement("div");
    message.classList.add("message_common");

    var class_to_add = "message_default";

    //selects proper class to add based on argument
    //totally could have just passed class name as argument and use it instead of making this switch
    switch(message_type) {
        case "enemy_defeated":
            class_to_add = "message_victory";
            break;
        case "hero_defeat":
            class_to_add = "message_hero_defeated";
            break;
        case "enemy_attacked":
            class_to_add = "message_enemy_attacked";
            break;
        case "enemy_attacked_critically":
            class_to_add = "message_enemy_attacked_critically";
            break;
        case "hero_attacked":
            class_to_add = "message_hero_attacked";
            break;
        case "hero_attacked_critically":
            class_to_add = "message_hero_attacked_critically";
            break;
        case "combat_loot":
            class_to_add = "message_items_obtained";
            break;
        case "skill_raised":
            class_to_add = "message_skill_leveled_up";
            break;	
        case "message_travel":
            class_to_add = "message_travel";
            break;
        case "dialogue_question":
            class_to_add = "message_dialogue_question";
            break;
        case "dialogue_answer":
            class_to_add = "message_dialogue_answer";
            break;
        case "location_unlocked":
            class_to_add = "message_location_unlocked";
    }

    message.classList.add(class_to_add);

    message.innerHTML = message_to_add + "<div class='message_border'> </>";


    if(message_log.children.length > 30) 
    {
        message_log.removeChild(message_log.children[0]);
    } //removes first position if there's too many messages

    message_log.appendChild(message);
    message_log.scrollTop = message_log.scrollHeight;
}

function log_loot(loot_list) {
    
    if(loot_list.length == 0) {
        return;
    }

    var message = "Looted " + loot_list[0]["item"]["name"] + " x" + loot_list[0]["count"];
    if(loot_list.length > 1) {
        for(let i = 1; i < loot_list.length; i++) {
            message += (", " + loot_list[i]["item"]["name"] + " x" + loot_list[i]["count"]);
        }
    } //this looks terrible

    log_message(message, "combat_loot");
    
}

function update_displayed_health() { //call it when eating, resting or getting hit
    current_health_value_div.innerHTML = character.stats.health + "/" + character.stats.max_health;
    current_health_bar.style.width = (character.stats.health*100/character.stats.max_health).toString() +"%";
}

function update_displayed_enemy_health() { //call it when getting new enemy and when enemy gets hit
    current_enemy_health_value_div.innerHTML = current_enemy.stats.health + "/" + current_enemy.stats.max_health;
    current_enemy_health_bar.style.width =  (current_enemy.stats.health*100/current_enemy.stats.max_health).toString() +"%";
}

function clear_enemy_and_enemy_info() {
    current_enemy = null;
    current_enemy_health_value_div.innerHTML = "0";
    current_enemy_health_bar.style.width = "100%";
    enemy_stats_div.innerHTML = `Str: 0 | Agl: 0 | Def: 0 | Magic: 0 | Atk speed: 0;`
    enemy_name_div.innerHTML = "None";
}

function add_to_inventory(items) {
    for(let i = 0; i < items.length; i++){
        if(!character.inventory.hasOwnProperty(items[i].item.name)) //not in inventory
        {
            if(items[i].item.stackable)
            {
                character.inventory[items[i].item.name] = items[i];
            }
            else 
            {
                character.inventory[items[i].item.name] = [items[i].item];
            }
        }
        else //in inventory 
        {
            if(items[i].item.stackable)
            {
                character.inventory[items[i].item.name].count += items[i].count;
            } 
            else 
            {
                character.inventory[items[i].item.name].push(items[i].item);
            }
        }

    }
    update_displayed_inventory();
}

function remove_from_inventory(item_info) {
    //item info -> {name: X, count: X, id: X}, with either count or id, depending on if item is stackable or not

    if(character.inventory.hasOwnProperty(item_info.name)) { //check if its in inventory, just in case, probably not needed

        if(character.inventory[item_info.name].hasOwnProperty("item")) { //stackable
            //console.log(character.inventory[item_info.name].item.stackable);

            if(typeof item_info.count === "number" && Number.isInteger(item_info.count) && item_info.count >= 1) 
            {
                character.inventory[item_info.name].count -= item_info.count;
            } 
            else 
            {
                character.inventory[item_info.name].count -= 1;
            }

            if(character.inventory[item_info.name].count <= 0) 
            {
                delete character.inventory[item_info.name];
                //removes item frm inventory if it's county is less than 1
            }
        }
        else { //unstackable
            character.inventory[item_info.name].splice([item_info.id], 1);
            //removes item from the array
            //dont need to check if .id even exists, as splice by default uses 0

            if(character.inventory[item_info.name].length == 0) 
            {
                delete character.inventory[item_info.name];
                //removes item array from inventory if its empty
                //might be unnecessary, lets leave it for now
            } 
        }
    }

    update_displayed_inventory();
}

function dismantle_item() {
    //todo: this thing
    //priority: extremely low
}

function update_displayed_inventory() {
    //inventory only, equipped items separately
    //todo: do it only for changed items?
    
    inventory_div.innerHTML = "";

    Object.keys(character.inventory).forEach(function(key) {
        if(character.inventory[key] instanceof Array) //unstackables
        { 
            for(let i = 0; i < character.inventory[key].length; i++) {
                var item_control_div = document.createElement("div");
                var item_div = document.createElement("div");
                //item_div is just name + item count (if stackable)


                //create tooltip and it's content
                var item_tooltip = document.createElement("span");
                item_tooltip.classList.add("item_tooltip");
                item_tooltip.innerHTML = 
                `<b>${character.inventory[key][i].name}</b>
                <br>${character.inventory[key][i].description}`;
    
                item_div.innerHTML = `${character.inventory[key][i].name}`;
                item_div.classList.add("inventory_item");

                item_control_div.setAttribute("data-inventory_item", `${character.inventory[key][i].name} #${i}`)
                //shouldnt create any problems, as any change to inventory will also call this method, 
                //so removing/equipping any item wont cause mismatch

                item_div.appendChild(item_tooltip);
                item_control_div.classList.add(`item_${character.inventory[key][i].item_type.toLowerCase()}`);
                item_control_div.appendChild(item_div);

                if(character.inventory[key][i].item_type === "EQUIPPABLE") {
                    var item_equip_div = document.createElement("div");
                    item_equip_div.innerHTML = "E";
                    item_equip_div.classList.add("equip_item_button");
                    item_control_div.appendChild(item_equip_div);

                    //add stats to tooltip

                    if(character.inventory[key][i].equip_slot === "offhand" && character.inventory[key][i].offhand_type === "shield") {
                        item_tooltip.innerHTML += 
                        `<br><br>Can fully block attacks not stronger than: ${character.inventory[key][i].shield_strength}`;
                    }

                    Object.keys(character.inventory[key][i].equip_effect).forEach(function(effect_key) {
                        item_tooltip.innerHTML += 
                        `<br><br>Flat ${effect_key} bonus: ${character.inventory[key][i].equip_effect[effect_key].flat_bonus}`;

                        if(character.inventory[key][i].equip_effect[effect_key].multiplier != null) {
                                item_tooltip.innerHTML += 
                            `<br>${capitalize_first_letter(effect_key)} multiplier: ${character.inventory[key][i].equip_effect[effect_key].multiplier}`;
                        }
                    });
                }

                   inventory_div.appendChild(item_control_div);
            }
        } else //stackables
        {
            var item_control_div = document.createElement("div");
            var item_div = document.createElement("div");

            if(character.inventory[key].count > 1)
            {
                item_div.innerHTML = `${character.inventory[key].item.name} x${character.inventory[key].count}`;
            } else 
            {
                item_div.innerHTML = `${character.inventory[key].item.name}`;
            }
            item_div.classList.add("inventory_item");

            //create tooltip and it's content
            var item_tooltip = document.createElement("span");
            item_tooltip.classList.add("item_tooltip");
            item_tooltip.innerHTML = 
            `<b>${character.inventory[key].item.name}</b> 
            <br>${character.inventory[key].item.description}`;


            if(character.inventory[key].item.item_type === "EQUIPPABLE") {
                //add stats to tooltip


            }


            item_div.appendChild(item_tooltip);

            item_control_div.classList.add(`item_${character.inventory[key].item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-inventory_item", `${character.inventory[key].item.name}`)
            item_control_div.appendChild(item_div);

               inventory_div.appendChild(item_control_div);
        }
    });
}

function equip_item_from_inventory(item_info) {
    //item info -> {name: X, count: X, id: X}, count currently not used
    if(character.inventory.hasOwnProperty(item_info.name)) { //check if its in inventory, just in case
        if(character.inventory[item_info.name].hasOwnProperty("item")) { //stackable
            console.log("not implemented");
        }
        else { //unstackable
            //add specific item to equipment slot
            // -> id and name tell which exactly item it is, then also check slot in item object and thats all whats needed
            equip_item(character.inventory[item_info.name][item_info.id]);
            remove_from_inventory(item_info); //put this outside if() when equipping gets implemented for stackables as well
        }
    }
}

function equip_item(item) {
    unequip_item(item.equip_slot);
    character.equipment[item.equip_slot] = item;
    update_displayed_equipment();
    update_displayed_inventory();
    update_character_stats();	
}

function unequip_item(item_slot) {
    if(character.equipment[item_slot] != null) {
        add_to_inventory([{item: character.equipment[item_slot]}]);
        character.equipment[item_slot] = null;
        update_displayed_equipment();
        update_displayed_inventory();
        update_character_stats();
    }
}

function update_displayed_equipment() {
    Object.keys(equipment_slots_divs).forEach(function(key) {
        var eq_tooltip = document.createElement("span");
        eq_tooltip.classList.add("equipment_tooltip");
        if(character.equipment[key] == null) { //no item in slot
            equipment_slots_divs[key].innerHTML = `${key} slot`;
            equipment_slots_divs[key].classList.add("equipment_slot_empty");
            eq_tooltip.innerHTML = `Your ${key} slot`;
        }
        else 
        {
            equipment_slots_divs[key].innerHTML = character.equipment[key].name;
            equipment_slots_divs[key].classList.remove("equipment_slot_empty");
            eq_tooltip.innerHTML = 
            `<b>${character.equipment[key].name}</b>
            <br>${character.equipment[key].description}`;

            Object.keys(character.equipment[key].equip_effect).forEach(function(effect_key) { //add all effects to tooltip
                eq_tooltip.innerHTML += 
                `<br><br>Flat ${effect_key} bonus: ${character.equipment[key].equip_effect[effect_key].flat_bonus}`;

                if(character.equipment[key].equip_effect[effect_key].multiplier != null) {
                        eq_tooltip.innerHTML += 
                    `<br>${capitalize_first_letter(effect_key)} multiplier: ${character.equipment[key].equip_effect[effect_key].multiplier}`;
                }
            });

            if(character.equipment[key].equip_slot === "offhand" && character.equipment[key].offhand_type === "shield") {
                eq_tooltip.innerHTML += `<br><br>Can fully block attacks not stronger than: ${character.equipment[key].shield_strength}`;
            }
        }
        equipment_slots_divs[key].appendChild(eq_tooltip);
    });
}

function update_character_stats() { //updates character stats
    if(character.equipment.weapon != null) { 
        character.stats.attack_power = (character.stats.strength + character.equipment.weapon.equip_effect.attack.flat_bonus) 
                                        * character.equipment.weapon.equip_effect.attack.multiplier;
    } 
    else {
        character.stats.attack_power = character.stats.strength;
    }

    character.stats.defense  = 0; //TODO: calculate it based on armor values of equipped items
    character.stats.crit_rate = character.stats.crit_rate; //TODO: calculate it based on skills and equipment
    character.stats.crit_multiplier = character.stats.crit_multiplier; //TODO: calculate it based on skils and equipment

    update_displayed_stats();
    update_combat_stats();
}

function update_displayed_stats() { //updates displayed stats
    Object.keys(stats_divs).forEach(function(key){
        if(key === "crit_rate" || key === "crit_multiplier") {
            stats_divs[key].innerHTML = `${(character.stats[key]*100).toFixed(1)}%`
        } 
        else {
            stats_divs[key].innerHTML = `${(character.stats[key]).toFixed(1)}`
        }
    });
}

function update_combat_stats() { //chances to hit and evade/block
    if(character.equipment.offhand != null && character.equipment.offhand.offhand_type === "shield") { //HAS SHIELD
        character.stats.evasion_chance = null;
        character.stats.block_chance = Math.round(0.4 * skills["Blocking"].get_coefficient("flat") * 10000)/10000;
    }

    if(current_enemy != null) { //IN COMBAT
        character.stats.hit_chance = Math.min(1, Math.max(0.2, (character.stats.agility/current_enemy.stats.agility) * 0.5 * skills["Combat"].get_coefficient("multiplicative")));
        //so 100% if at least twice more agility, 50% if same, and never less than 20%
        if(character.equipment.offhand == null || character.equipment.offhand.offhand_type !== "shield") {
            character.stats.evasion_chance = Math.min(0.95, (character.stats.agility/current_enemy.stats.agility) * 0.33 * skills["Evasion"].get_coefficient("multiplicative"));
            //so up to 95% if at least thrice more agility, 33% if same, can go down almost to 0%
        }
    } 
    else {
        character.stats.hit_chance = null;
        character.stats.evasion_chance = null;
    }

    update_displayed_combat_stats();
}

function update_displayed_combat_stats() {
    if(current_enemy != null) {
        other_combat_divs.hit_chance.innerHTML = `${(character.stats.hit_chance*100).toFixed(1)}%`;
    }
    else {
        other_combat_divs.hit_chance.innerHTML = "";
    }

    if(character.equipment.offhand != null && character.equipment.offhand.offhand_type === "shield") { //HAS SHIELD

        other_combat_divs.defensive_action.innerHTML = "Block:";

        if(current_enemy != null && character.equipment.offhand.shield_strength < current_enemy.stats.strength) { //IN COMBAT && SHIELD WEAKER THAN AVERAGE NON-CRIT ATTACK
            other_combat_divs.defensive_action_chance.innerHTML = `${(character.stats.block_chance*100-30).toFixed(1)}%`;
        } 
        else {
            other_combat_divs.defensive_action_chance.innerHTML = `${(character.stats.block_chance*100).toFixed(1)}%`;
        }
    }
    else {
        other_combat_divs.defensive_action.innerHTML = "Evasion:";
        if(current_enemy != null) {
            other_combat_divs.defensive_action_chance.innerHTML = `${(character.stats.evasion_chance*100).toFixed(1)}%`;
        }
        else {
            other_combat_divs.defensive_action_chance.innerHTML = "";
        }
    }
}

function create_save() {
    const save_data = {};
    save_data["current time"] = current_game_time;
    save_data["character"] = {name: character.name, titles: character.titles, inventory: character.inventory, equipment: character.equipment};
    //no need to save stats; on loading, base stats will be taken from code and then additional stuff will be calculated again (in case anything changed)

    save_data["skills"] = {};
    Object.keys(skills).forEach(function(key) {
        save_data["skills"][skills[key].skill_id] = {total_xp: skills[key].total_xp}; //a bit redundant, but keep it in case key in skills is different than skill_id
    }); //only save total xp of each skill, again in case of any changes
    
    save_data["current location"] = current_location.name;

    if(current_enemy == null) {
        save_data["current enemy"] = null;
    } 
    else {
        save_data["current enemy"] = {}; //no need to save everything, just name + stats -> get enemy from template and change stats to those saved
        save_data["current enemy"]["name"] = current_enemy.name;
        save_data["current enemy"]["stats"] = current_enemy.stats;
    }

    return JSON.stringify(save_data);
} //puts important stuff into the save string and returns it

function save_to_file() {
    return create_save();
} //called from index.html

function save_to_localStorage() {
    localStorage.setItem("save data", create_save());
}

function load(save_data) {
    //single loading method

    
    //TODO: some loading screen
    //TODO: clear/replace enemy info
    //TODO: load location

    current_game_time.load_time(save_data["current time"]);

    name_field.value = save_data.character.name;
    character.name = save_data.character.name;

    Object.keys(save_data.character.equipment).forEach(function(key){
        if(save_data.character.equipment[key] != null) {
            equip_item(save_data.character.equipment[key]);
        }
    }); //equip proper items

    const item_list = [];

    Object.keys(save_data.character.inventory).forEach(function(key){
        if(Array.isArray(save_data.character.inventory[key])) { //is a list [of unstackable item], needs to be added 1 by 1
            for(let i = 0; i < save_data.character.inventory[key].length; i++) {
                item_list.push({item: save_data.character.inventory[key][i], count: 1});
            }
        }
        else {
            item_list.push({item: save_data.character.inventory[key].item, count: save_data.character.inventory[key].count});
        }
        
    }); //add all loaded items to list
    add_to_inventory(item_list); // and then to inventory

    Object.keys(save_data.skills).forEach(function(key){ 
        if(save_data.skills[key].total_xp > 0) {
            add_xp_to_skill(skills[key], save_data.skills[key].total_xp, false);
        }
    }); //add xp to skills
} //core function for loading

function load_from_file(save_string) {
    Object.keys(character.equipment).forEach(function(key){
        if(character.equipment[key] != null) {
            unequip_item(key);
        }
    }); //remove equipment
    character.inventory = {}; //reset inventory to not duplicate items

    Object.keys(skills).forEach(function(key){
        if(skills[key].total_xp > 0) {
            skills[key].current_xp = 0;
            skills[key].current_lvl = 0;
            skills[key].total_xp = 0;
            skills[key].xp_to_next_lvl = skills[key].base_xp_cost;
            skills[key].total_xp_to_next_lvl = skills[key].base_xp_cost;
        }
    }); //clear all skill progress from display
    Object.keys(skill_bar_divs).forEach(function(key) {
        delete skill_bar_divs[key];
    });

    const skill_list_div = document.getElementById("skill_list_div");
    while(skill_list_div.firstChild) {
        skill_list_div.removeChild(skill_list_div.lastChild);
    } //remove skill bars from display

    load(JSON.parse(save_string));
} //called on loading from file, clears everything

function load_from_localstorage() {
    load(JSON.parse(localStorage.getItem("save data")));
} //called on loading the page, doesn't clear anything

function update_timer() {
    current_game_time.go_up();
    time_field.innerHTML = current_game_time.toString();
} //updates time div

function update() {
    //so technically everything is supposed to be happening in here
    //maybe just a bunch of IFs, checking what character is currently doing and acting properly?
    //i.e. fighting, sleeping, training, mining (if it even becomes a thing)
    //active skills, like eating, probably can be safely calculated outside of this?

    setTimeout(function()
    {
        end_date = Date.now(); 
        //basically when previous tick ends

        time_variance_accumulator += ((end_date - start_date) - 1000/tickrate);
        //duration of previous tick, minus time it was supposed to take
        //important to keep it between setting end_date and start_date, so they are 2 completely separate values

        //console.log((end_date - start_date).toString() + " : " + time_variance_accumulator.toString());

        start_date = Date.now();
        /*
        basically when current tick starts
        so before this assignment, start_date is when previous tick started
        and end_date is when previous_tick ended
        */

        update_timer();


        if("parent_location" in current_location){ //if it's a combat_zone
            do_combat();
        } else { //everything other than combat
            if(is_resting) { //make a change so it only switches to true on clicking the resting action and is false on default
                do_resting();
            }
        }
        save_counter += 1;
        if(save_counter >= save_period) {
            save_counter = 0;
            save_to_localStorage();
        } //save every X/60 minutes
        
        update();
    }, (1000 - time_variance_accumulator));
    //uses time_variance_accumulator for more precise overall stabilization
    //(instead of only stabilizing relative to previous tick, it stabilizes relative to sum of deviations)
}

function run() {
    if(typeof current_location === "undefined") {
        change_location("Village");
    } 
    //to initialize the starting location
    //later on call it also in the save loading method
    
    update_displayed_health();
        
    start_date = Date.now();
    update();   
}

window.equip_item = equip_item_from_inventory;
window.unequip_item = unequip_item;
window.change_location = change_location;
window.start_dialogue = start_dialogue;
window.end_dialogue = end_dialogue;
window.start_textline = start_textline;

window.save_to_localStorage = save_to_localStorage;
window.save_to_file = save_to_file;
window.load_progress = load_from_file;


if("save data" in localStorage) {
    load_from_localstorage();
}
else {
    //add_to_inventory([{item: new Item(item_templates["Rat fang"]), count: 5}]);
    add_to_inventory([{item: new Item(item_templates["Long stick"])}]);
    //add_to_inventory([{item: new Item(item_templates["Crude wooden shield"])}]);
    equip_item_from_inventory({name: "Long stick", id: 0});
}
//checks if there's an existing save file, otherwise just sets up some initial equipment

update_displayed_stats();
update_displayed_equipment();
run();