/* 
for perishables, if ever added, maybe a certain chance to perish/spoil/whatever every second?
alternatively simply make a time counter for it (with increase per tick being equal to number of items)
*/
var item_templates = {};

class Item {
    constructor(item_data) {
        this.name = item_data.name;
        this.description = item_data.description;

        /**
         * Use .getValue() instead of this
         */
        this.value = item_data.value || 0;
    }

    getValue() {
        return this.value;
    }
}

class OtherItem extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "OTHER";
        this.stackable = true;
    }
}

class ComponentItem extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "OTHER";
        this.stackable = true;
        
        //for future use
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
        //todo: multiply  [ item attack power, item block value, item armor value, item trade value ] by item quality (rounded up, always at least 1)
    }

    getValue() {
        return Math.ceil(this.value * this.quality);
    } 
}


class Shield extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = "off-hand";
        this.offhand_type = "shield";
        this.shield_strength = item_data.shield_strength; //how much dmg can be blocked
    }

    getShieldStrength() {
        return Math.ceil(this.shield_strength * this.quality**1.3);
    }
}

class Armor extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = item_data.equip_slot;
        //equipment slot to where item goes
        this.defense_value = item_data.defense_value;

    }

    getDefense() {
        return Math.ceil(this.defense_value * this.quality**1.3)
    }
}

class Weapon extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = "weapon";
        this.weapon_type = item_data.weapon_type; // "sword", "axe", "dagger", "spear", "blunt weapon", "wand", "staff"
        this.attack_value = item_data.attack_value;
    }

    getAttack(){
        return Math.ceil(this.attack_value * this.quality**1.3);
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
                case "shield":
                    return new Shield(item_data);
                default:
                    return new Armor(item_data);
            }
        case "USABLE":
            return new UsableItem(item_data);
        case "OTHER":
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

//components:
(function(){
    item_templates["Cheap short iron blade"] = new ComponentItem({
        name: "Cheap short iron blade", description: "Crude blade made of iron, perfect length for a dagger or a knife",
        value: 4,
    });
    item_templates["Simple short wooden handle"] = new ComponentItem({
        name: "Simple short wooden handle", description: "Short handle for a sword or maybe a dagger",
        value: 2,
    });

})();

//equippables:
(function(){
    item_templates["Ratslayer"] = new Weapon({
        name: "Ratslayer", description: "Test item", value: 1000000000, 
        weapon_type: "sword",
        attack_value: 1000000,
    });

    item_templates["Long stick"] = new Weapon({
        name: "Long stick", description: "Can be used as a simple weapon", value: 6,
        weapon_type: "blunt weapon",
        attack_value: 4,
    });

    item_templates["Sharpened long stick"] = new Weapon({
        name: "Sharpened long stick", description: "Works somewhat okay-ish as a makeshift spear", value: 10,
        weapon_type: "spear",
        attack_value: 6,
        equip_effect: {
            agility: {
                flat_bonus: 1,
            }
        }
    });

    item_templates["Cheap knife"] = new Weapon({
        name: "Cheap knife", description: "Knife of an unknown designation, probably made by an amatour", value: 10,
        weapon_type: "dagger",
        attack_value: 4,
        equip_effect: {
            agility: {
                flat_bonus: 2
            },
            crit_rate: {
                flat_bonus: 0.1
            }
        }
    });

    item_templates["Wooden sword"] = new Weapon({
        name: "Wooden sword", description: "Closer to a toy than to a real weapon", value: 10,
        weapon_type: "sword",
        attack_value: 7,
    });

    item_templates["Plank with a handle"] = new Shield({
        name: "Plank with a handle", description: "Technically can be used as a very basic shield, except it won't really block anything", 
        value: 8, shield_strength: 3,
    });

    item_templates["Crude wooden shield"] = new Shield({
        name: "Crude wooden shield", description: "Crude shield made of wood, not very strong", 
        value: 20, shield_strength: 6,
    });

    item_templates["Wooden shield"] = new Shield({
        name: "Wooden shield", description: "A proper wooden shield, although without any form of reinforcement", value: 40,
        shield_strength: 10,
    });

    item_templates["Cheap leather vest"] = new Armor({
        name: "Cheap leather vest", description: "Vest providing very low protection. Better not to know what's it made from", value: 20,
        equip_slot: "torso",
        defense_value: 4,
    });

    item_templates["Cheap leather pants"] = new Armor({
        name: "Cheap leather pants", description: "Pants of made of unknown leather. Uncomfortable.", value: 20,
        equip_slot: "legs",
        defense_value: 4,
    });
})();

//usables:
(function(){
    item_templates["Stale bread"] = new UsableItem({
        name: "Stale bread", description: "Big piece of an old bread, still edible", value: 2,
        use_effect: {
            health_regeneration: {
                flat: 1,
                duration: 30,
            },
        }
    });

    item_templates["Fresh bread"] = new UsableItem({
        name: "Fresh bread", description: "Freshly baked bread, delicious", value: 5,
        use_effect: {
            health_regeneration: {
                flat: 3,
                duration: 60,
            },
        }
    });
})();



export {item_templates, OtherItem, UsableItem, Armor, Shield, Weapon, getItem};