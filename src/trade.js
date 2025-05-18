"use strict";

import { traders } from "./traders.js";
import { 
    update_displayed_trader, update_displayed_trader_inventory, update_displayed_character_inventory, exit_displayed_trade, update_displayed_money } from "./display.js";
import { add_to_character_inventory, remove_from_character_inventory } from "./character.js";
import { skills } from "./skills.js";
import { getEquipmentValue, item_templates, loot_sold_count } from "./items.js";
import { character } from "./character.js";
import { add_xp_to_skill } from "./main.js";
import { round_item_price } from "./misc.js";

let current_trader = null;
const to_sell = {value: 0, items: []};
const to_buy = {value: 0, items: []};

function set_current_trader(trader_key) {
    current_trader = trader_key;
}

/**
 * 
 * @param {String} trader_key 
 */
function start_trade(trader_key) {
    traders[trader_key].refresh();
    current_trader = trader_key;
    
    update_displayed_trader(true);
}

function cancel_trade() {

    to_buy.items = [];
    to_buy.value = 0;
    to_sell.items = [];
    to_sell.value = 0;

    update_displayed_character_inventory();
    update_displayed_trader_inventory();
}

function accept_trade() {

    let new_balance;
    
    if(to_sell.items.length == 0 && to_buy.items.length == 0) {
        new_balance = character.money;
    }
    else {
        new_balance = character.money + to_sell.value - to_buy.value;
    }

    if(new_balance < 0) { //button shouldn't be clickable if trade is not affordable, so this is just in case
        throw new Error("Trying to make a trade that can't be afforded");
    } else {

        character.money = new_balance;

        let item_list = [];
        let to_remove = [];
        while(to_buy.items.length > 0) {
            //add to character inventory
            //remove from trader inventory

            const item = to_buy.items.pop();
            
            item.item_count = item.count;
            to_remove.push(item);

            item_list.push({item_key: item.item_key, count: item.count});
        }
        
        if(to_remove.length > 0) {
            add_to_character_inventory(item_list);
            remove_from_trader_inventory(current_trader,to_remove);

            for(let i = 0; i < item_list.length; i++) {
                update_displayed_character_inventory({item_key: item_list[i].item_key});
            }
        }
        

        item_list = []; //totally could reduce it to 1 array instead of 2 if I made param naming more consistent, maybe one day
        to_remove = [];

        while(to_sell.items.length > 0) {
            //remove from character inventory
            //add to trader inventory
            
            const item = to_sell.items.pop();
            
            item.item_count = item.count;
            to_remove.push(item);

            item_list.push({item_key: item.item_key, count: item.count});
        
            const {id} = JSON.parse(item.item_key);
            if(id && item_templates[id]?.saturates_market) {
                if(!loot_sold_count[id]) {
                    loot_sold_count[id] = {sold: 0, recovered: 0};
                }
                loot_sold_count[id].sold = loot_sold_count[id]?.sold + (item.count || 1);
            }
        }
        
        if(to_remove.length > 0) {
            add_to_trader_inventory(current_trader,item_list);
            remove_from_character_inventory(to_remove);

            for(let i = 0; i < item_list.length; i++) {
                update_displayed_trader_inventory({item_key: item_list[i].item_key});
            }
        }
    }

    add_xp_to_skill({skill: skills["Haggling"], xp_to_add: (to_sell.value + to_buy.value)/10});

    to_buy.value = 0;
    to_sell.value = 0;

    update_displayed_character_inventory();
    update_displayed_trader_inventory();
    update_displayed_money();
}

function exit_trade() {
    current_trader = null;
    to_buy.items = [];
    to_buy.value = 0;
    to_sell.items = [];
    to_sell.value = 0;
    exit_displayed_trade();
    update_displayed_character_inventory();
}

/**
 * @param {} selected_item 
 * {item_key: {string with value of data- attribute, which is supposed to be an inventory key}, count: Number}
 * @returns {Number} change of trade value
 */
function add_to_buying_list(selected_item) {
    const present_item = to_buy.items.find(a => a.item_key === selected_item.item_key);
    
    let item_count_in_trader = traders[current_trader].inventory[selected_item.item_key].count;

    if(present_item) { //there's already some in inventory
        if(item_count_in_trader - present_item.count < selected_item.count) {
            //trying to buy more than trader has left, so just put all in the buy list
            selected_item.count = item_count_in_trader - present_item.count;
            present_item.count = item_count_in_trader;
        } else {
            present_item.count += selected_item.count;
        }

    } else { 
        if(item_count_in_trader < selected_item.count) { 
            //trader has not enough: buy all available
            selected_item.count = item_count_in_trader;
        }

        to_buy.items.push(selected_item);
    }

    const value = get_item_value(selected_item, true);
    to_buy.value += value;
    return -value;
}

/**
 * @param {} selected_item 
 * {item_key: {string with value of data- attribute}, count: Number}
 * @returns {Number} change of trade value
 */
function remove_from_buying_list(selected_item) {

    const present_item = to_buy.items.find(a => a.item_key === selected_item.item_key);
    if(present_item?.count > selected_item.count) { //there's enough
        present_item.count -= selected_item.count;
    } else { //there's not enough, remove them all
        selected_item.count = present_item.count;
        to_buy.items.splice(to_buy.items.indexOf(present_item),1);
    }

    const value = get_item_value(selected_item, true);
    to_buy.value -= value;
    return value;
}

function is_in_trade() {
    return Boolean(current_trader);
}

function add_to_selling_list(selected_item) {

    const present_item = to_sell.items.find(a => a.item_key === selected_item.item_key);
    //find if item is already present in the sell list
    let item_count_in_player = character.inventory[selected_item.item_key].count;

    if(present_item) {
        //item present in the list -> increase its count, up to what player has in inventory

        if(item_count_in_player - present_item.count < selected_item.count) {
            //trying to sell more that remains in inventory, so just add everything
            selected_item.count = item_count_in_player - present_item.count;
            present_item.count = item_count_in_player;
        } else {
            present_item.count += selected_item.count;
        }

    } else { 
        if(item_count_in_player < selected_item.count) { 
            //character has not enough: sell all available
            selected_item.count = item_count_in_player;
        }

        to_sell.items.push(selected_item);
    }

    let {id, components, quality} = JSON.parse(selected_item.item_key);
    let value;

    if(id && item_templates[id].saturates_market) {
        value = item_templates[id].getValueOfMultiple({additional_count_of_sold: (present_item?.count - selected_item.count || 0), count: selected_item.count});
    } else if(id && !item_templates[id].saturates_market) { 
        value = item_templates[id].getValue(quality) * selected_item.count;
    } else {
        value = getEquipmentValue(components, quality) * selected_item.count;
    }
    
    to_sell.value += value;
    return value;
}

function remove_from_selling_list(selected_item) {
    let actual_number_to_remove = selected_item.count;

    const present_item = to_sell.items.find(a => a.item_key === selected_item.item_key);
    if(present_item?.count > selected_item.count) { //more than to remove
        present_item.count -= selected_item.count;
    } else { //less than to remove, so just remove all
        actual_number_to_remove = present_item.count;
        present_item.count = 0;
        to_sell.items.splice(to_sell.items.indexOf(present_item), 1);
    }

    let {id, components, quality} = JSON.parse(selected_item.item_key);
    let value;

    if(id && item_templates[id].saturates_market) {
        value = item_templates[id].getValueOfMultiple({additional_count_of_sold: (present_item?.count || 0), count: actual_number_to_remove});
    } else if(id && !item_templates[id].saturates_market) { 
        value = item_templates[id].getValue(quality) * actual_number_to_remove;
    } else {
        value = getEquipmentValue(components, quality) * actual_number_to_remove;
    }
    
    to_sell.value -= value;
    return -value;

}

function add_to_trader_inventory(trader_key, items) {
    traders[trader_key].add_to_inventory(items);

    if(current_trader === trader_key) {
        update_displayed_trader_inventory();
    }
}

function remove_from_trader_inventory(trader_key, items) {
    traders[trader_key].remove_from_inventory(items);
    
    if(current_trader === trader_key) {
        update_displayed_trader_inventory();
    }
}

/**
 * @description for buying only
 * @param {*} selected_item {item, count}
 * @param {Boolean} is_stackable
 * @returns total value of items, including character haggling skill and trader profit margin
 */
function get_item_value(selected_item) {
    const profit_margin = traders[current_trader].getProfitMargin();
    const {id, components, quality} = JSON.parse(selected_item.item_key);

    if(id) {
        return round_item_price(profit_margin * item_templates[id].getValue(quality)) * selected_item.count;
    } else {
        return round_item_price(profit_margin * getEquipmentValue(components, quality));
    }
}

export {to_buy, to_sell, set_current_trader, current_trader, 
        start_trade, cancel_trade, accept_trade, exit_trade, 
        add_to_trader_inventory, remove_from_trader_inventory,
        add_to_buying_list, remove_from_buying_list,
        add_to_selling_list, remove_from_selling_list,
        is_in_trade};