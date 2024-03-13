"use strict";

import { traders } from "./traders.js";
import { current_trader, to_buy, to_sell } from "./trade.js";
import { skills, get_unlocked_skill_rewards, get_next_skill_milestone } from "./skills.js";
import { character, get_skill_xp_gain, get_hero_xp_gain, get_skills_overall_xp_gain } from "./character.js";
import { current_enemies, can_work, current_location, active_effects, enough_time_for_earnings, get_current_book, last_location_with_bed, last_combat_location } from "./main.js";
import { dialogues } from "./dialogues.js";
import { activities } from "./activities.js";
import { format_time, current_game_time } from "./game_time.js";
import { book_stats, item_templates } from "./items.js";
import { location_types, locations } from "./locations.js";
import { enemy_killcount, enemy_templates } from "./enemies.js";
import { expo, format_reading_time, stat_names, get_hit_chance, round_item_price } from "./misc.js"

var activity_anim; //for the activity animation interval

//location actions & trade
const action_div = document.getElementById("location_actions_div");
const trade_div = document.getElementById("trade_div");

const location_name_span = document.getElementById("location_name_span");
const location_types_div = document.getElementById("location_types_div");
const location_tooltip = document.getElementById("location_name_tooltip");

//inventory display
const inventory_div = document.getElementById("inventory_content_div");
const trader_inventory_div = document.getElementById("trader_inventory_div");

//message log
const message_log = document.getElementById("message_box_div");

//enemy info
const combat_div = document.getElementById("combat_div");
const enemies_div = document.getElementById("enemies_div");

const enemy_count_div = document.getElementById("enemy_count_div");

//character healt display
const current_health_value_div = document.getElementById("character_health_value");
const current_health_bar = document.getElementById("character_healthbar_current");

//character stamina display
const current_stamina_value_div = document.getElementById("character_stamina_value");
const current_stamina_bar = document.getElementById("character_stamina_bar_current");

//character xp display
const character_xp_div = document.getElementById("character_xp_div");
const character_level_div = document.getElementById("character_level_div");

//active effects display
const active_effects_tooltip = document.getElementById("effects_tooltip");
const active_effect_count = document.getElementById("active_effect_count");

const time_field = document.getElementById("time_div");

const skill_bar_divs = {};
const skill_list = document.getElementById("skill_list");

const bestiary_entry_divs = {};
const bestiary_list = document.getElementById("bestiary_list");

const data_entry_divs = {
                            character: document.getElementById("character_xp_multiplier"),
                            skills: document.getElementById("skills_xp_multiplier") 
                        };
const data_list = document.getElementById("data_list");

let skill_sorting = "name";
let skill_sorting_direction = "asc";

let trader_inventory_sorting = "name";
let trader_inventory_sorting_direction = "asc";

let character_inventory_sorting = "name";
let character_inventory_sorting_direction = "asc";

const message_count = {
    message_combat: 0,
    message_unlocks: 0,
    message_loot: 0,
    message_events: 0
};

const stats_divs = {strength: document.getElementById("strength_slot"), agility: document.getElementById("agility_slot"),
                    dexterity: document.getElementById("dexterity_slot"), intuition: document.getElementById("intuition_slot"),
                    magic: document.getElementById("magic_slot"), 
                    attack_speed: document.getElementById("attack_speed_slot"), attack_power: document.getElementById("attack_power_slot"), 
                    defense: document.getElementById("defense_slot"), crit_rate: document.getElementById("crit_rate_slot"), 
                    crit_multiplier: document.getElementById("crit_multiplier_slot")
                    };

const other_combat_divs = {offensive_points: document.getElementById("hit_chance_slot"), defensive_action: document.getElementById("defensive_action_slot"),
                           defensive_points: document.getElementById("defensive_action_chance_slot")
                          };

const character_attack_bar = document.getElementById("character_attack_bar");

//equipment slots
const equipment_slots_divs = {head: document.getElementById("head_slot"), torso: document.getElementById("torso_slot"),
                              arms: document.getElementById("arms_slot"), ring: document.getElementById("ring_slot"),
                              weapon: document.getElementById("weapon_slot"), "off-hand": document.getElementById("offhand_slot"),
                              legs: document.getElementById("legs_slot"), feet: document.getElementById("feet_slot"),
                              amulet: document.getElementById("amulet_slot")
                              };

const rarity_colors = {
    trash: "lightgray",
    common: "white",
    uncommon: "lightgreen",
    rare: "blue",
    epic: "pink",
    legendary: "purple",
    mythical: "orange"
}

function capitalize_first_letter(some_string) {
    return some_string.charAt(0).toUpperCase() + some_string.slice(1);
}

function clear_skill_bars() {
    Object.keys(skill_bar_divs).forEach(function(key) {
        delete skill_bar_divs[key];
    });
}

function clear_action_div() {
    while(action_div.lastElementChild) {
        action_div.removeChild(action_div.lastElementChild);
    }
}

function create_item_tooltip(item, options) {
    //create tooltip and it's content
    let item_tooltip = document.createElement("span");
    item_tooltip.classList.add(options && options.css_class || "item_tooltip");

    item_tooltip.innerHTML = `<b>${item.getName()}</b>`;
    if(item.description) {
        item_tooltip.innerHTML += `<br>${item.description}`; 
    }

    //add stats if can be equipped
    if(item.item_type === "EQUIPPABLE"){

        item_tooltip.innerHTML += `<br><br><b style="color: ${rarity_colors[item.getRarity()]}">Quality: ${Math.round(item.quality*100)}% </b>`;

        //if a shield
        if(item.offhand_type === "shield") {
            item_tooltip.innerHTML += 
            `<br><br><b>[shield]</b><br><br>Can block up to ${item.getShieldStrength()} damage`;
        }
        else if(item.equip_slot === "weapon") {
            item_tooltip.innerHTML += `<br><br>Type: <b>${item.weapon_type}</b>`;
        }
        else {
            item_tooltip.innerHTML += `<br><br>Slot: <b>${item.equip_slot}</b`;
        }

        if(item.getAttack) {
            item_tooltip.innerHTML += 
                `<br><br>Attack: ${item.getAttack()}<br>`;
        } else if(item.getDefense) { 
            item_tooltip.innerHTML += 
            `<br><br>Defense: ${item.getDefense()}<br>`;
        } 
        const equip_stats = item.getStats();
        Object.keys(equip_stats).forEach(function(effect_key) {

            if(equip_stats[effect_key].flat != null) {
                item_tooltip.innerHTML += 
                `<br>${capitalize_first_letter(effect_key).replace("_"," ")} +${equip_stats[effect_key].flat}`;
            }
            if(equip_stats[effect_key].multiplier != null) {
                item_tooltip.innerHTML += 
                `<br>${capitalize_first_letter(effect_key).replace("_"," ")} x${equip_stats[effect_key].multiplier}`;
        }
        });
    } 
    else if (item.item_type === "USABLE") {

        Object.keys(item.use_effect).forEach(function(effect) {

            item_tooltip.innerHTML += `<br><br>Increases ${effect.replace("_", " ")} by`;

            if(item.use_effect[effect].flat) {
                item_tooltip.innerHTML += ` +${item.use_effect[effect].flat}`;
                if(item.use_effect[effect].percent) {
                    item_tooltip.innerHTML += ` and +${item.use_effect[effect].percent}%`;
                }
            } else if(item.use_effect[effect].percent) {
                item_tooltip.innerHTML += ` +${item.use_effect[effect].percent}%`;
            }

            if(item.use_effect[effect].duration) {
                item_tooltip.innerHTML += ` for ${item.use_effect[effect].duration} ticks`;
            } else {
                item_tooltip.innerHTML += ` permanently`;
            }
        });
    } else if(item.item_type === "BOOK") {
        if(!book_stats[item.name].is_finished) {
            item_tooltip.innerHTML += `<br><br>Time to read: ${item.getRemainingTime()} minutes`;
        }
        else {
            item_tooltip.innerHTML += `<br><br>Reading it provided ${character.name} with:<br> ${format_rewards(book_stats[item.name].rewards)}`;
        }
    }

    item_tooltip.innerHTML += `<br><br>Value: ${format_money(round_item_price(item.getValue() * ((options && options.trader) ? traders[current_trader].getProfitMargin() : 1) || 1))}`;

    if(item.saturates_market) {
        item_tooltip.innerHTML += ` [originally ${format_money(round_item_price(item.getBaseValue() * ((options && options.trader) ? traders[current_trader].getProfitMargin() : 1) || 1))}]`
    }

    return item_tooltip;
}

function end_activity_animation() {
    clearInterval(activity_anim);
}

/**
 * writes message to the message log
 * @param {String} message_to_add text to display
 * @param {String} message_type used for adding proper class to html element
 */
 function log_message(message_to_add, message_type) {
    if(typeof message_to_add === 'undefined') {
        return;
    }

    let message = document.createElement("div");
    message.classList.add("message_common");

    let class_to_add = "message_default";
    let group_to_add = "message_events";

    //selects proper class to add based on argument
    switch(message_type) {
        case "enemy_defeated":
            class_to_add = "message_victory";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "hero_defeat":
            class_to_add = "message_hero_defeated";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "enemy_attacked":
            class_to_add = "message_enemy_attacked";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "enemy_attacked_critically":
            class_to_add = "message_enemy_attacked_critically";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "hero_attacked":
            class_to_add = "message_hero_attacked";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "hero_missed":
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "hero_blocked":
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;    
        case "enemy_missed":
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;    
        case "hero_attacked_critically":
            class_to_add = "message_hero_attacked_critically";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;

        case "combat_loot":
            class_to_add = "message_items_obtained";
            group_to_add = "message_loot";
            message_count.message_loot += 1;
            break;
        case "location_reward":
            group_to_add = "message_loot";
            message_count.message_loot += 1;
            break;

        case "skill_raised":
            class_to_add = "message_skill_leveled_up";
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;
        case "level_up":
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;
        case "activity_unlocked": 
            //currently uses default style class
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;
        case "location_unlocked":
            class_to_add = "message_location_unlocked";
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;
        case "dialogue_unlocked":
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;

        case "message_travel":
            class_to_add = "message_travel";
            group_to_add = "message_events";
            message_count.message_events += 1;
            break;
        case "activity_finished":
            group_to_add = "message_events";
            message_count.message_events += 1;
            break;
        case "activity_money":
            group_to_add = "message_events";
            message_count.message_events += 1;
            break;
        case "notification":
            message_count.message_events += 1;
            group_to_add = "message_events";
            class_to_add = "message_notification";
            break;
    }

    if(group_to_add === "message_combat" && message_count.message_combat > 80
    || group_to_add === "message_loot" && message_count.message_loot > 20
    || group_to_add === "message_unlocks" && message_count.message_unlocks > 40
    || group_to_add === "message_events" && message_count.message_events > 20
    ) {
        // find first child with specified group
        // delete it
        message_log.removeChild(message_log.getElementsByClassName(group_to_add)[0]);
    }

    message.classList.add(class_to_add, group_to_add);

    message.innerHTML = message_to_add + "<div class='message_border'> </>";

    message_log.appendChild(message);
    
    message_log.scrollTop = message_log.scrollHeight;

}

function format_rewards(rewards) {
    let formatted = '';
    if(rewards.stats) {
        const stats = Object.keys(rewards.stats);
        
        formatted = `+${rewards.stats[stats[0]]} ${stat_names[stats[0]]}`;
        for(let i = 1; i < stats.length; i++) {
            formatted += `, +${rewards.stats[stats[i]]} ${stat_names[stats[i]]}`;
        }
    }

    if(rewards.multipliers) {
        const multipliers = Object.keys(rewards.multipliers);
        if(formatted) {
            formatted += `, x${rewards.multipliers[multipliers[0]]} ${stat_names[multipliers[0]]}`;
        } else {
            formatted = `x${rewards.multipliers[multipliers[0]]} ${stat_names[multipliers[0]]}`;
        }
        for(let i = 1; i < multipliers.length; i++) {
            formatted += `, x${rewards.multipliers[multipliers[i]]} ${stat_names[multipliers[i]]}`;
        }
    }
    if(rewards.xp_multipliers) {
        const xp_multipliers = Object.keys(rewards.xp_multipliers);
        if(formatted) {
            formatted += `, x${rewards.xp_multipliers[xp_multipliers[0]]} ${xp_multipliers[0]} xp gain`;
        } else {
            formatted = `x${rewards.xp_multipliers[xp_multipliers[0]]} ${xp_multipliers[0]} xp gain`;
        }
        for(let i = 1; i < xp_multipliers.length; i++) {
            formatted += `, x${rewards.xp_multipliers[xp_multipliers[i]]} ${xp_multipliers[i]} xp gain`;
        }
    }
    return formatted;
}

function clear_message_log() {
    while(message_log.firstChild) {
        message_log.removeChild(message_log.lastChild);
    }
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

function start_activity_animation(settings) {
    activity_anim = setInterval(() => { //sets a tiny little "animation" for activity text
        const action_status_div = document.getElementById("action_status_div");
        let end = "";
        if(action_status_div.innerHTML.endsWith("...")) {
            end = "...";
        } else if(action_status_div.innerHTML.endsWith("..")) {
            end = "..";
        } else if(action_status_div.innerHTML.endsWith("."))
            end = ".";

        if(settings?.book_title) {
            action_status_div.innerHTML = action_status_div.innerHTML.split(",")[0] + `, ${format_reading_time(item_templates[settings.book_title].getRemainingTime())} left`;
            action_status_div.innerHTML += end;
        }

        if(end.length < 3){
            action_status_div.innerHTML += ".";
        } else {
            action_status_div.innerHTML = action_status_div.innerHTML.substring(0, action_status_div.innerHTML.length - 3);
        }
     }, 600);
}

function update_displayed_trader() {
    action_div.style.display = "none";
    trade_div.style.display = "inherit";
    document.getElementById("trader_cost_mult_value").textContent = `${Math.round(100 * (traders[current_trader].getProfitMargin()))}%`
    update_displayed_trader_inventory();
}

function update_displayed_money() {
    document.getElementById("money_div").innerHTML = `Your purse contains: ${format_money(character.money)}`;
}

function update_displayed_trader_inventory({trader_sorting} = {}) {
    const trader = traders[current_trader];
    trader_inventory_div.textContent = "";

    Object.keys(trader.inventory).forEach(function(key) {
        if(trader.inventory[key] instanceof Array) //unstackables
        { 
            for(let i = 0; i < trader.inventory[key].length; i++) {

                let should_continue = false;
                for(let j = 0; j < to_buy.items.length; j++) {
                    if(trader.inventory[key][i].getName() === to_buy.items[j].item.split(" #")[0] && i == Number(to_buy.items[j].item.split(" #")[1])) {
                        //checks if item is present in to_buy, if so then doesn't add it to displayed in this inventory
                        should_continue = true;
                        break;
                    }
                }
                if(should_continue) {
                    continue;
                }

                const item_control_div = document.createElement("div");
                const item_div = document.createElement("div");
                const item_name_div = document.createElement("div");

                item_name_div.innerHTML = `<span class="item_slot">[${trader.inventory[key][i].equip_slot}]</span><span>${trader.inventory[key][i].getName()}</span>`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
                item_div.classList.add("inventory_item", "trader_item");       

                //add tooltip
                item_div.appendChild(create_item_tooltip(trader.inventory[key][i], {trader: true}));

                item_control_div.classList.add('inventory_item_control', 'trader_item_control', `trader_item_${trader.inventory[key][i].item_type.toLowerCase()}`);
                item_control_div.setAttribute("data-trader_item", `${trader.inventory[key][i].getName()} #${i}`);
                item_control_div.setAttribute("data-item_value", `${trader.inventory[key][i].getValue()}`);
                item_control_div.appendChild(item_div);

                var item_value_span = document.createElement("span");
                item_value_span.innerHTML = `${format_money(round_item_price(trader.inventory[key][i].getValue() * trader.getProfitMargin()), true)}`;
                item_value_span.classList.add("item_value", "item_controls");
                item_control_div.appendChild(item_value_span);

                trader_inventory_div.appendChild(item_control_div);
            }
        } else //stackables
        {
            let item_count = trader.inventory[key].count;
            for(let i = 0; i < to_buy.items.length; i++) {
                
                if(trader.inventory[key].item.name === to_buy.items[i].item.split(" #")[0]) {
                    item_count -= Number(to_buy.items[i].count);

                    if(item_count == 0) {
                        return;
                    }
                    if(item_count < 0) {
                        throw 'Something is wrong with trader item count';
                    }

                    break;
                }
            }
            
            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");

            if(trader.inventory[key].item.item_type === "BOOK") {
                item_name_div.innerHTML = '<span class = "item_category">[Book] </span>';
                item_name_div.classList.add("inventory_item_name");
                item_name_div.innerHTML += `<span class = "book_name item_name">"${trader.inventory[key].item.name}"</span><span class="item_count">x${item_count} </span>`;

                if(book_stats[trader.inventory[key].item.name].is_finished) {
                    item_div.classList.add("book_finished");
                }
            } else {
                item_name_div.innerHTML = `<span class = "item_category"></span> <span class = "item_name">${trader.inventory[key].item.name}</span> <span class="item_count">x${item_count}</span>`;
            }
    
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add('item_stackable', "inventory_item", 'trader_item');

            const trade_button_5 = document.createElement("div");
            trade_button_5.classList.add("trade_ammount_button");
            trade_button_5.innerText = "5";
            trade_button_5.setAttribute("data-trade_ammount", 5);

            const trade_button_10 = document.createElement("div");
            trade_button_10.classList.add("trade_ammount_button");
            trade_button_10.innerText = "10";
            trade_button_10.setAttribute("data-trade_ammount", 10);

            item_div.appendChild(create_item_tooltip(trader.inventory[key].item, {trader: true}));


            item_control_div.classList.add('trader_item_control', 'inventory_item_control', `trader_item_${trader.inventory[key].item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-trader_item", `${trader.inventory[key].item.name}`);
            item_control_div.setAttribute("data-item_count", `${item_count}`);
            item_control_div.setAttribute("data-item_value", `${trader.inventory[key].item.getValue()}`);
            
            item_control_div.appendChild(item_div);
            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(round_item_price(trader.inventory[key].item.getValue() * trader.getProfitMargin()), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            trader_inventory_div.appendChild(item_control_div);
        }
    });
    
    for(let i = 0; i < to_sell.items.length; i++) {
        //add items from to_sell to display
        // to_sell only contains names, so need to browse character.inventory for items that match

        const item_index = Number(to_sell.items[i].item.split(" #")[1]);

        if(isNaN(item_index)) { //it's stackable, so item_count is needed
            const item_count = to_sell.items[i].count;
            const actual_item = character.inventory[to_sell.items[i].item].item;

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    
            item_name_div.innerHTML = `<span class="item_category"></span><span class="item_name">${actual_item.name}</span> x${item_count}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add('item_stackable', "inventory_item", 'trader_item');

            item_div.appendChild(create_item_tooltip(actual_item));

            const trade_button_5 = document.createElement("div");
            trade_button_5.classList.add("trade_ammount_button");
            trade_button_5.innerText = "5";
            trade_button_5.setAttribute("data-trade_ammount", 5);

            const trade_button_10 = document.createElement("div");
            trade_button_10.classList.add("trade_ammount_button");
            trade_button_10.innerText = "10";
            trade_button_10.setAttribute("data-trade_ammount", 10);

            item_control_div.classList.add('item_to_trade', 'trader_item_control', 'inventory_item_control', `trader_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-trader_item", `${actual_item.name}`);
            item_control_div.setAttribute("data-item_value", `${actual_item.getValue()}`);
            item_control_div.setAttribute("data-item_count", `${item_count}`);
            item_control_div.appendChild(item_div);

            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            trader_inventory_div.appendChild(item_control_div);
            
        } else { //it's unstackable, no need for item_count as it's always at 1

            const actual_item = character.inventory[to_sell.items[i].item.split(" #")[0]][item_index];

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");

            item_name_div.innerHTML = `<span class="item_slot">[${actual_item.equip_slot}] </span><span class="item_name">${actual_item.getName()}</span>`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);
            item_div.classList.add("inventory_item", "trader_item");

            //add tooltip
            item_div.appendChild(create_item_tooltip(actual_item));

            item_control_div.classList.add('item_to_trade', 'inventory_item_control', 'trader_item_control', `trader_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-trader_item", `${actual_item.getName()} #${item_index}`)
            item_control_div.setAttribute("data-item_value", `${actual_item.getValue()}`);
            item_control_div.appendChild(item_div);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            trader_inventory_div.appendChild(item_control_div);
        }
    }

    sort_displayed_inventory({sort_by: trader_sorting || "name", target: "trader"});
}

function sort_displayed_inventory({sort_by="name", target = "character", change_direction = false}) {

    /*
    if(change_direction){
        if(sort_by && sort_by === skill_sorting) {
            if(skill_sorting_direction === "asc") {
                skill_sorting_direction = "desc";
            } else {
                skill_sorting_direction = "asc";
            }
        } else {
            if(sort_by === "level") {
                skill_sorting_direction = "desc";
            } else {
                skill_sorting_direction = "asc";
            }
        }
    }
    */

    let plus;
    let minus;
    if(target === "trader") {

        if(change_direction){
            if(sort_by && sort_by === trader_inventory_sorting) {
                if(trader_inventory_sorting_direction === "asc") {
                    trader_inventory_sorting_direction = "desc";
                } else {
                    trader_inventory_sorting_direction = "asc";
                }
            } else {
                if(sort_by === "price") {
                    trader_inventory_sorting_direction = "desc";
                } else {
                    trader_inventory_sorting_direction = "asc";
                }
            }
        }

        target = trader_inventory_div;
        plus = trader_inventory_sorting_direction==="asc"?1:-1;
        minus = trader_inventory_sorting_direction==="asc"?-1:1;
        trader_inventory_sorting = sort_by || "name";

    } else if(target === "character") {

        if(change_direction){
            if(sort_by && sort_by === character_inventory_sorting) {
                if(character_inventory_sorting_direction === "asc") {
                    character_inventory_sorting_direction = "desc";
                } else {
                    character_inventory_sorting_direction = "asc";
                }
            } else {
                if(sort_by === "price") {
                    character_inventory_sorting_direction = "desc";
                } else {
                    character_inventory_sorting_direction = "asc";
                }
            }
        }

        target = inventory_div;
        plus = character_inventory_sorting_direction==="asc"?1:-1;
        minus = character_inventory_sorting_direction==="asc"?-1:1;
        character_inventory_sorting = sort_by || "name";
    }
    else {
        console.warn(`Something went wrong, no such inventory as '${target}'`);
        return;
    }

    [...target.children].sort((a,b) => {
        //equipped items on top
        if(a.classList.contains("equipped_item_control") && !b.classList.contains("equipped_item_control")) {
            return -1;
        } else if(!a.classList.contains("equipped_item_control") && b.classList.contains("equipped_item_control")){
            return 1;
        } 

        if(a.classList.contains("item_to_trade") && !b.classList.contains("item_to_trade")) {
            return 1;
        } else if(!a.classList.contains("item_to_trade") && b.classList.contains("item_to_trade")) {
            return -1;
        }

        if(a.classList.contains("character_item_equippable") && !b.classList.contains("character_item_equippable")) {
            return 1;
        } else if(!a.classList.contains("character_item_equippable") && b.classList.contains("character_item_equippable")){
            return -1;
        } 
        if(a.classList.contains("trader_item_equippable") && !b.classList.contains("trader_item_equippable")) {
            return 1;
        } else if(!a.classList.contains("trader_item_equippable") && b.classList.contains("trader_item_equippable")){
            return -1;
        } 
        //items being traded on bottom

        //other items by either name or otherwise by value

        if(sort_by === "name") {
            //if they are equippable, take in account the [slot] value displayed in front of item in inventory
            const name_a = a.children[0].children[0].children[1].innerText.toLowerCase().replaceAll('"',"");
            const name_b = b.children[0].children[0].children[1].innerText.toLowerCase().replaceAll('"',"");

            //prioritize displaying equipment below stackable items
            if(name_a[0] === '[' && name_b[0] !== '[') {
                return 1;
            } else if(name_a[0] !== '[' && name_b[0] === '[') {
                return -1;
            }
            else if(name_a > name_b) {
                return plus;
            } else {
                return minus;
            }

        } else if(sort_by === "price") {
            
            let value_a = Number.parseInt(a.getAttribute(`data-item_value`));
            let value_b = Number.parseInt(b.getAttribute(`data-item_value`));
            
            if(value_a > value_b) {
                return plus;
            } else {
                return minus;
            }
        }

    }).forEach(node => target.appendChild(node));
}

/**
 * updates displayed inventory of the character (only inventory, worn equipment is managed by separate method)
 * 
 * if item_name is passed, it will instead only update the display of that one item
 * 
 * currently item_name is only used for books
 */
 function update_displayed_character_inventory({item_name, character_sorting="name", sorting_direction="asc"} = {}) {    

    if(item_name) {
        //recreate only one node
        const node = inventory_div.querySelector(`[data-character_item="${item_name}"]`);
        if(node) {
            node.remove();
        } else {
            return;
        }
    } else {
        //recreate all
        inventory_div.innerHTML = "";
    }

    Object.keys(character.inventory).forEach(function(key) {
        if(item_name) {
            if(key !== item_name) {
                return;
            }
        }

        if(character.inventory[key] instanceof Array) //unstackables
        { 
            for(let i = 0; i < character.inventory[key].length; i++) {
                
                let should_continue = false;
                for(let j = 0; j < to_sell.items.length; j++) {
                    if(character.inventory[key][i].getName() === to_sell.items[j].item.split(" #")[0] && i == Number(to_sell.items[j].item.split(" #")[1])) {
                        //checks if item is present in to_sell, if so then doesn't add it to displayed in this inventory
                        should_continue = true;
                        break;
                    }
                }
                if(should_continue) {
                    continue;
                }

                const item_control_div = document.createElement("div");
                const item_div = document.createElement("div");
                const item_name_div = document.createElement("div");

                item_name_div.innerHTML = `<span class = "item_slot" >[${character.inventory[key][i].equip_slot}]</span> <span>${character.inventory[key][i].getName()}</span>`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
    
                item_div.classList.add("inventory_item", "character_item", `item_${character.inventory[key][i].item_type.toLowerCase()}`);

                item_control_div.setAttribute("data-character_item", `${character.inventory[key][i].getName()} #${i}`)
                item_control_div.setAttribute("data-item_value", `${character.inventory[key][i].getValue()}`);
                //shouldnt create any problems, as any change to inventory will also call this method, 
                //so removing/equipping any item wont cause mismatch

                item_div.appendChild(create_item_tooltip(character.inventory[key][i]));
                item_control_div.classList.add('inventory_item_control', 'character_item_control', `character_item_${character.inventory[key][i].item_type.toLowerCase()}`);
                item_control_div.appendChild(item_div);

                
                var item_equip_span = document.createElement("span");
                item_equip_span.innerHTML = "[equip]";
                item_equip_span.classList.add("equip_item_button", "item_controls");
                item_control_div.appendChild(item_equip_span);

                var item_value_span = document.createElement("span");

                item_value_span.innerHTML = `${format_money(character.inventory[key][i].getValue(), true)}`;
                item_value_span.classList.add("item_value", "item_controls");
                item_control_div.appendChild(item_value_span);
                
                inventory_div.appendChild(item_control_div);
            }
        } else //stackables
        {
            let item_count = character.inventory[key].count;
            for(let i = 0; i < to_sell.items.length; i++) {
                
                if(character.inventory[key].item.name === to_sell.items[i].item.split(" #")[0]) {
                    item_count -= Number(to_sell.items[i].count);

                    if(item_count == 0) {
                        return;
                    }
                    if(item_count < 0) {
                        throw 'Something is wrong with character item count';
                    }

                    break;
                }
            }

            var item_control_div = document.createElement("div");
            var item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    
            if(character.inventory[key].item.item_type === "BOOK") {
                item_name_div.innerHTML = '<span class = "item_category">[Book] </span>';
                item_name_div.classList.add("inventory_item_name");
                item_name_div.innerHTML += `<span class = "book_name item_name">"${character.inventory[key].item.name}"</span><span class="item_count">x${item_count} </span>`;

                if(book_stats[character.inventory[key].item.name].is_finished) {
                    item_div.classList.add("book_finished");
                } else if(get_current_book() === character.inventory[key].item.name) {
                    item_control_div.classList.add("book_active");
                }
            } else {
                item_name_div.innerHTML = `<span class = "item_category"></span> <span class = "item_name">${character.inventory[key].item.name}</span> <span class="item_count">x${item_count}</span>`;
            }
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add("inventory_item", 'character_item', 'item_stackable', `item_${character.inventory[key].item.item_type.toLowerCase()}`);

            item_div.appendChild(create_item_tooltip(character.inventory[key].item));

            const trade_button_5 = document.createElement("div");
            trade_button_5.classList.add("trade_ammount_button");
            trade_button_5.innerText = "5";
            trade_button_5.setAttribute("data-trade_ammount", 5);

            const trade_button_10 = document.createElement("div");
            trade_button_10.classList.add("trade_ammount_button");
            trade_button_10.innerText = "10";
            trade_button_10.setAttribute("data-trade_ammount", 10);

            item_control_div.classList.add('inventory_item_control', 'character_item_control', `character_item_${character.inventory[key].item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-character_item", `${character.inventory[key].item.name}`)
            item_control_div.setAttribute("data-item_count", `${item_count}`)
            item_control_div.setAttribute("data-item_value", `${character.inventory[key].item.getValue()}`);
            item_control_div.appendChild(item_div);

            if(character.inventory[key].item.item_type === "USABLE") {
                const item_use_button = document.createElement("div");
                item_use_button.classList.add("item_use_button");
                item_use_button.innerText = "[use]";
                item_control_div.appendChild(item_use_button);
            } else if(character.inventory[key].item.item_type === "BOOK") {
                const item_read_button = document.createElement("div");
                item_read_button.classList.add("item_use_button");
                item_read_button.innerText = "[read]";
                item_control_div.appendChild(item_read_button);

                item_div.classList.add("item_book");
            }

            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(character.inventory[key].item.getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            inventory_div.appendChild(item_control_div);
        }

    });

    //equipped items
    Object.keys(character.equipment).forEach(function(key) {
        if(item_name) {
            if(key !== item_name) {
                return;
            }
        }
        const item = character.equipment[key];
        if(item) {
            var item_control_div = document.createElement("div");
            var item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    

            item_name_div.innerHTML = `<span>[${item.equip_slot}]</span> <span>${item.getName()}</span>`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add("inventory_equipped_item");

            item_control_div.setAttribute("data-character_item", `${item.getName()} #${key}`)
            item_control_div.setAttribute("data-item_value", `${item.getValue()}`);

            item_div.appendChild(create_item_tooltip(item));
            item_control_div.classList.add("equipped_item_control", `character_item_${item.item_type.toLowerCase()}`);
            item_control_div.appendChild(item_div);

            var item_unequip_div = document.createElement("div");
            item_unequip_div.innerHTML = "[take off]";
            item_unequip_div.classList.add("unequip_item_button", "item_controls");
            item_control_div.appendChild(item_unequip_div);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(character.equipment[key].getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            inventory_div.appendChild(item_control_div);
        }
    });

    
    if(!item_name){
    //add items from to_buy to display
        for(let i = 0; i < to_buy.items.length; i++) {
            
            const item_index = Number(to_buy.items[i].item.split(" #")[1]);

            if(isNaN(item_index)) { //it's stackable, so item_count is needed
                const item_count = to_buy.items[i].count;
                const actual_item = traders[current_trader].inventory[to_buy.items[i].item].item;

                const item_control_div = document.createElement("div");
                const item_div = document.createElement("div");
                const item_name_div = document.createElement("div");
        
                item_name_div.innerHTML = `<span class="item_category"></span><span class="item_name">${actual_item.name}</span><span> x${item_count}</span>`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);

                item_div.classList.add('item_stackable', "inventory_item", 'character_item');

                item_div.appendChild(create_item_tooltip(actual_item, {trader: true}));

                const trade_button_5 = document.createElement("div");
                trade_button_5.classList.add("trade_ammount_button");
                trade_button_5.innerText = "5";
                trade_button_5.setAttribute("data-trade_ammount", 5);

                const trade_button_10 = document.createElement("div");
                trade_button_10.classList.add("trade_ammount_button");
                trade_button_10.innerText = "10";
                trade_button_10.setAttribute("data-trade_ammount", 10);

                item_control_div.classList.add('item_to_trade', 'character_item_control', 'inventory_item_control', `character_item_${actual_item.item_type.toLowerCase()}`);
                item_control_div.setAttribute("data-character_item", `${actual_item.name}`);
                item_control_div.setAttribute("data-item_count", `${item_count}`);
                item_control_div.setAttribute("data-item_value", `${actual_item.getValue()}`);
                item_control_div.appendChild(item_div);

                item_control_div.appendChild(trade_button_5);
                item_control_div.appendChild(trade_button_10);

                var item_value_span = document.createElement("span");
                item_value_span.innerHTML = `${format_money(round_item_price(actual_item.getValue() * traders[current_trader].getProfitMargin()), true)}`;
                item_value_span.classList.add("item_value", "item_controls");
                item_control_div.appendChild(item_value_span);

                inventory_div.appendChild(item_control_div);
                
            } else { //it's unstackable, no need for item_count as it's always at 1

                const actual_item = traders[current_trader].inventory[to_buy.items[i].item.split(" #")[0]][item_index];

                const item_control_div = document.createElement("div");
                const item_div = document.createElement("div");
                const item_name_div = document.createElement("div");

                item_name_div.innerHTML = `<span class="item_slot">[${item_templates[actual_item.getName()].equip_slot}] </span><span>${actual_item.getName()}</span>`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
                item_div.classList.add("inventory_item", "character_item", "trade_item_equippable",);       

                //add tooltip
                item_div.appendChild(create_item_tooltip(actual_item, {trader: true}));

                item_control_div.classList.add('item_to_trade', 'inventory_item_control', 'character_item_control', `character_item_${actual_item.item_type.toLowerCase()}`);
                item_control_div.setAttribute("data-character_item", `${actual_item.getName()} #${item_index}`)
                item_control_div.setAttribute("data-item_value", `${actual_item.getValue()}`);
                item_control_div.appendChild(item_div);

                var item_value_span = document.createElement("span");
                item_value_span.innerHTML = `${format_money(round_item_price(actual_item.getValue() * traders[current_trader].getProfitMargin()/10)*10, true)}`;
                item_value_span.classList.add("item_value", "item_controls");
                item_control_div.appendChild(item_value_span);

                inventory_div.appendChild(item_control_div);
            }
        }
    }

    sort_displayed_inventory({target: "character", sort_by: character_sorting, direction: sorting_direction});
}

/**
 * updates the displayed worn items + attaches tooltips
 */
function update_displayed_equipment() {
    Object.keys(equipment_slots_divs).forEach(function(key) {
        var eq_tooltip; 

        if(character.equipment[key] == null) { //no item in slot
            eq_tooltip = document.createElement("span");
            eq_tooltip.classList.add("item_tooltip");
            equipment_slots_divs[key].innerHTML = `${key} slot`;
            equipment_slots_divs[key].classList.add("equipment_slot_empty");
            eq_tooltip.innerHTML = `Your ${key} slot`;
        }
        else 
        {
            equipment_slots_divs[key].innerHTML = character.equipment[key].getName();
            equipment_slots_divs[key].classList.remove("equipment_slot_empty");

            eq_tooltip = create_item_tooltip(character.equipment[key]);
        }
        equipment_slots_divs[key].appendChild(eq_tooltip);
    });
}

/**
 * sets visibility of divs for enemies (based on how many there are in current combat),
 * and enemies' AP / EP
 * 
 * called when new enemies get loaded
 */
function update_displayed_enemies() {
    for(let i = 0; i < 8; i++) { //go to max enemy count
        if(i < current_enemies.length) {
            enemies_div.children[i].children[0].style.display = null;
            enemies_div.children[i].children[0].children[0].innerHTML = current_enemies[i].name;

            let disp_speed;

            if(current_enemies[i].stats.attack_speed > 20) {
                disp_speed = Math.round(current_enemies[i].stats.attack_speed);
            } else if (current_enemies[i].stats.attack_speed > 2) {
                disp_speed = Math.round(current_enemies[i].stats.attack_speed*10)/10;
            } else {
                disp_speed = Math.round(current_enemies[i].stats.attack_speed*100)/100;
            }

            let hero_hit_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/4); // down to ~ 60% if there's full 8 enemies
            if(current_enemies[i].size === "small") {
                hero_hit_chance_modifier *= skills["Pest killer"].get_coefficient("multiplicative");
            }

            let hero_evasion_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/3); //down to .5 if there's full 8 enemies (multiple attackers make it harder to evade attacks)
            if(current_enemies[i].size === "large") {
                hero_evasion_chance_modifier *= skills["Giant slayer"].get_coefficient("multiplicative");
            }
        
            const evasion_chance = 1 - get_hit_chance(character.combat_stats.attack_points, current_enemies[i].stats.agility * Math.sqrt(current_enemies[i].stats.intuition ?? 1)) * hero_hit_chance_modifier;
            let hit_chance = get_hit_chance(current_enemies[i].stats.dexterity * Math.sqrt(current_enemies[i].stats.intuition ?? 1), character.combat_stats.evasion_points) / hero_evasion_chance_modifier;

            if(character.equipment["off-hand"]?.offhand_type === "shield") { //has shield
                hit_chance = 1;
            }

            //enemies_div.children[i].children[0].children[1].innerHTML = `AP : ${Math.round(ap)} | EP : ${Math.round(ep)}`;
            enemies_div.children[i].children[0].children[1].children[0].innerHTML = `Atk pwr: ${current_enemies[i].stats.attack}`;
            enemies_div.children[i].children[0].children[1].children[1].innerHTML = `Atk spd: ${disp_speed}`;
            enemies_div.children[i].children[0].children[1].children[2].innerHTML = `Hit: ${Math.min(100,Math.max(0,Math.round(100*hit_chance)))}%`; //100% if shield!
            enemies_div.children[i].children[0].children[1].children[3].innerHTML = `Ddg: ${Math.min(100,Math.max(0,Math.round(100*evasion_chance)))}%`;
            enemies_div.children[i].children[0].children[1].children[4].innerHTML = `Def: ${current_enemies[i].stats.defense}`;

        } else {
            enemies_div.children[i].children[0].style.display = "none"; //just hide it
        }     
    }
}

/**
 * updates displayed health and healthbars of enemies
 */
function update_displayed_health_of_enemies() {
    for(let i = 0; i < current_enemies.length; i++) {
        if(current_enemies[i].is_alive) {
            enemies_div.children[i].children[0].style.filter = "brightness(100%)";
        } else {
            enemies_div.children[i].children[0].style.filter = "brightness(30%)";
            update_displayed_enemies();
        }

        //update size of health bar
        enemies_div.children[i].children[0].children[2].children[0].children[0].style.width = 
            Math.max(0, 100*current_enemies[i].stats.health/current_enemies[i].stats.max_health) + "%";

            enemies_div.children[i].children[0].children[2].children[1].innerText = `${Math.ceil(current_enemies[i].stats.health)}/${Math.ceil(current_enemies[i].stats.max_health)} hp`;

    }
}

function update_displayed_normal_location(location) {
    clear_action_div();
    location_types_div.innerHTML = "";
    combat_div.style.display = "none";
    location_tooltip.innerText = "";

    enemy_count_div.style.display = "none";
    document.documentElement.style.setProperty('--actions_div_height', getComputedStyle(document.body).getPropertyValue('--actions_div_height_default'));
    document.documentElement.style.setProperty('--actions_div_top', getComputedStyle(document.body).getPropertyValue('--actions_div_top_default'));
    character_attack_bar.parentNode.style.display = "none";
    
    ////////////////////////////////////
    //add buttons for starting dialogues

    const available_dialogues = location.dialogues.filter(dialogue => dialogues[dialogue].is_unlocked && !dialogues[dialogue].is_finished);

    if(available_dialogues.length > 2) {
        //there's multiple -> add a choice to location actions that will show all available dialogues        
        const dialogues_button = document.createElement("div");
        dialogues_button.setAttribute("data-location", location.name);
        dialogues_button.classList.add("location_choices");
        dialogues_button.setAttribute("onclick", 'update_displayed_location_choices({location_name: this.getAttribute("data-location"), category: "talk"})');
        dialogues_button.innerHTML = '<i class="material-icons">format_list_bulleted</i>  Talk to someone';
        action_div.appendChild(dialogues_button);
    } else if (available_dialogues.length <= 2) {
        //there's only 1 -> put it in overall location choice list
        action_div.append(...create_location_choices({location: location, category: "talk"}));
    }

    /////////////////////////
    //add buttons for trading

    const available_traders = location.traders.filter(trader => traders[trader].is_unlocked);

    if(available_traders.length > 2) {     
        const traders_button = document.createElement("div");
        traders_button.setAttribute("data-location", location.name);
        traders_button.classList.add("location_choices");
        traders_button.setAttribute("onclick", 'update_displayed_location_choices({location_name: this.getAttribute("data-location"), category: "trade"})');
        traders_button.innerHTML = '<i class="material-icons">format_list_bulleted</i>  Visit a merchant';
        action_div.appendChild(traders_button);
    } else if (available_traders.length <= 2) {
        action_div.append(...create_location_choices({location: location, category: "trade"}));
    }

    ///////////////////////////
    //add buttons to start jobs

    const available_jobs = Object.values(location.activities).filter(activity => activities[activity.activity].type === "JOB" 
                                                                    && activities[activity.activity].is_unlocked
                                                                    && activity.is_unlocked);

    if(available_jobs.length > 2) {     
        const jobs_button = document.createElement("div");
        jobs_button.setAttribute("data-location", location.name);
        jobs_button.classList.add("location_choices");
        jobs_button.setAttribute("onclick", 'update_displayed_location_choices({location_name: this.getAttribute("data-location"), category: "work"})');
        jobs_button.innerHTML = '<i class="material-icons">format_list_bulleted</i>  Find some work';
        action_div.appendChild(jobs_button);
    } else if (available_jobs.length <= 2) {
        action_div.append(...create_location_choices({location: location, category: "work"}));
    }

    ///////////////////////////////
    //add buttons to start training

    const available_trainings = Object.values(location.activities).filter(activity => activities[activity.activity].type === "TRAINING" 
                                                                    && activities[activity.activity].is_unlocked
                                                                    && activity.is_unlocked);
    if(available_trainings.length > 2) {     
        const trainings_button = document.createElement("div");
        trainings_button.setAttribute("data-location", location.name);
        trainings_button.classList.add("location_choices");
        trainings_button.setAttribute("onclick", 'update_displayed_location_choices({location_name: this.getAttribute("data-location"), category: "train"})');
        trainings_button.innerHTML = '<i class="material-icons">format_list_bulleted</i>  Train for a bit';
        action_div.appendChild(trainings_button);
    } else if (available_trainings.length <= 2) {
        action_div.append(...create_location_choices({location: location, category: "train"}));
    }

    ///////////////////////////
    //add button to go to sleep

    if(location.sleeping) { 
        const start_sleeping_div = document.createElement("div");
        
        start_sleeping_div.innerHTML = '<i class="material-icons">bed</i>  ' + location.sleeping.text;
        start_sleeping_div.id = "start_sleeping_div";
        start_sleeping_div.setAttribute('onclick', 'start_sleeping()');

        action_div.appendChild(start_sleeping_div);
    }
    
    /////////////////////////////////
    //add butttons to change location

    const available_locations = location.connected_locations.filter(location => location.location.is_unlocked);

    if(available_locations.length > 3 && (location.sleeping + available_trainings.length + available_jobs.length +  available_traders.length + available_dialogues.length) > 2) {
        const locations_button = document.createElement("div");
        locations_button.setAttribute("data-location", location.name);
        locations_button.classList.add("location_choices");
        locations_button.setAttribute("onclick", 'update_displayed_location_choices({location_name: this.getAttribute("data-location"), category: "travel"});');
        locations_button.innerHTML = '<i class="material-icons">format_list_bulleted</i>  Move somewhere else';
        action_div.appendChild(locations_button);
    } else if(available_locations.length > 0) {
        action_div.append(...create_location_choices({location: location, category: "travel"}));
    }

    location_name_span.innerText = current_location.name;
    document.getElementById("location_description_div").innerText = current_location.description;
}

/**
 * 
 * @param {*} location 
 * @param {*} category 
 * @return {Array} an array of html nodes presenting the available choices
 */
function create_location_choices({location, category, add_icons = true, is_combat = false}) {
    let choice_list = [];
    
    if(category === "talk") {
        for(let i = 0; i < location.dialogues.length; i++) { 
            if(!dialogues[location.dialogues[i]].is_unlocked || dialogues[location.dialogues[i]].is_finished) { //skip if dialogue is not available
                continue;
            } 
            
            const dialogue_div = document.createElement("div");
    
            //if(Object.keys(dialogues[location.dialogues[i]].textlines).length > 0) { //has any textlines
                
            dialogue_div.innerHTML = add_icons ? `<i class="material-icons">question_answer</i>  ` : "";
            dialogue_div.innerHTML += dialogues[location.dialogues[i]].starting_text;
            dialogue_div.classList.add("start_dialogue");
            dialogue_div.setAttribute("data-dialogue", location.dialogues[i]);
            dialogue_div.setAttribute("onclick", "start_dialogue(this.getAttribute('data-dialogue'));");
            choice_list.push(dialogue_div);
            //}
        }
    } else if (category === "trade") {
        for(let i = 0; i < location.traders.length; i++) { 
            if(!traders[location.traders[i]].is_unlocked) { //skip if trader is not available
                continue;
            } 
            
            const trader_div = document.createElement("div");  

            trader_div.innerHTML = add_icons ? `<i class="material-icons">storefront</i>   ` : "";
            trader_div.innerHTML += traders[location.traders[i]].trade_text;
            trader_div.classList.add("start_trade");
            trader_div.setAttribute("data-trader", location.traders[i]);
            trader_div.setAttribute("onclick", "startTrade(this.getAttribute('data-trader'));");
            choice_list.push(trader_div);
        }
    } else if (category === "work") {
        Object.keys(location.activities).forEach(key => {
            if(!activities[location.activities[key].activity]?.is_unlocked 
                || !location.activities[key]?.is_unlocked 
                || activities[location.activities[key].activity].type === "TRAINING") 
            {
                return;
            }
            
            const activity_div = document.createElement("div");

            activity_div.innerHTML = `<i class="material-icons">construction</i>  `;
            activity_div.classList.add("activity_div");
            activity_div.setAttribute("data-activity", key);
            activity_div.setAttribute("onclick", "start_activity(this.getAttribute('data-activity'));");

            if(can_work(location.activities[key])) {
                activity_div.classList.add("start_activity");
            } else {
                activity_div.classList.add("activity_unavailable");
            }

            const job_tooltip = document.createElement("div");
            job_tooltip.classList.add("job_tooltip");
            if(!location.activities[key].infinite){
                job_tooltip.innerHTML = `Available from ${location.activities[key].availability_time.start} to ${location.activities[key].availability_time.end} <br>`;
            }
            job_tooltip.innerHTML += `Pays ${format_money(location.activities[key].get_payment())} per every ` +  
                    `${format_time({time: {minutes: location.activities[key].working_period}})} worked`;
            


            activity_div.appendChild(job_tooltip);
    
            activity_div.innerHTML += location.activities[key].starting_text;
            choice_list.push(activity_div);
        });
    } else if (category === "train") {
        Object.keys(location.activities).forEach(key => {
            if(!activities[location.activities[key].activity]?.is_unlocked 
                || !location.activities[key]?.is_unlocked 
                || activities[location.activities[key].activity].type === "JOB") 
            {
                return;
            }

            const activity_div = document.createElement("div");

            activity_div.innerHTML = `<i class="material-icons">fitness_center</i>  `;
            activity_div.classList.add("activity_div", "start_activity");
            activity_div.setAttribute("data-activity", key);
            activity_div.setAttribute("onclick", "start_activity(this.getAttribute('data-activity'));");
    
            activity_div.innerHTML += location.activities[key].starting_text;
            choice_list.push(activity_div);
        });
    } else if (category === "travel") {
        if(!is_combat){
            for(let i = 0; i < location.connected_locations.length; i++) { 

                if(location.connected_locations[i].location.is_unlocked == false) { //skip if not unlocked
                    continue;
                }

                const action = document.createElement("div");
                
                if("connected_locations" in location.connected_locations[i].location) {// check again if connected location is normal or combat
                    action.classList.add("travel_normal");
                    if("custom_text" in location.connected_locations[i]) {
                        action.innerHTML = `<i class="material-icons">directions</i>  ` + location.connected_locations[i].custom_text;
                    }
                    else {
                        action.innerHTML = `<i class="material-icons">directions</i>  ` + "Go to " + location.connected_locations[i].location.name;
                    }
                } else {
                    action.classList.add("travel_combat");
                    if("custom_text" in location.connected_locations[i]) {
                        action.innerHTML = `<i class="material-icons">warning_amber</i>  ` + location.connected_locations[i].custom_text;
                    }
                    else {
                        action.innerHTML = `<i class="material-icons">warning_amber</i>  ` + "Enter the " + location.connected_locations[i].location.name;
                    }
                }
            
                action.classList.add("action_travel");
                action.setAttribute("data-travel", location.connected_locations[i].location.name);
                action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");
        
                choice_list.push(action);
            } 

            if(last_combat_location && location.connected_locations.filter(loc => loc.location.name === last_combat_location).length == 0) {
                const last_combat = locations[last_combat_location];
                const action = document.createElement("div");
                action.classList.add("travel_combat");
                
                action.innerHTML = `<i class="material-icons">warning_amber</i>  Quick return to [${last_combat.name}]`;
                
                action.classList.add("action_travel");
                action.setAttribute("data-travel", last_combat.name);
                action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");
        
                choice_list.push(action);
            }
        } else {
            const action = document.createElement("div");
            action.classList.add("travel_normal", "action_travel");
            if(location.leave_text) {
                action.innerHTML = `<i class="material-icons">directions</i>  ` + location.leave_text;
            } else {
                action.innerHTML = `<i class="material-icons">directions</i>  ` + "Go back to " + location.parent_location.name;
            }
            action.setAttribute("data-travel", location.parent_location.name);
            action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");

            choice_list.push(action);
        }

        if(last_location_with_bed && !location.sleeping && (!location.connected_locations || location?.connected_locations?.filter(loc => loc.location.name === last_location_with_bed).length == 0)) {
            const last_bed = locations[last_location_with_bed];

            const action = document.createElement("div");
            action.classList.add("travel_normal");
            
            action.innerHTML = `<i class="material-icons">directions</i> Quick return to [${last_bed.name}]`;
            
            action.classList.add("action_travel");
            action.setAttribute("data-travel", last_bed.name);
            action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");
    
            choice_list.push(action);
        }

        choice_list.sort((a,b) => b.classList.contains("travel_normal") - a.classList.contains("travel_normal"));
    }

    return choice_list;
}

function update_displayed_location_choices({location_name, category, add_icons, is_combat}) {
    action_div.replaceChildren(...create_location_choices({location: locations[location_name], category: category, add_icons: add_icons, is_combat: is_combat}));
    const return_button = document.createElement("div");
    return_button.innerHTML = "<i class='material-icons'>arrow_back</i> Return";
    return_button.setAttribute("onclick", "reload_normal_location()");
    return_button.classList.add("choices_return_button");
    action_div.appendChild(return_button);
}

function update_displayed_combat_location(location) {

    clear_action_div();
    location_types_div.innerHTML = "";
    let action;

    enemy_count_div.style.display = "block";
    combat_div.style.display = "block";
    character_attack_bar.parentNode.style.display = "block";

    document.documentElement.style.setProperty('--actions_div_height', getComputedStyle(document.body).getPropertyValue('--actions_div_height_combat'));
    document.documentElement.style.setProperty('--actions_div_top', getComputedStyle(document.body).getPropertyValue('--actions_div_top_combat'));


    enemy_count_div.children[0].children[1].innerHTML = location.enemy_count - location.enemy_groups_killed % location.enemy_count;

    action = create_location_choices({location: location, category: "travel", is_combat: true});

    action_div.append(...action);


    location_name_span.innerText = current_location.name;
    //ADD tooltip with description to this!

    location_tooltip.innerText = current_location.description;
    location_tooltip.classList.add("location_tooltip");
    
    document.getElementById("location_description_div").innerText = current_location.description;

    //add location types to display
    for(let i = 0; i < current_location.types?.length; i++) {
        const type_div = document.createElement("div");
        type_div.innerHTML = current_location.types[i].type;
        type_div.classList.add("location_type_div");

        const type_tooltip = document.createElement("div");
        type_tooltip.innerHTML = location_types[current_location.types[i].type].stages[current_location.types[i].stage].description;
        type_tooltip.classList.add("location_type_tooltip");

        type_div.appendChild(type_tooltip);
        location_types_div.appendChild(type_div);
    }
}

function update_displayed_health() { //call it when using healing items, resting or getting hit
    current_health_value_div.innerText = (Math.round(character.stats.full.health*10)/10) + "/" + character.stats.full.max_health + " hp";
    current_health_bar.style.width = (character.stats.full.health*100/character.stats.full.max_health).toString() +"%";
}
function update_displayed_stamina() { //call it when eating, resting or fighting
    current_stamina_value_div.innerText = Math.round(character.stats.full.stamina) + "/" + Math.round(character.stats.full.max_stamina) + " stamina";
    current_stamina_bar.style.width = (character.stats.full.stamina*100/character.stats.full.max_stamina).toString() +"%";
}

function update_displayed_stats() { //updates displayed stats

    Object.keys(stats_divs).forEach(function(key){
        if(key === "crit_rate" || key === "crit_multiplier") {
            stats_divs[key].innerHTML = `${(character.stats.full[key]*100).toFixed(1)}%`;
        } 
        else if(key === "attack_speed") {
            stats_divs[key].innerHTML = `${(character.get_attack_speed()).toFixed(1)}`;
        }
        else if(key === "attack_power") {
            stats_divs[key].innerHTML = `${(character.get_attack_power()).toFixed(1)}`;
        }
        else {
            stats_divs[key].innerHTML = `${(character.stats.full[key]).toFixed(1)}`;
        }
    });
}

function update_displayed_combat_stats() {
    const attack_stats = document.getElementById("attack_stats");

    const ap = Math.round(character.combat_stats.attack_points);
    other_combat_divs.offensive_points.innerHTML = `${ap}`;

    if(character.equipment["off-hand"] != null && character.equipment["off-hand"].offhand_type === "shield") { //HAS SHIELD
        const dp = (character.combat_stats.block_chance*100).toFixed(1)
        other_combat_divs.defensive_action.innerHTML = "Block :";
        other_combat_divs.defensive_points.innerHTML = `${dp}%`;
        other_combat_divs.defensive_points.parentNode.children[2].innerHTML = "Chance to block an attack";

        attack_stats.children[3].innerHTML = `Block : ${Math.round(dp)}%`;
    }
    else { //NO SHIELD
        const ep = Math.round(character.combat_stats.evasion_points);
        other_combat_divs.defensive_action.innerHTML = "EP : ";
        other_combat_divs.defensive_points.innerHTML = `${ep}`;
        other_combat_divs.defensive_points.parentNode.children[2].innerHTML = 
        "Evasion points, a total value of everything that contributes to the evasion chance, except for some situational skills and modifiers";

        attack_stats.children[3].innerHTML = `EP: ${Math.round(ep)} `;
    }

    attack_stats.children[0].innerHTML = `Atk pwr: ${Math.round(character.get_attack_power()*10)/10}`;
    attack_stats.children[1].innerHTML = `Atk spd: ${Math.round(character.get_attack_speed()*100)/100}`;
    attack_stats.children[2].innerHTML = `AP  ${Math.round(ap)}`;
    attack_stats.children[4].innerHTML = `Def: ${Math.round(character.stats.full.defense)} `;
}

function update_displayed_effects() {
    const effect_count = Object.keys(active_effects).length;
    active_effect_count.innerText = effect_count;
    if(effect_count > 0) {
        active_effects_tooltip.innerHTML = '';
        Object.keys(active_effects).forEach(function(effect) {
            const effect_div = document.createElement("div");
            const effect_desc_div = document.createElement("div");
            const effect_duration_div = document.createElement("div");

            effect_desc_div.innerText = `${capitalize_first_letter(effect.replace("_", " "))} +${active_effects[effect].flat}`;

            effect_duration_div.innerText = active_effects[effect].duration;

            effect_div.appendChild(effect_desc_div);
            effect_div.append(effect_duration_div);
            active_effects_tooltip.appendChild(effect_div);
        });
    } else {
        active_effects_tooltip.innerHTML = 'No active effects';
    }
    update_displayed_effect_durations();
}

function update_displayed_effect_durations() {
    //it just iterates over all tooltips and decreases their durations by 1
    //later on might instead make another function for it and call it here
    for(let i = 0; i < active_effects_tooltip.children.length; i++) {
        active_effects_tooltip.children[i].children[1].innerText = Number(active_effects_tooltip.children[i].children[1].innerText) - 1;
    }

}

function update_displayed_time() {
    time_field.innerHTML = current_game_time.toString();
}

/** 
 * formats money to a nice string in form x..x G xx S xx C (gold/silver/copper) 
 * @param {Number} num value to be formatted
 * @param {Boolean} round if the value should be rounded a bit
 */
function format_money(num) {
    let value;
    const sign = num >= 0 ? '' : '-';
    num = Math.abs(num);
    
    if(num > 0) {
        value = (num%10 != 0 ? `${num%10}<span class="coin coin_wood">W</span>` : '');

        if(num > 9) {
            value = (Math.floor(num/10)%100 != 0?`${Math.floor(num/10)%100}<span class="coin coin_copper">C</span> ` :'') + value;
            if(num > 999) {
                value = (Math.floor(num/1000)%100 != 0?`${Math.floor(num/1000)%100}<span class="coin coin_silver">S</span> ` :'') + value;
                if(num > 99999) {
                    value = `${Math.floor(num/100000)}<span class="coin coin_gold">G</span> ` + value;
                }
            
            }  
        }

        return sign + value;

    } else {
        return 'nothing';
    }
}

function update_displayed_character_xp(did_level = false) {
    /*
    character_xp_div
        character_xp_bar_max
            character_xp_bar_current
        charaxter_xp_value
    */
    character_xp_div.children[0].children[0].style.width = `${100*character.xp.current_xp/character.xp.xp_to_next_lvl}%`;
    character_xp_div.children[1].innerText = `${Math.floor(character.xp.current_xp)}/${Math.ceil(character.xp.xp_to_next_lvl)} xp`;

    if(did_level) {
        character_level_div.innerText = `Level: ${character.xp.current_level}`;
        update_displayed_health();
    }
}

function update_displayed_xp_bonuses() {
    data_entry_divs.character.innerHTML = `<span class="data_entry_name">Base hero xp gain:</span><span class="data_entry_value">x${Math.round(100*get_hero_xp_gain())/100}</span>`;
    data_entry_divs.skills.innerHTML = `<span class="data_entry_name">Base skill xp gain:</span><span class="data_entry_value">x${Math.round(100*get_skills_overall_xp_gain())/100}</span>`;
}

function update_displayed_dialogue(dialogue_key) {
    const dialogue = dialogues[dialogue_key];
    
    clear_action_div();
    
    const dialogue_answer_div = document.createElement("div");
    dialogue_answer_div.id = "dialogue_answer_div";
    action_div.appendChild(dialogue_answer_div);
    Object.keys(dialogue.textlines).forEach(function(key) { //add buttons for textlines
            if(dialogue.textlines[key].is_unlocked && !dialogue.textlines[key].is_finished) { //do only if text_line is not unavailable
                const textline_div = document.createElement("div");
                textline_div.innerHTML = `"${dialogue.textlines[key].name}"`;
                textline_div.classList.add("dialogue_textline");
                textline_div.setAttribute("data-textline", key);
                textline_div.setAttribute("onclick", `start_textline(this.getAttribute('data-textline'))`);
                action_div.appendChild(textline_div);
            }
    });

    if(dialogue.trader) {
        const trade_div = document.createElement("div");
        trade_div.innerHTML = `<i class="material-icons">storefront</i>  ` + traders[dialogue.trader].trade_text;
        trade_div.classList.add("dialogue_trade")
        trade_div.setAttribute("data-trader", dialogue.trader);
        trade_div.setAttribute("onclick", "startTrade(this.getAttribute('data-trader'))")
        action_div.appendChild(trade_div);
    }

    const end_dialogue_div = document.createElement("div");

    end_dialogue_div.innerHTML = "<i class='material-icons'>arrow_back</i> " + dialogue.ending_text;
    end_dialogue_div.classList.add("end_dialogue_button");
    end_dialogue_div.setAttribute("onclick", "end_dialogue()");

    action_div.appendChild(end_dialogue_div);
}

function update_displayed_textline_answer(text) {
    document.getElementById("dialogue_answer_div").innerText = text;
    document.getElementById("dialogue_answer_div").style.padding = "10px";
}

function exit_displayed_trade() {
    action_div.style.display = "";
    trade_div.style.display = "none";
}

function start_activity_display(current_activity) {
    clear_action_div();
    const action_status_div = document.createElement("div");
    action_status_div.innerText = current_activity.activity.action_text;
    action_status_div.id = "action_status_div";

    const action_xp_div = document.createElement("div");
    if(current_activity.activity.base_skills_names) {
        action_xp_div.innerText = `Getting ${current_activity.skill_xp_per_tick} xp per in-game minute to ${current_activity.activity.base_skills_names.toString().replace(",", ", ")}`;
    }
    else {
        console.warn(`Activity "${current_activity.activity.name}" has no skills assigned!`);
    }
    action_xp_div.id = "action_xp_div";

    const action_end_div = document.createElement("div");
    action_end_div.setAttribute("onclick", "end_activity()");
    action_end_div.id = "action_end_div";


    const action_end_text = document.createElement("div");
    action_end_text.innerText = `Finish ${current_activity.name}`;
    action_end_text.id = "action_end_text";

    
    action_end_div.appendChild(action_end_text);

    if(current_activity.activity.type === "JOB") {
        const action_end_earnings = document.createElement("div");
        action_end_earnings.innerHTML = `(earnings: ${format_money(0)})`;
        action_end_earnings.id = "action_end_earnings";

        action_end_div.appendChild(action_end_earnings);
    }

     action_div.appendChild(action_status_div);
     action_div.appendChild(action_xp_div);
     action_div.appendChild(action_end_div);

     if(current_activity.activity.type === "JOB" && !enough_time_for_earnings(current_activity) && !document.getElementById("not_enough_time_for_earnings_div")) {
                            const time_info_div = document.createElement("div");
                            time_info_div.id = "not_enough_time_for_earnings_div";
                            time_info_div.innerHTML = `There's not enough time left to earn more, but ${character.name} might still learn something...`;
                            action_div.insertBefore(time_info_div, action_div.children[2]);
                        }

     start_activity_animation();
}

function start_sleeping_display(){
    clear_action_div();

    const action_status_div = document.createElement("div");
    action_status_div.innerText = "Sleeping...";
    action_status_div.id = "action_status_div";

    const action_end_div = document.createElement("div");
    action_end_div.setAttribute("onclick", "end_sleeping()");
    action_end_div.id = "action_end_div";


    const action_end_text = document.createElement("div");
    action_end_text.innerText = `Wake up`;
    action_end_text.id = "action_end_text";

    
    action_end_div.appendChild(action_end_text);

    action_div.appendChild(action_status_div);
    action_div.appendChild(action_end_div);
    start_activity_animation();
}

function start_reading_display(title) {
    clear_action_div();

    const action_status_div = document.createElement("div");
    action_status_div.innerText = `Reading the book, ${format_reading_time(item_templates[title].getRemainingTime())} left`;
    action_status_div.id = "action_status_div";

    const action_end_div = document.createElement("div");
    action_end_div.setAttribute("onclick", "end_reading()");
    action_end_div.id = "action_end_div";


    const action_end_text = document.createElement("div");
    action_end_text.innerText = `Stop reading for now`;
    action_end_text.id = "action_end_text";

    action_end_div.appendChild(action_end_text);

    action_div.appendChild(action_status_div);
    action_div.appendChild(action_end_div);
    start_activity_animation({book_title: title});
}

/**
 * //creates new skill bar
 * @param {Skill} skill 
 */
function create_new_skill_bar(skill) {
    skill_bar_divs[skill.skill_id] = document.createElement("div");

    const skill_bar_max = document.createElement("div");
    const skill_bar_current = document.createElement("div");
    const skill_bar_text = document.createElement("div");
    const skill_bar_name = document.createElement("div");
    const skill_bar_xp = document.createElement("div");

    const skill_tooltip = document.createElement("div");
    const tooltip_xp = document.createElement("div");
    const tooltip_xp_gain = document.createElement("div");
    const tooltip_desc = document.createElement("div");
    const tooltip_effect = document.createElement("div");
    const tooltip_milestones = document.createElement("div");
    const tooltip_next = document.createElement("div");
    
    skill_bar_max.classList.add("skill_bar_max");
    skill_bar_current.classList.add("skill_bar_current");
    skill_bar_text.classList.add("skill_bar_text");
    skill_bar_name.classList.add("skill_bar_name");
    skill_bar_xp.classList.add("skill_bar_xp");
    skill_tooltip.classList.add("skill_tooltip");
    tooltip_next.classList.add("skill_tooltip_next_milestone");

    skill_bar_text.appendChild(skill_bar_name);
    skill_bar_text.append(skill_bar_xp);

    tooltip_xp_gain.classList.add("skill_xp_gain");

    skill_tooltip.appendChild(tooltip_xp);
    skill_tooltip.appendChild(tooltip_xp_gain);
    skill_tooltip.appendChild(tooltip_desc);
    skill_tooltip.appendChild(tooltip_effect); 
    skill_tooltip.appendChild(tooltip_milestones);
    skill_tooltip.appendChild(tooltip_next);

    if(skill.parent_skill) {
        tooltip_desc.innerHTML = `${skill.description}<br><br>Parent skill: ${skill.parent_skill}<br><br>`; 
    } else {
        tooltip_desc.innerHTML = `${skill.description}<br><br>`; 
    }
    
    skill_bar_max.appendChild(skill_bar_text);
    skill_bar_max.appendChild(skill_bar_current);
    skill_bar_max.appendChild(skill_tooltip);

    skill_bar_divs[skill.skill_id].appendChild(skill_bar_max);
    skill_bar_divs[skill.skill_id].setAttribute("data-skill", skill.skill_id);
    skill_bar_divs[skill.skill_id].classList.add("skill_div");
    skill_list.appendChild(skill_bar_divs[skill.skill_id]);

    //sorts skill_list div alphabetically
    sort_displayed_skills({});
    update_displayed_skill_xp_gain(skill);
}

function update_displayed_skill_bar(skill, leveled_up) {
    /*
    skill_bar divs: 
        skill -> children (1): 
            skill_bar_max -> children(3): 
                skill_bar_text -> children(2):
                    skill_bar_name,
                    skill_bar_xp
                skill_bar_current, 
                skill_tooltip -> children(5):
                    tooltip_xp,
                    tooltip_xp_gain,
                    tooltip_desc,
                    tooltip_effect,
                    tooltip_milestones,
                    tooltip_next
    */

    if(!skill_bar_divs[skill.skill_id]) {
        return;
    }

    skill_bar_divs[skill.skill_id].children[0].children[0].children[0].innerHTML = `${skill.name()} : level ${skill.current_level}/${skill.max_level}`;
    //skill_bar_name

    if(skill.current_xp !== "Max") {
        skill_bar_divs[skill.skill_id].children[0].children[0].children[1].innerHTML = `${100*Math.round(skill.current_xp/skill.xp_to_next_lvl*1000)/1000}%`;
        skill_bar_divs[skill.skill_id].children[0].children[2].children[0].innerHTML = `${expo(skill.current_xp)}/${expo(skill.xp_to_next_lvl)}`;

    } else {
        skill_bar_divs[skill.skill_id].children[0].children[0].children[1].innerHTML = `Max!`;
        skill_bar_divs[skill.skill_id].children[0].children[2].children[0].innerHTML = `Maxed out!`;
    }
    //skill_bar_xp && tooltip_xp

    skill_bar_divs[skill.skill_id].children[0].children[1].style.width = `${100*skill.current_xp/skill.xp_to_next_lvl}%`;
    //skill_bar_current

    if(get_unlocked_skill_rewards(skill.skill_id)) {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[4].innerHTML  = `<br>${get_unlocked_skill_rewards(skill.skill_id)}`;
    }

    if(typeof get_next_skill_milestone(skill.skill_id) !== "undefined") {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[5].innerHTML  = `lvl ${get_next_skill_milestone(skill.skill_id)}: ???`;
    } else {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[5].innerHTML = "";
    }

    if(typeof skill.get_effect_description !== "undefined")
    {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[3].innerHTML = `${skill.get_effect_description()}`;
        //tooltip_effect
    }

    if(leveled_up) {
        sort_displayed_skills({sort_by: skill_sorting}); //in case of a name change on levelup
    }
}

function update_displayed_skill_description(skill) {
    if(!skill_bar_divs[skill.skill_id]) {
        return;
    }
    skill_bar_divs[skill.skill_id].children[0].children[2].children[3].innerHTML = `${skill.get_effect_description()}`;
}

function update_displayed_skill_xp_gain(skill) {
    if(!skill_bar_divs[skill.skill_id]) {
        return;
    }
    const xp_gain = Math.round(100*skill.get_parent_xp_multiplier()*get_skill_xp_gain(skill.skill_id))/100 || 1;
    skill_bar_divs[skill.skill_id].children[0].children[2].children[1].innerHTML = `XP gain: x${xp_gain}`;
}

function update_all_displayed_skills_xp_gain(){
    Object.keys(skill_bar_divs).forEach(key => {
        update_displayed_skill_xp_gain(skills[key]);
    })
}

function sort_displayed_skills({sort_by="name", change_direction=false}) {
    if(change_direction){
        if(sort_by && sort_by === skill_sorting) {
            if(skill_sorting_direction === "asc") {
                skill_sorting_direction = "desc";
            } else {
                skill_sorting_direction = "asc";
            }
        } else {
            if(sort_by === "level") {
                skill_sorting_direction = "desc";
            } else {
                skill_sorting_direction = "asc";
            }
        }
    }

    skill_sorting = sort_by;

    let plus = skill_sorting_direction=="asc"?1:-1;
    let minus = skill_sorting_direction==="asc"?-1:1;

    //[...skill_list.children].sort((a,b)=>skills[a.getAttribute("data-skill")].skill_id>skills[b.getAttribute("data-skill")].skill_id?1:-1)
                            //.forEach(node=>skill_list.appendChild(node));

    [...skill_list.children].sort((a,b) => {
        let elem_a;
        let elem_b;
        if(sort_by === "level") {
            skill_sorting = sort_by;
            elem_a = skills[a.getAttribute("data-skill")].current_level;
            elem_b = skills[b.getAttribute("data-skill")].current_level;
        } else {
            elem_a = skills[a.getAttribute("data-skill")].name();
            elem_b = skills[b.getAttribute("data-skill")].name();
            skill_sorting = "name";
        }

        if(elem_a > elem_b) {
            return plus;
        } else {
            return minus;
        }


    }).forEach(node=>skill_list.appendChild(node));
}

/**
 * creates a new bestiary entry;
 * called when a new enemy is killed (or, you know, loading a save)
 * @param {String} enemy_name 
 */
function create_new_bestiary_entry(enemy_name) {
    bestiary_entry_divs[enemy_name] = document.createElement("div");
    
    const enemy = enemy_templates[enemy_name];

    const name_div = document.createElement("div");
    name_div.innerHTML = enemy_name;
    name_div.classList.add("bestiary_entry_name");
    const kill_counter = document.createElement("div");
    kill_counter.innerHTML = enemy_killcount[enemy_name];
    kill_counter.classList.add("bestiary_entry_kill_count");
    

    const bestiary_tooltip = document.createElement("div");
    const tooltip_xp = document.createElement("div"); //base xp enemy gives
    tooltip_xp.innerHTML = `<br>Base xp value: ${enemy.xp_value} <br><br>`;
    const tooltip_desc = document.createElement("div"); //enemy description
    tooltip_desc.innerHTML = enemy.description;

    const tooltip_stats = document.createElement("div"); //base enemy stats
    tooltip_stats.innerHTML = "Stats: <br>"

    const stat_line_0 = document.createElement("div");
    stat_line_0.classList.add("grid_container");

    const stat_0 = document.createElement("div");
    const stat_0_name = document.createElement("div");
    const stat_0_value = document.createElement("div");

    stat_0.classList.add("stat_slot_div");
    stat_0_name.classList.add("stat_name");
    stat_0_value.classList.add("stat_value");

    stat_0_name.innerHTML = "Health:";
    stat_0_value.innerHTML = `${enemy.stats.health}`;
    stat_0.append(stat_0_name, stat_0_value);

    const stat_1 = document.createElement("div");
    const stat_1_name = document.createElement("div");
    const stat_1_value = document.createElement("div");

    stat_1.classList.add("stat_slot_div");
    stat_1_name.classList.add("stat_name");
    stat_1_value.classList.add("stat_value");

    stat_1_name.innerHTML = `Defense:`;
    stat_1_value.innerHTML = `${enemy.stats.defense}`;
    stat_1.append(stat_1_name, stat_1_value);

    stat_line_0.append(stat_0, stat_1);


    const stat_line_2 = document.createElement("div");
    stat_line_2.classList.add("grid_container");

    const stat_2 = document.createElement("div");
    const stat_2_name = document.createElement("div");
    const stat_2_value = document.createElement("div");

    stat_2.classList.add("stat_slot_div");
    stat_2_name.classList.add("stat_name");
    stat_2_value.classList.add("stat_value");

    stat_2_name.innerHTML = "Attack power:";
    stat_2_value.innerHTML = `${enemy.stats.attack}`;
    stat_2.append(stat_2_name, stat_2_value);

    const stat_3 = document.createElement("div");
    const stat_3_name = document.createElement("div");
    const stat_3_value = document.createElement("div");

    stat_3.classList.add("stat_slot_div");
    stat_3_name.classList.add("stat_name");
    stat_3_value.classList.add("stat_value");

    stat_3_name.innerHTML = `Attack speed:`;
    stat_3_value.innerHTML = `${enemy.stats.attack_speed}`;
    stat_3.append(stat_3_name, stat_3_value);

    stat_line_2.append(stat_2, stat_3);

    const stat_line_4 = document.createElement("div");
    stat_line_4.classList.add("grid_container");

    const stat_4 = document.createElement("div");
    const stat_4_name = document.createElement("div");
    const stat_4_value = document.createElement("div");

    stat_4.classList.add("stat_slot_div");
    stat_4_name.classList.add("stat_name");
    stat_4_value.classList.add("stat_value");

    stat_4_name.innerHTML = "AP:";
    stat_4_value.innerHTML = `${Math.round(enemy.stats.dexterity * Math.sqrt(enemy.stats.intuition || 1))}`;
    stat_4.append(stat_4_name, stat_4_value);

    const stat_5 = document.createElement("div");
    const stat_5_name = document.createElement("div");
    const stat_5_value = document.createElement("div");

    stat_5.classList.add("stat_slot_div");
    stat_5_name.classList.add("stat_name");
    stat_5_value.classList.add("stat_value");

    stat_5_name.innerHTML = "EP:";
    stat_5_value.innerHTML = `${Math.round(enemy.stats.agility * Math.sqrt(enemy.stats.intuition || 1))}`;
    stat_5.append(stat_5_name, stat_5_value);
    stat_line_4.append(stat_4, stat_5);

    
    tooltip_stats.appendChild(stat_line_0);
    tooltip_stats.appendChild(stat_line_2);
    tooltip_stats.appendChild(stat_line_4);

    const tooltip_drops = document.createElement("div"); //enemy drops
    if(enemy.loot_list.length > 0) {
        tooltip_drops.innerHTML = "<br>Loot list:";
        const loot_line = document.createElement("div");
        const loot_name = document.createElement("div");
        const loot_chance = document.createElement("div");
        const loot_chance_base = document.createElement("div");
        const loot_chance_current = document.createElement("div");

        loot_line.classList.add("loot_slot_div");
        loot_name.classList.add("loot_name");
        loot_chance.classList.add("loot_chance");
        loot_chance_base.classList.add("loot_chance_base");
        loot_chance_current.classList.add("loot_chance_current");

        loot_name.innerHTML = `Item name`;
        loot_chance_base.innerHTML = `base %`;
        loot_chance_current.innerHTML = `current %`;
        loot_chance.append(loot_chance_current, loot_chance_base);
        loot_line.append(loot_name, loot_chance);

        tooltip_drops.appendChild(loot_line);
    }

    for(let i = 0; i < enemy.loot_list.length; i++) {
        const loot_line = document.createElement("div");
        const loot_name = document.createElement("div");
        const loot_chance = document.createElement("div");
        const loot_chance_base = document.createElement("div");
        const loot_chance_current = document.createElement("div");

        loot_line.classList.add("loot_slot_div");
        loot_name.classList.add("loot_name");
        loot_chance.classList.add("loot_chance");
        loot_chance_base.classList.add("loot_chance_base");
        loot_chance_current.classList.add("loot_chance_current");

        loot_name.innerHTML = `${enemy.loot_list[i].item_name}`;
        loot_chance_base.innerHTML = `[${enemy.loot_list[i].chance*100}%]`;
        loot_chance_current.innerHTML = `${Math.round(10000*enemy.loot_list[i].chance*enemy.get_droprate_modifier())/100}%`;
        loot_chance.append(loot_chance_current, loot_chance_base);
        loot_line.append(loot_name, loot_chance);

        tooltip_drops.appendChild(loot_line);
    }

    bestiary_tooltip.classList.add("bestiary_entry_tooltip");
    
    bestiary_tooltip.appendChild(tooltip_desc);
    bestiary_tooltip.appendChild(tooltip_xp);
    bestiary_tooltip.appendChild(tooltip_stats);
    bestiary_tooltip.appendChild(tooltip_drops);

    bestiary_entry_divs[enemy_name].appendChild(name_div);
    bestiary_entry_divs[enemy_name].appendChild(kill_counter);
    bestiary_entry_divs[enemy_name].appendChild(bestiary_tooltip);

    bestiary_entry_divs[enemy_name].setAttribute("data-bestiary", enemy.rank);
    bestiary_entry_divs[enemy_name].classList.add("bestiary_entry_div");
    bestiary_list.appendChild(bestiary_entry_divs[enemy_name]);

    //sorts bestiary_list div by enemy rank
    [...bestiary_list.children].sort((a,b)=>parseInt(a.getAttribute("data-bestiary")) - parseInt(b.getAttribute("data-bestiary")))
                                .forEach(node=>bestiary_list.appendChild(node));
}

/**
 * updates the bestiary entry of an enemy, that is killcount and on-hover droprates
 * @param {String} enemy_name 
 */
function update_bestiary_entry(enemy_name) {
    const enemy = enemy_templates[enemy_name];
    bestiary_entry_divs[enemy_name].children[1].innerHTML = enemy_killcount[enemy_name];
    if(enemy.loot_list.length > 0) {
        update_bestiary_entry_description(enemy_name);
    }
}

/**
 * updates tooltip of an enemy in bestiary; called in the full update of an entry,;
 * dont call it directly
 * @param {String} enemy_name 
 */
function update_bestiary_entry_description(enemy_name) {
    const enemy = enemy_templates[enemy_name];
    const loot_divs = bestiary_entry_divs[enemy_name].children[2].children[3].children;
    for(let i = 2; i < loot_divs.length; i++) {
        loot_divs[i].children[1].children[0].innerHTML = `${Math.round(10000*enemy.loot_list[i-2].chance*enemy.get_droprate_modifier())/100}%`;
    }
}

function clear_bestiary() {
    Object.keys(bestiary_entry_divs).forEach((enemy) => {
        delete bestiary_entry_divs[enemy];
    });
}

function update_displayed_ongoing_activity(current_activity){
    document.getElementById("action_end_earnings").innerHTML = `(earnings: ${format_money(current_activity.earnings)})`
    if(!enough_time_for_earnings(current_activity) && !document.getElementById("not_enough_time_for_earnings_div")) {
        const time_info_div = document.createElement("div");
        time_info_div.id = "not_enough_time_for_earnings_div";
        time_info_div.innerHTML = `There's not enough time left to earn more, but ${character.name} might still learn something...`;
        action_div.insertBefore(time_info_div, action_div.children[2]);
    }
}

function clear_skill_list(){
    while(skill_list.firstChild) {
        skill_list.removeChild(skill_list.lastChild);
    } //remove skill bars from display

}

function update_enemy_attack_bar(enemy_id, num) {
    enemies_div.children[enemy_id].querySelector(".enemy_attack_bar").style.width = `${num*2.5}%`;
}

function update_character_attack_bar(num) {
    character_attack_bar.style.width = `${num*2.5}%`;
}

export {
    start_activity_animation,
    end_activity_animation,
    update_displayed_trader,
    update_displayed_trader_inventory,
    update_displayed_character_inventory,
    sort_displayed_inventory,
    create_item_tooltip,
    update_displayed_money,
    log_message,
    clear_action_div,
    update_displayed_enemies,
    update_displayed_health_of_enemies,
    update_displayed_normal_location,
    update_displayed_combat_location,
    log_loot,
    update_displayed_equipment,
    update_displayed_health,
    update_displayed_stamina,
    update_displayed_stats,
    update_displayed_combat_stats,
    update_displayed_effects,
    update_displayed_effect_durations,
    capitalize_first_letter,
    format_money,
    update_displayed_time,
    update_displayed_character_xp,
    update_displayed_dialogue,
    update_displayed_textline_answer,
    exit_displayed_trade,
    start_activity_display,
    start_sleeping_display,
    create_new_skill_bar, update_displayed_skill_bar, update_displayed_skill_description, 
    update_displayed_skill_xp_gain,
    update_all_displayed_skills_xp_gain,
    clear_skill_bars,
    update_displayed_ongoing_activity,
    clear_skill_list,
    update_character_attack_bar,
    clear_message_log,
    update_enemy_attack_bar,
    update_displayed_location_choices,
    create_new_bestiary_entry,
    update_bestiary_entry,
    clear_bestiary,
    start_reading_display,
    sort_displayed_skills,
    update_displayed_xp_bonuses
}