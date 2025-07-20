"use strict";
import {round_item_price } from "./items.js";

const loot_sold_count = {};

const group_key_prefix = "type_";

//direct connections for resource trickle
const market_region_mapping = {
    "Village": ["Slums"],
};

//for easier management, make it symmetrical
Object.keys(market_region_mapping).forEach(region => {

    loot_sold_count[region] = {}; //also do this

    for(let i = 0; i < market_region_mapping[region].length; i++) {
        if(!market_region_mapping[market_region_mapping[region][i]]) {
            market_region_mapping[market_region_mapping[region][i]] = [region];
        } else {
            if(!market_region_mapping[market_region_mapping[region][i]].includes(region)) {
                market_region_mapping[market_region_mapping[region][i]].push(region);
            }
        }
    }
});

/**
 * sets the sold count, used for loading
 * @param {*} data 
 */
function set_loot_sold_count(data) {
    Object.keys(data).forEach(market_region_key => {
        loot_sold_count[market_region_key] = data[market_region_key];
    });
}

function recover_item_prices(flat_recovery=1, ratio_recovery = 0) {
    Object.keys(loot_sold_count).forEach(item_group_key => {
        for(let i = 0; i < loot_sold_count[item_group_key].length; i++) {

            //recovered stored as a separate value that cannot be larger than sold count;
            loot_sold_count[item_group_key][i].recovered += Math.max(ratio_recovery*(loot_sold_count[item_group_key][i].sold-loot_sold_count[item_group_key][i].recovered), flat_recovery);
            
            if(loot_sold_count[item_group_key][i].recovered > loot_sold_count[item_group_key][i].sold) {
                loot_sold_count[item_group_key][i].recovered = loot_sold_count[item_group_key][i].sold;
            }
        }
    });
}

/**
 * To be called with sold count already calculated elsewhere and just passed as an argument
 * @param {*} value only for rounding
 * @param {*} how_many_sold 
 * @returns 
 */
function get_loot_price_modifier({value, how_many_sold, group_key, group_tier}) {
    let modifier = 1;
    if(how_many_sold >= 999) {
        modifier = 0.1;
    } else if(how_many_sold) {
        modifier = modifier * 111/(111+how_many_sold);
    }
    return Math.round(value*modifier)/value;
}

/**
 * 
 * @param {Number} value
 * @param {Number} start_count 
 * @param {Number} how_many_to_sell 
 * @returns 
 */
function get_loot_price_modifier_multiple(value, start_count, how_many_to_sell) {
    let sum = 0;
    for(let i = start_count; i < start_count+how_many_to_sell; i++) {
        sum += get_loot_price_modifier(value, i);
    }
    return sum;
}

function get_item_value_with_market_saturation({base_value, group_key, group_tier, region}) {
    return Math.max(
            1, round_item_price(
                Math.ceil(
                    base_value * get_loot_price_modifier(
                        base_value,
                        (Math.max(
                            loot_sold_count[region][group_key]?.[group_tier]?.sold - loot_sold_count[region][group_key]?.[group_tier]?.recovered,0)||0
                        )
                    )
                )
            )
        );
}

/**
 * i.e. when selling
 */
function add_to_sold({group_key, group_tier, count, region}) {
    if(!loot_sold_count[region][group_key]) {
        loot_sold_count[region][group_key] = new Array(group_tier+1).fill({sold: 0, recovered: 0});
    }
    
    loot_sold_count[region][group_key][group_tier].sold += (count || 1);
}

/**
 * i.e. when buying
 */
function remove_from_sold({group_key, group_tier, count, region}) {
    if(!loot_sold_count[region][group_key]) {
        //since prices cannot increase, there's no point in getting negative values
        return;
    }
    loot_sold_count[region][group_key][group_tier].sold = Math.max(loot_sold_count[region][group_key][group_tier].sold - (count || 1),0);
    loot_sold_count[region][group_key][group_tier].recovered = Math.min(loot_sold_count[region][group_key][group_tier].recovered, loot_sold_count[region][group_key][group_tier].sold);
}

export {
    loot_sold_count, group_key_prefix,
    recover_item_prices, set_loot_sold_count, 
    get_loot_price_modifier, get_item_value_with_market_saturation,
    get_loot_price_modifier_multiple, market_region_mapping,
    add_to_sold, remove_from_sold
};