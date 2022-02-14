import { current_game_time } from "./game_time.js";
import { Item, item_templates } from "./items.js";

var traders = {};
var inventory_templates = {};

function Trader(trader_data) {
    this.trade_text = trader_data.trade_text || "Let's trade";
    this.last_refresh = -1; //just the day_count from game_time at which trader was supposedly last refreshed
    this.refresh_time = trader_data.refresh_time || 7;
    //7 would mean it's refreshed every 7 days (with shift at 0 it's every monday)

    this.refresh_shift = trader_data.refresh_shift || 0;
    //shift refreshing days, e.g. time 7 + shift 2 would be wednesday, shift 4 would push it to fridays
    //pretty much pointless if refresh time is not 7 (or it's multiple)

    this.inventory_template = trader_data.inventory_template;
    this.inventory = []; //items and their counts

    this.profit_margin = trader_data.profit_margin || 2;
    //how much more expensive are the trader's items than their actual value, with default being 2 (so 2x more)

    this.refresh = function() {
        if(this.last_refresh < 0 || current_game_time.day_count - (this.last_refresh + this.refresh_shift) >= this.refresh_time) { 
            //if enough time passed since last refresh

            //refresh inventory
            this.inventory = this.get_inventory_from_template();

            this.last_refresh = (current_game_time.day_count + 1 - current_game_time.day_count % this.refresh_time);
            return true;
        } 
        //otherwise do nothing
    }

    this.get_inventory_from_template = function() {
        const inventory = {};
        const inventory_template = inventory_templates[this.inventory_template].inventory_template; //it's so wrong
        for(let i = 0; i < inventory_template.length; i++) {
            if(inventory_template[i].chance >= Math.random()) {
                var item_count = inventory_template[i].count.length == 1? 
                        inventory_template[i].count[0] : Math.round(Math.random() * 
                        (inventory_template[i].count[1] - inventory_template[i].count[0]) + inventory_template[i].count[0]);

                if(item_templates[inventory_template[i].item_name].stackable) { //stackable, so add one object with item_count
                    inventory[inventory_template[i].item_name] = {item: new Item(item_templates[inventory_template[i].item_name]), count: item_count}; 
                }
                else { //unstackable, so add array of n items
                    inventory[inventory_template[i].item_name] = Array(item_count).fill(new Item(item_templates[inventory_template[i].item_name]));
                }
                
            }
        }
        //just add items based on their chances and counts in inventory_template
        return inventory;
    }
}

function Inventory_template(inventory_template_data) {
    this.inventory_template = inventory_template_data.inventory_template;
}

function Trade_item(trade_item_data) {
    this.item_name = trade_item_data.item_name;
    this.chance = typeof trade_item_data.chance !== "undefined"? trade_item_data.chance : 1; //chance for item to appear, 1 is 100%
    this.count = typeof trade_item_data.count !== "undefined"? trade_item_data.count : [1]; 
    //how many can appear, will randomly choose something between min and max

}

traders["village trader"] = new Trader({
    trade_text: "Trade",
    inventory_template: "Basic",
});

inventory_templates["Basic"] = new Inventory_template({inventory_template :
    [
        new Trade_item({item_name: "Long stick", count: [1,2]}),
        new Trade_item({item_name: "Plank with a handle", count: [1,2]}),
        new Trade_item({item_name: "Crude wooden shield", count: [1], chance: 0.5}),
        new Trade_item({item_name: "Shabby leather vest", count: [1,2]}),
        new Trade_item({item_name: "Raggy leather pants", count: [1,2]}),
        new Trade_item({item_name: "Rusty knife", count: [1,2]}),
        new Trade_item({item_name: "Worn-out wooden sword", count: [1]}),
        new Trade_item({item_name: "Sharpened long stick", count: [1,2]}),
        new Trade_item({item_name: "Rat fang", count: [4,8]}),
]});

export {traders};