import { InventoryHaver } from "./inventory.js";
import { exit_displayed_storage, update_displayed_storage } from "./display.js";
import { add_to_character_inventory, character, remove_from_character_inventory } from "./character.js";

const player_storage = new InventoryHaver();

/**
 * @param {Array} items [{item_key, item_count}]
 */
function add_to_storage(items) {
    //items = items.map(x => {return {item: character.inventory[x.item_key], count: x.count}});
    for(let i = 0; i < items.length; i++) {
        const item = character.inventory[items[i].item_key].item;
        item.count = items[i].count;
        player_storage.add_to_inventory([{item, count: item.count}]);
    }
    items = items.map(x => character.inventory[x.item_key]);
    //player_storage.add_to_inventory(items);

    update_displayed_storage();
}

/**
 * @param {Array} items [{item_key, count}]
 */
function remove_from_storage(items) {
    player_storage.remove_from_inventory(items);
    
    update_displayed_storage();
}

//kinda pointless but keep it in case there are changes
function open_storage(items) {
    update_displayed_storage(items);
}

//kinda pointless but keep it in case there are changes
function close_storage(items) {
    exit_displayed_storage(items);
}

/**
 * @param {Object} item {item_key, count}
 */
function move_item_to_storage(item) {
    remove_from_character_inventory([item]);
    add_to_storage([item]);
}

/**
 * @param {Array} item [{item_key, item_count}]
 */
function remove_item_from_storage(item) {
    add_to_character_inventory([item]);
    remove_from_storage([item]);
}

export {
    player_storage, 
    add_to_storage, remove_from_storage, open_storage, close_storage,
    move_item_to_storage, remove_item_from_storage
}