import { InventoryHaver } from "./inventory.js";
import { exit_displayed_storage, update_displayed_storage } from "./display.js";
import { add_to_character_inventory, remove_from_character_inventory, character } from "./character.js";

const player_storage = new InventoryHaver();
let storage_open = false;

/**
 * @param {Array} items [{item_key, item_count}]
 */
function add_to_storage(items) {
    player_storage.add_to_inventory(items);

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
    storage_open = true;
}

//kinda pointless but keep it in case there are changes
function close_storage(items) {
    exit_displayed_storage(items);
    storage_open = false;
}

/**
 * @param {Object} item {item_key, count}
 */
function move_item_to_storage(item) {
    let count = Math.min(item.count, character.inventory[item.item_key].count);
    remove_from_character_inventory([{...item, item_count: count}]);
    add_to_storage([{...item, count}]);
}

/**
 * @param {Array} item [{item_key, item_count}]
 */
function remove_item_from_storage(item) {
    let count = Math.min(item.count, player_storage.inventory[item.item_key].count);
    add_to_character_inventory([{...item, count}]);
    remove_from_storage([{...item, item_count: count}]);
}

function is_storage_open() {
    return storage_open;
}

export {
    player_storage, 
    add_to_storage, remove_from_storage, open_storage, close_storage,
    move_item_to_storage, remove_item_from_storage, is_storage_open
}