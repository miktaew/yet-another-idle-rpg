"use strict";
import {round_item_price } from "./items.js";

const loot_sold_count = {};

const group_key_prefix = "type_";

//direct connections for resource trickle
const market_regions = {};
const market_region_mapping = {
    "Village": ["Slums"],
};

//different caps for normal items and for equipment/components, with the first reaching 1/10th around 1000 sold and latter around 200 sold
const capped_at = 500;
const item_saturation_cap = capped_at - 1;
const item_saturation_param = Math.round(capped_at/9);

const equipment_capped_at = 200;
const equipment_saturation_cap = equipment_capped_at - 1;
const equipment_saturation_param = Math.round(equipment_capped_at/9);


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
 * fills loot_sold_count with keys from market_regions (added in locations which have regions assigned)
 */
function fill_market_regions() {
    Object.keys(market_regions).forEach(region => {
        loot_sold_count[region] = {};
    })
}

/**
 * sets the sold count, used for loading and for inter-region trickling
 * @param {*} data 
 */
function set_loot_sold_count(data) {
    Object.keys(data).forEach(market_region_key => {
        loot_sold_count[market_region_key] = {};
        Object.keys(data[market_region_key]).forEach(item_key => {
            loot_sold_count[market_region_key][item_key] = [];
            for(let i = 0; i < data[market_region_key][item_key].length; i++) {
                if(data[market_region_key][item_key][i].sold < 1e13) {
                    if(data[market_region_key][item_key][i].recovered == null) {
                        data[market_region_key][item_key][i].recovered = 0;
                    }
                    loot_sold_count[market_region_key][item_key].push({...data[market_region_key][item_key][i]});
                } else {
                    const sold = 1000;
                    const recovered = Math.min(1000, Math.round(1000 * (data[market_region_key][item_key][i].recovered/data[market_region_key][item_key][i].sold))) ?? 0;
                    loot_sold_count[market_region_key][item_key].push({sold, recovered});
                    console.warn(`Encountered a suspiciously large sold count of a trade group "${item_key}" at tier ${i} (${data[market_region_key][item_key][i].sold}).`
                        +` It has been reduced to a 1000, and it's recovered_count was lowered in proportion to it.`);
                }
            }
        });
    });
}

function recover_item_prices(flat_recovery=1, ratio_recovery = 0) {
    Object.keys(loot_sold_count).forEach(region_key => {
        Object.keys(loot_sold_count[region_key]).forEach(item_group_key => {
            for(let i = 0; i < loot_sold_count[region_key][item_group_key].length; i++) {

                //recovered stored as a separate value that cannot be larger than sold count;
                loot_sold_count[region_key][item_group_key][i].recovered += Math.max(ratio_recovery*(loot_sold_count[region_key][item_group_key][i].sold-loot_sold_count[region_key][item_group_key][i].recovered), flat_recovery);
                
                if(loot_sold_count[region_key][item_group_key][i].recovered > loot_sold_count[region_key][item_group_key][i].sold) {
                    loot_sold_count[region_key][item_group_key][i].recovered = loot_sold_count[region_key][item_group_key][i].sold;
                }                
            }
        });
    });
}

/**
 * Goes through all market regions, trickling their saturations at low rate from any region to all that are directly connected to it
 * @param {*} trickle_rate 
 */
function trickle_market_saturations(trickle_rate) {
    const new_sold_count = {};

    Object.keys(market_region_mapping).forEach(trade_region => {
        //go through regions

        const connections_count = market_region_mapping[trade_region].length;
        for(let i = 0; i < connections_count; i++) {
            //iterate through connected regions
            const connected_region = market_region_mapping[trade_region][i];
            new_sold_count[connected_region] = new_sold_count[connected_region] || {};
            new_sold_count[trade_region] = new_sold_count[trade_region] || {};

            Object.keys(loot_sold_count[trade_region] || {}).forEach(group_key => {
                //go through saturation groups

                new_sold_count[connected_region][group_key] = new_sold_count[connected_region][group_key] || [];
                new_sold_count[trade_region][group_key] = new_sold_count[trade_region][group_key] || [];
                //new_sold_count[trade_region][group_key] = [];
                for(let group_tier = 0; group_tier < loot_sold_count[trade_region][group_key].length; group_tier++) {
                    //go through saturation groups' tier
        
                    
                    const saturation_level = loot_sold_count[trade_region][group_key][group_tier].sold - loot_sold_count[trade_region][group_key][group_tier].recovered;
                    //saturation level, basis for what to move, calculated as a simple difference between sold and recovered

                    const total_value_to_move = Math.floor(saturation_level * trickle_rate);
                    loot_sold_count[trade_region][group_key][group_tier].sold -= total_value_to_move;
                    //reducing sold count in current by trickle rate (some fraction) * saturation level

                    const value_to_move = Math.floor(total_value_to_move / connections_count);
                    //and dividing by connection count, to distribute evenly

                    if(!new_sold_count[trade_region][group_key][group_tier]) {
                        new_sold_count[trade_region][group_key][group_tier] = {...loot_sold_count[trade_region][group_key][group_tier]};
                    } else {
                        new_sold_count[trade_region][group_key][group_tier].sold -= total_value_to_move;
                    }

                    if(!new_sold_count[connected_region][group_key][group_tier]) {
                        if(loot_sold_count[connected_region]?.[group_key]?.[group_tier]) {
                            new_sold_count[connected_region][group_key][group_tier] = {...loot_sold_count[connected_region][group_key][group_tier]};
                        } else {
                            new_sold_count[connected_region][group_key][group_tier] = {sold: 0, recovered: 0};
                        }
                    }
                    
                    new_sold_count[connected_region][group_key][group_tier].sold += value_to_move;
                }
            });
        }
    });

    set_loot_sold_count(new_sold_count);
    //actually assign the newly calculated values
}

/**
 * To be called with sold count already calculated elsewhere and just passed as an argument
 * @param {*} value only for rounding
 * @param {*} how_many_sold 
 * @returns 
 */
function get_loot_price_modifier({is_group, value, how_many_sold}) {
    let modifier = 1;
    let modifier_caps_at;
    let param;
    if(is_group) {
        modifier_caps_at = equipment_saturation_cap;
        param = equipment_saturation_param;
    } else {
        modifier_caps_at = item_saturation_cap;
        param = item_saturation_param;
    }

    if(how_many_sold >= modifier_caps_at) {
        modifier = 0.1;
    } else if(how_many_sold > 0) {
        modifier = modifier * param/(param+how_many_sold);
    }
    //no case for negatives, prices don't go above the starting values

    return Math.round(value*modifier)/value;
}

/**
 * calculates total saturation of group in a provided region, including items of both lower and higher tier
 * @param {*} param0 
 * @returns 
 */
function get_total_tier_saturation({ region, group_key, group_tier }) {
    if(!loot_sold_count[region][group_key]) {
        return 0;
    }

    const sold_by_tier = [];
    for(let i = 0; i < loot_sold_count[region][group_key]?.length; i++) {
        sold_by_tier[i] = Math.max(0,loot_sold_count[region][group_key][i].sold - loot_sold_count[region][group_key][i].recovered);
    }

    const cap = group_key.startsWith(group_key_prefix)?equipment_capped_at:capped_at;
    return calculate_total_saturation({sold_by_tier, target_tier:group_tier, cap});
}

/**
 * calculates saturation for provided sold counts
 * @param {} param0 
 * @returns 
 */
function calculate_total_saturation({sold_by_tier, target_tier, cap}) {
    if(!sold_by_tier) {
        return 0;
    }
    let count = 0;
    for(let i = target_tier - 1; i >= 0; i--) {
        //x0.25 for each tier going down
        count += Math.max(sold_by_tier[i] ?? 0)*0.1**(target_tier-i);
    }
    
    //lower tier impact capped at eight of the cap
    count = Math.min(cap/8, count);
    count += (sold_by_tier[target_tier] ?? 0);

    for(let i = target_tier + 1 ; i < sold_by_tier.length; i++) {
        //x1 for each tier going down
        count += Math.max(sold_by_tier[i] ?? 0);
    }
    return count;
}

/**
 * @param {Object} data
 * @param {Number} data.value
 * @param {Number} data.start_count
 * @param {Number} data.how_many_to_sell
 * @returns 
 */
function get_loot_price_multiple({value, start_count, how_many_to_trade, is_group, is_selling = true, stop_multiplier_at}) {
    let sum = 0;
    if(is_selling) {
        /*
        for(let i = start_count; i < start_count+how_many_to_trade; i++) {
            sum += round_item_price(value*get_loot_price_modifier({value, how_many_sold: Math.min(start_count+stop_multiplier_at,i), is_group}));
        }
        */
        for(let i = 0; i < how_many_to_trade; i++) {
            sum += round_item_price(value*get_loot_price_modifier({value, how_many_sold: Math.min(start_count+stop_multiplier_at,i+start_count), is_group}));
        }
    } else {
        /*
        for(let i = start_count; i > start_count-how_many_to_trade; i--) {
            sum += round_item_price(value*get_loot_price_modifier({value, how_many_sold: Math.min(start_count+stop_multiplier_at,Math.max(i,0)), is_group}));
        }
        */
        for(let i = 0; i > -how_many_to_trade; i--) {
            sum += round_item_price(value*get_loot_price_modifier({value, how_many_sold: Math.min(start_count+stop_multiplier_at,Math.max(i+start_count,0)), is_group}));
        }
    }
    
    return sum;
}

function get_item_value_with_market_saturation({value, group_key, group_tier, region}) {

    const how_many_sold = get_total_tier_saturation({region, group_key, group_tier});
    return Math.max(
            1, round_item_price(
                    value * get_loot_price_modifier({value: value, how_many_sold, is_group: group_key.startsWith(group_key_prefix)})
            )
        );
}

/**
 * i.e. when selling
 */
function add_to_sold({group_key, group_tier, count, region}) {
    if(!loot_sold_count[region][group_key]) {
        loot_sold_count[region][group_key] = new Array(group_tier+1).fill().map(x => ({sold: 0, recovered: 0}));
    }
    if(!loot_sold_count[region][group_key][group_tier]) {
        loot_sold_count[region][group_key].push(...new Array(group_tier+1-loot_sold_count[region][group_key].length).fill().map(x => ({sold: 0, recovered: 0})));
    }

    loot_sold_count[region][group_key][group_tier].sold += (count || 1);
}

/**
 * i.e. when buying
 */
function remove_from_sold({group_key, group_tier, count, region}) {
    if(!loot_sold_count[region][group_key] || !loot_sold_count[region][group_key][group_tier]) {
        //since prices cannot increase, there's no point in getting negative values
        return;
    }
    loot_sold_count[region][group_key][group_tier].sold = Math.max(loot_sold_count[region][group_key][group_tier].sold - (count || 1),0);
    loot_sold_count[region][group_key][group_tier].recovered = Math.min(loot_sold_count[region][group_key][group_tier].recovered, loot_sold_count[region][group_key][group_tier].sold);
}

export {
    loot_sold_count, group_key_prefix,
    recover_item_prices, trickle_market_saturations, market_region_mapping,
    set_loot_sold_count,
    get_loot_price_modifier, get_loot_price_multiple,
    get_item_value_with_market_saturation,
    add_to_sold, remove_from_sold,
    get_total_tier_saturation, calculate_total_saturation,
    capped_at, equipment_capped_at,
    market_regions, fill_market_regions
};