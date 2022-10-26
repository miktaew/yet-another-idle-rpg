import { traders } from "./traders.js";
import { current_trader, to_buy, to_sell } from "./trade.js";
import { skills, get_unlocked_skill_rewards, get_next_skill_milestone } from "./skills.js";
import { character } from "./character.js";
import { current_enemies, can_work, current_location, active_effects, enough_time_for_earnings } from "./main.js";
import { dialogues } from "./dialogues.js";
import { activities } from "./activities.js";
import { format_time, current_game_time } from "./game_time.js";
import { item_templates } from "./items.js";

var activity_anim; //for the activity animation interval

//location actions & trade
const action_div = document.getElementById("location_actions_div");
const trade_div = document.getElementById("trade_div");

const location_name_div = document.getElementById("location_name_div");

//inventory display
const inventory_div = document.getElementById("inventory_content_div");
const trader_inventory_div = document.getElementById("trader_inventory_div");

//message log
const message_log = document.getElementById("message_log_div");

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
    epic: "purple",
    legendary: "orange",
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
    var item_tooltip = document.createElement("span");
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
    }

    item_tooltip.innerHTML += `<br><br>Value: ${format_money(Math.ceil(item.getValue() * ((options && options.trader) ? traders[current_trader].profit_margin : 1) || 1))}`;

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
        case "activity_unlocked": 
            //currently uses default
            break;
        case "location_unlocked":
            class_to_add = "message_location_unlocked";
    }

    message.classList.add(class_to_add);

    message.innerHTML = message_to_add + "<div class='message_border'> </>";


    if(message_log.children.length > 80) 
    {
        message_log.removeChild(message_log.children[0]);
    } //removes first position if there's too many messages

    message_log.appendChild(message);
    message_log.scrollTop = message_log.scrollHeight;
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

function start_activity_animation() {
    activity_anim = setInterval(() => { //sets a tiny little "animation" for activity text
        const action_status_div = document.getElementById("action_status_div");
        if(action_status_div.innerHTML.endsWith("...")) {
            action_status_div.innerHTML = action_status_div.innerHTML.substring(0, action_status_div.innerHTML.length - 3);
        } else{
            action_status_div.innerHTML += ".";
        }
     }, 600);
}

function update_displayed_trader() {
    action_div.style.display = "none";
    trade_div.style.display = "inherit";
    document.getElementById("trader_cost_mult_value").textContent = `${Math.round(100 * (1 + (traders[current_trader].profit_margin - 1) * (1 - skills["Haggling"].get_level_bonus())))}%`
    update_displayed_trader_inventory();
}

function update_displayed_money() {
    document.getElementById("money_div").innerHTML = `Your purse contains: ${format_money(character.money)}`;
}

function update_displayed_trader_inventory(sorting_param) {
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

                item_name_div.innerHTML = `<span class="item_slot">[${trader.inventory[key][i].equip_slot}]</span> ${trader.inventory[key][i].getName()}`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
                item_div.classList.add("inventory_item", "trader_item");       

                //add tooltip
                item_div.appendChild(create_item_tooltip(trader.inventory[key][i], {trader: true}));

                item_control_div.classList.add('inventory_item_control', 'trader_item_control', `trader_item_${trader.inventory[key][i].item_type.toLowerCase()}`);
                item_control_div.setAttribute("data-trader_item", `${trader.inventory[key][i].getName()} #${i}`)
                item_control_div.appendChild(item_div);

                var item_value_span = document.createElement("span");
                item_value_span.innerHTML = `${format_money(trader.inventory[key][i].getValue() * trader.profit_margin, true)}`;
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
    
            item_name_div.innerHTML = `${trader.inventory[key].item.name} x${item_count}`;
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
            
            item_control_div.appendChild(item_div);
            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(trader.inventory[key].item.getValue() * trader.profit_margin, true)}`;
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
    
            item_name_div.innerHTML = `${actual_item.name} x${item_count}`;
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

            item_name_div.innerHTML = `[${actual_item.equip_slot}] ${actual_item.getName()}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);
            item_div.classList.add("inventory_item", "trader_item");       

            //add tooltip
            item_div.appendChild(create_item_tooltip(actual_item));

            item_control_div.classList.add('item_to_trade', 'inventory_item_control', 'trader_item_control', `trader_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-trader_item", `${actual_item.getName()} #${item_index}`)
            item_control_div.appendChild(item_div);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            trader_inventory_div.appendChild(item_control_div);
        }
    }

    sort_displayed_inventory({sort_by: sorting_param || "name", target: "trader"});
}

function sort_displayed_inventory({sort_by, target = "character", direction = "asc"}) {

    if(target === "trader") {
        target = trader_inventory_div;
    } else if(target === "character") {
        target = inventory_div;
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
        //items being traded on bottom
        else if(a.classList.contains("item_to_trade") && !b.classList.contains("item_to_trade")) {
            return 1;
        } else if(!a.classList.contains("item_to_trade") && b.classList.contains("item_to_trade")) {
            return -1;
        }

        //other items by either name or otherwise by value

        else if(sort_by === "name") {
            //if they are equippable, take in account the [slot] value displayed in front of item in inventory
            const name_a = a.children[0].innerText.toLowerCase();
            const name_b = b.children[0].innerText.toLowerCase();

            //priotize displaying equipment below stackable items
            if(name_a[0] === '[' && name_b[0] !== '[') {
                return 1;
            } else if(name_a[0] !== '[' && name_b[0] === '[') {
                return -1;
            }
            else if(name_a > name_b) {
                return 1;
            } else {
                return -1;
            }

        } else if(sort_by === "price") {
            
            let value_a = Number(a.lastElementChild.innerText.replace(/[ GSC]/g, ''));
            let value_b = Number(b.lastElementChild.innerText.replace(/[ GSC]/g, ''));
            
            if(value_a > value_b) {
                return 1;
            } else {
                return -1;
            }
        }

    }).forEach(node => target.appendChild(node));
}

/**
 * updates displayed inventory of the character (only inventory, worn equipment is managed by separate method)
 */
 function update_displayed_character_inventory() {    
    inventory_div.innerHTML = "";

    Object.keys(character.inventory).forEach(function(key) {
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

                item_name_div.innerHTML = `<span class = "item_slot" >[${character.inventory[key][i].equip_slot}]</span> ${character.inventory[key][i].getName()}`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
    
                item_div.classList.add("inventory_item", "character_item", `item_${character.inventory[key][i].item_type.toLowerCase()}`);

                item_control_div.setAttribute("data-character_item", `${character.inventory[key][i].getName()} #${i}`)
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
    

            item_name_div.innerHTML = `${character.inventory[key].item.name} x${item_count}`;
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
            item_control_div.appendChild(item_div);

            if(character.inventory[key].item.item_type === "USABLE") {
                const item_use_button = document.createElement("div");
                item_use_button.classList.add("item_use_button");
                item_use_button.innerText = "[use]";
                item_control_div.appendChild(item_use_button);
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
        const item = character.equipment[key];
        if(item) {
            var item_control_div = document.createElement("div");
            var item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    

            item_name_div.innerHTML = `[${item.equip_slot}] ${item.getName()}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add("inventory_equipped_item");

            item_control_div.setAttribute("data-character_item", `${item.getName()} #${key}`)

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

    //add items from to_buy to display
    for(let i = 0; i < to_buy.items.length; i++) {
        
        const item_index = Number(to_buy.items[i].item.split(" #")[1]);

        if(isNaN(item_index)) { //it's stackable, so item_count is needed
            const item_count = to_buy.items[i].count;
            const actual_item = traders[current_trader].inventory[to_buy.items[i].item].item;

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    
            item_name_div.innerHTML = `${actual_item.name} x${item_count}`;
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
            item_control_div.appendChild(item_div);

            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue() * traders[current_trader].profit_margin, true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            inventory_div.appendChild(item_control_div);
            
        } else { //it's unstackable, no need for item_count as it's always at 1

            const actual_item = traders[current_trader].inventory[to_buy.items[i].item.split(" #")[0]][item_index];

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");

            item_name_div.innerHTML = `[${item_templates[actual_item.getName()].equip_slot}] ${actual_item.getName()}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);
            item_div.classList.add("inventory_item", "character_item", "trade_item_equippable",);       

            //add tooltip
            item_div.appendChild(create_item_tooltip(actual_item, {trader: true}));

            item_control_div.classList.add('item_to_trade', 'inventory_item_control', 'character_item_control', `character_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-character_item", `${actual_item.getName()} #${item_index}`)
            item_control_div.appendChild(item_div);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue() * traders[current_trader].profit_margin, true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            inventory_div.appendChild(item_control_div);
        }
    }


    sort_displayed_inventory({target: "character"});
}


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
 * and enemies' AP / DP
 * 
 * called when new enemies get loaded
 */
 function update_displayed_enemies() {
    for(let i = 0; i < 8; i++) { //go to max enemy count
        if(i < current_enemies.length) {
            enemies_div.children[i].children[0].style.display = null;
            enemies_div.children[i].children[0].children[0].innerHTML = current_enemies[i].name;

            const ap = current_enemies[i].stats.dexterity * Math.sqrt(current_enemies[i].stats.intuition || 1);
            const dp = current_enemies[i].stats.agility * Math.sqrt(current_enemies[i].stats.intuition || 1);
            enemies_div.children[i].children[0].children[1].innerHTML = `AP : ${Math.round(ap)} | DP : ${Math.round(dp)}`;

        } else {
            enemies_div.children[i].children[0].style.display = "none"; //just hide it
        }     
    }

    update_displayed_health_of_enemies();
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
        }

        //update size of health bar
        enemies_div.children[i].children[0].children[2].children[0].children[0].style.width = 
            Math.max(0, 100*current_enemies[i].stats.health/current_enemies[i].stats.max_health) + "%";

            enemies_div.children[i].children[0].children[2].children[1].innerText = `${Math.round(current_enemies[i].stats.health)}/${Math.round(current_enemies[i].stats.max_health)} hp`;

    }
}

function update_displayed_normal_location(location) {
    
    clear_action_div();
    var action;

    combat_div.style.display = "none";

    enemy_count_div.style.display = "none";
    document.documentElement.style.setProperty('--actions_div_height', getComputedStyle(document.body).getPropertyValue('--actions_div_height_default'));
    document.documentElement.style.setProperty('--actions_div_top', getComputedStyle(document.body).getPropertyValue('--actions_div_top_default'));
    character_attack_bar.parentNode.style.display = "none";
    
    //add buttons for starting dialogues
    for(let i = 0; i < location.dialogues.length; i++) { 
        if(!dialogues[location.dialogues[i]].is_unlocked || dialogues[location.dialogues[i]].is_finished) { //skip if dialogue is not available
            continue;
        } 
        
        const dialogue_div = document.createElement("div");

        if(Object.keys(dialogues[location.dialogues[i]].textlines).length > 0) { //has any textlines
            
            dialogue_div.innerHTML = dialogues[location.dialogues[i]].trader? `<i class="material-icons">storefront</i>  ` : `<i class="material-icons">question_answer</i>  `;
            dialogue_div.innerHTML += dialogues[location.dialogues[i]].starting_text;
            dialogue_div.classList.add("start_dialogue");
            dialogue_div.setAttribute("data-dialogue", location.dialogues[i]);
            dialogue_div.setAttribute("onclick", "start_dialogue(this.getAttribute('data-dialogue'));");
            action_div.appendChild(dialogue_div);
        } else if(dialogues[location.dialogues[i]].trader) { //has no textlines but is a trader -> add button to directly start trading
            const trade_div = document.createElement("div");
            trade_div.innerHTML = `<i class="material-icons">storefront</i>  ` + traders[dialogues[location.dialogues[i]].trader].trade_text;
            trade_div.classList.add("dialogue_trade")
            trade_div.setAttribute("data-trader", dialogues[location.dialogues[i]].trader);
            trade_div.setAttribute("onclick", "startTrade(this.getAttribute('data-trader'))")
            action_div.appendChild(trade_div);
        }
    }

    //add buttons to start activities
    for(let i = 0; i < location.activities.length; i++) {
        if(!activities[location.activities[i].activity]?.is_unlocked || !location.activities[i]?.is_unlocked) {
            continue;
        }

        const activity_div = document.createElement("div");
        
        if(activities[location.activities[i].activity].type === "JOB") {
            activity_div.innerHTML = `<i class="material-icons">construction</i>  `;
            activity_div.classList.add("activity_div");
            activity_div.setAttribute("data-activity", i);
            activity_div.setAttribute("onclick", `start_activity({id: ${i}});`);

            if(can_work(location.activities[i])) {
                activity_div.classList.add("start_activity");
            } else {
                activity_div.classList.add("activity_unavailable");
            }

            const job_tooltip = document.createElement("div");
            job_tooltip.classList.add("job_tooltip");
            job_tooltip.innerHTML = `Available from ${location.activities[i].availability_time.start} to ${location.activities[i].availability_time.end} <br>`;
            job_tooltip.innerHTML += `Pays ${format_money(location.activities[i].payment.min)} per every ` +  
                    `${format_time({time: {minutes: location.activities[i].working_period}})} worked`;
            


            activity_div.appendChild(job_tooltip);
        }
        else if(activities[location.activities[i].activity].type === "TRAINING") {
            activity_div.innerHTML = `<i class="material-icons">fitness_center</i>  `;
            activity_div.classList.add("activity_div");
            activity_div.setAttribute("data-activity", i);
            activity_div.setAttribute("onclick", `start_activity({id: ${i}});`);

            activity_div.classList.add("start_activity");

        }

        activity_div.innerHTML += location.activities[i].starting_text;
        action_div.appendChild(activity_div);
    }
    
    //add button to go to sleep
    if(location.sleeping) { 
        const start_sleeping_div = document.createElement("div");
        
        start_sleeping_div.innerHTML = '<i class="material-icons">bed</i>  ' + location.sleeping.text;
        start_sleeping_div.id = "start_sleeping_div";
        start_sleeping_div.setAttribute('onclick', 'start_sleeping()');

        action_div.appendChild(start_sleeping_div);
    }
    
    //add butttons to change location
    for(let i = 0; i < location.connected_locations.length; i++) { 

        if(location.connected_locations[i].location.is_unlocked == false) { //skip if not unlocked
            continue;
        }

        action = document.createElement("div");
        
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

        action_div.appendChild(action);
    }

    location_name_div.innerText = current_location.name;
    document.getElementById("location_description_div").innerText = current_location.description;
}

function update_displayed_combat_location(location) {

    clear_action_div();
    var action;

    enemy_count_div.style.display = "block";
    combat_div.style.display = "block";
    character_attack_bar.parentNode.style.display = "block";

    document.documentElement.style.setProperty('--actions_div_height', getComputedStyle(document.body).getPropertyValue('--actions_div_height_combat'));
    document.documentElement.style.setProperty('--actions_div_top', getComputedStyle(document.body).getPropertyValue('--actions_div_top_combat'));


    enemy_count_div.children[0].children[1].innerHTML = location.enemy_count - location.enemies_killed % location.enemy_count;

    action = document.createElement("div");
    action.classList.add("travel_normal", "action_travel");
    if(location.leave_text) {
        action.innerHTML = `<i class="material-icons">directions</i>  ` + location.leave_text;
    } else {
        action.innerHTML = `<i class="material-icons">directions</i>  ` + "Go back to " + location.parent_location.name;
    }
    action.setAttribute("data-travel", location.parent_location.name);
    action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");

    action_div.appendChild(action);


    location_name_div.innerText = current_location.name;
    document.getElementById("location_description_div").innerText = current_location.description;
}

function update_displayed_health() { //call it when using healing items, resting or getting hit
    current_health_value_div.innerText = (Math.round(character.full_stats.health*10)/10) + "/" + character.full_stats.max_health + " hp";
    current_health_bar.style.width = (character.full_stats.health*100/character.full_stats.max_health).toString() +"%";
}
function update_displayed_stamina() { //call it when eating, resting or fighting
    current_stamina_value_div.innerText = Math.round(character.full_stats.stamina) + "/" + Math.round(character.full_stats.max_stamina) + " stamina";
    current_stamina_bar.style.width = (character.full_stats.stamina*100/character.full_stats.max_stamina).toString() +"%";
}

function update_displayed_stats() { //updates displayed stats

    Object.keys(stats_divs).forEach(function(key){
        if(key === "crit_rate" || key === "crit_multiplier") {
            stats_divs[key].innerHTML = `${(character.full_stats[key]*100).toFixed(1)}%`;
        } 
        else if(key === "attack_speed") {
            stats_divs[key].innerHTML = `${(character.get_attack_speed()).toFixed(1)}`;
        }
        else if(key === "attack_power") {
            stats_divs[key].innerHTML = `${(character.get_attack_power()).toFixed(1)}`;
        }
        else {
            stats_divs[key].innerHTML = `${(character.full_stats[key]).toFixed(1)}`;
        }
    });
}

function update_displayed_combat_stats() {

    other_combat_divs.offensive_points.innerHTML = `${Math.round(character.combat_stats.attack_points)}`;

    if(character.equipment["off-hand"] != null && character.equipment["off-hand"].offhand_type === "shield") { //HAS SHIELD
        other_combat_divs.defensive_action.innerHTML = "Block :";
        other_combat_divs.defensive_points.innerHTML = `${(character.combat_stats.block_chance*100).toFixed(1)}%`;
        other_combat_divs.defensive_points.parentNode.children[2].innerHTML = "Chance to block an attack";
    }
    else { //NO SHIELD
        other_combat_divs.defensive_action.innerHTML = "EP : ";
        other_combat_divs.defensive_points.innerHTML = `${Math.round(character.combat_stats.evasion_points)}`;
        
        other_combat_divs.defensive_points.parentNode.children[2].innerHTML = 
        "Evasion points, a total value of everything that contributes to the evasion chance, except for some situational skills and modifiers";
        
    }
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
function format_money(num, round) {
    var value;
    const sign = num >= 0 ? '' : '-';
    num = Math.abs(num);

    if(round) {
        //round it up a bit to skip tiny little meaningless leftovers
        const size = Math.log10(num);
        if(size > 5 && size < 7) { //remove last 2 digits (C value)
            num = Math.round(num/100) * 100;
        } else if(size > 7) { //remove last 4 digits (S and C values)
            num = Math.round(num/10000) * 10000;
        }
    }

    if(num > 0) {
        value = (num%100 != 0 ? `${num%100} C` : '');

        if(num > 99) {
            value = (Math.floor(num/100)%100 != 0?`${Math.floor(num/100)%100} S ` :'') + value;
            if(num > 9999) {
                value = `${Math.floor(num/10000)} G ` + value;
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
    character_xp_div.children[1].innerText = `${character.xp.current_xp}/${character.xp.xp_to_next_lvl} xp`;

    if(did_level) {
        character_level_div.innerText = `Level: ${character.xp.current_level}`;
        update_displayed_health();
    }
}

function update_displayed_dialogue(dialogue_key) {
    const dialogue = dialogues[dialogue_key];
    
    clear_action_div();
    
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

    end_dialogue_div.innerHTML = dialogue.ending_text;
    end_dialogue_div.classList.add("end_dialogue_button");
    end_dialogue_div.setAttribute("onclick", "end_dialogue()");

    action_div.appendChild(end_dialogue_div);
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
    action_xp_div.innerText = `Getting ${current_activity.skill_xp_per_tick} xp per in-game minute to ${current_activity.activity.base_skills_names.toString().replace(",", ", ")}`;
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
        action_end_earnings.innerText = `(earnings: ${format_money(0)})`;
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

    skill_tooltip.appendChild(tooltip_xp);
    skill_tooltip.appendChild(tooltip_desc);
    skill_tooltip.appendChild(tooltip_effect); 
    skill_tooltip.appendChild(tooltip_milestones);
    skill_tooltip.appendChild(tooltip_next);

    

    if(skill.skill_group) {
        tooltip_desc.innerHTML = `${skill.description}<br><br>Group: ${skill.skill_group}<br><br>`; 
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
    [...skill_list.children].sort((a,b)=>a.getAttribute("data-skill")>b.getAttribute("data-skill")?1:-1)
                            .forEach(node=>skill_list.appendChild(node));
}

function update_displayed_skill_bar(skill) {
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
                    tooltip_desc,
                    tooltip_effect,
                    tooltip_milestones,
                    tooltip_next
    */
    skill_bar_divs[skill.skill_id].children[0].children[0].children[0].innerHTML = `${skill.name()} : level ${skill.current_level}/${skill.max_level}`;
    //skill_bar_name

    if(skill.current_xp !== "Max") {
        skill_bar_divs[skill.skill_id].children[0].children[0].children[1].innerHTML = `${100*Math.round(skill.current_xp/skill.xp_to_next_lvl*1000)/1000}%`;
    } else {
        skill_bar_divs[skill.skill_id].children[0].children[0].children[1].innerHTML = `Max!`;
    }
    //skill_bar_xp

    skill_bar_divs[skill.skill_id].children[0].children[1].style.width = `${100*skill.current_xp/skill.xp_to_next_lvl}%`;
    //skill_bar_current

    if(skill.current_xp !== "Max") {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[0].innerHTML = `${skill.current_xp}/${skill.xp_to_next_lvl}`;
    } else {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[0].innerHTML = `Maxed out!`;
    }
    //tooltip_xp

    if(get_unlocked_skill_rewards(skill.skill_id)) {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[3].innerHTML  = `<br>${get_unlocked_skill_rewards(skill.skill_id)}`;
    }

    if(typeof get_next_skill_milestone(skill.skill_id) !== "undefined") {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[4].innerHTML  = `lvl ${get_next_skill_milestone(skill.skill_id)}: ???`;
    } else {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[4].innerHTML = "";
    }

    if(typeof skill.get_effect_description !== "undefined")
    {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[2].innerHTML = `${skill.get_effect_description()}`;
        //tooltip_effect
    }
}

function update_displayed_skill_description(skill) {
    skill_bar_divs[skill.skill_id].children[0].children[2].children[2].innerHTML = `${skill.get_effect_description()}`;
}

function update_displayed_ongoing_activity(current_activity){
    document.getElementById("action_end_earnings").innerText = `(earnings: ${format_money(current_activity.earnings)})`
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
    exit_displayed_trade,
    start_activity_display,
    start_sleeping_display,
    create_new_skill_bar, update_displayed_skill_bar, update_displayed_skill_description,
    clear_skill_bars,
    update_displayed_ongoing_activity,
    clear_skill_list,
    update_character_attack_bar,
    clear_message_log,
    update_enemy_attack_bar
}