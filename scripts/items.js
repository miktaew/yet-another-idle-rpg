/* 
for perishables, if ever added, maybe a certain chance to perish/spoil/whatever every second?
alternatively simply make a time counter for it (with increase per tick being equal to number of items)
*/
var item_templates = {};

function Item(item_data) {

    this.name = item_data.name;
    this.description = item_data.description;
    this.value = item_data.value || 0;
    this.stackable = item_data.stackable || false; 
    //false currently only for equippables, but might change it in future so let's keep it

    this.can_be_dismantled = item_data.can_be_dismantled || false; 
    //maybe remove it and simply check if dismantling_materials is not undefined?
    this.dismantling_materials = item_data.dismantling_materials || {};

    if(item_data.item_type === "EQUIPPABLE" || item_data.item_type === "USABLE" || item_data.item_type === "OTHER") {
        this.item_type = item_data.item_type; 
    }
    else {
        throw new Error("Wrong item type!");
    }

    this.equip_stats = item_data.equip_stats;
    // (only bonuses to main stats)
    this.equip_slot = item_data.equip_slot;
    // equipment slot to where item goes
    this.equip_effect = item_data.equip_effect || {};
    // stats gained by equipping, {stats: {}, stat_multipliers: {}}
    // multipliers probably will only be used for weapon damage
    this.weapon_type = item_data.weapon_type; // "sword", "axe", "dagger", "spear", "blunt weapon", "wand", "staff"
    //remember to add proper skills if adding new weapon types aside from those above

    this.offhand_type = item_data.offhand_type; // "shield", something else?

    this.shield_strength = item_data.shield_strength;


    // if usable, bonus gained on using? (so heal hp, heal hunger, permanently raise max stats, etc)
    // assume it can't be both usable and equippable 


    //crafting?
    //might need something like is_crafting_unlocked (would need to be applied to templates probably)

}


//materials:

item_templates["Rat tail"] = new Item({
    name: "Rat tail", description: "Tail of a huge rat, basically useless", value: 1, stackable: true,
    item_type: "OTHER",
});

item_templates["Rat fang"] = new Item({
    name: "Rat fang", description: "Fang of a huge rat, not very sharp", value: 1, stackable: true,
    item_type: "OTHER",
});

item_templates["Rat pelt"] = new Item({
    name: "Rat pelt", description: "Pelt of a huge rat, terrible quality but maybe there's some use", value: 2, stackable: true,
    item_type: "OTHER",
});

//equippables:

item_templates["Ratslayer"] = new Item({
    name: "Ratslayer", description: "Test item", value: 1000000000, 
    item_type: "EQUIPPABLE", equip_slot: "weapon", weapon_type: "sword",
    equip_effect: {
        attack: {
            flat_bonus: 10000,
            multiplier: 10,
        }
    }
});

item_templates["Hard stone"] = new Item({
    name: "Hard stone", description: "Still better than punching with your fists",
    item_type: "EQUIPPABLE", equip_slot: "weapon", weapon_type: "blunt weapon",
    equip_effect: {
        attack: {
            flat_bonus: 2,
            multiplier: 1,
        }
    }
});

item_templates["Long stick"] = new Item({
    name: "Long stick", description: "Can be used as a simple weapon", value: 3,
    item_type: "EQUIPPABLE", equip_slot: "weapon", weapon_type: "blunt weapon",
    equip_effect: {
        attack: {
            flat_bonus: 4,
        }
    }
});

item_templates["Sharpened long stick"] = new Item({
    name: "Sharpened long stick", description: "Works somewhat okay-ish as a makeshift spear", value: 10,
    item_type: "EQUIPPABLE", equip_slot: "weapon", weapon_type: "spear",
    equip_effect: {
        attack: {
            flat_bonus: 6,
            multiplier: 1,
        },
        agility: {
            flat_bonus: 1,
        }
    }
});

item_templates["Rusty knife"] = new Item({
    name: "Rusty knife", description: "Knife of an unknown designation, rusty and dull", value: 10,
    item_type: "EQUIPPABLE", equip_slot: "weapon", weapon_type: "dagger",
    equip_effect: {
        attack: {
            flat_bonus: 4,
            multiplier: 1
        },
        agility: {
            flat_bonus: 2
        },
        crit_chance: {
            flat_bonus: 0.1
        }
    }
});

item_templates["Worn-out wooden sword"] = new Item({
    name: "Worn-out wooden sword", description: "Closer to a toy than to a real weapon", value: 10,
    item_type: "EQUIPPABLE", equip_slot: "weapon", weapon_type: "sword",
    equip_effect: {
        attack: {
            flat_bonus: 7,
            multiplier: 1
        }
    }
});

item_templates["Plank with a handle"] = new Item({
    name: "Plank with a handle", description: "Technically can be used as a very basic shield, except it won't really block anything", value: 7,
    item_type: "EQUIPPABLE", equip_slot: "offhand", offhand_type: "shield", shield_strength: 2,
});

item_templates["Crude wooden shield"] = new Item({
    name: "Crude wooden shield", description: "Crude shield made of wood, not very strong", value: 20,
    item_type: "EQUIPPABLE", equip_slot: "offhand", offhand_type: "shield", shield_strength: 6,
});

item_templates["Wooden shield"] = new Item({
    name: "Wooden shield", description: "A proper wooden shield, although without any form of reinforcement", value: 40,
    item_type: "EQUIPPABLE", equip_slot: "offhand", offhand_type: "shield", shield_strength: 10,
});

item_templates["Shabby leather vest"] = new Item({
    name: "Shabby leather vest", description: "Vest of terrible quality, providing almost no protection. Better not to know what's it made from", value: 15,
    item_type: "EQUIPPABLE", equip_slot: "torso",
    equip_effect: {
        defense: {
            flat_bonus: 1
        }
    }
});

item_templates["Raggy leather pants"] = new Item({
    name: "Raggy leather pants", description: "Pants of terrible quality, made of unknown leather. Lots of holes", value: 15,
    item_type: "EQUIPPABLE", equip_slot: "legs",
    equip_effect: {
        defense: {
            flat_bonus: 1
        }
    }
});



export {item_templates, Item};