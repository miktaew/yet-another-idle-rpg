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
            200-246%    legendary      orange     x2
            247-250%    mythical       ????       x2.5

            quality affects only attack/defense/max block, while additional multiplier affects all positive stats 
            (i.e flat bonuses over 0 and multiplicative bonuses over 1)

    basic idea for weapons:

        short blades (daggers/spears) are the fastest but also the weakest, +the most crit rate and crit damage
        blunt heads (blunt weapons) have highest damage, but also lower attack speed
        axe heads have a bit less damage, but a bit less attack speed penalty
        long blades (swords/spears?) have average damage and average attack speed

        long handles (spears) have higher attack multiplier and lower attack speed (so they counter the effects of the short blades), plus an additional built-in x1.5 attack multiplier
        medium handles (axes/blunt weapons) have them average
        short handles have lowest attack multiplier
        
        so, as a result, attack damage goes blunt > axe > spear > sword > dagger
        and attack speed goes               dagger > sword > spear > axe > blunt
        which kinda makes spears very average, but they also get bonus crit so whatever
*/

//as a note, try to not give dexterity/agility from weapons and instead use attack_points/evasion_points, this is in regards of possible skill checks;
//leaving it on armor seems fine on the other hand, as it makes much more sense for worn clothing to impact such a situation

import { round_item_price } from "./misc.js";
import { group_key_prefix, get_item_value_with_market_saturation, get_total_tier_saturation, get_loot_price_multiple} from "./market_saturation.js";
import { is_rat } from "./character.js";

const rarity_multipliers = {
    trash: 1, //low quality alone makes these so bad that no additional nerf should be needed
    common: 1,
    uncommon: 1.1,
    rare: 1.3,
    epic: 1.6,
    legendary: 2,
    mythical: 2.5
};

const item_templates = {};

function getArmorSlot(internal) {
    let equip_slot;
    if(item_templates[internal].component_type === "helmet interior") {
        equip_slot = "head";
    } else if(item_templates[internal].component_type === "chestplate interior") {
        equip_slot = "torso";
    } else if(item_templates[internal].component_type === "leg armor interior") {
        equip_slot = "legs";
    } else if(item_templates[internal].component_type === "glove interior") {
        equip_slot = "arms";
    } else if(item_templates[internal].component_type === "shoes interior") {
        equip_slot = "feet";
    } else {
        console.error(`Component type "${item_templates[internal].component_type}" doesn't correspond to any armor slot!`);
        return null;
    }
    return equip_slot;
}

function getItemRarity(quality) {
    let rarity;
    if(quality < 50) rarity =  "trash";
    else if(quality <= 100) rarity = "common";
    else if(quality < 130) rarity = "uncommon";
    else if(quality < 160) rarity = "rare";
    else if(quality < 200) rarity = "epic";
    else if(quality < 246) rarity = "legendary";
    else rarity = "mythical";
    
    return rarity;
}

function getEquipmentValue({components, quality = 100}) {
    let value = 0;
    Object.values(components).forEach(component => {
        value += item_templates[component].value;
    });
    return round_item_price(1.25 * value * (quality/100 ) * rarity_multipliers[getItemRarity(quality)]);
}

class Item {
    constructor({name,
                description,
                value = 0, 
                tags = {},
                market_saturation_group,
                saturates_market,
                material_type = null,
                quality = null,
                id = null, //passed only on loading, no need to provide it when creating new item objects as it will be filled automatically in that case
                components = null,
                getName = ()=>{return this.name},
                })
    {
        this.name = name;
        if(this.name?.startsWith(group_key_prefix)) {
            throw new Error(`Item name of item "${this.name}" starts with a forbidden prefix!`);
        }
        this.id = id;
        this.description = description;
        this.saturates_market = saturates_market ?? true;

        this.material_type = material_type;

        this.quality = quality;
        this.components = components; //meaningless unless it's an equippable that's /meant/ to have components

        /**
         * Use .getValue() instead of this
         */
        this.value = value;
        this.tags = tags;
        this.tags["item"] = true;
        this.market_saturation_group = market_saturation_group;

        if(!this.getName) {
            this.getName = getName;
        }
    }

    getMarketSaturationGroup() {
        return this.market_saturation_group || {group_key: this.id, group_tier: 0};
    }

    getInventoryKey() {
        if(!this.inventory_key) {
            this.inventory_key = this.createInventoryKey();
        }
        return this.inventory_key;
    }

    createInventoryKey() {
        const key = {};

        if(!this.components) {
            key.id = this.id;
        } else {
            key.components = {};
            Object.keys(this.components).forEach(component => {
                key.components[component] = this.components[component];
            });
        }
        if(this.quality) {
            key.quality = this.quality;
        }
        return JSON.stringify(key);
    }

    getBaseValue({quality, multiplier = 1}={}) {
        quality = quality || this.quality || 100;
        if(this.components) {
            return getEquipmentValue({components: this.components, quality});
        } else {
            return round_item_price(multiplier * this.value * ((quality)/100) * rarity_multipliers[getItemRarity(quality)]);
        }
    }

    getValue({quality, region, multiplier}) {
        quality = quality || this.quality || 100;
        if(!this.saturates_market || !region) {
            return this.getBaseValue({quality, multiplier});
        } else {  
            return this.getValueWithSaturation(region, multiplier);
        }
    }

    getValueWithSaturation(region, multiplier = 1) {
        const {group_key, group_tier} = this.getMarketSaturationGroup();

        return get_item_value_with_market_saturation({item: this, value: round_item_price(this.getBaseValue() * multiplier), group_key, group_tier, region});
    }

    /**
     * calculates total value for when trading multiple at once
     * @param {Object} param0
     * @param {Number} param0.additional_traded_count
     * @param {Number} param0.price_multiplier from trader profit margin
     * @returns 
     */
    getValueOfMultiple({additional_traded_count = 0, count, region, price_multiplier = 1, is_selling = true, stop_multiplier_at = Infinity}) {
        if(!this.saturates_market) {
            //doesn't saturate market, so it's literally just price * count
            return round_item_price(this.getBaseValue()*price_multiplier) * count;
        } else {
            const {group_key, group_tier} = this.getMarketSaturationGroup();

            const val = this.getBaseValue();
            //start_count: total existing saturation + however many is artificially added to sold (e.g. got 40 already added to selling, need to calc price of next 1)
            const multi_value = get_loot_price_multiple({
                value: round_item_price(val*price_multiplier),
                start_count: get_total_tier_saturation({region, group_key, group_tier}) + additional_traded_count,
                how_many_to_trade: count,
                region,
                is_group: group_key.startsWith(group_key_prefix),
                is_selling,
                stop_multiplier_at,
            });

            return Math.max(count, multi_value);
        }
    }

    getDescription() {
        return this.description;
    }
}

class OtherItem extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "OTHER";
    }
}

class Material extends OtherItem {
    constructor(item_data) {
        super(item_data);
        this.item_type = "MATERIAL";
        this.tags["material"] = true;
    }
}

class ItemComponent extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "COMPONENT";
        this.component_tier = item_data.component_tier || 1;
        this.component_stats = item_data.component_stats || {};
        this.tags["component"] = true;
        this.quality = Math.round(item_data.quality) || 100;
    }

    getRarity(quality){
        if(!quality) {
            if(!this.rarity) {
                this.rarity = getItemRarity(this.quality);
            }
            return this.rarity;
        } else {
            return getItemRarity(quality);
        }
    }

    calculateRarity(quality) {
        let rarity;
        if(quality < 50) rarity =  "trash";
        else if(quality < 100) rarity = "common";
        else if(quality < 130) rarity = "uncommon";
        else if(quality < 160) rarity = "rare";
        else if(quality < 200) rarity = "epic";
        else if(quality < 246) rarity = "legendary";
        else rarity = "mythical";
        
        return rarity;
    }

    getStats() {
        return this.component_stats;
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
        if(item_data.component_type === "short handle"){
            this.attack_multiplier = 1;
            this.market_saturation_group = {group_key: group_key_prefix+"handle", group_tier: this.component_tier-1};
        } else if(item_data.component_type === "medium handle"){
            this.attack_multiplier = 1;
            this.market_saturation_group = {group_key: group_key_prefix+"handle", group_tier: this.component_tier-1};
        } else if(item_data.component_type === "long handle"){
            this.attack_multiplier = 1.5;
            this.market_saturation_group = {group_key: group_key_prefix+"handle", group_tier: this.component_tier-1};
        } else {
            this.attack_multiplier = 1;
            this.market_saturation_group = {group_key: group_key_prefix+"weapon", group_tier: this.component_tier-1};
        }

        this.name_prefix = item_data.name_prefix; //to create a name of an item, e.g. "Sharp iron" used to create spear results in "Sharp iron spear"

        this.tags["weapon component"] = true;
        this.tags["component"] = true;
    }
}

class ShieldComponent extends ItemComponent {
    constructor(item_data) {
        super(item_data);
        if(item_data.component_type !== "shield base" && item_data.component_type !== "shield handle") {
            throw new Error(`No such shield component type as ${item_data.component_type}`);
        }
        this.component_type = item_data.component_type;

        if(item_data.component_type === "shield base") {
            this.market_saturation_group = {group_key: group_key_prefix+"shield", group_tier: this.component_tier-1};
        } else {
            this.market_saturation_group = {group_key: group_key_prefix+"handle", group_tier: this.component_tier-1};
        }
        //properties below only matter for shield type component
        this.shield_strength = item_data.shield_strength; 
        this.shield_name = item_data.shield_name || item_data.name;

        this.tags["shield component"] = true;
        this.tags["component"] = true;
    }
}

class ArmorComponent extends ItemComponent {
    constructor(item_data) {
        super(item_data);
        if(item_data.component_type !== "helmet interior" && item_data.component_type !== "helmet exterior"
        && item_data.component_type !== "chestplate interior" && item_data.component_type !== "chestplate exterior"
        && item_data.component_type !== "leg armor interior" && item_data.component_type !== "leg armor exterior"
        && item_data.component_type !== "glove interior" && item_data.component_type !== "glove exterior"
        && item_data.component_type !== "shoes interior" && item_data.component_type !== "shoes exterior") {

            throw new Error(`No such armor component type as ${item_data.component_type}`);
        }
        this.component_type = item_data.component_type;
        this.defense_value = item_data.defense_value;

        this.stats = item_data.stats || {};

        this.equip_slot = item_data.equip_slot;

        //only used with external elements
        this.full_armor_name = item_data.full_armor_name;

        //only used with internal elements
        this.armor_name = item_data.armor_name;

        //only used with external elements; name_prefix/name_suffix are used only if full_armor_name is not provided
        this.name_prefix = item_data.name_prefix;
        this.name_suffix = item_data.name_suffix;

        this.tags["armor component"] = true;
        this.tags["component"] = true;

        this.market_saturation_group = {group_key: group_key_prefix+"armor", group_tier: this.component_tier-1};
    }
}

class UsableItem extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "USABLE";
        this.effects = item_data.effects || {};
        this.recovery_chances = item_data.recovery_chances || {};
        this.saturates_market = false;

        this.tags["usable"] = true;
    }
}

class Equippable extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "EQUIPPABLE";
        this.bonus_skill_levels = item_data.bonus_skill_levels || {};

        this.quality = Math.round(Number(item_data.quality)) || 100;

        this.tags["equippable"] = true;
    }

    getItemTier() {
        if(this.components) {
            let tier = 1;
            Object.values(this.components).forEach(component_key => {
                if(item_templates[component_key].component_tier > tier) {
                    tier = item_templates[component_key].component_tier;
                }
            });
            return tier;
        } else if(this.component_tier) {
            return this.component_tier;
        } else {
            return 1;
        }
    }

    getRarity(quality){
        if(!quality) {
            if(!this.rarity) {
                this.rarity = getItemRarity(this.quality);
            }
            return this.rarity;
        } else {
            return getItemRarity(quality);
        }

    }

    getStats(quality){
        if(!quality) {
            if(!this.stats) {
                this.stats = this.calculateStats(this.quality);
            }
            return this.stats;
        } else {
            return this.calculateStats(quality);
        }
    }

    calculateStats(quality){
        const stats = {};
        if(this.components) {
            //iterate over components
            const components = Object.values(this.components).map(comp => item_templates[comp]).filter(comp => comp);
            for(let i = 0; i < components.length; i++) {
                Object.keys(components[i].component_stats).forEach(stat => {
                    if(!stats[stat]) {
                        stats[stat] = {};
                    }

                    if(stat === "defense" || stat === "attack_power" || stat === "block_strength") { //skip it, it's to be added to the basic defense/attack instead
                        return;
                    }

                    if(components[i].component_stats[stat].multiplier) {
                        stats[stat].multiplier = (stats[stat].multiplier || 1) * components[i].component_stats[stat].multiplier;
                    }
                    if(components[i].component_stats[stat].flat) {
                        stats[stat].flat = (stats[stat].flat || 0) + components[i].component_stats[stat].flat;
                    }
                });
            }

            //iterate over stats and apply rarity bonus if possible
            Object.keys(stats).forEach(stat => {
                if(stats[stat].multiplier){
                    if(stats[stat].multiplier >= 1) {
                        stats[stat].multiplier = Math.round(100 * (1 + (stats[stat].multiplier - 1) * rarity_multipliers[this.getRarity(quality)]))/100;
                    } else {
                        stats[stat].multiplier = Math.round(100 * stats[stat].multiplier)/100;
                    }
                }

                if(stats[stat].flat){
                    if(stats[stat].flat > 0) {
                        stats[stat].flat = Math.round(100 * stats[stat].flat * rarity_multipliers[this.getRarity(quality)])/100;
                    } else {
                        stats[stat].flat = Math.round(100 * stats[stat].flat)/100;
                    }
                }
            });
        } else { //no components, only needs to apply quality to already present stats
            let used_stats = this.component_stats || this.base_stats || {};
            Object.keys(used_stats).forEach(stat => {
                stats[stat] = {};
                if(used_stats[stat].multiplier){
                    stats[stat].multiplier = 1;
                    if(used_stats[stat].multiplier >= 1) {
                        stats[stat].multiplier = Math.round(100 * (1 + (used_stats[stat].multiplier - 1) * rarity_multipliers[this.getRarity(quality)]))/100;
                    } else {
                        stats[stat].multiplier = Math.round(100 * used_stats[stat].multiplier)/100;
                    }
                }

                if(used_stats[stat].flat){
                    stats[stat].flat = 0;
                    if(used_stats[stat].flat > 0) {
                        stats[stat].flat = Math.round(100 * used_stats[stat].flat * rarity_multipliers[this.getRarity(quality)])/100;
                    } else {
                        stats[stat].flat = Math.round(100 * used_stats[stat].flat)/100;
                    }
                }
            });
        }

        return stats;
    }

    getBonusSkillLevels() {
        return this.bonus_skill_levels;
    }
}

class Artifact extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = "artifact";
        this.stats = item_data.stats;
        this.ignore_quality = true;

        this.tags["artifact"] = true;
        if(!this.id) {
            this.id = this.getName();
        }
    }

    getStats(){
        return this.stats;
    }
}

class Tool extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = item_data.equip_slot; //tool type is same as equip slot (axe/pickaxe/herb sickle)
        this.ignore_quality = true;
        this.tags["tool"] = true;
        this.tags[this.equip_slot] = true;
        if(!this.id) {
            this.id = this.getName();
        }
    }
    getStats() {
        return {};
    }
}

class Shield extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = "off-hand";
        this.offhand_type = "shield"; //not like there's any other option

        if(!item_templates[item_data.components.shield_base]) {
            throw new Error(`No such shield base component as: ${item_data.components.shield_base}`);
        }
        this.components.shield_base = item_data.components.shield_base; //only the name

        if(item_data.components.handle && !item_templates[item_data.components.handle]) {
            throw new Error(`No such shield handle component as: ${item_data.components.handle}`);
        }
        this.components.handle = item_data.components.handle; //only the name
        this.tags = {...this.tags, ...item_templates[this.components.handle].tags, ...item_templates[this.components.shield_base].tags};
        this.tags["shield"] = true;
        if(!this.id) {
            this.id = this.getName();
        }

        this.market_saturation_group = {group_key: group_key_prefix+"shield", group_tier: this.getItemTier()-1};
    }

    getShieldStrength(quality) {
        if(!quality) {
            if(!this.shield_strength) {
                this.shield_strength = this.calculateShieldStrength(this.quality);
            }
            return this.shield_strength;
        } else {
            return this.calculateShieldStrength(quality);
        }
    }

    calculateShieldStrength(quality) {
        return Math.round(
            10 * Math.ceil(10*item_templates[this.components.shield_base].shield_strength 
            * (item_templates[this.components.handle].component_stats?.block_strength?.multiplier || 1) 
            * (quality/100) * rarity_multipliers[this.getRarity(quality)]))/100;
    }

    getName() {
        return item_templates[this.components.shield_base].shield_name;
    }
}

class Armor extends Equippable {
    /*
        can have no components, effectively being an equippable internal part;

        naming convention:
        if full_armor_name in external
            then full_armor_name
        else use prefix and suffix on internal element
    */
   /**
    * Takes either {components} or {stats}, with {components} having higher priority. Lack of {components} assumes item is a wearable internal part (clothing)
    * @param {*} item_data 
    */
    constructor(item_data) {
        super(item_data);
        
        if(item_data.components) {
            if(!item_templates[item_data.components.internal]) {
                throw new Error(`No such internal armor element as: ${item_data.components.internal}`);
            }

            this.components.internal = item_data.components.internal; //only the name
            this.components.external = item_data.components.external; //only the name

            if(item_templates[this.components.internal].component_type === "helmet interior") {
                this.equip_slot = "head";
            } else if(item_templates[this.components.internal].component_type === "chestplate interior") {
                this.equip_slot = "torso";
            } else if(item_templates[this.components.internal].component_type === "leg armor interior") {
                this.equip_slot = "legs";
            } else if(item_templates[this.components.internal].component_type === "glove interior") {
                this.equip_slot = "arms";
            } else if(item_templates[this.components.internal].component_type === "shoes interior") {
                this.equip_slot = "feet";
            } else {
                throw new Error(`Component type "${item_templates[this.components.internal].component_type}" doesn't correspond to any armor slot!`);
            }
            if(item_data.external && !item_templates[item_data.external]) {
                throw new Error(`No such external armor element as: ${item_data.components.external}`);
            }

            this.market_saturation_group = {group_key: group_key_prefix+"armor", group_tier: this.getItemTier()-1};
            
        } else { 
            //no components, assumed to be the internal part (clothing)
            this.tags["component"] = true;
            this.tags["armor component"] = true;
            this.tags["clothing"] = true;
            this.component_stats = item_data.component_stats || {};
            delete this.components;
            
            if(!item_data.name) {
                throw new Error(`Component-less item needs to be provided a name!`);
            }
            this.name = item_data.name;
            if(!item_data.value) {
                throw new Error(`Component-less item "${this.getName()}" needs to be provided a monetary value!`);
            }

            this.component_type = item_data.component_type;
            this.value = item_data.value;
            this.component_tier = item_data.component_tier || 1;
            this.base_defense = item_data.base_defense;

            this.market_saturation_group = {group_key: group_key_prefix+"clothing", group_tier: this.getItemTier()-1};

            if(item_data.component_type === "helmet interior") {
                this.equip_slot = "head";
            } else if(item_data.component_type === "chestplate interior") {
                this.equip_slot = "torso";
            } else if(item_data.component_type === "leg armor interior") {
                this.equip_slot = "legs";
            } else if(item_data.component_type === "glove interior") {
                this.equip_slot = "arms";
            } else if(item_data.component_type === "shoes interior") {
                this.equip_slot = "feet";
            } else {
                throw new Error(`Component type "${item_data.component_type}" doesn't correspond to any armor slot!`);
            }
        }

        this.tags["armor"] = true;
        if(!this.id) {
            this.id = this.getName();
        }
    }

    getDefense(quality) {
        if(!quality) {
            if(!this.defense_value) {
                this.defense_value = this.calculateDefense(this.quality);
            }
            return this.defense_value;
        } else {
            return this.calculateDefense(quality);
        }
    }

    calculateDefense(quality) {
        if(this.components) {
            return Math.ceil(((item_templates[this.components.internal].defense_value || item_templates[this.components.internal].base_defense ||0) + 
                                        (item_templates[this.components.external]?.defense_value || 0 )) 
                                        * (quality/100 || this.quality/100) * rarity_multipliers[this.getRarity(quality || this.quality)]
            );
        } else {
            return Math.ceil((this.base_defense || 0)  * (quality/100 || this.quality/100) * rarity_multipliers[this.getRarity(quality || this.quality)]);
        }
    }

    getName() {
        /*
        no external => name after internal.armor_name
        external with full_armor_name => use full_armor_name
        otherwise => prefix + internal + suffix
        */

        if(!this.name) {
            if(!this.components.external) {
                this.name = item_templates[this.components.internal].armor_name;
            } else {
                if(item_templates[this.components.external].full_armor_name) {
                    this.name = item_templates[this.components.external].full_armor_name;
                } else {
                    this.name = (item_templates[this.components.external].name_prefix || '') + " " + item_templates[this.components.internal].armor_name.toLowerCase() + " " + (item_templates[this.components.external].name_suffix || '');
                }
            }
        }

        return this.name;
    }
}

class Weapon extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = "weapon";

        if(!item_templates[item_data.components.head]) {
            throw new Error(`No such weapon head as: ${item_data.components.head}`);
        }
        this.components.head = item_data.components.head; //only the name

        if(!item_templates[item_data.components.handle]) {
            throw new Error(`No such weapon handle as: ${item_data.components.handle}`);
        }
        this.components.handle = item_data.components.handle; //only the name

        if(item_templates[this.components.handle].component_type === "long handle" 
        && (item_templates[this.components.head].component_type === "short blade" || item_templates[this.components.head].component_type === "long blade")) {
            //long handle + short/long blade = spear
            this.weapon_type = "spear";
        } else if(item_templates[this.components.handle].component_type === "medium handle" 
        && item_templates[this.components.head].component_type === "axe head") {
            //medium handle + axe head = axe
            this.weapon_type = "axe";
        } else if(item_templates[this.components.handle].component_type === "medium handle" 
        && item_templates[this.components.head].component_type === "hammer head") {
            //medium handle + hammer head = hammer
            this.weapon_type = "hammer";
        } else if(item_templates[this.components.handle].component_type === "short handle" 
        && item_templates[this.components.head].component_type === "short blade") {
            //short handle + short blade = dagger
            this.weapon_type = "dagger";
        } else if(item_templates[this.components.handle].component_type === "short handle" 
        && item_templates[this.components.head].component_type === "long blade") {
            //short handle + long blade = sword
            this.weapon_type = "sword";
        } else {
            throw new Error(`Combination of elements of types ${item_templates[this.components.handle].component_type} and ${item_templates[this.components.head].component_type} does not exist!`);
        }

        this.tags["weapon"] = true;
        this.tags[this.weapon_type] = true;
        if(!this.id) {
            this.id = this.getName();
        }

        this.market_saturation_group = {group_key: group_key_prefix+"weapon", group_tier: this.getItemTier()-1};
    }

    getAttack(quality){
        if(!quality) {
            if(!this.attack_power) {
                this.attack_power = this.calculateAttackPower(this.quality);
            }
            return this.attack_power;
        } else {
            return this.calculateAttackPower(quality);
        }
    }

    calculateAttackPower(quality) {
        return Math.ceil(
            (item_templates[this.components.head].attack_value + item_templates[this.components.handle].attack_value 
                + (item_templates[this.components.handle].component_stats?.attack_power?.flat || 0))
            * item_templates[this.components.head].attack_multiplier * item_templates[this.components.handle].attack_multiplier
            * (item_templates[this.components.handle].component_stats?.attack_power?.multiplier || 1)
            * (quality/100) * rarity_multipliers[this.getRarity(quality)]
        );
    }

    getName() {
        return `${item_templates[this.components.head].name_prefix} ${this.weapon_type === "hammer" ? "battle hammer" : this.weapon_type}`;
    }
}

class Cape extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.components = undefined;
        this.equip_slot = "cape";
        this.base_stats = item_data.base_stats;
        this.item_tier = item_data.item_tier;

        this.tags["cape"] = true;

        if(!item_data.name) {
            throw new Error(`Component-less item needs to be provided a name!`);
        }
        this.name = item_data.name;
        if(!item_data.value) {
            throw new Error(`Component-less item "${this.getName()}" needs to be provided a monetary value!`);
        }

        this.value = item_data.value;
        this.base_defense = item_data.base_defense;

        if(!this.id) {
            this.id = this.getName();
        }

        this.market_saturation_group = {group_key: group_key_prefix+"cape", group_tier: this.getItemTier()-1};
    }
    

    getDefense(quality) {
        if(!quality) {
            if(!this.defense_value) {
                this.defense_value = this.calculateDefense(this.quality);
            }
            return this.defense_value;
        } else {
            return this.calculateDefense(quality);
        }
    }
    calculateDefense(quality) {
        return Math.ceil((this.base_defense || 0)  * (quality/100 || this.quality/100) * rarity_multipliers[this.getRarity(quality || this.quality)]);
    }
}

class Amulet extends Equippable {
    constructor(item_data) {
        super(item_data);
        this.equip_slot = "amulet";
        this.stats = item_data.stats;

        this.ignore_quality = true;

        this.tags["amulet"] = true;
        if(!this.id) {
            this.id = this.getName();
        }
    }

    getStats(){
        return this.stats;
    }
}

//////////////////////////////
//////////////////////////////
//////////////////////////////
class BookData{
    constructor({
        required_time = 1,
        required_skills = {literacy: 0},
        literacy_xp_rate = 1,
        finish_reward = {},
        bonuses = {}, //xp/stat bonuses
        rewards = {}, //unlocks, etc
    }) {
        this.required_time = required_time;
        this.accumulated_time = 0;
        this.required_skills = required_skills;
        this.literacy_xp_rate = literacy_xp_rate;
        this.finish_reward = finish_reward;
        this.is_finished = false;
        this.bonuses = bonuses;
        this.rewards = rewards;
    }
}

const book_stats = {};

class Book extends Item {
    constructor(item_data) {
        super(item_data);
        this.item_type = "BOOK";
        this.name = item_data.name;

        this.tags["book"] = true;

        this.saturates_market = false; //uncraftable and limited, no point
    }

    /**
     * 
     * @returns {Number} total time needed to read the book
     */
    getReadingTime() {
        //maybe make it go faster with literacy skill level?
        let {required_time} = book_stats[this.name];
        return required_time;
    }

    /**
     * 
     * @returns {Number} remaining time needed to read the book (total time minus accumulated time)
     */
    getRemainingTime() {
        let remaining_time = Math.max(book_stats[this.name].required_time - book_stats[this.name].accumulated_time, 0);
        return remaining_time;
    }

    addProgress(time = 1) {
        book_stats[this.name].accumulated_time += time;
        if(book_stats[this.name].accumulated_time >= book_stats[this.name].required_time) {
            this.setAsFinished();
        }
    }

    setAsFinished() {
        book_stats[this.name].is_finished = true;
        book_stats[this.name].accumulated_time = book_stats[this.name].required_time;
    }
}

/**
 * @param {Object} item_data 
 * @param {Object} item_data.item_type
 * @returns {Item} item of proper type, created with item_data
 */
function getItem(item_data) {
    switch(item_data.item_type) {
        case "EQUIPPABLE":
            switch(item_data.equip_slot) {
                case "weapon":
                    return new Weapon(item_data);
                case "off-hand":
                    return new Shield(item_data);
                case "artifact":
                    return new Artifact(item_data);
                case "axe":
                case "pickaxe":
                case "sickle":
                case "shovel":
                    return new Tool(item_data);
                case "cape":
                    return new Cape(item_data);
                case "amulet":
                    return new Amulet(item_data);
                default:
                    return new Armor(item_data);
            }
        case "USABLE":
            return new UsableItem(item_data);
        case "BOOK":
            return new Book(item_data);
        case "OTHER":
            return new OtherItem(item_data);
        case "COMPONENT":
            if(item_data.tags["weapon component"]) 
                return new WeaponComponent(item_data);
            else if(item_data.tags["armor component"]) 
                return new ArmorComponent(item_data);
            else if(item_data.tags["shield component"]) 
                return new ShieldComponent(item_data);
            else throw new Error(`Item ${item_data.name} has a wrong component type`);
        case "MATERIAL":
            return new Material(item_data);
        default:
            throw new Error(`Wrong item type: ${item_data.item_type}`);
    }
}

/**
 * @param {String} item_data 
 * @returns {Item} item of proper type, created based on item_key
 */
function getItemFromKey(key) {
    let {id, components, quality} = JSON.parse(key);
    if(id && !quality) { 
        if(item_templates[id]) {
            return getItem(item_templates[id]);
        } else {
            throw new Error(`Inventory item "${key}" couldn't be found!`);
        }
    } else if(components) {
        const {head, handle, shield_base, internal, external} = components;
        if(head) { //weapon
            if(!item_templates[head]){
                throw new Error(`Weapon head component "${head}" couldn't be found!`);
            } else if(!item_templates[handle]) {
                throw new Error(`Weapon handle component "${handle}" couldn't be found!`);
            } else {
                return getItem({components, quality, equip_slot: "weapon", item_type: "EQUIPPABLE"});
            }
        } else if(shield_base){ //shield
            if(!item_templates[shield_base]){
                throw new Error(`Shield base component "${shield_base}" couldn't be found!`);
            } else if(!item_templates[handle]) {
                throw new Error(`Shield handle component "${handle}" couldn't be found!`);
            } else {
                return getItem({components, quality, equip_slot: "off-hand", item_type: "EQUIPPABLE"});
            }
        } else if(internal) { //armor
            if(!item_templates[internal]){
                throw new Error(`Internal armor component "${internal}" couldn't be found!`);
            } else if(!item_templates[external]) {
                throw new Error(`External armor component "${external}" couldn't be found!`);
            } else {
                let equip_slot = getArmorSlot(internal);
                if(!equip_slot) {
                    return;
                }
                return getItem({components, quality, equip_slot, item_type: "EQUIPPABLE"});
            }
        } else {
            throw new Error(`Inventory key "${key}" seems to refer to non-existing item type!`);
        }
    } else if(quality) { //no comps but quality (clothing / artifact?)
        return getItem({...item_templates[id], quality});
    } else {
        throw new Error(`Inventory key "${key}" is incorrect!`);
    }
}

//book stats
book_stats["ABC for kids"] = new BookData({
    required_time: 120,
    literacy_xp_rate: 1,
    bonuses: {
        xp_multipliers: {
            all: 1.1,
        }
    },
});

book_stats["Old combat manual"] = new BookData({
    required_time: 320,
    literacy_xp_rate: 1,
    bonuses: {
        xp_multipliers: {
            Combat: 1.2,
        }
    },
});

book_stats["Twist liek a snek"] = new BookData({
    required_time: 320,
    literacy_xp_rate: 1,
    bonuses: {
        xp_multipliers: {
            Evasion: 1.2,
        },
        multipliers: {
            agility: 1.1,
        } 
    },
});

book_stats["Medicine for dummies"] = new BookData({
    required_time: 420,
    literacy_xp_rate: 2,
    rewards: {
        recipes: [
            {category: "alchemy", subcategory: "items", recipe_id: "Weak healing powder"},
            {category: "alchemy", subcategory: "items", recipe_id: "Healing balm"},
            {category: "alchemy", subcategory: "items", recipe_id: "Oneberry juice"},
            {category: "alchemy", subcategory: "items", recipe_id: "Healing powder"},
            {category: "alchemy", subcategory: "items", recipe_id: "Healing potion"},
        ],
    },
    bonuses: {
        xp_multipliers: {
            Medicine: 1.2,
        },
    }
});

book_stats["Butchering and you"] = new BookData({
    required_time: 240,
    literacy_xp_rate: 2,
    rewards: {
        skills: ["Butchering"],
        recipes: [
            {category: "cooking", subcategory: "items", recipe_id: "Animal fat"}
        ],
    },
});

book_stats["Ode to Whimsy, and other poems"] = new BookData({
    required_time: 120,
    literacy_xp_rate: 4,
    bonuses: {
        xp_multipliers: {
            all: 1.1,
        }
    },
});

book_stats["A Glint On The Sand"] = new BookData({
    required_time: 420,
    literacy_xp_rate: 4,
    rewards: {
        recipes: [
            {category: "alchemy", subcategory: "items", recipe_id: "Potash"},
            {category: "smelting", subcategory: "items", recipe_id: "Raw Glass"},
            {category: "crafting", subcategory: "items", recipe_id: "Glass phial"},
            {category: "crafting", subcategory: "items", recipe_id: "Glass bottle"},
        ],
        activities: [{location: "Village", activity: "sand"}]
    }
});

//books
(()=>{
    item_templates["ABC for kids"] = new Book({
        name: "ABC for kids",
        description: "The simplest book on the market",
        value: 100,
    });

    item_templates["Old combat manual"] = new Book({
        name: "Old combat manual",
        description: "Old book about combat, worn and outdated, but might still contain something useful",
        value: 200,
    });

    item_templates["Twist liek a snek"] = new Book({
        name: "Twist liek a snek",
        description: "This book has a terrible grammar, seemingly written by some uneducated bandit, but despite that it quite well details how to properly evade attacks",
        value: 200,
    });

    item_templates["Medicine for dummies"] = new Book({
        name: "Medicine for dummies",
        description: "A simple book about healing, describing how to create some basic medicines",
        value: 320,
    });

    item_templates["Butchering and you"] = new Book({
        name: "Butchering and you",
        description: "An introductory book to animal butchering, that goes into further detail on how to make a use of animal parts, especially hides and bones",
        value: 240,
    });

    item_templates["Ode to Whimsy, and other poems"] = new Book({
        name: "Ode to Whimsy, and other poems",
        description: "A short and wonderful book of poetry that fills one with appreciation for life",
        value: 200,
    });

    item_templates["A Glint On The Sand"] = new Book({
        id: "A Glint On The Sand",
        name: "A Glint On The Sand",
        description: "This books recounts a tale of shipwrecked crew accidentally discovering glassmaking while cooking on a beach. More importantly, it details the processees and materials necessary to manufacture glass",
        value: 300
    });
})();

//miscellaneous, and useless loot:
(function(){
    item_templates["Rat fang"] = new OtherItem({
        name: "Rat fang", 
        description: "Fang of a huge rat, not very sharp, but can still pierce a human skin if enough force is applied", 
        value: 8,
        material_type: "animal tooth",
    });

    item_templates["Wolf fang"] = new OtherItem({
        name: "Wolf fang", 
        description: "Fang of a wild wolf. Somewhat sharp, still not very useful. Maybe if it had a bit better quality...",
        value: 12,
        material_type: "animal tooth",
    });

    item_templates["Boar tusk"] = new Material({
        name: "Boar tusk", 
        description: "Tusk of a wild boar. Visibly worn and not very sharp",
        value: 20,
    });

    item_templates["Rat meat chunks"] = new OtherItem({
        name: "Rat meat chunks", 
        description: "Eww", 
        value: 8,
    });

    item_templates["Glass phial"] = new OtherItem({
        name: "Glass phial", 
        description: "Small glass phial, a perfect container for a potion", 
        value: 10,
    });

    item_templates["Glass bottle"] = new OtherItem({
        name: "Glass bottle", 
        description: "A glass bottle, perfect for carrying a drink around", 
        value: 20,
    });

    item_templates["Camping supplies"] = new OtherItem({
        name: "Camping supplies", 
        description: "Bedroll, tent, small chest, and generally just anything that could be needed to establish a camp", 
        value: 2000,
    });
    item_templates["Coil of rope"] = new OtherItem({
        name: "Coil of rope",
        description: "A nice, long coil of rope, for whatever use you might find (although you have a feeling it will only be very situational)",
        value: 400,
    });

    item_templates["Mountain goat horn"] = new OtherItem({
        name: "Mountain goat horn",
        description: "A curved and sturdy horn of a mountain goat. While not very useful in itself, it makes for a nice decoration",
        value: 30,
    });
})();

//lootable materials
(function(){
    item_templates["Rat tail"] = new Material({
        name: "Rat tail",
        description: "Tail of a huge rat. Doesn't seem very useful, but maybe some meat could be recovered from it",
        value: 4,
    });
    item_templates["Rat pelt"] = new Material({
        name: "Rat pelt",
        description: "Pelt of a huge rat. Fur has terrible quality, but maybe leather could be used for something if you gather more?",
        value: 10,
        material_type: "pelt",
    });
    item_templates["High quality wolf fang"] = new Material({
        name: "High quality wolf fang",
        description: "Fang of a wild wolf. Very sharp, undamaged and surprisingly clean",
        value: 15,
        material_type: "miscellaneous",
    });
    item_templates["Wolf pelt"] = new Material({
        name: "Wolf pelt",
        description: "Pelt of a wild wolf. It's a bit damaged so it won't fetch a great price, but the leather itself could be useful",
        value: 20,
        material_type: "pelt",
    });

    item_templates["Boar hide"] = new Material({
        name: "Boar hide",
        description: "Thick hide of a wild boar. Too stiff for clothing, but might be useful for an armor",
        value: 30,
        material_type: "pelt",
    });
    item_templates["Boar meat"] = new Material({
        name: "Boar meat",
        description: "Fatty meat of a wild boar, all it needs is to be cooked",
        value: 20,
    });
    item_templates["High quality boar tusk"] = new Material({
        name: "High quality boar tusk",
        description: "Tusk of a wild boar. Sharp and long enough to easily kill an adult human",
        value: 25,
        material_type: "miscellaneous",
    });

    item_templates["Bear hide"] = new Material({
        description: "A strong hide of a wild bear, so strong that even steel struggles against it",
        value: 50,
        material_type: "pelt",
    });
    item_templates["Bear claw"] = new Material({
        description: "Large and dangerous claw of a wild bear, but it has seen better days",
        value: 50,
    });
    item_templates["Sharp bear claw"] = new Material({
        description: "Large and dangerous of a wild bear, sharp enough to easily cut through meat",
        value: 80,
        material_type: "miscellaneous",
    });

    item_templates["Weak monster bone"] = new Material({
        name: "Weak monster bone",
        description: "Mutated and dark bone of a monster. While on the weaker side, it's still very strong and should be useful for crafting after some processing",
        value: 30,
        material_type: "bone",
    });

    item_templates["Goat meat"] = new Material({
        name: "Goat meat",
        description: "Lean meat of a goat, it's pretty tough and needs to be cooked for a long time",
        value: 25,
    });
    item_templates["Mountain goat hide"] = new Material({
        name: "Mountain goat hide", 
        description: "Thick hide of a mountain goat hide. Not as strong as boar hide, but this one can actually be turned into clothes after some processing",
        value: 30,
        material_type: "pelt",
    });
    item_templates["Pristine mountain goat horn"] = new Material({
        name: "Pristine mountain goat horn",
        description: "Curved and sturdy horn of a mountain goat. It's noticeably bigger than average and seems to be even sturdier",
        value: 70,
        material_type: "miscellaneous",
    });

})();

//gatherable materials
(function(){
    item_templates["Low quality iron ore"] = new Material({
        name: "Low quality iron ore",
        description: "Iron content is rather low and there are a lot of problematic components that can't be fully removed, which will affect created materials",
        value: 3,
        material_type: "raw metal",
    });
    item_templates["Iron ore"] = new Material({
        name: "Iron ore", 
        description: "It has a decent iron content and can be smelt into market-quality iron",
        value: 5,
        material_type: "raw metal",
    });
    item_templates["Atratan ore"] = new Material({
        name: "Atratan ore",
        description: "A dark-colored ore that's useless by itself but can be mixed with iron to create steel",
        value: 6,
        material_type: "raw metal",
    });
    item_templates["Coal"] = new Material({
        name: "Coal",
        description: "A flammable material with extremely high carbon content",
        value: 7,
        material_type: "coal",
    });

    item_templates["Charcoal"] = new Material({
        name: "Charcoal",
        description: "A flammable material with extremely high carbon content, created by strongly heating wood",
        value: 5,
        material_type: "coal",
    });
    item_templates["Piece of rough wood"] = new Material({
        description: "Cheapest form of wood. There's a lot of bark and malformed pieces",
        value: 2,
        material_type: "raw wood",
        getName: ()=>{
            if(is_rat()) return "Piece of rat wood";
            else return "Piece of rough wood";
        }
    });
    item_templates["Piece of wood"] = new Material({
        description: "Average quality wood. There's a lot of bark and malformed pieces",
        value: 4,
        material_type: "raw wood",
    });
    item_templates["Piece of ash wood"] = new Material({
        description: "Strong yet elastic, it's best wood you can hope to find around. There's a lot of bark and malformed pieces",
        value: 7,
        material_type: "raw wood",
    });

    item_templates["Belmart leaf"] = new Material({
        description: "Small, round, dark-green leaves with with very good disinfectant properties",
        value: 8,
        material_type: "disinfectant herb",
    });

    item_templates["Golmoon leaf"] = new Material({
        description: "Big green-brown leaves that can be applied to wounds to speed up their healing",
        value: 8,
        material_type: "healing herb",
    });

    item_templates["Oneberry"] = new Material({
        description: "Small blue berries capable of stimulating body's natural healing",
        value: 8,
        material_type: "healing herb",
    });

    item_templates["Silver thistle"] = new Material({
        description: "Rare herb that usually grows high up in mountains, a potent healing ingredient",
        value: 20,
        material_type: "healing herb",
    });

    item_templates["Cooking herbs"] = new Material({
        name: "Parsley, sage, rosemary and thyme",
        description: "A collection of various herbs commonly used to enhance the flavour and nutrition of dishes",
        value: 10,
        material_type: "culinary herb",
    });

    item_templates["Wool"] = new Material({
        description: "A handful of wool, raw and unprocessed",
        value: 8,
        material_type: "raw fabric",
    });
    
    item_templates["Silica Sand"] = new Material({
        name: "Silica sand",
        description: "Sand made potent by the remains of countless generations of creatures that lived and died in the body of water it was taken from",
        value: 1
    });
})();

//processed materials
(function(){
    item_templates["Bonemeal"] = new Material({
        description: "Powdered bones and teeth, that can be used as an organic fertilizer",
        value: 100,
    }),
    item_templates["Low quality iron ingot"] = new Material({
        description: "It has a lot of impurities, resulting in it being noticeably below the market standard",
        value: 10,
        material_type: "metal",
    });
    item_templates["Iron ingot"] = new Material({
        description: "It doesn't suffer from any excessive impurities and can be used without worries",
        value: 20,
        material_type: "metal",
    });
    item_templates["Steel ingot"] = new Material({
        description: "Basic alloy of iron, harder and more resistant",
        value: 40,
        material_type: "metal",
    });
    item_templates["Piece of wolf rat leather"] = new Material({
        description: "It's slightly damaged and seems useless for anything that requires precise work",
        value: 10,
        material_type: "piece of leather",
    });
    item_templates["Processed rat pelt"] = new Material({
        description: "Processed pelt of a huge rat. It's of a barely acceptable quality, but it's still a miracle with how terrible the basic material was", 
        value: 15,
        material_type: "processed pelt",
    });
    item_templates["Piece of wolf leather"] = new Material({
        description: "Somewhat strong, should offer some protection when turned into armor",
        value: 20,
        material_type: "piece of leather",
    });
    item_templates["Processed wolf pelt"] = new Material({
        description: "Processed pelt of a wild wolf. It's a nice, stylish material",
        value: 30,
        material_type: "processed pelt",
    });
    item_templates["Piece of boar leather"] = new Material({
        description: "Thick and resistant leather, too stiff for clothes but perfect for armor",
        value: 30,
        material_type: "piece of leather",
    });
    item_templates["Processed boar hide"] = new Material({
        description: "Processed hide of a wild boar. It's a rough, heavy material, but it's quite strong",
        value: 45,
        material_type: "processed pelt",
    });
    item_templates["Piece of goat leather"] = new Material({
        description: "Thick and resistant, just barely elastic enough to be used for clothing",
        value: 40,
        material_type: "piece of leather"
    }),
    item_templates["Processed goat hide"] = new Material({
        description: "Processed hide of a wild goat. It's a rough and resistant material",
        value: 60,
        material_type: "processed pelt",
    });
    item_templates["Piece of bear leather"] = new Material({
        description: "Strong and resistant, but too thick for clothing",
        value: 60,
        material_type: "piece of leather"
    }),
    item_templates["Processed bear hide"] = new Material({
        description: "Strong, resistan, and warm",
        value: 90,
        material_type: "piece of leather"
    }),
    item_templates["Animal fat"] = new Material({
        description: "White, thick, oily substance, rendered from animal tissue",
        value: 40,
        material_type: "fat",
    });
    item_templates["Wool cloth"] = new Material({
        description: "Thick and warm, might possibly absorb some punches",
        value: 8,
        material_type: "fabric",
    });
    item_templates["Iron chainmail"] = new Material({
        description: "Dozens of tiny iron rings linked together. Nowhere near a wearable form, turning it into armor will still take a lot of effort and focus",
        value: 12,
        material_type: "chainmail",
    });
    item_templates["Steel chainmail"] = new Material({
        description: "Dozens of tiny steel rings linked together. Nowhere near a wearable form, turning it into armor will still take a lot of effort and focus",
        value: 18,
        material_type: "chainmail",
    });
    item_templates["Scraps of wolf rat meat"] = new Material({
        description: "Ignoring where they come from and all the attached diseases, they actually look edible. Just remember to cook it first",
        value: 8,
        material_type: "meat",
    });
    item_templates["Processed rough wood"] = new Material({
        description: "Cheapest form of wood, ready to be used. Despite being rather weak, it still has a lot of uses",
        value: 6,
        material_type: "wood",
    });

    item_templates["Processed wood"] = new Material({
        description: "Average quality wood, ready to be used",
        value: 11,
        material_type: "wood",
    });

    item_templates["Processed ash wood"] = new Material({
        description: "High quality wood, just waiting to be turned into a piece of equipment",
        value: 20,
        material_type: "wood",
    });

    item_templates["Processed weak monster bone"] = new Material({
        description: "Polished and cleaned bones of a weak monster, just waiting to be turned into a piece of equipment",
        value: 40,
        material_type: "bone",
    });

    item_templates["Potash"] = new Material({
        description: "An alchemical substance derived from plant ash, sought after for production of bleach, soap and glass",
        value: 25
    });

    item_templates["Raw Glass"] = new Material({
        name: "Raw glass",
        description: "Molten piece of glass, yet to be shaped into something useful",
        value: 100
    });

})();

//spare parts
(function(){
    //currently not in use and not obtainable
    item_templates["Basic spare parts"] = new OtherItem({
        name: "Basic spare parts", 
        description: "Some cheap and simple spare parts, like bindings and screws, necessary for crafting equipment",
        value: 30, 
        component_tier: 1,
    });
}());

//weapon components:
(function(){
    item_templates["Cheap short iron blade"] = new WeaponComponent({
        name: "Cheap short iron blade", description: "Crude blade made of iron. Perfect length for a dagger, but could be also used for a spear",
        component_type: "short blade",
        value: 70,
        component_tier: 1,
        name_prefix: "Cheap iron",
        attack_value: 5,
        component_stats: {
            crit_rate: {
                flat: 0.06,
            },
            attack_speed: {
                multiplier: 1.20,
            },
            evasion_points: {
                multiplier: 1.05,
            }
        }
    });
    item_templates["Short iron blade"] = new WeaponComponent({
        name: "Short iron blade", description: "A good iron blade. Perfect length for a dagger, but could be also used for a spear",
        component_type: "short blade",
        value: 160,
        component_tier: 2,
        name_prefix: "Iron",
        attack_value: 8,
        component_stats: {
            crit_rate: {
                flat: 0.08,
            },
            attack_speed: {
                multiplier: 1.30,
            },
            evasion_points: {
                multiplier: 1.13,
            }
        }
    });
    item_templates["Short steel blade"] = new WeaponComponent({
        name: "Short steel blade", description: "A good steel blade. Perfect length for a dagger, but could be also used for a spear",
        component_type: "short blade",
        value: 240,
        component_tier: 3,
        name_prefix: "Steel",
        attack_value: 11,
        component_stats: {
            crit_rate: {
                flat: 0.1,
            },
            attack_speed: {
                multiplier: 1.35,
            },
            evasion_points: {
                multiplier: 1.2,
            }
        }
    });
    item_templates["Cheap long iron blade"] = new WeaponComponent({
        name: "Cheap long iron blade", description: "Crude blade made of iron, with a perfect length for a sword",
        component_type: "long blade",
        value: 100,
        name_prefix: "Cheap iron",
        component_tier: 1,
        attack_value: 8,
        component_stats: {
            attack_speed: {
                multiplier: 1.10,
            },
            crit_rate: {
                flat: 0.02,
            },
            attack_points: {
                multiplier: 1.05,
            }
        }
    });
    item_templates["Long iron blade"] = new WeaponComponent({
        name: "Long iron blade", description: "Good blade made of iron, with a perfect length for a sword",
        component_type: "long blade",
        value: 210,
        name_prefix: "Iron",
        component_tier: 2,
        attack_value: 13,
        component_stats: {
            attack_speed: {
                multiplier: 1.15,
            },
            crit_rate: {
                flat: 0.04,
            },
            attack_points: {
                multiplier: 1.13,
            }
        }
    });
    item_templates["Long steel blade"] = new WeaponComponent({
        name: "Long steel blade", description: "Good blade made of steel, with a perfect length for a sword",
        component_type: "long blade",
        value: 310,
        name_prefix: "Steel",
        component_tier: 3,
        attack_value: 18,
        component_stats: {
            attack_speed: {
                multiplier: 1.2,
            },
            crit_rate: {
                flat: 0.05,
            },
            attack_points: {
                multiplier: 1.2,
            }
        }
    });
    item_templates["Cheap iron axe head"] = new WeaponComponent({
        name: "Cheap iron axe head", description: "A heavy axe head made of low quality iron",
        component_type: "axe head",
        value: 100,
        name_prefix: "Cheap iron",
        component_tier: 1,
        attack_value: 10,
        component_stats: {
            attack_speed: {
                multiplier: 0.9,
            }
        }
    });
    item_templates["Iron axe head"] = new WeaponComponent({
        name: "Iron axe head", description: "A heavy axe head made of steel",
        component_type: "axe head",
        value: 210,
        name_prefix: "Iron",
        component_tier: 2,
        attack_value: 16,
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Steel axe head"] = new WeaponComponent({
        name: "Steel axe head", description: "A heavy axe head made of steel",
        component_type: "axe head",
        value: 310,
        name_prefix: "Steel",
        component_tier: 3,
        attack_value: 22,
    });
    item_templates["Cheap iron hammer head"] = new WeaponComponent({
        name: "Cheap iron hammer head", description: "A crude ball made of low quality iron, with a small hole for the handle",
        component_type: "hammer head",
        value: 100,
        name_prefix: "Cheap iron",
        component_tier: 1,
        attack_value: 12,
        component_stats: {
            attack_speed: {
                multiplier: 0.8,
            }
        }
    });

    item_templates["Iron hammer head"] = new WeaponComponent({
        name: "Iron hammer head", description: "A crude ball made of iron, with a small hole for the handle",
        component_type: "hammer head",
        value: 210,
        name_prefix: "Iron",
        component_tier: 2,
        attack_value: 19,
        component_stats: {
            attack_speed: {
                multiplier: 0.85,
            }
        }
    });
    item_templates["Steel hammer head"] = new WeaponComponent({
        name: "Steel hammer head", description: "A blocky piece of steel, with a small hole for the handle",
        component_type: "hammer head",
        value: 300,
        name_prefix: "Steel",
        component_tier: 3,
        attack_value: 26,
        component_stats: {
            attack_speed: {
                multiplier: 0.9,
            }
        }
    });

    item_templates["Simple short wooden hilt"] = new WeaponComponent({
        name: "Simple short wooden hilt", description: "A short handle for a sword or maybe a dagger",
        component_type: "short handle",
        value: 8,
        component_tier: 1,
    });

    item_templates["Short wooden hilt"] = new WeaponComponent({
        name: "Short wooden hilt", description: "A short handle for a sword or maybe a dagger",
        component_type: "short handle",
        value: 32,
        component_tier: 2,
        component_stats: {
            attack_speed: {
                multiplier: 1.05,
            }
        }
    });

    item_templates["Short ash wood hilt"] = new WeaponComponent({
        name: "Short ash wood hilt", description: "A short handle for a sword or maybe a dagger",
        component_type: "short handle",
        value: 48,
        component_tier: 3,
        component_stats: {
            attack_speed: {
                multiplier: 1.1,
            }
        }
    });

    item_templates["Simple medium wooden handle"] = new WeaponComponent({
        name: "Simple medium wooden handle", description: "A medium handle for an axe or a hammer",
        component_type: "medium handle",
        value: 16,
        component_tier: 1,
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });

    item_templates["Medium wooden handle"] = new WeaponComponent({
        name: "Medium wooden handle", description: "A medium handle for an axe or a hammer",
        component_type: "medium handle",
        value: 64,
        component_tier: 2,
    });

    item_templates["Medium ash wood handle"] = new WeaponComponent({
        name: "Medium ash wood handle", description: "A medium handle for an axe or a hammer",
        component_type: "medium handle",
        value: 96,
        component_tier: 3,
        component_stats: {
            attack_speed: {
                multiplier: 1.05,
            }
        }
    });

    item_templates["Simple long wooden shaft"] = new WeaponComponent({
        name: "Simple long wooden shaft", description: "A long shaft for a spear, somewhat uneven",
        component_type: "long handle",
        value: 24,
        component_tier: 1,
        component_stats: {
            attack_speed: {
                multiplier: 0.9,
            },
        }
    });

    item_templates["Long wooden shaft"] = new WeaponComponent({
        name: "Long wooden shaft", 
        description: "A long shaft for a spear, somewhat uneven",
        component_type: "long handle",
        value: 100,
        component_tier: 2,
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            },
        }
    });
    item_templates["Long ash wood shaft"] = new WeaponComponent({
        name: "Long ash wood shaft", 
        description: "A long shaft for a spear",
        component_type: "long handle",
        value: 150,
        component_tier: 3,
    });

    item_templates["Cheap short iron hilt"] = new WeaponComponent({
        name: "Cheap short iron hilt", description: "A short handle for a sword or maybe a dagger, heavy",
        component_type: "short handle",
        value: 56,
        component_tier: 1,
        component_stats: {
            attack_speed: {
                multiplier: 0.9,
            },
            attack_power: {
                multiplier: 1.05,
            }
        }
    });

    item_templates["Short iron hilt"] = new WeaponComponent({
        name: "Short iron hilt", description: "A short handle for a sword or maybe a dagger, heavy",
        component_type: "short handle",
        value: 80,
        component_tier: 2,
        component_stats: {
            attack_power: {
                multiplier: 1.05,
            }
        }
    });

    item_templates["Short steel hilt"] = new WeaponComponent({
        name: "Short steel hilt", description: "A short handle for a sword or maybe a dagger, heavy",
        component_type: "short handle",
        value: 120,
        component_tier: 3,
        component_stats: {
            attack_power: {
                multiplier: 1.1,
            }
        }
    });

    item_templates["Cheap medium iron handle"] = new WeaponComponent({
        name: "Cheap medium iron handle", description: "A medium handle for an axe or a hammer, very heavy",
        component_type: "medium handle",
        value: 64,
        component_tier: 1,
        component_stats: {
            attack_speed: {
                multiplier: 0.7,
            },
            attack_power: {
                multiplier: 1.2,
            }
        }
    });

    item_templates["Medium iron handle"] = new WeaponComponent({
        name: "Medium iron handle", description: "A medium handle for an axe or a hammer, very heavy",
        component_type: "medium handle",
        value: 100,
        component_tier: 2,
        component_stats: {
            attack_speed: {
                multiplier: 0.8,
            },
            attack_power: {
                multiplier: 1.2,
            }
        }
    });

    item_templates["Medium steel handle"] = new WeaponComponent({
        name: "Medium steel handle", description: "A medium handle for an axe or a hammer, very heavy",
        component_type: "medium handle",
        value: 150,
        component_tier: 3,
        component_stats: {
            attack_speed: {
                multiplier: 0.8,
            },
            attack_power: {
                multiplier: 1.27,
            }
        }
    });

    item_templates["Cheap long iron shaft"] = new WeaponComponent({
        name: "Cheap long iron shaft", description: "A long shaft for a spear, extremely heavy",
        component_type: "long handle",
        value: 92,
        component_tier: 1,
        component_stats: {
            attack_speed: {
                multiplier: 0.5,
            },
            attack_power: {
                multiplier: 1.6,
            }
        }
    });

    item_templates["Long iron shaft"] = new WeaponComponent({
        name: "Long iron shaft", 
        description: "A long shaft for a spear,  extremely heavy",
        component_type: "long handle",
        value: 128,
        component_tier: 2,
        component_stats: {
            attack_speed: {
                multiplier: 0.6,
            },
            attack_power: {
                multiplier: 1.6,
            }
        }
    });

    item_templates["Long steel shaft"] = new WeaponComponent({
        name: "Long steel shaft", 
        description: "A long shaft for a spear, extremely heavy",
        component_type: "long handle",
        value: 192,
        component_tier: 3,
        component_stats: {
            attack_speed: {
                multiplier: 0.6,
            },
            attack_power: {
                multiplier: 1.75,
            }
        }
    });

    item_templates["Short weak bone hilt"] = new WeaponComponent({
        name: "Short weak bone hilt", description: "A short handle for a sword or maybe a dagger, made of a weak monster's bone",
        component_type: "short handle",
        value: 120,
        component_tier: 3,
        component_stats: {
            attack_power: {
                multiplier: 1.05,
            },
            attack_speed: {
                multiplier: 1.05,
            }
        },
    });

    item_templates["Medium weak bone handle"] = new WeaponComponent({
        name: "Medium weak bone handle", description: "A medium handle for an axe or a hammer, made of a weak monster's bone",
        component_type: "medium handle",
        value: 150,
        component_tier: 3,
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            },
            attack_power: {
                multiplier: 1.1,
            },
        }
    });

    item_templates["Long weak bone shaft"] = new WeaponComponent({
        name: "Long weak bone shaft", 
        description: "A long shaft for a spear, made of weak monster's bone",
        component_type: "long handle",
        value: 192,
        component_tier: 3,
        component_stats: {
            attack_speed: {
                multiplier: 0.8,
            },
            attack_power: {
                multiplier: 1.5,
            }
        }
    });

})();

//weapons:
(function(){
    item_templates["Cheap iron spear"] = new Weapon({
        components: {
            head: "Cheap short iron blade",
            handle: "Simple long wooden shaft"
        }
    });
    item_templates["Iron spear"] = new Weapon({
        components: {
            head: "Short iron blade",
            handle: "Simple long wooden shaft"
        }
    });
    item_templates["Steel spear"] = new Weapon({
        components: {
            head: "Short steel blade",
            handle: "Long wooden shaft"
        }
    });

    item_templates["Cheap iron dagger"] = new Weapon({
        components: {
            head: "Cheap short iron blade",
            handle: "Simple short wooden hilt",
        }
    });
    item_templates["Iron dagger"] = new Weapon({
        components: {
            head: "Short iron blade",
            handle: "Simple short wooden hilt",
        }
    });
    item_templates["Steel dagger"] = new Weapon({
        components: {
            head: "Short steel blade",
            handle: "Short wooden hilt",
        }
    });

    item_templates["Cheap iron sword"] = new Weapon({
        components: {
            head: "Cheap long iron blade",
            handle: "Simple short wooden hilt",
        }
    });
    item_templates["Iron sword"] = new Weapon({
        components: {
            head: "Long iron blade",
            handle: "Simple short wooden hilt",
        }
    });
    item_templates["Steel sword"] = new Weapon({
        components: {
            head: "Long steel blade",
            handle: "Short wooden hilt",
        }
    });

    item_templates["Cheap iron axe"] = new Weapon({
        components: {
            head: "Cheap iron axe head",
            handle: "Simple medium wooden handle",
        }
    });
    item_templates["Iron axe"] = new Weapon({
        components: {
            head: "Iron axe head",
            handle: "Simple medium wooden handle",
        }
    });
    item_templates["Steel axe"] = new Weapon({
        components: {
            head: "Steel axe head",
            handle: "Medium wooden handle",
        }
    });

    item_templates["Cheap iron battle hammer"] = new Weapon({
        components: {
            head: "Cheap iron hammer head",
            handle: "Simple medium wooden handle",
        }
    });
    item_templates["Iron battle hammer"] = new Weapon({
        components: {
            head: "Iron hammer head",
            handle: "Simple medium wooden handle",
        }
    });
    item_templates["Steel battle hammer"] = new Weapon({
        components: {
            head: "Steel hammer head",
            handle: "Medium wooden handle",
        }
    });
})();

//armor components:
(function(){
    item_templates["Wolf leather helmet armor"] = new ArmorComponent({
        name: "Wolf leather helmet armor", 
        description: "Strenghtened wolf leather, ready to be used as a part of a helmet",
        component_type: "helmet exterior",
        value: 240,
        component_tier: 2,
        full_armor_name: "Wolf leather helmet",
        defense_value: 2,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });

    item_templates["Boar leather helmet armor"] = new ArmorComponent({
        name: "Boar leather helmet armor", 
        description: "Strong boar leather, ready to be used as a part of a helmet",
        component_type: "helmet exterior",
        value: 400,
        component_tier: 3,
        full_armor_name: "Boar leather helmet",
        defense_value: 3,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });

    item_templates["Bear leather helmet armor"] = new ArmorComponent({
        name: "Bear leather helmet armor", 
        description: "Strong bear leather, ready to be used as a part of a helmet",
        component_type: "helmet exterior",
        value: 600,
        component_tier: 4,
        full_armor_name: "Bear leather helmet",
        defense_value: 4,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });

    item_templates["Wolf leather chestplate armor"] = new ArmorComponent({
        id: "Wolf leather chestplate armor",
        name: "Wolf leather cuirass",
        description: "Simple cuirass made of solid wolf leather, all it needs now is something softer to wear under it",
        component_type: "chestplate exterior",
        value: 480,
        component_tier: 2,
        full_armor_name: "Wolf leather armor",
        defense_value: 4,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Boar leather chestplate armor"] = new ArmorComponent({
        id: "Boar leather chestplate armor",
        name: "Boar leather cuirass",
        description: "Strong cuirass made of boar leather",
        component_type: "chestplate exterior",
        value: 800,
        component_tier: 3,
        full_armor_name: "Boar leather armor",
        defense_value: 6,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Bear leather chestplate armor"] = new ArmorComponent({
        id: "Bear leather chestplate armor",
        name: "Bear leather cuirass",
        description: "Strong cuirass made of bear leather",
        component_type: "chestplate exterior",
        value: 1000,
        component_tier: 4,
        full_armor_name: "Bear leather armor",
        defense_value: 8,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });

    item_templates["Wolf leather greaves"] = new ArmorComponent({
        name: "Wolf leather greaves",
        description: "Greaves made of wolf leather. Just attach them onto some pants and you are ready to go",
        component_type: "leg armor exterior",
        value: 240,
        component_tier: 2,
        full_armor_name: "Wolf leather armored pants",
        defense_value: 2,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Boar leather greaves"] = new ArmorComponent({
        name: "Boar leather greaves",
        description: "Greaves made of thick boar leather. Just attach them onto some pants and you are ready to go",
        component_type: "leg armor exterior",
        value: 400,
        component_tier: 3,
        full_armor_name: "Boar leather armored pants",
        defense_value: 3,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Bear leather greaves"] = new ArmorComponent({
        name: "Bear leather greaves",
        description: "Greaves made of thick bear leather. Just attach them onto some pants and you are ready to go",
        component_type: "leg armor exterior",
        value: 600,
        component_tier: 4,
        full_armor_name: "Bear leather armored pants",
        defense_value: 4,
        component_stats: {
            agility: {
                multiplier: 0.95,
            }
        }
    });

    item_templates["Wolf leather glove armor"] = new ArmorComponent({
        name: "Wolf leather glove armor",
        description: "Pieces of wolf leather shaped for gloves",
        component_type: "glove exterior",
        value: 240,
        component_tier: 2,
        full_armor_name: "Wolf leather gloves",
        defense_value: 2,
    });
    item_templates["Boar leather glove armor"] = new ArmorComponent({
        name: "Boar leather glove armor",
        description: "Pieces of boar leather shaped for gloves",
        component_type: "glove exterior",
        value: 400,
        component_tier: 3,
        full_armor_name: "Boar leather gloves",
        defense_value: 3,
    });
    item_templates["Bear leather glove armor"] = new ArmorComponent({
        name: "Bear leather glove armor",
        description: "Pieces of bear leather shaped for gloves",
        component_type: "glove exterior",
        value: 600,
        component_tier: 4,
        full_armor_name: "Bear leather gloves",
        defense_value: 4,
    });

    item_templates["Wolf leather shoe armor"] = new ArmorComponent({
        name: "Wolf leather shoe armor",
        description: "Pieces of wolf leather shaped for shoes",
        component_type: "shoes exterior",
        value: 240,
        component_tier: 2,
        full_armor_name: "Wolf leather shoes",
        defense_value: 2,
    });
    item_templates["Boar leather shoe armor"] = new ArmorComponent({
        name: "Boar leather shoe armor",
        description: "Pieces of boar leather shaped for shoes",
        component_type: "shoes exterior",
        value: 400,
        component_tier: 3,
        full_armor_name: "Boar leather shoes",
        defense_value: 3,
    });
    item_templates["Bear leather shoe armor"] = new ArmorComponent({
        name: "Bear leather shoe armor",
        description: "Pieces of bear leather shaped for shoes",
        component_type: "shoes exterior",
        value: 600,
        component_tier: 4,
        full_armor_name: "Bear leather shoes",
        defense_value: 4,
    });

    item_templates["Iron chainmail helmet armor"] = new ArmorComponent({
        name: "Iron chainmail helmet armor",
        description: "Best way to keep your head in one piece",
        component_type: "helmet exterior",
        value: 320,
        component_tier: 2,
        full_armor_name: "Iron chainmail helmet",
        defense_value: 4,
        component_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });
    item_templates["Steel chainmail helmet armor"] = new ArmorComponent({
        name: "Steel chainmail helmet armor",
        description: "Best way to keep your head in one piece",
        component_type: "helmet exterior",
        value: 480,
        component_tier: 3,
        full_armor_name: "Steel chainmail helmet",
        defense_value: 6,
        component_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });

    item_templates["Iron chainmail vest"] = new ArmorComponent({
        name: "Iron chainmail vest",
        description: "Basic iron chainmail. Nowhere near as strong as a plate armor",
        component_type: "chestplate exterior",
        value: 640,
        component_tier: 2,
        full_armor_name: "Iron chainmail armor",
        defense_value: 8,
        component_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });
    item_templates["Steel chainmail vest"] = new ArmorComponent({
        name: "Steel chainmail vest",
        description: "Basic steel chainmail. Nowhere near as strong as a plate armor",
        component_type: "chestplate exterior",
        value: 960,
        component_tier: 3,
        full_armor_name: "Steel chainmail armor",
        defense_value: 11,
        component_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });

    item_templates["Iron chainmail greaves"] = new ArmorComponent({
        name: "Iron chainmail greaves",
        description: "Greaves made of iron chainmail. Just attach them onto some pants and you are ready to go",
        component_type: "leg armor exterior",
        value: 320,
        component_tier: 2,
        full_armor_name: "Iron chainmail pants",
        defense_value: 4,
        component_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });
    item_templates["Steel chainmail greaves"] = new ArmorComponent({
        name: "Steel chainmail greaves",
        description: "Greaves made of steel chainmail. Just attach them onto some pants and you are ready to go",
        component_type: "leg armor exterior",
        value: 480,
        component_tier: 3,
        full_armor_name: "Steel chainmail pants",
        defense_value: 6,
        component_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });

    item_templates["Iron chainmail glove"] = new ArmorComponent({
        name: "Iron chainmail glove",
        description: "Iron chainmail in a form ready to be applied onto a glove",
        component_type: "glove exterior",
        value: 320,
        component_tier: 2,
        full_armor_name: "Iron chainmail gloves",
        defense_value: 4,
        component_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });
    item_templates["Steel chainmail glove"] = new ArmorComponent({
        name: "Steel chainmail glove",
        description: "Steel chainmail in a form ready to be applied onto a glove",
        component_type: "glove exterior",
        value: 480,
        component_tier: 3,
        full_armor_name: "Steel chainmail gloves",
        defense_value: 6,
        component_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });

    item_templates["Iron chainmail shoes"] = new ArmorComponent({
        name: "Iron chainmail shoes",
        description: "Iron chainmail in a form ready to be applied onto a pair of shoes",
        component_type: "shoes exterior",
        value: 320,
        component_tier: 2,
        full_armor_name: "Iron chainmail boots",
        defense_value: 4,
        component_stats: {
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });
    item_templates["Steel chainmail shoes"] = new ArmorComponent({
        name: "Steel chainmail shoes",
        description: "Steel chainmail in a form ready to be applied onto a pair of shoes",
        component_type: "shoes exterior",
        value: 480,
        component_tier: 3,
        full_armor_name: "Steel chainmail boots",
        defense_value: 6,
        component_stats: {
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: -1,
            }
        }
    });

})();

//clothing (functions both as weak armor and as an armor component) and capes:
(function(){
    item_templates["Cheap leather vest"] = new Armor({
        name: "Cheap leather vest", 
        description: "Vest providing very low protection. Better not to know what's it made from", 
        value: 100,
        component_type: "chestplate interior",
        base_defense: 2,
        component_tier: 1,
        component_stats: {
            attack_speed: {
                multiplier: 0.99,
            },
            cold_tolerance: {
                flat: 1,
            }
        }
    });
    item_templates["Leather vest"] = new Armor({
        name: "Leather vest", 
        description: "Comfortable leather vest, offering a low protection",
        value: 300,
        component_type: "chestplate interior",
        base_defense: 2,
        component_tier: 2,
        component_stats: {
            cold_tolerance: {
                flat: 1,
            }
        }
    });
    item_templates["Goat leather vest"] = new Armor({
        name: "Goat leather vest", 
        description: "Comfortable leather vest, offering a mediocre protection",
        value: 450,
        component_type: "chestplate interior",
        base_defense: 3,
        component_tier: 3,
        component_stats: {
            cold_tolerance: {
                flat: 1,
            }
        }
    });

    item_templates["Cheap leather pants"] = new Armor({
        name: "Cheap leather pants", 
        description: "Leather pants made from cheapest resources available",
        value: 100,
        component_type: "leg armor interior",
        base_defense: 1,
        component_tier: 1,
        component_stats: {
            attack_speed: {
                multiplier: 0.99,
            },
            cold_tolerance: {
                flat: 1,
            }
        }
    });
    item_templates["Leather pants"] = new Armor({
        name: "Leather pants", 
        description: "Solid leather pants",
        value: 300,
        component_type: "leg armor interior",
        base_defense: 2,
        component_tier: 2,
        component_stats: {
            cold_tolerance: {
                flat: 2,
            }
        }
    });
    item_templates["Goat leather pants"] = new Armor({
        name: "Goat leather pants", 
        description: "Solid leather pants",
        value: 450,
        component_type: "leg armor interior",
        base_defense: 3,
        component_tier: 3,
        component_stats: {
            cold_tolerance: {
                flat: 2,
            }
        }
    });

    item_templates["Cheap leather hat"] = new Armor({
        name: "Cheap leather hat", 
        description: "A cheap leather hat to protect your head",
        value: 100,
        component_type: "helmet interior",
        base_defense: 1,
        component_tier: 1,
        component_stats: {
            attack_speed: {
                multiplier: 0.99,
            },
            cold_tolerance: {
                flat: 1,
            }
        }
    });

    item_templates["Leather hat"] = new Armor({
        name: "Leather hat", 
        description: "A nice leather hat to protect your head",
        value: 300,
        component_type: "helmet interior",
        base_defense: 2,
        component_tier: 2,
        component_stats: {
            cold_tolerance: {
                flat: 1,
            }
        }
    });

    item_templates["Goat leather hat"] = new Armor({
        name: "Goat leather hat", 
        description: "A solid leather hat to protect your head",
        value: 450,
        component_type: "helmet interior",
        base_defense: 3,
        component_tier: 3,
        component_stats: {
            cold_tolerance: {
                    flat: 1,
            }
        }
    });

    item_templates["Leather gloves"] = new Armor({
        name: "Leather gloves", 
        description: "Strong leather gloves, perfect for handling rough and sharp objects",
        value: 300,
        component_type: "glove interior",
        base_defense: 1,
        component_tier: 2,
        component_stats: {
            cold_tolerance: {
                flat: 2,
            }
        }
    });
    item_templates["Goat leather gloves"] = new Armor({
        name: "Goat leather gloves", 
        description: "Strong leather gloves, perfect for handling rough and sharp objects",
        value: 450,
        component_type: "glove interior",
        base_defense: 2,
        component_tier: 3,
        component_stats: {
            cold_tolerance: {
                flat: 2,
            }
        }
    });

    item_templates["Cheap leather shoes"] = new Armor({
        name: "Cheap leather shoes",
        description: "Shoes made of thin and cheap leather. Even then, they are in every single aspect better than not having any",
        value: 100,
        component_type: "shoes interior",
        base_defense: 0,
        component_tier: 1,
        component_stats: {
            agility: {
                multiplier: 1.05,
            },
            cold_tolerance: {
                flat: 2,
            }
        }
    });

    item_templates["Work shoes"] = new Armor({
        name: "Work shoes", 
        description: "Work shoes made of a mix of leather and wool. While they provide no protection, they are very comfortable for moving around",
        value: 300,
        component_type: "shoes interior",
        base_defense: 0,
        component_tier: 2,
        component_stats: {
            attack_speed: {
                multiplier: 1.02,
            },
            agility: {
                multiplier: 1.15,
            },
            cold_tolerance: {
                flat: 2,
            }
        }
    });

    item_templates["Leather shoes"] = new Armor({
        name: "Leather shoes", 
        description: "Solid shoes made of leather, a must have for any traveler", 
        value: 300,
        component_type: "shoes interior",
        base_defense: 1,
        component_tier: 2,
        component_stats: {
            attack_speed: {
                multiplier: 1.02,
            },
            agility: {
                multiplier: 1.1,
            },
            cold_tolerance: {
                flat: 2,
            }
        }
    });
    item_templates["Goat leather shoes"] = new Armor({
        name: "Goat leather shoes", 
        description: "Strong shoes made of leather, a must have for any traveler",
        value: 450,
        component_type: "shoes interior",
        base_defense: 2,
        component_tier: 3,
        component_stats: {
            attack_speed: {
                multiplier: 1.02,
            },
            agility: {
                multiplier: 1.15,
            },
            cold_tolerance: {
                flat: 2,
            }
        }
    });

    item_templates["Wool shirt"] = new Armor({
        name: "Wool shirt",
        description: "It's not thick enough to provide any physical protection, but on the plus side it's light, it's warm, and it and doesn't block your moves",
        value: 300,
        component_type: "chestplate interior",
        base_defense: 0,
        component_tier: 2,
        component_stats: {
            attack_speed: {
                multiplier: 1.01,
            },
            agility: {
                multiplier: 1.02,
            },
            cold_tolerance: {
                flat: 3,
            }
        }
    });

    item_templates["Wool pants"] = new Armor({
        name: "Wool pants", 
        description: "Nice woollen pants. Slightly itchy",
        value: 100,
        component_type: "leg armor interior",
        base_defense: 0,
        component_tier: 2,
        component_stats: {
            cold_tolerance: {
                flat: 3,
            }
        }
    });

    item_templates["Wool hat"] = new Armor({
        name: "Wool hat", 
        description: "Simple woollen hat to protect your head from cold",
        value: 300,
        component_type: "helmet interior",
        base_defense: 0,
        component_tier: 2,
        component_stats: {
            attack_speed: {
                multiplier: 1.01,
            },
            agility: {
                multiplier: 1.01,
            },
            cold_tolerance: {
                flat: 2,
            }
        }
    });

    item_templates["Wool gloves"] = new Armor({
        name: "Wool gloves",
        description: "Warm and comfy, but they don't provide any protection",
        value: 300,
        component_type: "glove interior",
        base_defense: 0,
        component_tier: 2,
        component_stats: {
            cold_tolerance: {
                flat: 3,
            }
        }
    });

    item_templates["Rat pelt cape"] = new Cape({
        name: "Rat pelt cape", 
        item_tier: 1,
        description: "It's a cape... made of wolf rat pelts. Only for poor or insane",
        value: 100,
        base_stats: {
            cold_tolerance: {
                flat: 2,
            }
        }
    });
    item_templates["Wolf pelt cape"] = new Cape({
        name: "Wolf pelt cape", 
        description: "An elegant cape made from wolf pelts. Doesn't provide much protection, but is light enough to not hinder your movements",
        value: 400,
        item_tier: 2,
        base_defense: 2,
        base_stats: {
            cold_tolerance: {
                flat: 4,
            }
        }
    });
    item_templates["Boar hide cape"] = new Cape({
        name: "Boar hide cape", 
        description: "A rough cape made from boar hides. Offers a nice protection, but is heavy and stiff",
        value: 700,
        item_tier: 3,
        base_defense: 5,
        base_stats: {
            attack_speed: {
                multiplier: 0.9,
            },
            agility: {
                multiplier: 0.9,
            },
            cold_tolerance: {
                flat: 5,
            }
        }
    });
    item_templates["Goat hide cape"] = new Cape({
        name: "Goat hide cape", 
        description: "A rough cape made from goat hides",
        value: 700,
        item_tier: 3,
        base_defense: 3,
        base_stats: {
            attack_speed: {
                multiplier: 0.98,
            },
            agility: {
                multiplier: 0.95,
            },
            cold_tolerance: {
                flat: 4,
            }
        }
    });
    item_templates["Bear hide cape"] = new Cape({
        name: "Bear hide cape", 
        description: "A thick, heavy, and warm furry cape, made from a bear hide",
        value: 1000,
        item_tier: 4,
        base_defense: 7,
        base_stats: {
            attack_speed: {
                multiplier: 0.95,
            },
            agility: {
                multiplier: 0.95,
            },
            cold_tolerance: {
                flat: 7,
            }
        }
    });
})();

//armors:
(function(){
    //predefined full (int+ext) armors go here
    item_templates["Wolf leather armor"] = new Armor({
        components: {
            internal: "Leather vest",
            external: "Wolf leather chestplate armor",
        }
    });
    item_templates["Wolf leather helmet"] = new Armor({
        components: {
            internal: "Leather hat",
            external: "Wolf leather helmet armor",
        }
    });
    item_templates["Wolf leather armored pants"] = new Armor({
        components: {
            internal: "Leather pants",
            external: "Wolf leather greaves",
        }
    });

    item_templates["Iron chainmail armor"] = new Armor({
        components: {
            internal: "Leather vest",
            external: "Iron chainmail vest",
        }
    });
    item_templates["Iron chainmail helmet"] = new Armor({
        components: {
            internal: "Leather hat",
            external: "Iron chainmail helmet armor",
        }
    });
    item_templates["Iron chainmail pants"] = new Armor({
        components: {
            internal: "Leather pants",
            external: "Iron chainmail greaves",
        }
    });

    item_templates["Steel chainmail armor"] = new Armor({
        components: {
            internal: "Goat leather vest",
            external: "Steel chainmail vest",
        }
    });
    item_templates["Steel chainmail helmet"] = new Armor({
        components: {
            internal: "Goat leather hat",
            external: "Steel chainmail helmet armor",
        }
    });
    item_templates["Steel chainmail pants"] = new Armor({
        components: {
            internal: "Goat leather pants",
            external: "Steel chainmail greaves",
        }
    });
})();

//shield components:
(function(){

    item_templates["Wooden training shield base"] = new ShieldComponent({
        name: "Wooden training shield base",
        description: "A primitive but cheap form of a shield",
        value: 16,
        tags: {"ignore_skill": true},
        shield_strength: 0.5,
        shield_name: "Wooden training shield",
        component_tier: 1,
        component_type: "shield base",
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });
    
    item_templates["Cheap wooden shield base"] = new ShieldComponent({
        name: "Cheap wooden shield base",
        description: "Cheap shield component made of wood, basically just a few planks barely holding together", 
        value: 16, 
        shield_strength: 1, 
        shield_name: "Cheap wooden shield",
        component_tier: 1,
        component_type: "shield base",
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });

    item_templates["Crude wooden shield base"] = new ShieldComponent({
        name: "Crude wooden shield base",
        description: "A shield base of rather bad quality, but at least it won't fall apart by itself", 
        value: 32,
        shield_strength: 3,
        shield_name: "Crude wooden shield",
        component_tier: 1,
        component_type: "shield base",
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Wooden shield base"] = new ShieldComponent({
        name: "Wooden shield base",
        description: "Proper wooden shield base, although it could use some additional reinforcement", 
        value: 80,
        shield_strength: 5,
        shield_name: "Wooden shield",
        component_tier: 2,
        component_type: "shield base",
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Ash wood shield base"] = new ShieldComponent({
        name: "Ash wood shield base",
        description: "Solid wooden shield base, although still nowhere near as resistant as metal", 
        value: 120,
        shield_strength: 8,
        shield_name: "Ash wood shield",
        component_tier: 3,
        component_type: "shield base",
        component_stats: {
            attack_speed: {
                multiplier: 0.95,
            }
        }
    });
    item_templates["Crude iron shield base"] = new ShieldComponent({
        name: "Crude iron shield base", 
        description: "Heavy shield base made of low quality iron",
        value: 128,
        shield_strength: 6,
        shield_name: "Crude iron shield",
        component_tier: 1,
        component_type: "shield base",
        component_stats: {
            attack_speed: {
                multiplier: 0.75,
            }
        }
    });
    item_templates["Iron shield base"] = new ShieldComponent({
        name: "Iron shield base", 
        description: "Solid and strong shield base, although it's quite heavy", 
        value: 210,
        shield_strength: 10,
        shield_name: "Iron shield",
        component_tier: 2,
        component_type: "shield base",
        component_stats: {
            attack_speed: {
                multiplier: 0.8,
            }
        }
    });
    item_templates["Steel shield base"] = new ShieldComponent({
        name: "Steel shield base", 
        description: "Mighty shield base, although it's quite heavy", 
        value: 300,
        shield_strength: 14,
        shield_name: "Steel shield",
        component_tier: 3,
        component_type: "shield base",
        component_stats: {
            attack_speed: {
                multiplier: 0.85, //don't make speed penalty for heavy shields weaker than this
            }
        }
    });

    item_templates["Basic shield handle"] = new ShieldComponent({
        id: "Basic shield handle",
        name: "Crude wooden shield handle", 
        description: "A simple handle for holding the shield", 
        value: 10,
        component_tier: 1,
        component_type: "shield handle",
    });

    item_templates["Wooden shield handle"] = new ShieldComponent({
        name: "Wooden shield handle", 
        description: "A decent wooden handle for holding the shield", 
        value: 32,
        component_tier: 2,
        component_type: "shield handle",
        component_stats: {
            block_strength: {
                multiplier: 1.1,
            }
        }
    });
    item_templates["Ash wood shield handle"] = new ShieldComponent({
        name: "Ash wood shield handle", 
        description: "A solid wooden handle for holding the shield", 
        value: 48,
        component_tier: 3,
        component_type: "shield handle",
        component_stats: {
            block_strength: {
                multiplier: 1.2,
            }
        }
    });

})();

//shields:
(function(){
    item_templates["Wooden training shield"] = new Shield({
        components: {
            shield_base: "Wooden training shield base",
            handle: "Basic shield handle",
        }
    });

    item_templates["Cheap wooden shield"] = new Shield({
        components: {
            shield_base: "Cheap wooden shield base",
            handle: "Basic shield handle",
        }
    });

    item_templates["Crude wooden shield"] = new Shield({
        components: {
            shield_base: "Crude wooden shield base",
            handle: "Basic shield handle",
        }
    });

    item_templates["Wooden shield"] = new Shield({
        components: {
            shield_base: "Wooden shield base",
            handle: "Wooden shield handle",
        }
    });
    item_templates["Ash wood shield"] = new Shield({
        components: {
            shield_base: "Ash wood shield base",
            handle: "Ash wood shield handle",
        }
    });

    item_templates["Crude iron shield"] = new Shield({
        components: {
            shield_base: "Crude iron shield base",
            handle: "Basic shield handle",
        }
    });

    item_templates["Iron shield"] = new Shield({
        components: {
            shield_base: "Iron shield base",
            handle: "Wooden shield handle",
        }
    });

    item_templates["Steel shield"] = new Shield({
        components: {
            shield_base: "Steel shield base",
            handle: "Ash wood shield handle",
        }
    });
})();

//trinkets:
(function(){
    item_templates["Wolf trophy"] = new Artifact({
        name: "Wolf trophy",
        value: 100,
        stats: {
            armor_penetration: {
                flat: 50,
            },
            crit_rate: {
                flat: 0.02,
            },
        }
    });

    item_templates["Boar trophy"] = new Artifact({
        name: "Boar trophy",
        value: 160,
        stats: {
            attack_power: {
                multiplier: 1.1,
            },
            crit_multiplier: {
                flat: 0.2,
            },
        }
    });

    item_templates["Mountain goat trophy"] = new Artifact({
        name: "Mountain goat trophy",
        value: 250,
        stats: {
            attack_power: {
                multiplier: 1.05,
            },
            defense: {
                flat: 5,
                multiplier: 1.05,
            },
        }
    });

    item_templates["Bear trophy"] = new Artifact({
        name: "Bear trophy",
        value: 400,
        stats: {
            attack_power: {
                multiplier: 1.3,
            },
            attack_speed: {
                multiplier: 0.9,
            },
        }
    });
})();

//amulets:
(function(){
    item_templates["Warrior's necklace"] = new Amulet({
        value: 1000,
        tags: {unique: true},
        stats: {
            attack_power: {
                multiplier: 1.1,
            },
            attack_speed: {
                multiplier: 1.1,
            },
        },
    });
})();

//tools:
(function(){
    item_templates["Old pickaxe"] = new Tool({
        name: "Old pickaxe",
        description: "An old pickaxe that has seen better times, but is still usable",
        value: 10,
        equip_slot: "pickaxe",
    });

    item_templates["Old axe"] = new Tool({
        name: "Old axe",
        description: "An old axe that has seen better times, but is still usable",
        value: 10,
        equip_slot: "axe",
    });

    item_templates["Old sickle"] = new Tool({
        name: "Old sickle",
        description: "And old herb sickle that has seen better times, but is still usable",
        value: 10,
        equip_slot: "sickle",
    });

    item_templates["Old shovel"] = new Tool({
        name: "Old shovel",
        description: "And old shovel that has seen better times, but can still be used to dig something up",
        value: 10,
        equip_slot: "shovel",
    });

    item_templates["Iron pickaxe"] = new Tool({
        name: "Iron pickaxe",
        description: "A decent pickaxe made of iron, strong enough for most ores",
        value: 1000,
        equip_slot: "pickaxe",
        bonus_skill_levels: {
            "Mining": 3,
        }
    });

    item_templates["Iron chopping axe"] = new Tool({
        name: "Iron chopping axe",
        description: "A decent axe made of iron, hard and sharp enough for most of trees, even if they will still require an effort",
        value: 1000,
        equip_slot: "axe",
        bonus_skill_levels: {
            "Woodcutting": 3,
        }
    });

    item_templates["Iron sickle"] = new Tool({
        name: "Iron sickle",
        description: "A decent sickle made of iron, sharp enough for most of plants",
        value: 1000,
        equip_slot: "sickle",
        bonus_skill_levels: {
            "Herbalism": 3,
        }
    });

    item_templates["Iron shovel"] = new Tool({
        name: "Iron shovel",
        description: "A decent shovel made of iron, solid enough for most of your digging needs",
        value: 1000,
        equip_slot: "shovel",
        bonus_skill_levels: {
            "Digging": 3,
        }
    });
})();

//usables:
(function(){
    item_templates["Stale bread"] = new UsableItem({
        name: "Stale bread", description: "Big piece of an old bread, still edible",
        value: 20,
        effects: [{effect: "Basic meal", duration: 60}],
        tags: {"food": true},
        material_type: "bread",
    });

    item_templates["Fresh bread"] = new UsableItem({
        name: "Fresh bread", 
        description: "Freshly baked bread, delicious",
        value: 40,
        effects: [{effect: "Basic meal", duration: 150}],
        tags: {"food": true},
        material_type: "bread",
    });

    item_templates["Bread kwas"] = new UsableItem({
        name: "Bread kwas", 
        description: "Tastes like bread", 
        value: 40,
        effects: [{effect: "Well hydrated", duration: 60}],
        recovery_chances: {"Glass bottle": 0.6},
        tags: {"drink": true},
    });

    item_templates["Carrot"] = new UsableItem({
        name: "Carrot", description: "A delicious root that can be eaten raw",
        value: 20,
        effects: [{effect: "Basic meal", duration: 10}],
        tags: {"food": true},
    });

    item_templates["Cooked carrot"] = new UsableItem({
        name: "Cooked carrot", description: "A delicious root, cooked",
        value: 30,
        effects: [{effect: "Basic meal", duration: 150}],
        tags: {"food": true},
    });

    item_templates["Potato"] = new UsableItem({
        name: "Potato", description: "A common tuber with versatile culinary usage. Just remember to cook it first!",
        value: 15,
        effects: [{effect: "Slight food poisoning", duration: 20}],
        tags: {"food": true},
    });

    item_templates["Cooked potato"] = new UsableItem({
        name: "Potato", description: "A common tuber with versatile culinary usage, though this one was simply cooked",
        value: 40,
        effects: [{effect: "Basic meal", duration: 150}],
        tags: {"food": true},
    });

    item_templates["Weak healing powder"] = new UsableItem({
        name: "Weak healing powder", 
        description: "Not very potent, but can still make body heal noticeably faster for quite a while",
        value: 40,
        effects: [{effect: "Weak healing powder", duration: 240}],
        tags: {"medicine": true},
    });

    item_templates["Healing powder"] = new UsableItem({
        name: "Healing powder", 
        description: "Not exactly powerful in its effects, but still makes the body heal noticeably faster and for a long time",
        value: 100,
        effects: [{effect: "Healing powder", duration: 300}],
        tags: {"medicine": true},
    });

    item_templates["Oneberry juice"] = new UsableItem({
        name: "Oneberry juice", 
        description: "Tastes kinda nice and provides a quick burst of healing",
        value: 80,
        effects: [{effect: "Weak healing potion", duration: 10}],
        recovery_chances: {"Glass phial": 0.75},
        tags: {"medicine": true},
    });
    item_templates["Healing potion"] = new UsableItem({
        name: "Healing potion", 
        description: "Tastes nice at first but has a bitter aftertase. Povides a quick burst of healing",
        value: 200,
        effects: [{effect: "Healing potion", duration: 10}],
        recovery_chances: {"Glass phial": 0.75},
        tags: {"medicine": true},
    });
    item_templates["Healing balm"] = new UsableItem({
        name: "Healing balm", 
        description: "Simply apply it to your wound and watch it heal",
        value: 120,
        effects: [{effect: "Weak healing balm", duration: 90}],
        tags: {"medicine": true},
    });

    item_templates["Roasted rat meat"] = new UsableItem({
        name: "Roasted rat meat", 
        description: "Smell might be fine now, but it still seems like a bad idea to eat it",
        value: 10,
        effects: [{effect: "Cheap meat meal", duration: 45}, {effect: "Slight food poisoning", duration: 45}],
        tags: {"food": true},
    });

    item_templates["Roasted purified rat meat"] = new UsableItem({
        name: "Roasted purified rat meat", 
        description: "Smells alright and should be safe to eat, yet you still have some doubts",
        value: 20,
        effects: [{effect: "Cheap meat meal", duration: 45}],
        tags: {"food": true},
    });

    item_templates["Fried pork"] = new UsableItem({
        name: "Fried pork",
        description: "It's dripping with fat and smells fantastic, all it lacks is some spices and a good side dish",
        value: 40,
        effects: [{effect: "Simple meat meal", duration: 90}],
        tags: {"food": true},
    });

    item_templates["Fried goat meat"] = new UsableItem({
        name: "Fried goat meat",
        description: "It has a nice aroma, but is a bit too tough. Perhaps a stew would have been a better choice?",
        value: 40,
        effects: [{effect: "Simple meat meal", duration: 90}],
        tags: {"food": true},
    });

    item_templates["Pork roast"] = new UsableItem({
        name: "Pork roast",
        description: "A generous amount of herbs has been rubbed into the meat, resulting in a hearty meal with a mouthwatering aroma",
        value: 100,
        effects: [{effect: "Decent meat meal", duration: 120}],
        tags: {"food": true},
    });

    item_templates["Goat stew"] = new UsableItem({
        name: "Goat stew",
        description: "Goat meat boiled to tenderness in a herbal broth. Perfect to warm yourself up for the road",
        value: 100,
        effects: [{ effect: "Decent meat meal", duration: 120 },
                  { effect: "Hot meal", duration: 60 }],
        tags: {"food": true},
    });

})();

//setup ids
Object.keys(item_templates).forEach(id => {
    item_templates[id].id = id;
    if(!item_templates[id].getName()) {
        item_templates[id].name = id;
    }
});

export {
    item_templates, 
    Item, OtherItem, UsableItem, 
    Armor, Shield, Weapon, Cape, Artifact, Book, 
    Material, WeaponComponent, ArmorComponent, ShieldComponent,
    getItem, getItemFromKey,
    round_item_price, getArmorSlot, getEquipmentValue,
    book_stats, BookData,
    rarity_multipliers,
    getItemRarity
};