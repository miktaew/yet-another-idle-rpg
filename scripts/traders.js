import { current_game_time } from "./game_time.js";
import { InventoryHaver } from "./inventory.js";
import { item_templates, getItem } from "./items.js";

var traders = {};
var inventory_templates = {};


class Trader extends InventoryHaver {
    constructor(trader_data) {
        super();
        this.trade_text = trader_data.trade_text || `Trade with ${trader_data.name}`;
        this.name = trader_data.name;
        this.location_name = trader_data.location_name;
        this.last_refresh = -1; //just the day_count from game_time at which trader was supposedly last refreshed
        this.refresh_time = trader_data.refresh_time || 7;
        //7 would mean it's refreshed every 7 days (with shift at 0 it's every monday)
        this.refresh_shift = trader_data.refresh_shift || 0;
        //shift refreshing days, e.g. time 7 + shift 2 would be wednesday, shift 4 would push it to fridays
        //pretty much pointless if refresh time is not 7 (or it's multiple)
        this.inventory_template = trader_data.inventory_template;

        //how much more expensive are the trader's items than their actual value, with default being 2 (so 2x more)
        this.profit_margin = trader_data.profit_margin || 2;
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

    can_refresh() {
        return (this.last_refresh < 0 || current_game_time.day_count - (this.last_refresh + this.refresh_shift) >= this.refresh_time);
        //if enough time passed since last refresh
    };

    get_inventory_from_template() {
        const inventory = {};
        const inventory_template = inventory_templates[this.inventory_template];

        for (let i = 0; i < inventory_template.length; i++) {
            if (inventory_template[i].chance >= Math.random()) {
                var item_count = inventory_template[i].count.length == 1 ?
                    inventory_template[i].count[0] : Math.round(Math.random() *
                        (inventory_template[i].count[1] - inventory_template[i].count[0]) + inventory_template[i].count[0]);

                if (item_templates[inventory_template[i].item_name].stackable) { //stackable, so add one object with item_count
                    inventory[inventory_template[i].item_name] = { item: getItem(item_templates[inventory_template[i].item_name]), count: item_count };
                }
                else { //unstackable, so add array of n items, each with random quality
                    inventory[inventory_template[i].item_name] = inventory[inventory_template[i].item_name] || [];
                    for (let j = 0; j < item_count; j++) {
                        let item = getItem(item_templates[inventory_template[i].item_name]);
                        item.quality = Math.round(100 * (Math.random() *
                            (inventory_template[i].quality[1] - inventory_template[i].quality[0]) + inventory_template[i].quality[0])) / 100;

                        inventory[inventory_template[i].item_name].push(item);
                    }
                }
            }
        }

        //just add items based on their chances and counts in inventory_template
        return inventory;
    };
}

function TradeItem(trade_item_data) {
    this.item_name = trade_item_data.item_name;
    this.chance = typeof trade_item_data.chance !== "undefined"? trade_item_data.chance : 1; //chance for item to appear, 1 is 100%
    this.count = typeof trade_item_data.count !== "undefined"? trade_item_data.count : [1]; 
    //how many can appear, will randomly choose something between min and max
    this.quality = typeof trade_item_data.quality !== "undefined"? trade_item_data.quality : [0.2, 0.8]; 
    //min and max quality of item

}

traders["village trader"] = new Trader({
    name: "village trader",
    inventory_template: "Basic",
    is_unlocked: false,
    location_name: "Village",
});
inventory_templates["Basic"] = 
[
        new TradeItem({item_name: "Cheap iron spear", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap iron dagger", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap iron sword", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap iron axe", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap iron battle hammer", count: [1], quality: [0.4, 0.9]}),

        new TradeItem({item_name: "Cheap iron spear", count: [1], quality: [0.91, 1.2], chance: 0.5}),
        new TradeItem({item_name: "Cheap iron dagger", count: [1], quality: [0.91, 1.2], chance: 0.5}),
        new TradeItem({item_name: "Cheap iron sword", count: [1], quality: [0.91, 1.2], chance: 0.5}),
        new TradeItem({item_name: "Cheap iron axe", count: [1], quality: [0.91, 1.2], chance: 0.5}),
        new TradeItem({item_name: "Cheap iron battle hammer", count: [1], quality: [0.91, 1.2], chance: 0.5}),

        new TradeItem({item_name: "Cheap wooden shield", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap wooden shield", count: [1], chance: 0.5, quality: [0.91, 1.2]}),
        new TradeItem({item_name: "Crude wooden shield", count: [1], chance: 0.4, quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Crude wooden shield", count: [1], chance: 0.3, quality: [0.91, 1.2]}),

        new TradeItem({item_name: "Cheap leather vest", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap leather vest", count: [1], chance: 0.5, quality: [0.91, 1.2]}),
        new TradeItem({item_name: "Cheap leather pants", count: [1], quality: [0.4, 0.9]}),
        new TradeItem({item_name: "Cheap leather pants", count: [1], chance: 0.5, quality: [0.91, 1.2]}),

        new TradeItem({item_name: "Stale bread", count: [4,10]}),
        new TradeItem({item_name: "Fresh bread", count: [2,5]}),
        new TradeItem({item_name: "Weak healing powder", count: [2,5]}),

];

export {traders};