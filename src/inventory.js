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
        for(let i = 0; i < items.length; i++){            
            if(!(items[i].item.id in this.inventory)) //not in inventory
            {
                if(items[i].item.stackable)
                {
                    if(!items[i].count) {
                        items[i].count=1;
                    }
                    this.inventory[items[i].item.id] = items[i];
                } else 
                {
                    this.inventory[items[i].item.id] = [items[i].item];
                }
            }
            else //in inventory 
            {
                if(items[i].item.stackable)
                {
                    this.inventory[items[i].item.id].count += (items[i].count || 1);
                } 
                else 
                {
                    this.inventory[items[i].item.id].push(items[i].item);
                }
            }
        }
    }

    /**
     * @description removes specified items (array of {item_name, item_count, item_id}) from the inventory; don't use this method directly, there are other methods that call this one and take care of display
     * @param {Array} items
     * @param {*} item_name name of the item
     * @param {*} item_count number of items to remove (for stackable items)
     * @param {*} item_id id of an item to remove (for unstackable items)  
     */
    remove_from_inventory(items) {
        //stores the indexes for removing unstackable items later on, since they are in their own arrays
        const indexes = {};
        const stackables = items.filter(item => typeof item.item_id === "undefined");
        for(let i = 0; i < items.length; i++) {
            if(typeof items[i].item_id === "undefined"){
                continue;
            }

            if(indexes[items[i].item_name]) {
                indexes[items[i].item_name].push(`${items[i].item_id}`);
            } else {
                indexes[items[i].item_name] = [`${items[i].item_id}`];
            }
        }

        //handles the removal
        for(let i = 0; i < stackables.length; i++){       
            if(stackables[i].item_name in this.inventory) { //check if its in inventory, just in case, probably not needed
                if("item" in this.inventory[stackables[i].item_name]) { //stackable
        
                    if(typeof stackables[i].item_count === "number" && Number.isInteger(stackables[i].item_count) && stackables[i].item_count >= 1) 
                    {
                        this.inventory[stackables[i].item_name].count -= stackables[i].item_count;
                    }  else 
                    {
                        this.inventory[stackables[i].item_name].count -= 1;
                    }
        
                    if(this.inventory[stackables[i].item_name].count == 0) //less than 0 shouldn't happen so no need to check
                    {
                        delete this.inventory[stackables[i].item_name];
                        //removes item from inventory if it's county is less than 1
                    } else if(this.inventory[stackables[i].item_name].count < 0 || isNaN(this.inventory[stackables[i].item_name].count)) {
                        throw new Error(`Item count for "item_name" reached an illegal value (either less than 0 or NaN)`);
                    }
                }
            } else { 
                    throw new Error("Tried to remove item that was not present in inventory");
            }
        }

        const names = Object.keys(indexes);
        for(let i = 0; i < names.length; i++) {
            
            this.inventory[names[i]] = this.inventory[names[i]].filter((item,index) => {
                return !indexes[names[i]].includes(`${index}`);
            });
            //replaces the array with one without specified items

            if(this.inventory[names[i]].length == 0)
            {
                delete this.inventory[names[i]];
                //removes item array from inventory if its empty
            } 
        }
    }
}

export {InventoryHaver};