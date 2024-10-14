"use strict";

//extended by character and traders, as their inventories are supposed to work the same way
class InventoryHaver {
    
    constructor() {
        this.inventory = {}; //currently items are stored separately and are re-added on load
    }

    /**
     * @description adds items from the list to inventory; don't use this method directly, there are other methods that call this one and take care of display
     * @param {Array} items - [{item, count},...]
     */
    add_to_inventory(items) {
        let anything_new = false;
        for(let i = 0; i < items.length; i++){
            if(!(items[i].item.getInventoryKey() in this.inventory)) //not in inventory
            {
                if(!items[i].count) {
                    items[i].count = 1;
                }
                this.inventory[items[i].item.getInventoryKey()] = items[i];
                anything_new = true;
            }
            else //in inventory 
            {
                this.inventory[items[i].item.getInventoryKey()].count += (items[i].count || 1);
            }
        }
        return anything_new;
    }

    /**
     * @description removes specified items (array of {item_key, item_count}) from the inventory; don't use this method directly, there are other methods that call this one and take care of display
     * @param {Array} items
     * @param {*} item_key inventory key of the item
     * @param {*} item_count number of items to remove
     *      */
    remove_from_inventory(items) {
        for(let i = 0; i < items.length; i++){       
            if(items[i].item_key in this.inventory) { //check if its in inventory, just in case, probably not needed

                if(typeof items[i].item_count === "number" && Number.isInteger(items[i].item_count) && items[i].item_count >= 1)  {
                    this.inventory[items[i].item_key].count -= items[i].item_count;
                }  else {
                    this.inventory[items[i].item_key].count -= 1; //remove one if count was not passed
                }
    
                if(this.inventory[items[i].item_key].count == 0) { //less than 0 shouldn't happen so no need to check
                    delete this.inventory[items[i].item_key]; 
                    //removes item from inventory if it's county is less than 1
                } else if(this.inventory[items[i].item_key].count < 0 || isNaN(this.inventory[items[i].item_key].count)) {
                    throw new Error(`Item count for key "${items[i].item_key}" reached an illegal value`);
                }
                
            } else { 
                    throw new Error("Tried to remove item that was not present in inventory");
            }
        }
    }
}

export {InventoryHaver};