import { traders } from "./traders.js";
import { 
    update_displayed_trader, update_displayed_trader_inventory, update_displayed_character_inventory, exit_displayed_trade, update_displayed_money } from "./display.js";
import { add_to_character_inventory, remove_from_character_inventory } from "./character.js";
import { skills } from "./skills.js";
import { item_templates } from "./items.js";
import { character } from "./character.js";
import { add_xp_to_skill } from "./main.js";

var current_trader = null;
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
    
    update_displayed_trader();
}

function cancel_trade() {
    
    to_buy.items = [];
    to_buy.value = 0;
    to_sell.items = [];
    to_sell.value = 0;

    update_displayed_inventory();
    update_displayed_trader_inventory();
}

function accept_trade() {
    
    //button shouldn't be clickable if trade is not affordable, so this is just in case
    const new_balance = character.money + to_sell.value - to_buy.value
    if(new_balance < 0) {
        throw "Trying to make a trade that can't be afforded"
    } else {

        character.money = new_balance;

        while(to_buy.items.length > 0) {
            //add to character inventory
            //remove from trader inventory

            const item = to_buy.items.pop();
            const [item_name, item_id] = item.item.split(' #');
            let actual_item;
            if(item_id) {
                actual_item = traders[current_trader].inventory[item_name][item_id];

                remove_from_trader_inventory(current_trader, {item_name, item_count: 1, item_id});

                add_to_character_inventory([{item: actual_item, count: 1}]);                              
            } else {

                actual_item = traders[current_trader].inventory[item_name].item;
                
                remove_from_trader_inventory(current_trader, {item_name, item_count: item.count});

                add_to_character_inventory([{item: actual_item, count: item.count}]);
            }

            
        }
        while(to_sell.items.length > 0) {
            //remove from character inventory
            //add to trader inventory
            
            const item = to_sell.items.pop();
            const [item_name, item_id] = item.item.split(' #');
            let actual_item;
            if(item_id) {
                actual_item = character.inventory[item_name][item_id];
                
                remove_from_character_inventory({item_name, item_count: 1, item_id});

                add_to_trader_inventory(current_trader, [{item: actual_item, count: 1}]);
            } else {
                actual_item = character.inventory[item_name].item;
                remove_from_character_inventory({item_name, item_count: item.count});

                add_to_trader_inventory(current_trader, [{item: actual_item, count: item.count}]);
            }
        }
    }

    add_xp_to_skill(skills["Haggling"], to_sell.value + to_buy.value);

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
 * {item: {string with value of data- attribute}, count: Number, id: Number (position in inventory)}
 * @returns {Number} change of trade value
 */
function add_to_buying_list(selected_item) {
    const is_stackable = !Array.isArray(traders[current_trader].inventory[selected_item.item.split(' #')[0]]);
    if(is_stackable) {
        const present_item = to_buy.items.find(a => a.item === selected_item.item);
        
        if(present_item) { //there's already some in inventory
            if(traders[current_trader].inventory[selected_item.item.split(' #')[0]].count < selected_item.count + present_item.count) {
                //trader has not enough when items already added make the total be too much, so just put all in the list
                present_item.count = traders[current_trader].inventory[selected_item.item.split(' #')[0]].count;
            } else {
                present_item.count += selected_item.count;
            }

        } else { 
            if(traders[current_trader].inventory[selected_item.item.split(' #')[0]].count < selected_item.count) { 
                //trader has not enough: buy all available
                selected_item.count = traders[current_trader].inventory[selected_item.item.split(' #')[0]].count;
            }

            to_buy.items.push(selected_item);
        }

        const value = get_item_value(selected_item, true);
        to_buy.value += value;
        return -value;

    } else { //unstackable item, so always 1

        to_buy.items.push(selected_item);

        const value = get_item_value(selected_item, false);
        to_buy.value += value;
        return -value;
    }
}

/**
 * @param {} selected_item 
 * {item: {string with value of data- attribute}, count: Number, id: Number (position in inventory)}
 * @returns {Number} change of trade value
 */
function remove_from_buying_list(selected_item) {
    const is_stackable = !Array.isArray(traders[current_trader].inventory[selected_item.item.split(' #')[0]]);

    if(is_stackable) { //stackable, so "count" may be more than 1
        const present_item = to_buy.items.find(a => a.item === selected_item.item);
        if(present_item?.count > selected_item.count) { //there's enough
            present_item.count -= selected_item.count;
        } else { //there's not enough, remove them all
            selected_item.count = present_item.count;
            to_buy.items.splice(to_buy.items.indexOf(present_item),1);
        }

        const value = get_item_value(selected_item, true);
        to_buy.value -= value;
        return value;

    } else { //unstackable item, so always just 1
        //find index of item and remove it
        to_buy.items.splice(to_buy.items.map(item => item.item).indexOf(selected_item.item),1);
        const value = get_item_value(selected_item, false);
        to_buy.value -= value;
        return value;
    }
}


function is_in_trade() {
    return Boolean(current_trader);
}

function add_to_selling_list(selected_item) {
    const is_stackable = !Array.isArray(character.inventory[selected_item.item.split(' #')[0]]);

    if(is_stackable) {

        const present_item = to_sell.items.find(a => a.item === selected_item.item);

        if(present_item) {
            if(character.inventory[selected_item.item.split(' #')[0]].count < selected_item.count + present_item.count) {
                //character has not enough when items already added make the total be too much, so just put all in the list
                present_item.count = character.inventory[selected_item.item.split(' #')[0]].count;
            } else {
                present_item.count += selected_item.count;
            }

        } else { 
            if(character.inventory[selected_item.item.split(' #')[0]].count < selected_item.count) { 
                //character has not enough: sell all available
                selected_item.count = character.inventory[selected_item.item.split(' #')[0]].count;
            }
            to_sell.items.push(selected_item);
            
        }
        const value = item_templates[selected_item.item.split(' #')[0]].getValue() * selected_item.count;
        to_sell.value += value;
        return value;

    } else {
        to_sell.items.push(selected_item);

        const actual_item = character.inventory[selected_item.item.split(' #')[0]][selected_item.item.split(' #')[1]];
        const value = actual_item.getValue();
        to_sell.value += value;
        return value;
    }
}

function remove_from_selling_list(selected_item) {
    const is_stackable = !Array.isArray(character.inventory[selected_item.item.split(' #')[0]]);
    var actual_number_to_remove = selected_item.count;

    if(is_stackable) { //stackable, so "count" may be more than 1
        const present_item = to_sell.items.find(a => a.item === selected_item.item);
        if(present_item?.count > selected_item.count) {
            present_item.count -= selected_item.count;
        } else {
            actual_number_to_remove = present_item.count;
            to_sell.items.splice(to_sell.items.indexOf(present_item), 1);
        }
        const value = item_templates[selected_item.item.split(' #')[0]].getValue() * actual_number_to_remove;
        to_sell.value -= value;
        return -value;
    } else { //unstackable item
        //find index of item and remove it
        to_sell.items.splice(to_sell.items.map(item => item.item).indexOf(selected_item.item),1);

        const actual_item = character.inventory[selected_item.item.split(' #')[0]][selected_item.item.split(' #')[1]];
        const value = actual_item.getValue();
        to_sell.value -= value;
        return -value;
    }

}

function add_to_trader_inventory(trader_key, items) {
    traders[trader_key].add_to_inventory(items);

    if(current_trader === trader_key) {
        update_displayed_trader_inventory();
    }
}

function remove_from_trader_inventory(trader_key, item_data) {
    traders[trader_key].remove_from_inventory(item_data);
    
    if(current_trader === trader_key) {
        update_displayed_trader_inventory();
    }
}

/**
 * @description for buying only !!
 * @param {*} selected_item {item, count}
 * @param {Boolean} is_stackable
 * @returns total value of items, including character haggling skill and trader profit margin
 */
function get_item_value(selected_item, is_stackable) {

    const profit_margin = 1 + (traders[current_trader].profit_margin - 1) * (1 - skills["Haggling"].get_level_bonus());
    if(is_stackable) {
        return Math.ceil(profit_margin * item_templates[selected_item.item.split(' #')[0]].getValue()) * selected_item.count;
    } else {
        const actual_item = traders[current_trader].inventory[selected_item.item.split(' #')[0]][selected_item.item.split(' #')[1]];
        return Math.ceil(profit_margin * actual_item.getValue());
    }
}

export {to_buy, to_sell, set_current_trader, current_trader, 
        start_trade, cancel_trade, accept_trade, exit_trade, 
        add_to_trader_inventory, remove_from_trader_inventory,
        add_to_buying_list, remove_from_buying_list,
        add_to_selling_list, remove_from_selling_list,
        is_in_trade};