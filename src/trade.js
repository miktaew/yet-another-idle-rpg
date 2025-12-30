"use strict";

import { traders } from "./traders.js";
import { update_displayed_trader, update_displayed_trader_inventory, 
         update_displayed_character_inventory, exit_displayed_trade, update_displayed_money } from "./display.js";
import { add_to_character_inventory, remove_from_character_inventory } from "./character.js";
import { skills } from "./skills.js";
import { getItemFromKey } from "./items.js";
import { add_to_sold, calculate_total_saturation, capped_at, equipment_capped_at, group_key_prefix, remove_from_sold } from "./market_saturation.js";
import { character } from "./character.js";
import { add_xp_to_skill, current_location } from "./main.js";
import { round_item_price } from "./misc.js";

let current_trader = null;
const to_sell = {value: 0, items: [], groups: {}};
const to_buy = {value: 0, items: [], groups: {}};

/*
{
    items: [],
    value: Number,
    groups: {
        group_key: {
            count: [] //index = group tier
            needs_resort: Boolean
            unsorted: [] //same as items ({item_key:item_count}) but split by groups
            sorted: [] //'unsorted' but sorted by tier and then value
            group_value: Number
        },
    }
}
*/

class TradeGroupContent {
    constructor(group_tier) {
        this.count = new Array(group_tier + 1).fill(0),
        this.needs_resort = false,
        this.unsorted = [],
        this.sorted = [],
        this.group_value = 0;
    }
}

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
    update_displayed_character_inventory({is_trade: true});
}

function cancel_trade() {

    to_buy.items = [];
    to_buy.groups = {};
    to_buy.value = 0;
    to_sell.items = [];
    to_sell.groups = {};
    to_sell.value = 0;

    update_displayed_character_inventory({is_trade: true});
    update_displayed_trader_inventory();
}

function accept_trade() {

    let new_balance;
    
    if(to_sell.items.length == 0 && to_buy.items.length == 0) {
        new_balance = character.money;
    } else {
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

            const trade_item = to_buy.items.pop();
            
            trade_item.item_count = trade_item.count;
            to_remove.push(trade_item);

            item_list.push({item_key: trade_item.item_key, count: trade_item.count});

            const item = getItemFromKey(trade_item.item_key);
            const {group_key, group_tier} = item.getMarketSaturationGroup();
            if(item.saturates_market) {
                remove_from_sold({group_key, group_tier, count: trade_item.count, region: current_location.market_region});
            }
        }
        
        if(to_remove.length > 0) {
            add_to_character_inventory(item_list);
            remove_from_trader_inventory(current_trader,to_remove);

            for(let i = 0; i < item_list.length; i++) {
                //update (remove) single item from display
                update_displayed_character_inventory({item_key: item_list[i].item_key});
            }
        }
        

        item_list = []; //totally could reduce it to 1 array instead of 2 if I made param naming more consistent, maybe one day
        to_remove = [];

        while(to_sell.items.length > 0) {
            //remove from character inventory
            //add to trader inventory
            
            const trade_item = to_sell.items.pop();
            
            trade_item.item_count = trade_item.count;
            to_remove.push(trade_item);

            item_list.push({item_key: trade_item.item_key, count: trade_item.count});
        
            const item = getItemFromKey(trade_item.item_key);
            const {group_key, group_tier} = item.getMarketSaturationGroup();
            if(item.saturates_market) {
                add_to_sold({group_key, group_tier, count: trade_item.count, region: current_location.market_region});
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

    add_xp_to_skill({skill: skills["Haggling"], xp_to_add: (to_sell.value + to_buy.value)/10, cap_gained_xp: false});
    //xp not capped for this one

    to_buy.value = 0;
    to_buy.groups = {};
    to_sell.value = 0;
    to_sell.groups = {};


    update_displayed_character_inventory({is_trade: true});
    update_displayed_trader_inventory();
    update_displayed_money();
}

function exit_trade() {
    current_trader = null;
    to_buy.items = [];
    to_buy.groups = {};
    to_buy.value = 0;
    to_sell.items = [];
    to_sell.groups = {};
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
    const item = getItemFromKey(selected_item.item_key);
    const {group_key, group_tier} = item.getMarketSaturationGroup();
    const present_item = to_buy.items.find(a => a.item_key === selected_item.item_key);
    
    let actual_number_to_add = selected_item.count;
    let item_count_in_trader = traders[current_trader].inventory[selected_item.item_key].count;

    if(present_item) { //there's already some in to_buy
        if(item_count_in_trader - present_item.count < selected_item.count) {
            //trying to buy more than trader has left, so just put all in the buy list
            actual_number_to_add = item_count_in_trader - present_item.count;
            present_item.count = item_count_in_trader;
        } else {
            present_item.count += actual_number_to_add;
        }

        to_buy.groups[group_key].count[group_tier] += actual_number_to_add;
        to_buy.groups[group_key].unsorted.find(x => selected_item.item_key === x.item_key).count += actual_number_to_add;
        //no need to increase value in sorted, it's part of the same object and will be affected
    } else { //it's not yet in to_buy
        if(item_count_in_trader < selected_item.count) { 
            //trader has not enough: buy all available
            selected_item.count = item_count_in_trader;
        }

        if(!to_buy.groups[group_key]) {
            to_buy.groups[group_key] = new TradeGroupContent(group_tier);
        } else if(to_buy.groups[group_key].count.length < (group_tier + 1)) {
            to_buy.groups[group_key].count.push(...new Array(group_tier + 1 - to_buy.groups[group_key].count.length).fill(0));
        }

        to_buy.items.push(selected_item);
        to_buy.groups[group_key].unsorted.push({...selected_item});

        //increase overall tier count, mark as needing a resorting
        to_buy.groups[group_key].count[group_tier] += selected_item.count;
        to_buy.groups[group_key].needs_resort = true;
    }

    return calculate_total_values();
}

/**
 * @param {} selected_item 
 * {item_key: {string with value of data- attribute}, count: Number}
 * @returns {Number} change of trade value
 */
function remove_from_buying_list(selected_item) {
    const item = getItemFromKey(selected_item.item_key);
    const {group_key, group_tier} = item.getMarketSaturationGroup();

    let actual_number_to_remove = selected_item.count;
    
    const present_item = to_buy.items.find(a => a.item_key === selected_item.item_key);
    if(present_item?.count < actual_number_to_remove) {
        actual_number_to_remove = present_item.count;
    }

    //trying to remove something not in list -> error
    if(!to_buy.groups[group_key] || to_buy.groups[group_key].count.length < (group_tier + 1)) {
        throw new Error(`Tried to remove an item of trade group '${group_key}:${group_tier}' from the buying list, but nothing of such group was present in it!`);
    }
    //trying to remove more than present -> error
    if(to_buy.groups[group_key].count[group_tier] < actual_number_to_remove) {
        throw new Error(`Tried to remove an item of trade group '${group_key}:${group_tier}' from the buying list, but provided count of '${actual_number_to_remove}' would lead to a negative number!`);
    }

    if(present_item?.count > selected_item.count) { //more than to remove, use the provided count
        present_item.count -= actual_number_to_remove;
        to_buy.groups[group_key].unsorted.find(x => selected_item.item_key === x.item_key).count -= actual_number_to_remove;
        //no need to decrease value in sorted, it's part of the same object and will be affected
    } else { //less than to remove, so just remove all
        actual_number_to_remove = present_item.count;
        present_item.count = 0;

        to_buy.items.splice(to_buy.items.indexOf(present_item), 1);
        to_buy.groups[group_key].unsorted = to_buy.groups[group_key].unsorted.filter(x => selected_item.item_key !== x.item_key);
        to_buy.groups[group_key].sorted = to_buy.groups[group_key].sorted.filter(x => selected_item.item_key !== x.item_key);
    }

    to_buy.groups[group_key].count[group_tier] -= actual_number_to_remove;

    return calculate_total_values();
}

function is_in_trade() {
    return Boolean(current_trader);
}

function add_to_selling_list(selected_item) {
    const item = getItemFromKey(selected_item.item_key);
    const {group_key, group_tier} = item.getMarketSaturationGroup();

    const present_item = to_sell.items.find(a => a.item_key === selected_item.item_key);
    //find if item is already present in the sell list

    let item_count_in_player = character.inventory[selected_item.item_key].count;

    if(present_item) {
        //item present in to_sell -> increase its count, up to what player has in inventory

        if(item_count_in_player - present_item.count < selected_item.count) {
            //trying to sell more that remains in inventory, so just add everything
            selected_item.count = item_count_in_player - present_item.count;
            present_item.count = item_count_in_player;
        } else {
            present_item.count += selected_item.count;
        }

        //increase overall tier count and specific counts in unsorted and sorted
        to_sell.groups[group_key].count[group_tier] += selected_item.count;
        to_sell.groups[group_key].unsorted.find(x => selected_item.item_key === x.item_key).count += selected_item.count;
        //no need to increase value in sorted, it's part of the same object and will be affected
    } else { 
        //item not present in to_sell, add it and do other necessary stuff

        if(item_count_in_player < selected_item.count) { 
            //character has not enough: sell all available
            selected_item.count = item_count_in_player;
        }

        if(!to_sell.groups[group_key]) {
            to_sell.groups[group_key] = new TradeGroupContent(group_tier);
        } else if(to_sell.groups[group_key].count.length < (group_tier + 1)) {
            to_sell.groups[group_key].count.push(...new Array(group_tier + 1 - to_sell.groups[group_key].count.length).fill(0));
        }

        to_sell.items.push(selected_item);
        to_sell.groups[group_key].unsorted.push({...selected_item});

        //increase overall tier count, mark as needing a resorting
        to_sell.groups[group_key].count[group_tier] += selected_item.count;
        to_sell.groups[group_key].needs_resort = true;
    }
    return calculate_total_values();
}

function remove_from_selling_list(selected_item) {
    const item = getItemFromKey(selected_item.item_key);
    const {group_key, group_tier} = item.getMarketSaturationGroup();

    let actual_number_to_remove = selected_item.count;

    const present_item = to_sell.items.find(a => a.item_key === selected_item.item_key);
    if(present_item?.count < actual_number_to_remove) {
        actual_number_to_remove = present_item.count;
    }

    //trying to remove something not in list -> error
    if(!to_sell.groups[group_key] || to_sell.groups[group_key].count.length < (group_tier + 1)) {
        throw new Error(`Tried to remove an item of trade group '${group_key}:${group_tier}' from the selling list, but nothing of such group was present in it!`);
    }
    //trying to remove more than present -> error
    if(to_sell.groups[group_key].count[group_tier] < actual_number_to_remove) {
        throw new Error(`Tried to remove an item of trade group '${group_key}:${group_tier}' from the selling list, but provided count of '${actual_number_to_remove}' would lead to a negative number!`);
    }
    
    if(present_item?.count > selected_item.count) { //more than to remove, use the provided count
        present_item.count -= actual_number_to_remove;
        to_sell.groups[group_key].unsorted.find(x => selected_item.item_key === x.item_key).count -= actual_number_to_remove;
        //no need to decrease value in sorted, it's part of the same object and will be affected
    } else { //less than to remove, so just remove all
        actual_number_to_remove = present_item.count;
        present_item.count = 0;

        to_sell.items.splice(to_sell.items.indexOf(present_item), 1);
        to_sell.groups[group_key].unsorted = to_sell.groups[group_key].unsorted.filter(x => selected_item.item_key !== x.item_key);
        to_sell.groups[group_key].sorted = to_sell.groups[group_key].sorted.filter(x => selected_item.item_key !== x.item_key);
    }

    to_sell.groups[group_key].count[group_tier] -= actual_number_to_remove;

    return calculate_total_values();
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
 * calculates total values of to_sell and to_buy, taking market saturation into account
 */
function calculate_total_values() {
    /*
        {
            items: [],
            value: Number,
            groups: {
                group_key: {
                    count: [] //index = group tier
                    needs_resort: Boolean
                    unsorted: [] //same as items but split by groups
                    sorted: [] //'unsorted' but sorted by tier and then value
                    group_value: Number
                },
            }
        }
    */

    const traded_groups = {buying_precalculated: {}, selling: {}, buying: {}};
    to_buy.value = 0;
    to_sell.value = 0;


    ///////////////////////////////////////////////
    //precalculate buying count for use in selling
    //selling count for use in buying will be just calculated in selling, so no need

    Object.keys(to_buy.groups).forEach(group_key => {
        if(!traded_groups.buying_precalculated[group_key]) {
            traded_groups.buying_precalculated[group_key] = [];
        }

        for(let i = 0; i < to_buy.groups[group_key].sorted.length; i++) {
            const item = getItemFromKey(to_buy.groups[group_key].sorted[i].item_key);
            const {group_tier} = item.getMarketSaturationGroup();

            //array too short compared to tier: push a spreaded array with the length of how much is missing, filled with zeroes
            if(traded_groups.buying_precalculated[group_key].length < group_tier + 1) {
                traded_groups.buying_precalculated[group_key].push(...new Array(group_tier + 1 - traded_groups.buying_precalculated[group_key].length).fill(0));
            }

            //and then just increase tier count
            traded_groups.buying_precalculated[group_key][group_tier] += to_buy.groups[group_key].sorted[i].count;
        }
    });

    ///////////////////////////////////////////////////////
    //go through both categories and calculate their values

    Object.keys(to_sell.groups).forEach(traded_group_key => {
        to_sell.groups[traded_group_key].group_value = 0;
        traded_groups.selling[traded_group_key] = [];

        if(to_sell.groups[traded_group_key].needs_resort) {
            to_sell.groups[traded_group_key].sorted = to_sell.groups[traded_group_key].unsorted.sort((a,b) => sort_traded_items(a,b)); 

            to_sell.groups[traded_group_key].needs_resort = false;
        }

        
        for(let i = 0; i < to_sell.groups[traded_group_key].sorted.length; i++) {
            const item = getItemFromKey(to_sell.groups[traded_group_key].sorted[i].item_key);
            const {group_tier, group_key} = item.getMarketSaturationGroup();

            let trade_cap;
            if(group_key.startsWith(group_key_prefix)) {
                trade_cap = equipment_capped_at;
            } else {
                trade_cap = capped_at;
            }

            //grab both saturations beforehand, to avoid unnecessary recalc (those are not total, just for current trade)
            const sold_saturation = calculate_total_saturation({sold_by_tier: traded_groups.selling[traded_group_key], target_tier: group_tier, cap: trade_cap});
            const bought_saturation = calculate_total_saturation({sold_by_tier: traded_groups.buying_precalculated[traded_group_key], target_tier: group_tier, cap: trade_cap});

            /*
            increase value by value of however many there is of specific item
            additional traded count: what's being sold from same group (and is already processed)
            stop_multiplier_at: difference in counts, as only count over that difference should be subject to saturation
            */
            to_sell.groups[traded_group_key].group_value 
                                    += item.getValueOfMultiple({
                                        additional_traded_count: sold_saturation,
                                        stop_multiplier_at: Math.max(0,sold_saturation-bought_saturation+to_sell.groups[traded_group_key].sorted[i].count),
                                        count: to_sell.groups[traded_group_key].sorted[i].count,
                                        region: current_location.market_region,
                                    });

            //array too short compared to tier: push a spreaded array with the length of how much is missing, filled with zeroes                        
            if(traded_groups.selling[traded_group_key].length < group_tier + 1) {
                traded_groups.selling[traded_group_key].push(...new Array(group_tier + 1 - traded_groups.selling[traded_group_key].length).fill(0));
            }

            //and then just increase tier count so that other stuff can take already processed items into account
            //also used for processing of to_buy
            traded_groups.selling[traded_group_key][group_tier] += to_sell.groups[traded_group_key].sorted[i].count;
        }

        to_sell.value += to_sell.groups[traded_group_key].group_value;
    });

    Object.keys(to_buy.groups).forEach(traded_group_key => {
        to_buy.groups[traded_group_key].group_value = 0;

        traded_groups.buying[traded_group_key] = [];

        if(to_buy.groups[traded_group_key].needs_resort) {
            to_buy.groups[traded_group_key].sorted = to_buy.groups[traded_group_key].unsorted.sort((a,b) => sort_traded_items(a,b));

            to_buy.groups[traded_group_key].needs_resort = false;
        }

        for(let i = 0; i < to_buy.groups[traded_group_key].sorted.length; i++) {
            const item = getItemFromKey(to_buy.groups[traded_group_key].sorted[i].item_key);
            const {group_tier, group_key} = item.getMarketSaturationGroup();

            let trade_cap;
            if(group_key.startsWith(group_key_prefix)) {
                trade_cap = equipment_capped_at;
            } else {
                trade_cap = capped_at;
            }
            //grab both saturations beforehand, to avoid unnecessary recalc
            const sold_saturation = calculate_total_saturation({sold_by_tier: traded_groups.selling[traded_group_key], target_tier: group_tier, cap: trade_cap});
            const bought_saturation = calculate_total_saturation({sold_by_tier: traded_groups.buying[traded_group_key], target_tier: group_tier, cap: trade_cap});

            /*
            increase value by value of however many there is of specific item
            additional traded count: what's being bought from same group
            stop_multiplier_at: difference in counts, as only count over that difference should be subject to saturation
            */
            
            to_buy.groups[group_key].group_value 
                                    += item.getValueOfMultiple({
                                        additional_traded_count: -bought_saturation,
                                        stop_multiplier_at: Math.max(0,sold_saturation-bought_saturation-to_buy.groups[traded_group_key].sorted[i].count),
                                        count: to_buy.groups[traded_group_key].sorted[i].count,
                                        region: current_location.market_region,
                                        price_multiplier: traders[current_trader].getProfitMargin(),
                                        is_selling: false,
                                    });

            //array too short compared to tier: push a spreaded array with the length of how much is missing, filled with zeroes
            if(traded_groups.buying[traded_group_key].length < group_tier + 1) {
                traded_groups.buying[traded_group_key].push(...new Array(group_tier + 1 - traded_groups.buying[traded_group_key].length).fill(0));
            }

            //and then just increase tier count
            traded_groups.buying[traded_group_key][group_tier] += to_buy.groups[traded_group_key].sorted[i].count;
        }

        to_buy.value += to_buy.groups[traded_group_key].group_value;
    });

    return  to_sell.value - to_buy.value;
}

/**
 * @description calculates item value based on current trader, does not take market saturation into account
 * @param {*} selected_item {item, count}
 * @param {Boolean} is_stackable
 * @returns total value of items, including character haggling skill and trader profit margin
 */
function get_item_value(selected_item) {
    const profit_margin = traders[current_trader].getProfitMargin();

    const item = getItemFromKey(selected_item.item_key);

    return round_item_price(profit_margin * item.getValue({quality: item.quality, region: current_location.market_region})) * selected_item.count;
}

/**
 * sorts by tier, then by value, in descending order
 * */
function sort_traded_items(a,b) {
    const item_a = getItemFromKey(a.item_key);
    const item_b = getItemFromKey(b.item_key);
    const tier_a = item_a.getMarketSaturationGroup().group_tier;
    const tier_b = item_b.getMarketSaturationGroup().group_tier;
    if(tier_a != tier_b) {
        return tier_b - tier_a;
    } else {
        return item_b.getBaseValue() - item_a.getBaseValue();
    }
}

export {to_buy, to_sell, set_current_trader, current_trader, 
        start_trade, cancel_trade, accept_trade, exit_trade, 
        add_to_trader_inventory, remove_from_trader_inventory,
        add_to_buying_list, remove_from_buying_list,
        add_to_selling_list, remove_from_selling_list,
        is_in_trade};