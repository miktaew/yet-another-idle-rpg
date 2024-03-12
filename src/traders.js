"use strict";

import { current_game_time } from "./game_time.js";
import { InventoryHaver } from "./inventory.js";
import { item_templates, getItem} from "./items.js";
import { skills } from "./skills.js";

var traders = {};
var inventory_templates = {};


class Trader extends InventoryHaver {
    constructor({name,
                 trade_text = `Trade with ${name}`,
                 location_name,
                 refresh_time = 7,
                 refresh_shift = 0,
                 inventory_template,
                 profit_margin = 2
                }) 
    {
        super();
        this.name = name;
        this.trade_text = trade_text;
        this.location_name = location_name;
        this.last_refresh = -1;  
        //just the day_count from game_time at which trader was supposedly last refreshed

        this.refresh_time = refresh_time; 
        //7 would mean it's refreshed every 7 days (with shift at 0 it's every monday)
        
        this.refresh_shift = refresh_shift; 
        //shift refreshing days, e.g. time 7 + shift 2 would be every wednesday, shift 4 would push it to every friday
        //pretty much pointless if refresh time is not N*7
        
        this.inventory_template = inventory_template;
        //a template for the trader to use, so multiple traders can have same predefined item selection (but still separate and with certain randomness)

        this.profit_margin = profit_margin;
        //how much more expensive are the trader's items than their actual value, with default being 2 (so 2x more)
        //don't make it too low to prevent easy xp grinding for the haggling skill
    }
    
    /**
     * refreshes trader inventory
     * @returns boolean informing if it was able to refresh
     */
    refresh() {
        if (this.can_refresh()) {
            //refresh inventory
            this.inventory = this.get_inventory_from_template();

            this.last_refresh = (current_game_time.day_count + 1 - current_game_time.day_count % this.refresh_time);
            return true;
        }
        //otherwise do nothing
        return false;
    };

    /**
     * checks if enough time passed since last refresh
     * @returns {Boolean}
     */
    can_refresh() {
        return (this.last_refresh < 0 || current_game_time.day_count - (this.last_refresh + this.refresh_shift) >= this.refresh_time);
    };

    /**
     * creates new choice of items for the trader, based on assigned inventory template
     * @returns {null}
     */
    get_inventory_from_template() {
        const inventory = {};
        const inventory_template = inventory_templates[this.inventory_template];

        for (let i = 0; i < inventory_template.length; i++) {
            if (inventory_template[i].chance >= Math.random()) {
                var item_count = inventory_template[i].count.length == 1 ?
                    inventory_template[i].count[0] : Math.round(Math.random() *
                        (inventory_template[i].count[1] - inventory_template[i].count[0]) + inventory_template[i].count[0]);

                if (item_templates[inventory_template[i].item_name].stackable) { 
                    //stackable, so add one object with item_count
                    inventory[inventory_template[i].item_name] = { item: getItem(item_templates[inventory_template[i].item_name]), count: item_count };
                }
                else { 
                    //unstackable, so add array of n items, with random quality if applicable
                    inventory[inventory_template[i].item_name] = inventory[inventory_template[i].item_name] || [];
                    for (let j = 0; j < item_count; j++) {
                        let item = getItem(item_templates[inventory_template[i].item_name]);
                        if(inventory_template[i].quality) {
                            item.quality = Math.round(100 * (Math.random() *
                                (inventory_template[i].quality[1] - inventory_template[i].quality[0]) + inventory_template[i].quality[0])) / 100;
                        }
                        inventory[inventory_template[i].item_name].push(item);
                    }
                }
            }
        }

        //just add items based on their chances and counts in inventory_template
        return inventory;
    };

    /**
     * 
     * @returns {Number} trader's profit margin multiplied by bonus from the haggling skill
     */
    getProfitMargin() {
        return 1 + (this.profit_margin - 1) * (1 - skills["Haggling"].get_level_bonus());
    }

    getItemPrice(value) {
        let price = Math.ceil(value*this.getProfitMargin());
        if(price >= 100) {
            return Math.round(price/10)*10;
        } else if(price >= 1000) {
            return Math.round(price/100)*100;
        } else {
            return price;
        }
    }
}

class TradeItem {
    constructor({ item_name,
                  chance = 1,
                  count = [1],
                  quality = [0.2, 0.8]
                }) 
    {
        this.item_name = item_name;
        this.chance = chance; //chance for item to appear, 1 is 100%
        this.count = count; 
        //how many can appear, will randomly choose something between min and max if specificed, otherwise will go with specific ammount
        
        this.quality = quality; //min and max quality of item
    }
}

traders["village trader"] = new Trader({
    name: "village trader",
    inventory_template: "Basic",
    is_unlocked: false,
    location_name: "Village",
});
inventory_templates["Basic"] = 
[
        new TradeItem({item_name: "Cheap iron spear", count: [1], quality: [0.4, 0.9], chance: 0.8}),
        new TradeItem({item_name: "Cheap iron dagger", count: [1], quality: [0.4, 0.9], chance: 0.8}),
        new TradeItem({item_name: "Cheap iron sword", count: [1], quality: [0.4, 0.9], chance: 0.8}),
        new TradeItem({item_name: "Cheap iron axe", count: [1], quality: [0.4, 0.9], chance: 0.8}),
        new TradeItem({item_name: "Cheap iron battle hammer", count: [1], quality: [0.4, 0.9], chance: 0.8}),

        new TradeItem({item_name: "Cheap iron spear", count: [1], quality: [0.91, 1.2], chance: 0.4}),
        new TradeItem({item_name: "Cheap iron dagger", count: [1], quality: [0.91, 1.2], chance: 0.4}),
        new TradeItem({item_name: "Cheap iron sword", count: [1], quality: [0.91, 1.2], chance: 0.4}),
        new TradeItem({item_name: "Cheap iron axe", count: [1], quality: [0.91, 1.2], chance: 0.4}),
        new TradeItem({item_name: "Cheap iron battle hammer", count: [1], quality: [0.91, 1.2], chance: 0.4}),

        new TradeItem({item_name: "Cheap wooden shield", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap wooden shield", count: [1], chance: 0.8, quality: [0.91, 1.2]}),
        new TradeItem({item_name: "Crude wooden shield", count: [1], chance: 0.7, quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Crude wooden shield", count: [1], chance: 0.4, quality: [0.91, 1.2]}),

        new TradeItem({item_name: "Cheap leather vest", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap leather vest", count: [1], chance: 0.5, quality: [0.91, 1.2]}),
        new TradeItem({item_name: "Cheap leather pants", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap leather pants", count: [1], chance: 0.5, quality: [0.91, 1.2]}),

        new TradeItem({item_name: "Stale bread", count: [4,10]}),
        new TradeItem({item_name: "Fresh bread", count: [2,5]}),
        new TradeItem({item_name: "Weak healing powder", count: [2,5]}),

        new TradeItem({item_name: "ABC for kids", count: [1], chance: 1}),
        new TradeItem({item_name: "Old combat manual", count: [1], chance: 0.5}),
];

export {traders};