"use strict";

import { current_game_time } from "./game_time.js";
import { item_templates, getItem} from "./items.js";
import { locations } from "./locations.js";
import { skills } from "./skills.js";
import { dialogues } from "./dialogues.js";
import { Enemy} from "./enemies.js";
import { traders } from "./traders.js";
import { is_in_trade, start_trade, cancel_trade, accept_trade, exit_trade, add_to_trader_inventory,
         add_to_buying_list, remove_from_buying_list, add_to_selling_list, remove_from_selling_list} from "./trade.js";
import { character, 
         add_to_character_inventory, remove_from_character_inventory,
         equip_item_from_inventory, unequip_item, equip_item, 
         update_character_stats, update_combat_stats, } from "./character.js";
import { activities } from "./activities.js";
import { end_activity_animation, 
         update_displayed_character_inventory, update_displayed_trader_inventory, sort_displayed_inventory,
         update_displayed_money, log_message,
         update_displayed_enemies, update_displayed_health_of_enemies,
         update_displayed_combat_location, update_displayed_normal_location,
         log_loot, update_displayed_equipment, capitalize_first_letter,
         update_displayed_health, update_displayed_stamina,
         format_money, update_displayed_stats,
         update_displayed_effects, update_displayed_effect_durations,
         update_displayed_time, update_displayed_character_xp, 
         update_displayed_dialogue, update_displayed_textline_answer,
         start_activity_display, start_sleeping_display,
         create_new_skill_bar, update_displayed_skill_bar, update_displayed_skill_description, clear_skill_bars,
         update_displayed_ongoing_activity, clear_skill_list,
         clear_message_log,
         update_enemy_attack_bar, update_character_attack_bar,
         update_displayed_location_choices
        } from "./display.js";

const game_version = "v0.2.8";

//current enemy
var current_enemies = null;

const enemy_attack_loops = {};

let character_attack_loop;

//current location
var current_location;

var current_activity;

//resting, true -> health regenerates
var is_resting = true;

//sleeping, true -> health regenerates, timer goes up faster
var is_sleeping = false;

//ticks between saves, 60 = ~1 minute
var save_period = 60;
var save_counter = 0;

//accumulates deviations
var time_variance_accumulator = 0;
//all 3 used for calculating and adjusting tick durations
var time_adjustment = 0;
var start_date;
var end_date;

var current_dialogue;
const active_effects = {};
//e.g. health regen from food

const tickrate = 1;
//how many ticks per second
//best leave it at 1, as less is rather slow, and more makes ticks noticably unstable


//enemy crit stats
const enemy_crit_chance = 0.1;
const enemy_crit_damage = 2; //multiplier, not a flat bonus

//character name
const name_field = document.getElementById("character_name_field");
name_field.value = character.name;
name_field.addEventListener("change", () => character.name = name_field.value.toString().trim().length>0?name_field.value:"Hero");

const time_field = document.getElementById("time_div");
time_field.innerHTML = current_game_time.toString();

//just a small multiplier for xp, mostly for testing I guess
const global_xp_bonus = 1;

function change_location(location_name) {
    var location = locations[location_name];
    clear_all_enemy_attack_loops();
    clear_character_attack_loop();
    clear_enemies();

    if(!location) {
        throw `No such location as "${location_name}"`;
    }

    if(typeof current_location !== "undefined" && current_location.name !== location.name ) { 
        //so it's not called when initializing the location on page load or on reloading current location (due to new unlocks)
        log_message(`[ Entering ${location.name} ]`, "message_travel");
    }
    
    current_location = location;

    update_combat_stats();

    if("connected_locations" in current_location) { // basically means it's a normal location and not a combat zone (as combat zone has only "parent")
        update_displayed_normal_location(current_location);

    } else { //so if entering combat zone

        update_displayed_combat_location(current_location);
        start_combat();
    }
}

/**
 * 
 * @param {Object} selected_activity - {id} of activity in Location's activities list??
 */
function start_activity(selected_activity) {
    current_activity = Object.assign({},current_location.activities[selected_activity]);
    current_activity.name = current_activity.activity;
    current_activity.activity = activities[current_activity.activity];

    if(activities[current_activity.name].type === "JOB") {
        if(!can_work(current_activity)) {
            current_activity = null;
            return;
        }

        current_activity.earnings = 0;
        current_activity.working_time = 0;

        if(!current_activity.activity) {
            throw "Job option not found!";
        }
    } else if(activities[current_activity.name].type === "TRAINING") {
        if(!current_activity.activity) {
            throw "Training option not found!";
        }
    } else if(activities[current_activity.name].type === "GATHERING") { 
        if(!current_activity.activity) {
            throw `"${activities[current_activity.name].type}" is not a valid activity type!`;
        } 
    }

    start_activity_display(current_activity);
}

function end_activity() {
    
    log_message(`${character.name} finished ${current_activity.name}`, "activity_finished");
    
    if(current_activity.earnings) {
        character.money += current_activity.earnings;
        log_message(`${character.name} earned ${format_money(current_activity.earnings)}`, "activity_money");
        update_displayed_money();
    }
    end_activity_animation(); //clears the "animation"
    current_activity = null;
    change_location(current_location.name);
}

/**
 * 
 * @param {Object} activity_data {activity, location_name}
 */
 function unlock_activity(activity_data) {
    if(!activity_data.activity.is_unlocked){
        activity_data.activity.is_unlocked = true;
        log_message(`Unlocked activity ${activity_data.activity.activity} in location ${activity_data.location}`, "activity_unlocked");
    }
}

//single tick of resting
function do_resting() {
    if(character.full_stats.health < character.full_stats.max_health)
    {
        const resting_heal_ammount = Math.max(character.full_stats.max_health * 0.01,1); 
        //todo: scale it with skill, because why not?; maybe up to x2 bonus

        character.full_stats.health += (resting_heal_ammount);
        if(character.full_stats.health > character.full_stats.max_health) {
            character.full_stats.health = character.full_stats.max_health;
        } 
        update_displayed_health();
    }

    if(character.full_stats.stamina < character.full_stats.max_stamina)
    {
        const resting_stamina_ammount = Math.round(Math.max(character.full_stats.max_stamina/120, 1)); 
        //todo: scale it with skill as well

        character.full_stats.stamina += (resting_stamina_ammount);
        if(character.full_stats.stamina > character.full_stats.max_stamina) {
            character.full_stats.stamina = character.full_stats.max_stamina;
        } 
        update_displayed_stamina();
    }
}

function do_sleeping() {
    if(character.full_stats.health < character.full_stats.max_health)
    {
        const sleeping_heal_ammount = Math.max(character.full_stats.max_health * 0.04, 1); 
        //todo: scale it with skill (maybe up to x2.5 bonus)
        
        character.full_stats.health += (sleeping_heal_ammount);
        if(character.full_stats.health > character.full_stats.max_health) {
            character.full_stats.health = character.full_stats.max_health;
        } 
        update_displayed_health();
    }

    if(character.full_stats.stamina < character.full_stats.max_stamina)
    {
        const sleeping_stamina_ammount = Math.round(Math.max(character.full_stats.max_stamina/30, 1)); 
        //todo: scale it with skill as well

        character.full_stats.stamina += (sleeping_stamina_ammount);
        if(character.full_stats.stamina > character.full_stats.max_stamina) {
            character.full_stats.stamina = character.full_stats.max_stamina;
        } 
        update_displayed_stamina();
    }
}

function start_sleeping() {
    start_sleeping_display();
    is_sleeping = true;
}

function end_sleeping() {
    is_sleeping = false;
    change_location(current_location.name);
    end_activity_animation();
}

/**
 * 
 * @param {*} selected_job location job property
 * @returns if current time is within working hours
 */
function can_work(selected_job) {
    //if can start at all
    if(!selected_job.infinite) {
        if(selected_job.availability_time.end > selected_job.availability_time.start) {
            //ends on the same day
            if(current_game_time.hour * 60 + current_game_time.minute > selected_job.availability_time.end*60
                ||  //too late
                current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.start*60
                ) {  //too early
                
                return false;
            }
        } else {
            //ends on the next day (i.e. working through the night)        
            if(current_game_time.hour * 60 + current_game_time.minute > selected_job.availability_time.start*60
                //too late
                ||
                current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.end*60
                //too early

            ) {  
                return false;
            }
        }
    }

    return true;
}

/**
 * 
 * @param {} selected_job location job property
 * @returns if there's enough time to earn anything
 */
function enough_time_for_earnings(selected_job) {
    if(!selected_job.infinite) {
        //if enough time for at least 1 working period
        if(selected_job.availability_time.end > selected_job.availability_time.start) {
            //ends on the same day
            if(current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period > selected_job.availability_time.end*60
                ||  //not enough time left for another work period
                current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.start*60
                ) {  //too early to start (shouldn't be allowed to start and get here at all)
                return false;
            }
        } else {
            //ends on the next day (i.e. working through the night)        
            if(current_game_time.hour * 60 + current_game_time.minute > selected_job.availability_time.start*60
                //timer is past the starting hour, so it's the same day as job starts
                && 
                current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period > selected_job.availability_time.end*60 + 24*60
                //time available on this day + time available on next day are less than time needed
                ||
                current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.start*60
                //timer is less than the starting hour, so it's the next day
                &&
                current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period > selected_job.availability_time.end*60
                //time left on this day is not enough to finish
                ) {  
                return false;
            }
        }
    }

    return true;
}

/**
 * 
 * @param {String} dialogue_key 
 */
function start_dialogue(dialogue_key) {
    current_dialogue = dialogue_key;

    update_displayed_dialogue(dialogue_key);
}

function end_dialogue() {
    current_dialogue = null;
    reload_normal_location();
}
function reload_normal_location() {
    update_displayed_normal_location(current_location);
}

/**
 * 
 * @param {String} textline_key 
 */
function start_textline(textline_key){
    const dialogue = dialogues[current_dialogue];
    const textline = dialogue.textlines[textline_key];

    for(let i = 0; i < textline.unlocks.dialogues.length; i++) { //unlocking dialogues
        const dialogue = dialogues[textline.unlocks.dialogues[i]]
        if(!dialogue.is_unlocked) {
            dialogue.is_unlocked = true;
            log_message(`Can now talk with ${dialogue.name}`, "activity_unlocked");
        }
    }

    for(let i = 0; i < textline.unlocks.traders.length; i++) { //unlocking traders
        const trader = traders[textline.unlocks.traders[i]];
        if(!trader.is_unlocked) {
            trader.is_unlocked = true;
            log_message(`Can now trade with ${trader.name}`, "activity_unlocked");
        }
    }

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
        dialogue.textlines[textline.locks_lines[i]].is_finished = true;
    }

    if(textline.unlocks.activities) { //unlocking activities
        for(let i = 0; i < textline.unlocks.activities.length; i++) { //unlock 
            unlock_activity({location: locations[textline.unlocks.activities[i].location].name, 
                             activity: locations[textline.unlocks.activities[i].location].activities[textline.unlocks.activities[i].activity]});
        }
    }
    start_dialogue(current_dialogue);
    update_displayed_textline_answer(textline.text);
}

/**
 * @description sets attack cooldowns and new enemies, either from provided list or from current location, called whenever a new enemy group starts
 * @param {List<Enemy>} enemies 
 */
function set_new_combat(enemies) {
    current_enemies = enemies || current_location.get_next_enemies();
    clear_all_enemy_attack_loops();

    let character_attack_cooldown = 1/character.full_stats.attack_speed;
    let enemy_attack_cooldowns = [...current_enemies.map(x => 1/x.stats.attack_speed)];

    let fastest_cooldown = [character_attack_cooldown, ...enemy_attack_cooldowns].sort((a,b) => a - b)[0];

    //scale all attacks to be not faster than 1 per second
    if(fastest_cooldown < 1) {
        const cooldown_multiplier = 1/fastest_cooldown;
        
        character_attack_cooldown *= cooldown_multiplier;
        for(let i = 0; i < current_enemies.length; i++) {
            enemy_attack_cooldowns[i] *= cooldown_multiplier;

        }
    }

    //attach animations
    for(let i = 0; i < current_enemies.length; i++) {
        //set_enemy_attack_animation(i, enemy_attack_cooldowns[i]);
        set_enemy_attack_loop(i, enemy_attack_cooldowns[i]);
    }

    set_character_attack_loop(character_attack_cooldown);
    
    update_displayed_enemies();
}

/**
 * @description Creates an Interval responsible for performing the attack loop of enemy and updating their attack_bar progress
 * @param {*} enemy_id 
 * @param {*} cooldown 
 */
function set_enemy_attack_loop(enemy_id, cooldown) {
    let count = 0;

    enemy_attack_loops[enemy_id] = setInterval(() => {
        update_enemy_attack_bar(enemy_id, count);
        count++;
        if(count == 40) {
            count = 0;
            do_enemy_combat_action(enemy_id);
        }
    }, cooldown*1000/40);
}

function clear_enemy_attack_loop(enemy_id) {
    clearInterval(enemy_attack_loops[enemy_id]);
}

/**
 * 
 * @param {Number} base_cooldown basic cooldown based on attack speeds of enemies and character (ignoring stamina penalty) 
 * @param {String} attack_type type of attack, not yet implemented
 */
function set_character_attack_loop(base_cooldown, attack_type = "normal") {
    clear_character_attack_loop();

    let stamina_cost = 1; 
    //TODO: set it depending on attack type when they are added

    use_stamina(stamina_cost);
    let actual_cooldown = base_cooldown * character.get_stamina_multiplier();
    let attack_power = character.get_attack_power();
    do_character_attack_loop(base_cooldown, actual_cooldown, attack_power, attack_type);
}

/**
 * @description updates character's attack bar, performs combat action when it reaches full
 * @param {*} base_cooldown 
 * @param {*} actual_cooldown 
 * @param {*} attack_power 
 * @param {*} attack_type 
 */
function do_character_attack_loop(base_cooldown, actual_cooldown, attack_power, attack_type) {
    let count = 0;
    character_attack_loop = setInterval(() => {
        
        update_character_attack_bar(count);
        count++;
        if(count == 40) {
            count = 0;
            let done = do_character_combat_action(attack_power, attack_type);
            if(!done) { //set next loop if there's still an enemy left
                set_character_attack_loop(base_cooldown, attack_type);
            }
        }
    }, 1000/(40*actual_cooldown));
}

function clear_character_attack_loop() {
    clearInterval(character_attack_loop);
}

function clear_all_enemy_attack_loops() {
    Object.keys(enemy_attack_loops).forEach((key) => {
        clearInterval(enemy_attack_loops[key]);
    })
}

function start_combat() {
    if(current_enemies == null) {
        set_new_combat();
        update_combat_stats();
    }
}

/**
 * performs a single combat action (that is attack, as there isn't really any other kind for now),
 * called when attack cooldown finishes
 * 
 * @param attacker combatant performing the action
*/ 
function do_enemy_combat_action(enemy_id) {
    
    /*
    tiny workaround, as character being defeated while facing multiple enemies,
    sometimes results in enemy attack animation still finishing before character retreats,
    launching this function and causing an error
    */
    if(!current_enemies) { 
        return;
    }
    
    const attacker = current_enemies[enemy_id];

    let evasion_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/3); //down to .5 if there's full 8 enemies (multiple attackers make it harder to evade attacks)
    if(attacker.size === "small") {
        add_xp_to_skill(skills["Pest killer"], attacker.xp_value, true);
    } else if(attacker.size === "large") {
        add_xp_to_skill(skills["Giant slayer"], attacker.xp_value, true);
        evasion_chance_modifier *= skills["Giant slayer"].get_coefficient("multiplicative");
    }

    const enemy_base_damage = attacker.stats.attack;

    let damage_dealt;

    let critted = false;

    let partially_blocked = false; //only used for combat info in message log

    damage_dealt = enemy_base_damage * (1.2 - Math.random() * 0.4); //basic 20% deviation for damage


    if(character.equipment["off-hand"]?.offhand_type === "shield") { //HAS SHIELD
        if(character.combat_stats.block_chance > Math.random()) {//BLOCKED THE ATTACK
            add_xp_to_skill(skills["Shield blocking"], attacker.xp_value, true);
            if(character.equipment["off-hand"].getShieldStrength() >= damage_dealt) {
                log_message(character.name + " blocked an attack", "hero_blocked");
                return; //damage fully blocked, nothing more can happen 
            } else {
                damage_dealt -= character.equipment["off-hand"].getShieldStrength();
                partially_blocked = true;
            }
         }
    } else { // HAS NO SHIELD
        //character EP div by enemy_AP * 3
        const evasion_chance = (character.combat_stats.evasion_points / (attacker.stats.dexterity * Math.sqrt(attacker.stats.intuition ?? 1) * 3)) * evasion_chance_modifier;

        if(evasion_chance > Math.random()) { //EVADED ATTACK
            add_xp_to_skill(skills["Evasion"], attacker.xp_value, true);
            log_message(character.name + " evaded an attack", "enemy_missed");
            return; //damage fully evaded, nothing more can happen
        }
    }

    if(enemy_crit_chance > Math.random())
    {
        damage_dealt *= enemy_crit_damage;
        critted = true;
    }

    let {damage_taken, fainted} = character.take_damage({damage_value: damage_dealt});

    if(critted)
    {
        if(partially_blocked) {
            log_message(character.name + " partially blocked, critically was hit for " + damage_taken + " dmg", "hero_attacked_critically");
        } 
        else {
            log_message(character.name + " critically was hit for " + damage_taken + " dmg", "hero_attacked_critically");
        }
    } else {
        if(partially_blocked) {
            log_message(character.name + " partially blocked, was hit for " + damage_taken + " dmg", "hero_attacked");
        }
        else {
            log_message(character.name + " was hit for " + damage_taken + " dmg", "hero_attacked");
        }
    }

    if(fainted) {
        log_message(character.name + " has lost consciousness", "hero_defeat");

        update_displayed_health();
        change_location(current_location.parent_location.name);
        return;
    }

    update_displayed_health();
}

function do_character_combat_action(attack_power, attack_type = "normal") {
    
    //todo: attack types with different stamina costs
    //TODO: when multi-target attacks are added, calculate this in a loop, separetely for each enemy that can be hit
    //TODO: when single-target attack kills target, deal the remaining dmg (basically the remaining negative hp that the target has) to next target

    const hero_base_damage = attack_power;

    let damage_dealt;
    
    let critted = false;

    const target = current_enemies.filter(enemy => enemy.is_alive).slice(-1).pop(); //get bottom-most of alive enemies
    
    let hit_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/4); // down to ~ 60% if there's full 8 enemies
    
    add_xp_to_skill(skills["Combat"], target.xp_value, true);
    if(target.size === "small") {
        add_xp_to_skill(skills["Pest killer"], target.xp_value, true);
        hit_chance_modifier *= skills["Pest killer"].get_coefficient("multiplicative");
    } else if(target.size === "large") {
        add_xp_to_skill(skills["Giant slayer"], target.xp_value, true);
    }

    //character AP div by 2*enemy_DP 
    const hit_chance = (character.combat_stats.attack_points / (target.stats.agility * Math.sqrt(target.stats.intuition ?? 1) * 2)) * hit_chance_modifier;

    if(hit_chance > Math.random()) {//hero's attack hits

        if(character.equipment.weapon != null) {
            damage_dealt = Math.round(
                                        10 * hero_base_damage * (1.2 - Math.random() * 0.4) 
                                        * skills[`${capitalize_first_letter(character.equipment.weapon.weapon_type)}s`].get_coefficient()
                                     )/10;


            add_xp_to_skill(skills[`${capitalize_first_letter(character.equipment.weapon.weapon_type)}s`], target.xp_value, true); 

        } else {
            damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4) * skills['Unarmed'].get_coefficient())/10;
            add_xp_to_skill(skills['Unarmed'], target.xp_value, true);
        }
        //small randomization by up to 20%, then bonus from skill
        
        if(character.full_stats.crit_rate > Math.random()) {
            damage_dealt = Math.round(10*damage_dealt * character.full_stats.crit_multiplier)/10;
            critted = true;
        }
        else {
            critted = false;
        }
        
        damage_dealt = Math.max(Math.round(10*(damage_dealt - target.stats.defense))/10, 1);

        target.stats.health -= damage_dealt;
        if(critted) {
            log_message(target.name + " was critically hit for " + damage_dealt + " dmg", "enemy_attacked_critically");
        }
        else {
            log_message(target.name + " was hit for " + damage_dealt + " dmg", "enemy_attacked");
        }

        if(target.stats.health <= 0) {
            target.stats.health = 0; //to not go negative on displayed value

            log_message(target.name + " was defeated", "enemy_defeated");

            //gained xp multiplied by square root of TOTAL size of enemy group
            let xp_reward = target.xp_value * (current_enemies.length**0.5);
            add_xp_to_character(xp_reward, true);
            

            var loot = target.get_loot();
            if(loot.length > 0) {
                log_loot(loot);
                add_to_character_inventory(loot);
            }
            
            kill_enemy(target);
            const finished_group = current_enemies.filter(enemy => enemy.is_alive).length == 0;

            if(finished_group) {
                current_location.enemy_groups_killed += 1;
                set_new_combat();

                if(current_location.enemy_groups_killed > 0 && current_location.enemy_groups_killed % current_location.enemy_count == 0) {
                    get_location_rewards(current_location);

                }
                enemy_count_div.children[0].children[1].innerHTML = current_location.enemy_count - current_location.enemy_groups_killed % current_location.enemy_count;
                
                return true;
            }
        }

        update_displayed_health_of_enemies();
    } else {
        log_message(character.name + " has missed", "hero_missed");
    }
}

/**
 * sets enemy to dead, disabled their attack, checks if that was the last enemy in group
 * @param {Enemy} enemy 
 * @return {Boolean} if that was the last of an enemy group
 */
function kill_enemy(target) {
    target.is_alive = false;
    const enemy_id = current_enemies.findIndex(enemy => enemy===target);
    clear_enemy_attack_loop(enemy_id);
}

function use_stamina(num = 1) {
    character.full_stats.stamina -= num;

    if(character.full_stats.stamina < 0)  {
        character.full_stats.stamina = 0;
    };

    if(character.full_stats.stamina < 1) {
        add_xp_to_skill(skills["Persistence"], num );
        update_displayed_stats();
    }

        update_displayed_stamina();
}

/**
 * adds xp to skills, handles their levelups and tooltips
 * @param skill - skill object 
 * @param {Number} xp_to_add 
 * @param {Boolean} should_info 
 */
function add_xp_to_skill(skill, xp_to_add, should_info) 
{
    if(xp_to_add == 0) {
        return;
    }
    
    if(skill.total_xp == 0) 
    {
        create_new_skill_bar(skill);
        
        if(typeof should_info === "undefined" || should_info) {
            log_message(`Learned new skill: ${skill.name()}`, "skill_raised");
        }
    } 

    const level_up = skill.add_xp(xp_to_add * (global_xp_bonus || 1));

    update_displayed_skill_bar(skill);
    
    if(typeof level_up !== "undefined"){ //not undefined => levelup happened and levelup message was returned
    //character stats currently get added in character.add_bonuses() method, called in skill.get_bonus_stats() method, called in skill.add_xp() when levelup happens
        if(typeof should_info === "undefined" || should_info)
        {
            log_message(level_up, "skill_raised");
            update_character_stats();
        }

        if(typeof skill.get_effect_description !== "undefined")
        {
            update_displayed_skill_description(skill);
        }
    }
}

/**
 * adds xp to character, handles levelups
 * @param {Number} xp_to_add 
 * @param {Boolean} should_info 
 */
function add_xp_to_character(xp_to_add, should_info = true) {
    const level_up = character.add_xp(xp_to_add * (global_xp_bonus || 1));
    
    if(level_up) {
        if(should_info) {
            log_message(level_up, "level_up");
        }
        
        character.full_stats.health = character.full_stats.max_health; //free healing on level up, because it's a nice thing to have
        update_character_stats();
    }

    update_displayed_character_xp(level_up);
}

/**
 * @param {Location} location game Location object
 * @description handles all the rewards for clearing location (both first and subsequent clears), adding xp and unlocking stuff
 */
function get_location_rewards(location) {

    if(location.enemy_groups_killed == location.enemy_count) { //first clear
        change_location(current_location.parent_location.name); //go back to parent location, only on first clear

        if(location.first_reward.xp && typeof location.first_reward.xp === "number") {
            log_message(`Obtained ${location.first_reward.xp}xp for clearing ${location.name} for the first time`, "location_reward");
            add_xp_to_character(location.first_reward.xp);
        }
    } else if(location.repeatable_reward.xp && typeof location.repeatable_reward.xp === "number") {
        log_message(`Obtained additional ${location.repeatable_reward.xp}xp for clearing ${location.name}`, "location_reward");
        add_xp_to_character(location.repeatable_reward.xp);
    }


    //all below: on each clear, so that if something gets added after location was cleared, it will still be unlockable

    for(let i = 0; i < location.repeatable_reward.locations?.length; i++) { //unlock locations
        unlock_location(location.repeatable_reward.locations[i]);
    }

    for(let i = 0; i < location.repeatable_reward.textlines?.length; i++) { //unlock textlines and dialogues
        var any_unlocked = false;
        for(let j = 0; j < location.repeatable_reward.textlines[i].lines.length; j++) {
            if(dialogues[location.repeatable_reward.textlines[i].dialogue].textlines[location.repeatable_reward.textlines[i].lines[j]].is_unlocked == false) {
                any_unlocked = true;
                dialogues[location.repeatable_reward.textlines[i].dialogue].textlines[location.repeatable_reward.textlines[i].lines[j]].is_unlocked = true;
            }
        }
        if(any_unlocked) {
            log_message(`Maybe you should check on ${location.repeatable_reward.textlines[i].dialogue}...`, "dialogue_unlocked");
            //maybe do this only when there's just 1 dialogue with changes?
        }
    }
    //TODO: unlocking full dialogues and not just textlines

    
    /*
    TODO: give more rewards on all clears
    - some xp for location-related skills? (i.e. if location is dark, then for "night vision" or whatever it will be called)
    - items/money?
    */
}

/**
 * 
 * @param location game location object 
 */
function unlock_location(location) {
    if(!location.is_unlocked){
        location.is_unlocked = true;
        log_message(`Unlocked location ${location.name}`, "location_unlocked");
    }
}

function clear_enemies() {
    current_enemies = null;
}

/**
 * TODO
 */
function dismantle_item() {
    //TODO
}

function character_equip_item(item_info) {
    if(current_enemies) {
        set_new_combat(current_enemies);
    }
    equip_item_from_inventory(item_info);
}
function character_unequip_item(item_info) {
    if(current_enemies) {
        set_new_combat(current_enemies);
    }
    unequip_item(item_info);
}

function use_item(item_name) { 
    //can only use 1 at once and usable items are stackable, so item_name is enough

    const item_effects = item_templates[item_name].use_effect;
    
    var used = false;

    Object.keys(item_effects).forEach(function(key) {
        /*
        add effects to active_effects if not present
        same or lower strength: dont allow
        stronger: overwrite current
        */

        //temporary implementation
        if(!active_effects[key] || active_effects[key].flat < item_effects[key].flat) {
            active_effects[key] = Object.assign({}, item_effects[key]);
            used = true;
        }
        
    });
    if(used) {
        update_displayed_effects();
        remove_from_character_inventory({item_name, item_count: 1});
    }
}


/**
 * puts all important stuff into a string
 * @returns string with save data
 */
function create_save() {
    try{
        const save_data = {};
        save_data["current time"] = current_game_time;
        save_data["character"] = {
                                name: character.name, titles: character.titles, 
                                inventory: character.inventory, equipment: character.equipment,
                                money: character.money, 
                                xp: {
                                total_xp: character.xp.total_xp,
                                },
                                hp_to_full: character.full_stats.max_health - character.full_stats.health,
                                stamina_to_full: character.full_stats.max_stamina - character.full_stats.stamina
                            };
        //no need to save all stats; on loading, base stats will be taken from code and then additional stuff will be calculated again (in case anything changed)

        save_data["skills"] = {};
        Object.keys(skills).forEach(function(key) {
            save_data["skills"][skills[key].skill_id] = {total_xp: skills[key].total_xp}; //a bit redundant, but keep it in case key in skills is different than skill_id
        }); //only save total xp of each skill, again in case of any changes
        
        save_data["current location"] = current_location.name;

        save_data["locations"] = {};
        Object.keys(locations).forEach(function(key) { 
            save_data["locations"][key] = {};
            if(locations[key].is_unlocked) {      
                save_data["locations"][key].is_unlocked = true;
            }

            if("parent_location" in locations[key]) { //combat zone
                save_data["locations"][key]["enemy_groups_killed"] = locations[key].enemy_groups_killed;
            }

            if(locations[key].activities) {
                save_data["locations"][key]["unlocked_activities"] = []
                Object.keys(locations[key].activities).forEach(activity_key => {
                    if(locations[key].activities[activity_key].is_unlocked) {
                        save_data["locations"][key]["unlocked_activities"].push(locations[key].activities[activity_key].activity);
                    }
                });
            }
        }); //save locations' (and their activities') unlocked status and their killcounts

        save_data["activities"] = {};
        Object.keys(activities).forEach(function(activity) {
            if(activities[activity].is_unlocked) {
                save_data["activities"][activity] = {is_unlocked: true};
            }
        }); //save activities' unlocked status (this is separate from unlock status in location)

        if(current_activity) {
            save_data["current_activity"] = {activity: current_activity.activity.name, 
                                             working_time: current_activity.working_time, 
                                             earnings: current_activity.earnings};
        }
        
        save_data["dialogues"] = {};
        Object.keys(dialogues).forEach(function(dialogue) {
            save_data["dialogues"][dialogue] = {is_unlocked: dialogues[dialogue].is_unlocked, is_finished: dialogues[dialogue].is_finished, textlines: {}};
            if(dialogues[dialogue].textlines) {
                Object.keys(dialogues[dialogue].textlines).forEach(function(textline) {
                    save_data["dialogues"][dialogue].textlines[textline] = {is_unlocked: dialogues[dialogue].textlines[textline].is_unlocked,
                                                                is_finished: dialogues[dialogue].textlines[textline].is_finished};
                });
            }
        }); //save dialogues' and their textlines' unlocked/finished statuses

        save_data["traders"] = {};
        Object.keys(traders).forEach(function(trader) {
            if(traders[trader].is_unlocked) {
                if(traders[trader].last_refresh == -1 || traders[trader].can_refresh()) {
                    //no need to save inventory, as trader would be anyway refreshed on any visit
                    save_data["traders"][trader] = {last_refresh: -1,
                                                    is_unlocked: traders[trader].is_unlocked};
                } else {
                    save_data["traders"][trader] = {inventory: traders[trader].inventory, 
                                                    last_refresh: traders[trader].last_refresh, 
                                                    is_unlocked: traders[trader].is_unlocked
                                                };
                }
            }
        });

        save_data["is_sleeping"] = is_sleeping;

        save_data["active_effects"] = active_effects;

        return JSON.stringify(save_data);
    } catch(error) {
        console.error("Something went wrong on saving the game!");
        console.error(error);
    }
} 

/**
 * called from index.html
 * @returns save string encoded to base64
 */
function save_to_file() {
    return btoa(create_save());
}

/**
 * saves game state to localStorage, on manual saves also logs message about it being done
 * @param {Boolean} is_manual 
 */
function save_to_localStorage(is_manual) {
    localStorage.setItem("save data", create_save());
    if(is_manual) {
        log_message("Saved the game manually");
    }
}

function load(save_data) {
    //single loading method
    
    //current enemies are not saved

    //TODO: some loading screen
    try{
        current_game_time.load_time(save_data["current time"]);
        time_field.innerHTML = current_game_time.toString();
        //set game time

        name_field.value = save_data.character.name;
        character.name = save_data.character.name;

        Object.keys(save_data.character.equipment).forEach(function(key){
            if(save_data.character.equipment[key] != null) {
                try{

                    if(key === "weapon") {
                        const {head, handle, quality, equip_slot} = save_data.character.equipment[key];
                        if(!item_templates[head]){
                            console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                        } else if(!item_templates[handle]) {
                            console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                        } else {
                            const item = getItem({head, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                            equip_item(item);
                        }
                    } else if(key === "off-hand") {
                        const {shield_base, handle, quality, equip_slot} = save_data.character.equipment[key];
                        if(!item_templates[shield_base]){
                            console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                        } else if(!item_templates[handle]) {
                            console.warn(`Skipped item: shield handle "${handle}" couldn't be found!`);
                        } else {
                            const item = getItem({shield_base, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                            equip_item(item);
                        }
                    } else {
                        const {internal, external, quality, equip_slot} = save_data.character.equipment[key];
                        if(!item_templates[internal]){
                            console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                        } else if(external && !item_templates[external]) {
                            console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                        } else {
                            const item = getItem({internal, external, quality, equip_slot, item_type: "EQUIPPABLE"});
                            equip_item(item);
                        }
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        }); //equip proper items

        const item_list = [];

        Object.keys(save_data.character.inventory).forEach(function(key){
            if(Array.isArray(save_data.character.inventory[key])) { //is a list of unstackable items (equippables), needs to be added 1 by 1
                for(let i = 0; i < save_data.character.inventory[key].length; i++) {
                    try{
                        if(save_data.character.inventory[key][i].equip_slot === "weapon") {
                            const {head, handle, quality, equip_slot} = save_data.character.inventory[key][i];
                            if(!item_templates[head]){
                                console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                            } else if(!item_templates[handle]) {
                                console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                            } else {
                                const item = getItem({head, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                                item_list.push({item, count: 1});
                            }
                        } else if(save_data.character.inventory[key][i].equip_slot === "off-hand") {
                            const {shield_base, handle, quality, equip_slot} = save_data.character.inventory[key][i];
                            if(!item_templates[shield_base]){
                                console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                            } else if(!item_templates[handle]) {
                                console.warn(`Skipped item: shield handle "${handle}" couldn't be found!`);
                            } else {
                                const item = getItem({shield_base, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                                item_list.push({item, count: 1});
                            }
                        } else {
                            const {internal, external, quality, equip_slot} = save_data.character.inventory[key][i];
                            if(!item_templates[internal]){
                                console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                            } else if(external && !item_templates[external]) {
                                console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                            } else {
                                const item = getItem({internal, external, quality, equip_slot, item_type: "EQUIPPABLE"});
                                item_list.push({item, count: 1});
                            }
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
            else { //is stackable 
                if(item_templates[key]) {
                    save_data.character.inventory[key].item.value = item_templates[key].value;
                    save_data.character.inventory[key].item.description = item_templates[key].description;
                    if(item_templates[key].item_type === "USABLE") {
                        save_data.character.inventory[key].item.use_effect = item_templates[key].use_effect;
                    }
                    item_list.push({item: getItem(save_data.character.inventory[key].item), count: save_data.character.inventory[key].count});
                } else {
                    console.warn(`Inventory item "${key}" couldn't be found!`);
                    return;
                }
            }
            
        }); //add all loaded items to list

        add_to_character_inventory(item_list); // and then to inventory

        character.money = save_data.character.money || 0;
        update_displayed_money();

        add_xp_to_character(save_data.character.xp.total_xp/(global_xp_bonus || 1), false);

        Object.keys(save_data.skills).forEach(function(key){ 
            if(skills[key]){
                if(save_data.skills[key].total_xp > 0) {
                    add_xp_to_skill(skills[key], save_data.skills[key].total_xp/(global_xp_bonus || 1), false);
                }
            } else {
                console.warn(`Skill "${key}" couldn't be found!`);
                return;
            }
        }); //add xp to skills


        Object.keys(save_data.dialogues).forEach(function(dialogue) {
            if(dialogues[dialogue]) {
                dialogues[dialogue].is_unlocked = save_data.dialogues[dialogue].is_unlocked;
                dialogues[dialogue].is_finished = save_data.dialogues[dialogue].is_finished;
            } else {
                console.warn(`Dialogue "${dialogue}" couldn't be found!`);
                return;
            }
            if(save_data.dialogues[dialogue].textlines) {  
                Object.keys(save_data.dialogues[dialogue].textlines).forEach(function(textline){
                    if(dialogues[dialogue].textlines[textline]) {
                        dialogues[dialogue].textlines[textline].is_unlocked = save_data.dialogues[dialogue].textlines[textline].is_unlocked;
                        dialogues[dialogue].textlines[textline].is_finished = save_data.dialogues[dialogue].textlines[textline].is_finished;
                    } else {
                        console.warn(`Textline "${textline}" in dialogue "${dialogue}" couldn't be found!`);
                        return;
                    }
                }); 
            }
        }); //load for dialogues and their textlines their unlocked/finished status

        
        Object.keys(save_data.traders).forEach(function(trader) { 
            let trader_item_list = [];
            if(traders[trader]){

                //set as unlocked (it must have been unlocked to be saved, so no need to check the actual value)
                traders[trader].is_unlocked = true;

                if(save_data.traders[trader].inventory) {
                    Object.keys(save_data.traders[trader].inventory).forEach(function(key){
                        if(Array.isArray(save_data.traders[trader].inventory[key])) { //is a list of unstackable (equippable) item, needs to be added 1 by 1
                            for(let i = 0; i < save_data.traders[trader].inventory[key].length; i++) {
                                try{
                                    if(save_data.traders[trader].inventory[key][i].equip_slot === "weapon") {
                                        const {head, handle, quality, equip_slot} =  save_data.traders[trader].inventory[key][i];
                                        if(!item_templates[head]){
                                            console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                                        } else if(!item_templates[handle]) {
                                            console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                                        } else {
                                            const item = getItem({head, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                                            trader_item_list.push({item, count: 1});
                                        }
                                    } else if( save_data.traders[trader].inventory[key][i].equip_slot === "off-hand") {
                                        const {shield_base, handle, quality, equip_slot} =  save_data.traders[trader].inventory[key][i];
                                        if(!item_templates[shield_base]){
                                            console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                                        } else if(!item_templates[handle]) {
                                            console.warn(`Skipped item: shield handle "${handle}" couldn't be found!`);
                                        } else {
                                            const item = getItem({shield_base, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                                            trader_item_list.push({item, count: 1});
                                        }
                                    } else {
                                        const {internal, external, quality, equip_slot} =  save_data.traders[trader].inventory[key][i];
                                        if(!item_templates[internal]){
                                            console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                                        } else if(external && !item_templates[external]) {
                                            console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                                        } else {
                                            const item = getItem({internal, external, quality, equip_slot, item_type: "EQUIPPABLE"});
                                            trader_item_list.push({item, count: 1});
                                        }
                                    }
                                } catch (error) {
                                    console.error(error);
                                }
                            }
                        }
                        else {
                            save_data.traders[trader].inventory[key].item.value = item_templates[key].value;
                            if(item_templates[key].item_type === "EQUIPPABLE") {
                                save_data.traders[trader].inventory[key].item.equip_effect = item_templates[key].equip_effect;
                            } else if(item_templates[key].item_type === "USABLE") {
                                save_data.traders[trader].inventory[key].item.use_effect = item_templates[key].use_effect;
                            }
                            trader_item_list.push({item: getItem(save_data.traders[trader].inventory[key].item), count: save_data.traders[trader].inventory[key].count});
                        }
                    });
                }
                traders[trader].refresh(); 
                traders[trader].inventory = {};
                add_to_trader_inventory(trader, trader_item_list);

                traders[trader].last_refresh = save_data.traders[trader].last_refresh; 
            }
            else {
                console.warn(`Trader "${trader} couldn't be found!`);
                return;
            }
        }); //load trader inventories
        

        Object.keys(save_data.locations).forEach(function(key) {
            if(locations[key]) {
                if(save_data.locations[key].is_unlocked) {
                    locations[key].is_unlocked = true;
                }
                if("parent_location" in locations[key]) { // if combat zone
                    locations[key].enemy_groups_killed = save_data.locations[key].enemy_groups_killed || 0;   
                }

                //unlock activities
                if(save_data.locations[key].unlocked_activities) {
                    for(let i = 0; i < save_data.locations[key].unlocked_activities.length; i++) {
                        locations[key].activities[save_data.locations[key].unlocked_activities[i]].is_unlocked = true;
                    }
                }
            } else {
                console.warn(`Location "${key}" couldn't be found!`);
                return;
            }
        }); //load for locations their unlocked status and their killcounts

        Object.keys(save_data.activities).forEach(function(activity) {
            if(activities[activity]) {
                activities[activity].is_unlocked = save_data.activities[activity].is_unlocked || false;
            } else {
                console.warn(`Activity "${activity}" couldn't be found!`);
            }
        });

        Object.keys(save_data.active_effects).forEach(function(effect) {
            active_effects[effect] = save_data.active_effects[effect];
        });

        
        if(save_data.character.hp_to_full == null || save_data.character.hp_to_full >= character.full_stats.max_health) {
            character.full_stats.health = 1;
        } else {
            character.full_stats.health = character.full_stats.max_health - save_data.character.hp_to_full;
        }
        //if missing hp is null (save got corrupted) or its more than max_health, set health to minimum allowed (which is 1)
        //otherwise just do simple substraction
        //then same with stamina below
        if(save_data.character.stamina_to_full == null || save_data.character.stamina_to_full >= character.full_stats.max_stamina) {
            character.full_stats.stamina = 0;
        } else {
            character.full_stats.stamina = character.full_stats.max_stamina - save_data.character.stamina_to_full;
        }
        
        update_character_stats();

        update_displayed_health();
        //load current health
        
        //TODO: apply effects properly
        update_displayed_effects();
        
        change_location(save_data["current location"]);

        //set activity if any saved
        if(save_data.current_activity) {
            //search for it in location from save_data
            const activity_id = save_data.current_activity.activity;

            if(typeof activity_id !== "undefined" && current_location.activities[activity_id]) {
                start_activity(activity_id);
                if(activities[activity_id].type === "JOB") {
                    current_activity.working_time = save_data.current_activity.working_time;
                    current_activity.earnings = save_data.current_activity.earnings;
                    document.getElementById("action_end_earnings").innerText = `(earnings: ${format_money(current_activity.earnings)})`;
                }
                
            } else {
                console.warn("Couldn't find saved activity! It might have been removed");
            }
        }

        if(save_data.is_sleeping) {
            start_sleeping();
        }
        
    } catch(error) {
        throw error; //let other loading methods (from_file and from_localstorage) take care of it
    }

} //core function for loading

/**
 * called from index.html
 * loads game from file by resetting everything that needs to be reset and then calling main loading method with same parameter
 * @param {String} save_string 
 */
function load_from_file(save_string) {
    try{
        Object.keys(character.equipment).forEach(function(key){
            if(character.equipment[key] != null) {
                character_unequip_item(key);
            }
        }); //remove equipment
        character.inventory = {}; //reset inventory to not duplicate items

        character.stats = character.base_stats;
        character.xp = character.starting_xp;
        //reset stats and xp

        Object.keys(skills).forEach(function(key){
            if(skills[key].total_xp > 0) {
                skills[key].current_xp = 0;
                skills[key].current_lvl = 0;
                skills[key].total_xp = 0;
                skills[key].xp_to_next_lvl = skills[key].base_xp_cost;
                skills[key].total_xp_to_next_lvl = skills[key].base_xp_cost;
            }
        });

        clear_skill_bars();

        exit_trade();

        clear_skill_list();

        clear_message_log();
        
        try {
            load(JSON.parse(atob(save_string)));
        } catch(error) {
            console.error("Something went wrong on loading from file!");
            console.error(error);
        }
    } catch (error) {
        console.error("Something went wrong on preparing to load from file!");
        console.error(error);
    }
} //called on loading from file, clears everything

/**
 * loads the game from localStorage
 * it's called when page is refreshed, so there's no need for it to reset anything
 */
function load_from_localstorage() {
    try{
        load(JSON.parse(localStorage.getItem("save data")));
    } catch(error) {
        console.error("Something went wrong on loading from localStorage!");
        console.error(error);
    }
}

//update game time
function update_timer() {
    current_game_time.go_up(is_sleeping ? 6 : 1);
    update_combat_stats(); //yep, done every second, gotta try to optimize it at some point
    update_displayed_time();
}

function get_game_version() {
    return game_version;
}

function update() {
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
            //nothing here i guess?
        } else { //everything other than combat
            if(is_sleeping) {
                do_sleeping();
                add_xp_to_skill(skills["Sleeping"], current_location.sleeping.xp);
            }
            else if(is_resting) {
                do_resting();
            }

            if(current_activity) { //in activity

                //add xp to all related skills
                for(let i = 0; i < current_activity.activity.base_skills_names?.length; i++) {
                    add_xp_to_skill(skills[current_activity.activity.base_skills_names[i]], current_activity.skill_xp_per_tick);
                }

                //if job: payment
                if(current_activity.activity.type === "JOB") {
                    current_activity.working_time += 1;

                    if(current_activity.working_time % current_activity.working_period == 0) { 
                        //finished working period, add money, then check if there's enough time left for another

                        current_activity.earnings += current_activity.get_payment();

                        update_displayed_ongoing_activity(current_activity);
                    }
                    
                    if(!can_work(current_activity)) {
                        end_activity();
                    }
                }

                //if gathering: add drops to inventory

            } else {
                const divs = document.getElementsByClassName("activity_div");
                for(let i = 0; i < divs.length; i++) {
                    const activity = current_location.activities[divs[i].getAttribute("data-activity")];

                    if(activities[activity.activity].type === "JOB") {
                        if(can_work(activity)) {
                            divs[i].classList.remove("activity_unavailable");
                            divs[i].classList.add("start_activity");
                        } else {
                            divs[i].classList.remove("start_activity");
                            divs[i].classList.add("activity_unavailable");
                        }
                        
                    }
                }
            }
        }

        //regenerate hp
        if(active_effects.health_regeneration) {
            if(character.full_stats.health < character.full_stats.max_health) {
                character.full_stats.health += active_effects.health_regeneration.flat;

                if(character.full_stats.health > character.full_stats.max_health) {
                    character.full_stats.health = character.full_stats.max_health
                }

                update_displayed_health();
            }
            active_effects.health_regeneration.duration -= 1;
            if(active_effects.health_regeneration.duration <= 0) {
                delete active_effects.health_regeneration;
                update_displayed_effects();
            }
        }

        //regenerate stamina
        if(active_effects.stamina_regeneration) {
            if(character.full_stats.stamina < character.full_stats.max_stamina) {
                character.full_stats.stamina += active_effects.stamina_regeneration.flat;

                if(character.full_stats.stamina > character.full_stats.max_stamina) {
                    character.full_stats.stamina = character.full_stats.max_stamina
                }

                update_displayed_stamina();
            }
            active_effects.stamina_regeneration.duration -= 1;
            if(active_effects.stamina_regeneration.duration <= 0) {
                delete active_effects.stamina_regeneration;
                update_displayed_effects();
            }
        }
        update_displayed_effect_durations();

        save_counter += 1;
        if(save_counter >= save_period) {
            save_counter = 0;
            save_to_localStorage();
        } //save every X/60 minutes

        if(!is_sleeping && current_location && current_location.light_level === "normal" && (current_game_time.hour >= 20 || current_game_time.hour <= 4)) 
        {
            add_xp_to_skill(skills["Night vision"], 1);
        }

        //add xp to proper skills based on location types
        if(current_location) {
            const skills = current_location.gained_skills;
            for(let i = 0; i < skills?.length; i++) {
                add_xp_to_skill(current_location.gained_skills[i].skill, current_location.gained_skills[i].xp);
            }
        }

        if(time_variance_accumulator <= 100/tickrate && time_variance_accumulator >= -100/tickrate) {
            time_adjustment = time_variance_accumulator;
        }
        else {
            if(time_variance_accumulator > 100/tickrate) {
                time_adjustment = 100/tickrate;
            }
            else {
                if(time_variance_accumulator < -100/tickrate) {
                    time_adjustment = -100/tickrate;
                }
            }
        }
        /*
        small correction, limiting maximum adjustment;
        */

        update();
    }, 1000/tickrate - time_adjustment);
    //uses time_adjustment based on time_variance_accumulator for more precise overall stabilization
    //(instead of only stabilizing relative to previous tick, it stabilizes relative to sum of deviations)
    //probably completely unnecessary lol, but hey, it sounds cool
}

function run() {
    if(typeof current_location === "undefined") {
        change_location("Village");
    } 
    
    update_displayed_health();
        
    start_date = Date.now();
    update();   
}

window.equip_item = character_equip_item;
window.unequip_item = character_unequip_item;

window.change_location = change_location;
window.reload_normal_location = reload_normal_location;

window.start_dialogue = start_dialogue;
window.end_dialogue = end_dialogue;
window.start_textline = start_textline;

window.update_displayed_location_choices = update_displayed_location_choices;

window.start_activity = start_activity;
window.end_activity = end_activity;

window.start_sleeping = start_sleeping;
window.end_sleeping = end_sleeping;

window.start_trade = start_trade;
window.exit_trade = exit_trade;
window.add_to_buying_list = add_to_buying_list;
window.remove_from_buying_list = remove_from_buying_list;
window.add_to_selling_list = add_to_selling_list;
window.remove_from_selling_list = remove_from_selling_list;
window.cancel_trade = cancel_trade;
window.accept_trade = accept_trade;
window.is_in_trade = is_in_trade;

window.format_money = format_money;
window.get_character_money = character.get_character_money;

window.use_item = use_item;

window.do_enemy_combat_action = do_enemy_combat_action;

window.sort_displayed_inventory = sort_displayed_inventory;
window.update_displayed_character_inventory = update_displayed_character_inventory;
window.update_displayed_trader_inventory = update_displayed_trader_inventory;

window.save_to_localStorage = save_to_localStorage;
window.save_to_file = save_to_file;
window.load_progress = load_from_file;
window.get_game_version = get_game_version;

if("save data" in localStorage) {
    load_from_localstorage();

    update_combat_stats();
}
else {
    
    add_to_character_inventory([{item: getItem({...item_templates["Cheap iron sword"], quality: 0.4})}, 
                                {item: getItem({...item_templates["Cheap leather pants"], quality: 0.4})},
                                {item: getItem(item_templates["Stale bread"]), count: 5}]);

    equip_item_from_inventory({name: "Cheap iron spear", id: 0});
    equip_item_from_inventory({name: "Cheap leather pants", id: 0});
    add_xp_to_character(0);
    character.money = 15;
    update_displayed_money();
    update_character_stats();
}

//checks if there's an existing save file, otherwise just sets up some initial equipment
update_displayed_equipment();
run();


export { current_enemies, can_work, current_location, active_effects, enough_time_for_earnings, add_xp_to_skill };