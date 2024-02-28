"use strict";

import { item_templates, Weapon } from "./items.js";

/*
    no recipes, instead items crafted with components
    components get their tiers, crafting difficulty is based on the tier
    crafting skill affects resulting quality
    quality is separated into rarities (as explained in items.js)
    xp based on value * quality multiplier, xp for dismantling equal to 1/3 of that
    handle can be at most 2 tiers below weapon head
    type of spare parts must match the tier of highest-tiered element of the item


    weapon item = 1x head + 1x handle + 1x spare parts
    value = sum of values of head and handle

    weapon types:
        long handle => spear
        medium handle => axe (if axe head) or blunt (if blunt head)
        short handle => dagger (if short blade) or sword (if long blade)

*/

function craftWeapon(head_component, handle_component) {
    
    return new Weapon({});
}



function dismantle(item) {
    
}

export {dismantle};