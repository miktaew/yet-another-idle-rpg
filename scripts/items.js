"use strict";

/*
    item_templates contain some predefined equipment for easier access (instead of having to create them with proper components each time)

    equippable are unstackable, other items stack

    item quality translates into rarity, but also provides another multiplier on top of quality multiplier, starting at uncommon
            quality     rarity         color      additional_multiplier
            0-49%       trash          gray       x1
            50-99%      common         white      x1
            100-129%    uncommon       green      x1.1
            130-159%    rare           blue       x1.3
            160-199%    epic           purple     x1.6
            200-250%    legendary      orange     x2

            then also special items of rarity "unique", that will really be unique
            so quality nor additional multiplier don't really matter on them

            quality affects only attack/defense/max block, while additional multiplier affects all positive stats 
            (i.e flat bonuses over 0 and multiplicative bonuses over 1)


    basic idea for weapons:

        short blades (daggers/spears) are the fastest but also the weakest, +the most crit rate and crit damage
        blunt heads (blunt weapons) have highest damage, but also lower attack speed
        axe heads have a bit less damage, but a bit less attack speed penalty
        long blades (swords/spears?) have average damage and average attack speed

        long handles (spears) have higher attack multiplier and lower attack speed (so they counter the effects of the short blades)
        medium handles (axes/blunt weapons) have them average
        short handles have lowest attack multiplier
        
        so, as a result, attack damage goes blunt > axe > spear > sword > dagger
        and attack speed goes               dagger > sword > spear > axe > blunt
        which kinda makes spears very average, but they also get bonus crit so whatever


        other bonuses: 
            long handle: -agility
            short blade: +agility


*/

import { character } from "./character.js";

const rarity_multipliers = {
    trash: 1,
    common: 1,
    uncommon: 1.1,
    rare: 1.3,
    epic: 1.6,
    legendary: 2
};

const item_templates = {};


class Item {
    constructor({name,
                description,
                value = 0}) {
        this.name = name; 
        this.description = description;

        /**
         * Use .getValue() instead of this
         */
        this.value = value;
    }

    getValue() {
        return this.value;
    }

    getName() {
        return this.name;
    }

    getDescription() {
        return this.description;
    }
}

class OtherItem extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "OTHER";
        this.stackable = true;
    }
}

class ItemComponent extends OtherItem {
    constructor(item_data) {
        super(item_data);
        this.component_tier = item_data.component_tier || 1;
        this.stats = item_data.stats || {};
    }
}

class WeaponComponent extends ItemComponent {
    constructor(item_data) {
        super(item_data);
        if(item_data.component_type !== "axe head" && item_data.component_type !== "hammer head"
        && item_data.component_type !== "short blade" && item_data.component_type !== "long blade"
        && item_data.component_type !== "short handle" && item_data.component_type !== "long handle"
        && item_data.component_type !== "medium handle") {
            throw new Error(`No such weapon component type as ${item_data.component_type}`);
        }
        this.component_type = item_data.component_type; 
        //"short blade", "long blade", "axe blade", "hammer blade" for heads; "short handle", "medium handle", "long handle" for handles

        this.attack_value = item_data.attack_value || 0; //can skip this for weapon handles
        this.attack_multiplier = item_data.attack_multiplier || 1; //can skip this for weapon heads

        this.name_prefix = item_data.name_prefix; //to create a name of an item, e.g. "Sharp iron" used to create spear results in "Sharp iron spear"
    }
}

class ShieldComponent extends ItemComponent {
    constructor(item_data) {
        super(item_data);
        if(item_data.component_type !== "shield base" && item_data.component_type !== "shield handle") {
            throw new Error(`No such shield component type as ${item_data.component_type}`);
        }
        this.component_type = item_data.component_type;

        //properties below only matter for shield type component
        this.shield_strength = item_data.shield_strength; 
        this.shield_name = item_data.shield_name || item_data.name;
    }
}

class ArmorComponent extends ItemComponent {
    constructor(item_data) {
        super(item_data);
        if(item_data.component_type !== "external" && item_data.component_type !== "internal") {
            throw new Error(`No such armor component type as ${item_data.component_type}`);
        }
        this.component_type = item_data.component_type;
        this.defense_value = item_data.defense_value;

        this.equip_slot = item_data.equip_slot;

        //only used with external elements
        this.full_armor_name = item_data.full_armor_name;

        //only used with internal elements
        this.armor_name = item_data.armor_name;

        //only used with external elements; name_prefix/name_suffix are used only if full_armor_name is not provided
        this.name_prefix = item_data.name_prefix;
        this.name_suffix = item_data.name_suffix;
    }
}

class UsableItem extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "USABLE";
        this.stackable = true;
        this.use_effect = item_data.use_effect || {};
    }
}

class Equippable extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "EQUIPPABLE";
        this.stackable = false;

        this.equip_effect = item_data.equip_effect || {};
        // stats gained by equipping, {stats: {}, stat_multipliers: {}}

        this.quality = item_data.quality || 1;
        //item quality, value of (0, 1>, set in other place
    }

    getValue() {
        return Math.ceil(this.value * this.quality);
    } 

    getRarity(){
        if(!this.rarity) {
            if(this.quality < 0.5) this.rarity =  "trash";
            else if(this.quality < 1.0) this.rarity = "common";
            else if(this.quality < 1.3) this.rarity = "uncommon";
            else if(this.quality < 1.6) this.rarity = "rare";
            else if(this.quality < 2.0) this.rarity = "epic";
            else this.rarity = "legendary";
        }
        return this.rarity;
    }
}


class Shield extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = "off-hand";
        this.offhand_type = "shield"; //not like there's any other option

        if(!item_templates[item_data.shield_base]) {
            throw new Error(`No such shield base component as: ${item_data.shield_base}`);
        }
        this.shield_base = item_data.shield_base; //only the name

        if(item_data.handle && !item_templates[item_data.handle]) {
            throw new Error(`No such shield handle component as: ${item_data.handle}`);
        }
        this.handle = item_data.handle; //only the name
    }

    getShieldStrength() {
        if(!this.shield_strength) {
            this.shield_strength = Math.ceil(item_templates[this.shield_base].shield_strength * this.quality * rarity_multipliers[this.getRarity()]);
        }
        //console.log(this.shield_strength);
        return this.shield_strength;
    }

    getName() {
        return item_templates[this.shield_base].shield_name;
    }

    getValue() {
        if(!this.value) {
            //value of shield base + value of handle, both multiplied by quality and rarity
            this.value = Math.ceil((item_templates[this.shield_base].value + item_templates[this.handle].value)
                                  * this.quality * rarity_multipliers[this.getRarity()]);
        }
        return this.value;
    } 

    getStats(){
        if(!this.stats) {
            const stats = {};
            const handle = item_templates[this.handle];
            const shield_base = item_templates[this.shield_base];
            Object.keys(character.stats).forEach((stat) => {
                if(stat === "attack_power" || stat === "defense") { //skip them just in case
                    return;
                }

                stats[stat] = {};
                /*
                if any has the stat:
                    for multipliers, multiply them together, then if it's a "positive" bonus (i.e at least 1.0), get the actual bonus (i.e. for x1.5 it's 0.5) and multiply by rarity multiplier, then add 1 back
                    for flat bonuses, add them together, then if it's a positive bonus then just multiply it by rarity multiplier
                */
                if(stat in handle.stats || stat in shield_base.stats) {
                    if(handle.stats?.[stat]?.multiplier || shield_base.stats?.[stat]?.multiplier) {
                        const multiplier = (handle.stats[stat]?.multiplier || 1) * (shield_base.stats[stat]?.multiplier || 1);
                        if(multiplier >= 1) {
                            stats[stat].multiplier = Math.round(100 * (1 + (multiplier - 1) * rarity_multipliers[this.getRarity()]))/100;
                        } else {
                            stats[stat].multiplier = Math.round(100 * multiplier)/100;
                        }
                    }
                    
                    if(handle.stats?.[stat]?.flat ||shield_base.stats?.[stat]?.flat) {
                        const flat = (handle.stats[stat]?.flat || 0) + (shield_base.stats[stat]?.flat || 0);
                        if(flat > 0) {
                            stats[stat].flat = Math.round(100 * flat * rarity_multipliers[this.getRarity()])/100;
                        } else {
                            stats[stat].flat = Math.round(100 * flat)/100;
                        }
                    }
                }
            });
            this.stats = {...stats};
        } 
        return this.stats;
    }
}

class Armor extends Equippable {
    /*
        equip slot is based on internal element (e.g. leather vest)
        external element can be empty

        naming convention:
        if full_armor_name in external
            then full_armor_name
        else use prefix and suffix on internal element

    */
    constructor(item_data) {
        super(item_data);
        if(!item_templates[item_data.internal]) {
            throw new Error(`No such internal armor element as: ${item_data.internal}`);
        }
        this.internal = item_data.internal; //only the name

        this.equip_slot = item_templates[item_data.internal].equip_slot;

        if(item_data.external && !item_templates[item_data.external]) {
            throw new Error(`No such external armor element as: ${item_data.external}`);
        }
        this.external = item_data.external; //only the name
    }

    getDefense() {
        if(!this.defense_value) {
            this.defense_value = Math.ceil((item_templates[this.internal].defense_value + 
                                           (item_templates[this.external]?.defense_value || 0 )) 
                                          * this.quality * rarity_multipliers[this.getRarity()]
            );
        }

        return this.defense_value;
    }

    getValue() {
        if(!this.value) {
            //value of internal + value of external (if present), both multiplied by quality and rarity
            this.value = Math.ceil((item_templates[this.internal].value + 
                                   (item_templates[this.external]?.value || 0))
                                  * this.quality * rarity_multipliers[this.getRarity()]);
        }
        return this.value;
    } 

    getName() {
        /*
        no external => name after internal.armor_name
        external with full_armor_name => use full_armor_name
        otherwise => prefix + internal + suffix
        */

        if(!this.name) {
            
            if(!this.external) {
                this.name = item_templates[this.internal].armor_name;
            } else {
                if(item_templates[this.external].full_armor_name) {
                    this.name = item_templates[this.external].full_armor_name;
                } else {
                    this.name = (item_templates[this.external].name_prefix || '') + " " + item_templates[this.internal].armor_name.toLowerCase() + " " + (item_templates[this.external].name_suffix || '');
                }
            }
        }

        return this.name;
    }

    getStats(){
        if(!this.stats) {
            const stats = {};
            const internal = item_templates[this.internal];
            const external = item_templates[this.external] || {stats: {}};
            Object.keys(character.stats).forEach((stat) => {
                if(stat === "attack_power" || stat === "defense") {
                    return;
                }

                stats[stat] = {};
                /*
                if any has the stat:
                    for multipliers, multiply them together, then if it's a "positive" bonus (i.e at least 1.0), get the actual bonus (i.e. for x1.5 it's 0.5) and multiply by rarity multiplier, then add 1 back
                    for flat bonuses, add them together, then if it's a positive bonus then just multiply it by rarity multiplier
                */
                if(stat in internal.stats || stat in external.stats) {
                    if(internal.stats?.[stat]?.multiplier || external.stats?.[stat]?.multiplier) {
                        const multiplier = (internal.stats[stat]?.multiplier || 1) * (external.stats[stat]?.multiplier || 1);
                        if(multiplier >= 1) {
                            stats[stat].multiplier = Math.round(100 * (1 + (multiplier - 1) * rarity_multipliers[this.getRarity()]))/100;
                        } else {
                            stats[stat].multiplier = Math.round(100 * multiplier)/100;
                        }
                    }
                    
                    if(internal.stats?.[stat]?.flat ||external.stats?.[stat]?.flat) {
                        const flat = (internal.stats[stat]?.flat || 0) + (external.stats[stat]?.flat || 0);
                        if(flat > 0) {
                            stats[stat].flat = Math.round(100 * flat * rarity_multipliers[this.getRarity()])/100;
                        } else {
                            stats[stat].flat = Math.round(100 * flat)/100;
                        }
                    }
                }
            });
            this.stats = {...stats};
        } 
        return this.stats;
    }
}

class Weapon extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = "weapon";

        if(!item_templates[item_data.head]) {
            throw new Error(`No such weapon head as: ${item_data.head}`);
        }
        this.head = item_data.head; //only the name

        if(!item_templates[item_data.handle]) {
            throw new Error(`No such weapon handle as: ${item_data.handle}`);
        }
        this.handle = item_data.handle; //only the name

        
        if(item_templates[this.handle].component_type === "long handle" 
        && (item_templates[this.head].component_type === "short blade" || item_templates[this.head].component_type === "long blade")) {
            //long handle + short/long blade = spear
            this.weapon_type = "spear";
        } else if(item_templates[this.handle].component_type === "medium handle" 
        && item_templates[this.head].component_type === "axe head") {
            //medium handle + axe head = axe
            this.weapon_type = "axe";
        } else if(item_templates[this.handle].component_type === "medium handle" 
        && item_templates[this.head].component_type === "hammer head") {
            //medium handle + hammer head = hammer
            this.weapon_type = "hammer";
        } else if(item_templates[this.handle].component_type === "short handle" 
        && item_templates[this.head].component_type === "short blade") {
            //short handle + short blade = dagger
            this.weapon_type = "dagger";
        } else if(item_templates[this.handle].component_type === "short handle" 
        && item_templates[this.head].component_type === "long blade") {
            //short handle + long blade = sword
            this.weapon_type = "sword";
        } else {
            throw new Error(`Combination of elements of types ${item_templates[this.handle].component_type} and ${item_templates[this.head].component_type} does not exist!`);
        }
    }

    getAttack(){
        if(!this.attack_power) {

            this.attack_power = Math.ceil(
                (item_templates[this.head].attack_value + item_templates[this.handle].attack_value)
                * item_templates[this.head].attack_multiplier * item_templates[this.handle].attack_multiplier
                * this.quality * rarity_multipliers[this.getRarity()]);

        }
        return this.attack_power;
    }

    getValue() {
        if(!this.value) {
            //value of handle + value of head, both multiplied by quality and rarity
            this.value = Math.ceil((item_templates[this.handle].value + item_templates[this.head].value) * this.quality * rarity_multipliers[this.getRarity()]);
        }
        return this.value;
    } 

    getName() {
        return `${item_templates[this.head].name_prefix} ${this.weapon_type === "hammer" ? "battle hammer" : this.weapon_type}`;
    }

    getStats(){
        if(!this.stats) {
            const stats = {};
            const handle = item_templates[this.handle];
            const head = item_templates[this.head];
            Object.keys(character.stats).forEach((stat) => {
                if(stat === "attack_power" || stat === "defense") { //skip them just in case
                    return;
                }

                stats[stat] = {};
                /*
                if any has the stat:
                    for multipliers, multiply them together, then if it's a "positive" bonus (i.e at least 1.0), get the actual bonus (i.e. for x1.5 it's 0.5) and multiply by rarity multiplier, then add 1 back
                    for flat bonuses, add them together, then if it's a positive bonus then just multiply it by rarity multiplier
                */
                if(stat in handle.stats || stat in head.stats) {
                    if(handle.stats?.[stat]?.multiplier || head.stats?.[stat]?.multiplier) {
                        const multiplier = (handle.stats[stat]?.multiplier || 1) * (head.stats[stat]?.multiplier || 1);
                        if(multiplier >= 1) {
                            stats[stat].multiplier = Math.round(100 * (1 + (multiplier - 1) * rarity_multipliers[this.getRarity()]))/100;
                        } else {
                            stats[stat].multiplier = Math.round(100 * multiplier)/100;
                        }
                    }
                    
                    if(handle.stats?.[stat]?.flat ||head.stats?.[stat]?.flat) {
                        const flat = (handle.stats[stat]?.flat || 0) + (head.stats[stat]?.flat || 0);
                        if(flat > 0) {
                            stats[stat].flat = Math.round(100 * flat * rarity_multipliers[this.getRarity()])/100;
                        } else {
                            stats[stat].flat = Math.round(100 * flat)/100;
                        }
                    }
                }
            });
            this.stats = {...stats};
        } 
        return this.stats;
    }
}

/**
 * @param {*} item_data 
 * @returns item of proper type, created with item_data
 */
function getItem(item_data) {
    switch(item_data.item_type) {
        case "EQUIPPABLE":
            switch(item_data.equip_slot) {
                case "weapon":
                    return new Weapon(item_data);
                case "off-hand":
                    return new Shield(item_data);
                default:
                    return new Armor(item_data);
            }
        case "USABLE":
            return new UsableItem(item_data);
        case "OTHER":
            if("weapon_types" in item_data) 
                return new WeaponComponent(item_data);
            else if(item_data.component_type == "external" || item_data.component_type == "internal") 
                return new ArmorComponent(item_data);
            else if("component_type" in item_data) 
                return new ShieldComponent(item_data);
            else
                return new OtherItem(item_data);
        default:
            throw new Error(`Wrong item type: ${item_data.item_type}`);
    }
}

//miscellaneous:
(function(){
    item_templates["Rat tail"] = new OtherItem({
        name: "Rat tail", description: "Tail of a huge rat, basically useless", value: 1
    });

    item_templates["Rat fang"] = new OtherItem({
        name: "Rat fang", description: "Fang of a huge rat, not very sharp", value: 1
    });

    item_templates["Rat pelt"] = new OtherItem({
        name: "Rat pelt", description: "Pelt of a huge rat, terrible quality but maybe there's some use", value: 2
    });
})();

//spare parts
(function(){
    item_templates["Basic spare parts"] = new ItemComponent({
        name: "Basic spare parts", description: "Some cheap and simple spare parts, like bindings and screws, necessary for crafting equipment",
        value: 3, 
        component_tier: 1,
    });
}());

//weapon components:
(function(){
    item_templates["Cheap short iron blade"] = new WeaponComponent({
        name: "Cheap short iron blade", description: "Crude blade made of iron. Perfect length for a dagger, but could be also used for a spear",
        component_type: "short blade",
        value: 9,
        component_tier: 1,
        name_prefix: "Cheap iron",
        attack_value: 5,
        stats: {
            crit_rate: {
                flat: 0.1,
            },
            attack_speed: {
                multiplier: 1.20,
            },
            agility: {
                flat: 1,
            }
        }
    });
    item_templates["Cheap long iron blade"] = new WeaponComponent({
        name: "Cheap long iron blade", description: "Crude blade made of iron, with a perfect length for a sword",
        component_type: "long blade",
        value: 12,
        name_prefix: "Cheap iron",
        component_tier: 1,
        attack_value: 7,
        stats: {
            attack_speed: {
                multiplier: 1.10,
            },
        }
    });
    item_templates["Cheap iron axe head"] = new WeaponComponent({
        name: "Cheap iron axe head", description: "A heavy axe head made of low quality iron",
        component_type: "axe head",
        value: 12,
        name_prefix: "Cheap iron",
        component_tier: 1,
        attack_value: 8,
        stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Cheap iron hammer head"] = new WeaponComponent({
        name: "Cheap iron hammer head", description: "A crude ball made of low quality iron, with a small hole for the handle",
        component_type: "hammer head",
        value: 12,
        name_prefix: "Cheap iron",
        component_tier: 1,
        attack_value: 9,
        stats: {
            attack_speed: {
                multiplier: 0.9,
            }
        }
    });

    item_templates["Simple short wooden hilt"] = new WeaponComponent({
        name: "Simple short wooden hilt", description: "A short handle for a sword or maybe a dagger",
        component_type: "short handle",
        value: 5,
        component_tier: 1,
    });

    item_templates["Simple medium wooden handle"] = new WeaponComponent({
        name: "Simple medium wooden handle", description: "A medium handle for an axe or a hammer",
        component_type: "medium handle",
        value: 6,
        component_tier: 1,
        stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });

    item_templates["Simple long wooden shaft"] = new WeaponComponent({
        name: "Simple long wooden shaft", description: "A long shaft for a spear, somewhat uneven",
        component_type: "long handle",
        value: 8,
        component_tier: 1,
        attack_multiplier: 1.5,
        stats: {
            attack_speed: {
                multiplier: 0.9,
            }
        }
    });

})();

//weapons:
(function(){
    item_templates["Cheap iron spear"] = new Weapon({
        weapon_type: "spear",
        head: "Cheap short iron blade",
        handle: "Simple long wooden shaft"
    });

    item_templates["Cheap iron dagger"] = new Weapon({
        weapon_type: "dagger",
        head: "Cheap short iron blade",
        handle: "Simple short wooden hilt",
    });

    item_templates["Cheap iron sword"] = new Weapon({
        weapon_type: "sword",
        head: "Cheap long iron blade",
        handle: "Simple short wooden hilt",
    });

    item_templates["Cheap iron axe"] = new Weapon({
        weapon_type: "axe",
        head: "Cheap iron axe head",
        handle: "Simple medium wooden handle",
    });

    item_templates["Cheap iron battle hammer"] = new Weapon({
        weapon_type: "hammer",
        head: "Cheap iron hammer head",
        handle: "Simple medium wooden handle",
    });
})();

//armor components:
(function(){
    item_templates["Cheap leather vest [component]"] = new ArmorComponent({
        name: "Cheap leather vest [component]", description: "Vest providing very low protection. Better not to know what's it made from", 
        value: 20,
        armor_name: "Cheap leather vest",
        equip_slot: "torso",
        component_type: "internal",
        defense_value: 2,
        component_tier: 1,
    });

    item_templates["Cheap leather pants [component]"] = new ArmorComponent({
        name: "Cheap leather pants [component]", description: "Pants of made of unknown leather. Uncomfortable.", value: 20,
        armor_name: "Cheap leather pants",
        equip_slot: "legs",
        component_type: "internal",
        defense_value: 2,
        component_tier: 1,
    });
})();

//armors:
(function(){
    item_templates["Cheap leather vest"] = new Armor({
        internal: "Cheap leather vest [component]",
    });
    item_templates["Cheap leather pants"] = new Armor({
        internal: "Cheap leather pants [component]",
    })
})();

//shield components:
(function(){
    item_templates["Cheap wooden shield base"] = new ShieldComponent({
        name: "Cheap wooden shield base", description: "Cheap shield component made of wood, basically just a few planks barely holding together", 
        value: 10, 
        shield_strength: 3, 
        shield_name: "Cheap wooden shield",
        component_tier: 1,
        component_type: "shield base"
    });

    item_templates["Crude wooden shield base"] = new ShieldComponent({
        name: "Crude wooden shield base", description: "A shield component of rather bad quality, but at least it won't fall apart by itself", 
        value: 20,
        shield_strength: 6,
        shield_name: "Crude wooden shield",
        component_tier: 1,
        component_type: "shield base"
    });
    item_templates["Wooden shield base"] = new ShieldComponent({
        name: "Wooden shield base", description: "Proper wooden shield component, although it could use some additional reinforcement", 
        value: 40,
        shield_strength: 10,
        shield_name: "Wooden shield",
        component_tier: 1,
        component_type: "shield base"
    });
    item_templates["Basic shield handle"] = new ShieldComponent({
        name: "Wooden shield base", description: "A simple handle for holding the shield", 
        value: 8,
        component_tier: 1,
        component_type: "shield handle"
    });

})();

//shields:
(function(){
    item_templates["Cheap wooden shield"] = new Shield({
        shield_base: "Cheap wooden shield base",
        handle: "Basic shield handle",
    });

    item_templates["Crude wooden shield"] = new Shield({
        shield_base: "Crude wooden shield base",
        handle: "Basic shield handle",
    });
})();


//usables:
(function(){
    item_templates["Stale bread"] = new UsableItem({
        name: "Stale bread", description: "Big piece of an old bread, still edible", value: 2,
        use_effect: {
            stamina_regeneration: {
                flat: 1,
                duration: 60,
            },
        }
    });

    item_templates["Fresh bread"] = new UsableItem({
        name: "Fresh bread", description: "Freshly baked bread, delicious", value: 4,
        use_effect: {
            stamina_regeneration: {
                flat: 1,
                duration: 120,
            },
        }
    });

    item_templates["Weak healing powder"] = new UsableItem({
        name: "Weak healing powder", description: "Not very potent, but can still make body heal noticeably faster", value: 8,
        use_effect: {
            health_regeneration: {
                flat: 1,
                duration: 120,
            },
        }
    });
})();



export {item_templates, OtherItem, UsableItem, Armor, Shield, Weapon, getItem};