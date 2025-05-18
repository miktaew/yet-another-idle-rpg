"use strict";

import { getItem, getItemFromKey, item_templates } from "./items.js";

//extended by character and traders, as their inventories are supposed to work the same way
class InventoryHaver {
    
    constructor() {
        this.inventory = {}; //currently items are stored separately and are re-added on load
    }

    /**
     * @description adds items from the list to inventory; don't use this method directly, there are other methods that call this one and take care of display
     * @param {Array} items - [{item_key, count, item_id (if no key), quality (optional if no key)},...]
     */
    add_to_inventory(items) {
        let anything_new = false;
        
        for(let i = 0; i < items.length; i++){
            let item_key;
            if(items[i].item_key){
                item_key = items[i].item_key;
            } else {
                //this part is so stupid (recreating item just to grab it's key)
                //but at least it wont break if code for creating inventory keys changes
                let item;
                if(items[i].quality) {
                    item = getItem({...item_templates[items[i].item_id], quality:items[i].quality});
                } else {
                    item = getItem({...item_templates[items[i].item_id]});
                }
                item_key = item.getInventoryKey();
            } 

            if(!(item_key in this.inventory)) {//not in inventory
                if(!items[i].count) {
                    items[i].count = 1;
                }
                const item = getItemFromKey(item_key);
                this.inventory[item_key] = {item, count: items[i].count};
                anything_new = true;
            } else { //in inventory
                if(items[i].count === undefined) {
                    this.inventory[item_key].count += 1;
                } else if(typeof items[i].count === "number" && !isNaN(items[i].count)){
                    this.inventory[item_key].count += items[i].count;
                } else {
                    throw new TypeError(`Tried to add "${items[i].count}" items, which is not a valid number!`);
                }
            }
        }
        return anything_new;
    }

    /**
     * @description removes specified items (array of {item_key, count}) from the inventory; don't use this method directly, there are other methods that call this one and take care of display
     * @param {Array} items [{item_key, item_count}]
     **/
    remove_from_inventory(items) {
        for(let i = 0; i < items.length; i++){       
            if(items[i].item_key in this.inventory) { //check if its in inventory, just in case, probably not needed

                if(typeof items[i].item_count === "number" && Number.isInteger(items[i].item_count) && items[i].item_count >= 1)  {
                    this.inventory[items[i].item_key].count -= items[i].item_count;
                }  else {
                    this.inventory[items[i].item_key].count -= 1; //remove one if count was not passed
                }
    
                if(this.inventory[items[i].item_key].count == 0) {
                    delete this.inventory[items[i].item_key]; 
                    //removes item from inventory if it's county is 0
                } else if(this.inventory[items[i].item_key].count < 0 || isNaN(this.inventory[items[i].item_key].count)) {
                    throw new Error(`Item count for key "${items[i].item_key}" reached an illegal value of "${this.inventory[items[i].item_key].count}"`);
                }
                
            } else { 
                    throw new Error("Tried to remove item that was not present in inventory");
            }
        }
    }
}

export {InventoryHaver};