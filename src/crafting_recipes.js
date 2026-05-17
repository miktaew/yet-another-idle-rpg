"use strict";

import { character, get_total_skill_level } from "./character.js";
import { Armor, ArmorComponent, Cape, Shield, ShieldComponent, Weapon, WeaponComponent, Amulet, item_templates } from "./items.js";
import { skills } from "./skills.js";
import { clamp, random_range } from "./misc.js";

const crafting_recipes = {items: {}, components: {}, equipment: {}};
const cooking_recipes = {items: {}};
const smelting_recipes = {items: {}};
const forging_recipes = {items: {}, components: {}};
const alchemy_recipes = {items: {}};
const butchering_recipes = { items: {} };
const woodworking_recipes = {items: {}, components: {}};

/*
    recipes can be treated differently for display based on if they are in items/components/equipment category

    non-equipment recipes have a success rate (presented with min-max value, where max should be 1) that shall scale with skill level and with crafting station level
    for equipment recipes, there is no success rate in favor of equipment's "quality" property

    resulting quality of equipment is based on component quality, result tier, crafting station tier and relevant skill level
    
    overal max quality achievable scales with related skills
*/

function get_crafting_quality_caps(skill_name) {
    return {
        components: Math.min(Math.round(100+2*get_total_skill_level(skill_name)),200),
        equipment: Math.min(Math.round(100+2.8*get_total_skill_level(skill_name)),250),
    }
}

class Recipe {
    constructor({
        name,
        id,
        is_unlocked = true,
        recipe_type,
        result, //{name, count}
        getResult,
        recipe_level = [1,1],
        recipe_skill,
        scale_results = true, //only matters for recipes rewarding multiple of an item, checked in use_recipe to scale result count with skill;
                              //false will mean that recipe can only succeed or fail, true will mean it can succeed partially
    }) {
        this.name = name;
        this.id = id;
        this.is_unlocked = is_unlocked;
        this.recipe_type = recipe_type;
        this.result = result;
        this.scale_results = scale_results;
        this.getResult = getResult || function(){return this.result};
        this.recipe_level = recipe_level;
        this.recipe_skill = recipe_skill;
    }

    get_success_chance(station_tier=1) {
        const level = clamp(get_total_skill_level(this.recipe_skill), 0, this.recipe_level[1]) - this.recipe_level[0] + 1;
        const skill_modifier = Math.min(1,(0||(level+(station_tier-1))/(this.recipe_level[1]-this.recipe_level[0]+1)));
        return this.success_chance[0]*(this.success_chance[1]/this.success_chance[0])**skill_modifier;
    }

    get_quality_range(tier = 0, component_quality) {
        const skill = skills[this.recipe_skill];
        if (component_quality) {
            const quality = (3 * get_total_skill_level(this.recipe_skill) - skill.max_level) + 50 + component_quality + (10 * tier);
            return [
                clamp(Math.round(quality - 15), 10, this.get_quality_cap()),
                clamp(Math.round(quality + 15), 10, this.get_quality_cap())
            ];
        }
        else {
            const quality = (3 * get_total_skill_level(this.recipe_skill) - skill.max_level) + 130 + (15 * tier);
            return [
                clamp(Math.round(quality - 15), 10, this.get_quality_cap()),
                clamp(Math.round(quality + 10), 10, this.get_quality_cap()),
            ];
        }
    }
}

class ItemRecipe extends Recipe {
    constructor({
        name,
        id,
        materials = [], //{name, count}
        is_unlocked = true,
        recipe_type,
        result, //{name, count}
        getResult,
        recipe_level,
        recipe_skill,
        success_chance = [1,1],
    }) {
        super({name, id, is_unlocked, recipe_type, result, getResult, recipe_level, recipe_skill});
        this.materials = materials;
        this.success_chance = success_chance;
        if(this.success_chance[0]==0){
            this.success_chance[0] = 0.1;
        }
    }

    get_availability() {
        let amount = Infinity;
        let materials = [];
        for (let i = 0; i < this.materials.length; i++) {
            let material = find_recipe_material(this.materials[i]);
            amount = Math.floor(Math.min(material.count / this.materials[i].count, amount));
            materials.push(material);

            if (amount == 0) {
                break;
            }
        }
        
        return {available_ammount: amount, materials};
    }
}

class ComponentRecipe extends ItemRecipe{
    constructor({
        name,
        id,
        materials = [], 
        is_unlocked = true,
        result, //{item, count, result_name} where result_name is an item_templates key
        component_type,
        recipe_skill,
        item_type,
    }) {
        super({name, id, materials, is_unlocked, recipe_type: "component", result, recipe_level: [1,1], recipe_skill, getResult: null, success_rate: [1,1]})
        this.component_type = component_type;
        this.item_type = item_type;
        this.getResult = function(material, station_tier = 1){
            const result = item_templates[this.materials.filter(x => x.material_id===material.id)[0].result_id];
            //return based on material used
            let quality = this.roll_quality((station_tier-result.component_tier) || 0);
            if(result.tags["clothing"]) {
                //means its a clothing (wearable internal part of armor)
                return new Armor({...item_templates[result.id], quality: quality});
            } else if(result.tags["armor component"]) {

                return new ArmorComponent({...item_templates[result.id], quality: quality});
            } else if(result.tags["weapon component"]) {

                return new WeaponComponent({...item_templates[result.id], quality: quality});
            } else if (result.tags["shield component"]) {

                return new ShieldComponent({ ...item_templates[result.id], quality: quality });
            } else if (result.tags["amulet"]) {

                return new Amulet({ ...item_templates[result.id], quality: quality });
            } else {
                throw new Error(`Component recipe ${this.name} does not produce a valid result!`);
            }
        }
    }

    get_quality_cap() {
        if(this.item_type === "Armor") {
            return get_crafting_quality_caps(this.recipe_skill).equipment;
        } else {
            return get_crafting_quality_caps(this.recipe_skill).components;
        }
    }

    roll_quality(tier = 0) {
        const quality_range = this.get_quality_range(tier);
        return Math.round(random_range(quality_range[0], quality_range[1])/4)*4;
    }
}

class ComponentlessEquipRecipe extends ItemRecipe{
    constructor({
        name,
        id,
        materials = [], 
        is_unlocked = true,
        result, //{item, count, result_name} where result_name is an item_templates key
        recipe_skill,
        item_type,
    }) {
        super({name, id, materials, is_unlocked, recipe_type: "componentless", result, recipe_level: [1,1], recipe_skill, getResult: null, success_rate: [1,1]})
        this.item_type = item_type;
        this.getResult = function(material, station_tier = 1){
            const result = item_templates[this.materials.filter(x => x.material_id===material.id)[0].result_id];
            //return based on material used
            let quality = this.roll_quality((station_tier-result.item_tier) || 0);
            return new Cape({...item_templates[result.id], quality: quality});
        }
    }

    get_quality_cap() {
        return get_crafting_quality_caps(this.recipe_skill).equipment;
    }

    roll_quality(tier = 0) {
        const quality_range = this.get_quality_range(tier);
        return Math.round(random_range(quality_range[0], quality_range[1])/4)*4;
    }
}

class EquipmentRecipe extends Recipe {
    constructor({
        name,
        id,
        components = [], //pair of component types; first letter not capitalized; blade-handle or internal-external
        is_unlocked = true,
        result = null,
        recipe_skill = "Crafting",
        item_type, //Weapon/Armor/Shield
        //no recipe level, difficulty based on selected components
    }) {
        super({name, id, is_unlocked, recipe_type: "equipment", result, getResult: null, recipe_level: [1,1], recipe_skill, success_rate: [1,1]})
        this.components = components;
        this.item_type = item_type;
        this.getResult = function (components, station_tier = 1) {
            const component_stats = get_component_stats(components);
            let quality = this.roll_quality(component_stats.weighted_quality, station_tier - component_stats.max_tier);
            
            //return based on components used
            if(this.item_type === "Weapon") {
                return new Weapon(
                    {
                        components: {
                            head: components[0].item.id,
                            handle: components[1].item.id,
                        },
                        quality: quality,
                    }
                );
            } else if(this.item_type === "Armor") {
                return new Armor(
                    {
                        components: {
                            internal: components[0].item.id,
                            external: components[1].item.id,
                        },
                        quality: quality,
                    }
                );
            } else if(this.item_type === "Shield") {
                return new Shield(
                    {
                        components: {
                            shield_base: components[0].item.id,
                            handle: components[1].item.id,
                        },
                        quality: quality,
                    }
                );
            } else {
                throw new Error(`Recipe "${this.name}" has an incorrect item_type provided ("${this.item_type}")`);
            }
        }
    }

    get_quality_cap() {
        return get_crafting_quality_caps(this.recipe_skill).equipment;
    }

    roll_quality(component_quality, tier = 0) {
        const quality_range = this.get_quality_range(tier, component_quality);
        return Math.round(random_range(quality_range[0], quality_range[1])/2)*2;
    }
}

/**
 * @param {material_id/material_type, count, result_id?} material
 * @returns { count, items[] } - items: [{item_key, count, item_id (if no key), quality (optional if no key)},...] - same as inventory
 */
function find_recipe_material(material) {
    let count = 0;
    let items = [];

    if (material.material_id) {
        const material_id = material.material_id;
        const key = item_templates[material_id].getInventoryKey();
        if (character.inventory[key]) {
            //material without quality exists, no need to search further
            count = character.inventory[key].count;
            items = [character.inventory[key]];
        }
        return { count, items };
    }

    Object.values(character.inventory)
        .filter(item => (material.material_id && item.id === material.material_id) || (material.material_type && item.item.material_type === material.material_type))
        .sort((a,b) => a.item.getBaseValue()-b.item.getBaseValue())
        .forEach(item => {
            count += item.count;
            items.push(item);
        });

    return { count, items };
}

function get_component_stats(components) {
    let total_quality = 0;
    let total_tier = 0;
    let max_tier = 0;

    for (let i in components) {
        let component = components[i].item;

        total_quality += component.quality * component.component_tier;
        total_tier += component.component_tier;
        max_tier = Math.max(max_tier, component.component_tier);
    }

    let result_level = max_tier * 8;
    let weighted_quality = total_quality / total_tier;

    return { total_quality, total_tier, max_tier, result_level, weighted_quality };
}

//TODO decouple from categories
function get_recipe_xp_value({category, subcategory, recipe_id, material_count, result_tier, selected_components, rarity_multiplier}) {
    //
    //for components: multiplied by material count (so every component of same tier is equally profitable to craft)
    //for equipment: based on component tier average
    if(!category || !subcategory || !recipe_id) {
        //shouldn't be possible to reach this
        throw new Error(`Tried to use a recipe but either category, subcategory, or recipe id was not passed: ${category} - ${subcategory} - ${recipe_id}`);
    }
    let exp_value = 4;
    const selected_recipe = recipes[category][subcategory][recipe_id];
    const skill_level = skills[selected_recipe.recipe_skill].current_level; //don't use buffed level as that would only result in reduced xp gain, which is not desired here
    if(!selected_recipe) {
        throw new Error(`Tried to use a recipe that doesn't exist: ${category} -> ${subcategory} -> ${recipe_id}`);
    }
    if(subcategory === "items") {
        exp_value = Math.max(exp_value,1.5*selected_recipe.recipe_level[1])**1.1;
        //maybe scale with materials needed?
        
        if(selected_recipe.recipe_level[1] < skill_level) {
            exp_value = Math.max(1,exp_value * Math.max(0,Math.min(5,(selected_recipe.recipe_level[1]+6-skill_level))/5));
            //penalty kicks in when more than 5 levels more than needed, goes down to 0 within further 5 levels
        }
    } else if (subcategory === "components" || selected_recipe.recipe_type === "component" || selected_recipe.recipe_type === "componentless") {
        const result_level = 8*result_tier;
        exp_value = Math.max(exp_value**1.2,((result_tier * 4)**1.1) * material_count);

        if(result_level > skill_level*rarity_multiplier**0.5) {
            //full value
            exp_value = Math.max(0.5*material_count,exp_value*rarity_multiplier);
        } else {
            //scaled value
            exp_value = Math.max(0.5*material_count,exp_value*rarity_multiplier*Math.max(0,Math.min(5,result_level*rarity_multiplier**0.5+5-skill_level))/5);
        }
        //penalty kicks in when skill level is more than 8*item_tier, but is delayed by sqrt of rarity multiplier
    } else {
        //TODO

        const component_stats = get_component_stats(selected_components);

        exp_value = Math.max(exp_value, component_stats.total_tier * 4)**1.1;

        if(component_stats.result_level > skill_level*rarity_multiplier**0.5) {
            //full value
            exp_value = Math.max(1,exp_value*rarity_multiplier);
        } else {
            //scaled value
            exp_value = Math.max(1,exp_value*rarity_multiplier*Math.max(0,Math.min(5,component_stats.result_level*rarity_multiplier**0.5+5-skill_level))/5);
        }
        //penalty kicks in when skill level is more than 8*item_tier, but is delayed by sqrt of rarity multiplier
    }
    return Math.round(10*exp_value)/10;
}

//weapon components
(()=>{
    forging_recipes.components["Short blade"] = new ComponentRecipe({
        name: "Short blade",
        materials: [
            {material_id: "Low quality iron ingot", count: 2, result_id: "Cheap iron short blade"},
            {material_id: "Iron ingot", count: 2, result_id: "Iron short blade"},
            {material_id: "Steel ingot", count: 2, result_id: "Steel short blade"},
        ],
        item_type: "Component",
        recipe_skill: "Forging"
    });
    forging_recipes.components["Long blade"] = new ComponentRecipe({
        name: "Long blade",
        materials: [
            {material_id: "Low quality iron ingot", count: 3, result_id: "Cheap iron long blade"},
            {material_id: "Iron ingot", count: 3, result_id: "Iron long blade"},
            {material_id: "Steel ingot", count: 3, result_id: "Steel long blade"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
    });
    forging_recipes.components["Axe head"] = new ComponentRecipe({
        name: "Axe head",
        materials: [
            {material_id: "Low quality iron ingot", count: 4, result_id: "Cheap iron axe head"}, 
            {material_id: "Iron ingot", count: 4, result_id: "Iron axe head"},
            {material_id: "Steel ingot", count: 4, result_id: "Steel axe head"},
        ],
        item_type: "Component",
        recipe_skill: "Forging"
    });
    forging_recipes.components["Hammer head"] = new ComponentRecipe({
        name: "Hammer head",
        materials: [
            {material_id: "Low quality iron ingot", count: 4, result_id: "Cheap iron hammer head"}, 
            {material_id: "Iron ingot", count: 4, result_id: "Iron hammer head"},
            {material_id: "Steel ingot", count: 4, result_id: "Steel hammer head"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
    });

    forging_recipes.components["Short hilt"] = new ComponentRecipe({
        name: "Short hilt",
        materials: [
            {material_id: "Low quality iron ingot", count: 1, result_id: "Cheap iron short handle"},
            {material_id: "Iron ingot", count: 1, result_id: "Iron short handle"},
            {material_id: "Steel ingot", count: 1, result_id: "Steel short handle"},
            {material_id: "Turtle shellplate", count: 2, result_id: "Turtleshell short handle"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
    });
    forging_recipes.components["Medium handle"] = new ComponentRecipe({
        name: "Medium handle",
        materials: [
            {material_id: "Low quality iron ingot", count: 2, result_id: "Cheap iron medium handle"},
            {material_id: "Iron ingot", count: 2, result_id: "Iron medium handle"},
            {material_id: "Steel ingot", count: 2, result_id: "Steel medium handle"},
            {material_id: "Turtle shellplate", count: 4, result_id: "Turtleshell medium handle"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
    });
    forging_recipes.components["Long shaft"] = new ComponentRecipe({
        name: "Long shaft",
        materials: [
            {material_id: "Low quality iron ingot", count: 4, result_id: "Cheap iron long handle"},
            {material_id: "Iron ingot", count: 4, result_id: "Iron long handle"},
            {material_id: "Steel ingot", count: 4, result_id: "Steel long handle"},
            {material_id: "Turtle shellplate", count: 8, result_id: "Turtleshell long handle"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
    });

    crafting_recipes.components["Short hilt"] = new ComponentRecipe({
        name: "Short hilt",
        materials: [
            {material_id: "Processed weak monster bone", count: 1, result_id: "Weak bone short handle"},
        ],
        item_type: "Component",
        recipe_skill: "Crafting",
    });
    crafting_recipes.components["Medium handle"] = new ComponentRecipe({
        name: "Medium handle",
        materials: [
            {material_id: "Processed weak monster bone", count: 2, result_id: "Weak bone medium handle"},
        ],
        item_type: "Component",
        recipe_skill: "Crafting",
    });
    crafting_recipes.components["Long shaft"] = new ComponentRecipe({
        name: "Long shaft",
        materials: [
            {material_id: "Processed weak monster bone", count: 4, result_id: "Weak bone long handle"},
        ],
        item_type: "Component",
        recipe_skill: "Crafting",
    });

    woodworking_recipes.components["Short hilt"] = new ComponentRecipe({
        name: "Short hilt",
        materials: [
            {material_id: "Processed rough wood", count: 1, result_id: "Simple wooden short handle"},
            {material_id: "Processed wood", count: 1, result_id: "Wooden short handle"},
            {material_id: "Processed ash wood", count: 1, result_id: "Ash wood short handle"},
			{material_id: "Processed hickory wood", count: 1, result_id: "Hickory short handle"},
			{material_id: "Alchemical Wood", count: 1, result_id: "Alchemical wood short handle"},
        ],
        item_type: "Component",
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.components["Medium handle"] = new ComponentRecipe({
        name: "Medium handle",
        materials: [
            {material_id: "Processed rough wood", count: 2, result_id: "Simple wooden medium handle"},
            {material_id: "Processed wood", count: 2, result_id: "Wooden medium handle"},
            {material_id: "Processed ash wood", count: 2, result_id: "Ash wood medium handle"},
			{material_id: "Processed hickory wood", count: 2, result_id: "Hickory medium handle"},
			{material_id: "Alchemical Wood", count: 2, result_id: "Alchemical wood medium handle"},
        ],
        item_type: "Component",
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.components["Long shaft"] = new ComponentRecipe({
        name: "Long shaft",
        materials: [
            {material_id: "Processed rough wood", count: 4, result_id: "Simple wooden long handle"},
            {material_id: "Processed wood", count: 4, result_id: "Wooden long handle"},
            {material_id: "Processed ash wood", count: 4, result_id: "Ash wood long handle"},
			{material_id: "Processed hickory wood", count: 4, result_id: "Hickory long handle"},
			{material_id: "Alchemical Wood", count: 4, result_id: "Alchemical wood long handle"},
        ],
        item_type: "Component",
        recipe_skill: "Woodworking",
    });
})();

//shield components
(()=>{
    woodworking_recipes.components["Shield base"] = new ComponentRecipe({
        name: "Shield base",
        materials: [
            {material_id: "Processed rough wood", count: 6, result_id: "Simple wooden shield base"}, 
            {material_id: "Processed wood", count: 6, result_id: "Wooden shield base"},
            {material_id: "Processed ash wood", count: 6, result_id: "Ash wood shield base"},
			{material_id: "Processed hickory wood", count: 6, result_id: "Hickory shield base"},
			{material_id: "Alchemical Wood", count: 6, result_id: "Alchemical wood shield base"},
        ],
        item_type: "Component",
        recipe_skill: "Woodworking",
        component_type: "shield base",
    });

    woodworking_recipes.components["Shield handle"] = new ComponentRecipe({
        name: "Shield handle",
        materials: [
            {material_id: "Processed rough wood", count: 4, result_id: "Simple wooden shield handle"}, 
            {material_id: "Processed wood", count: 4, result_id: "Wooden shield handle"},
            {material_id: "Processed ash wood", count: 4, result_id: "Ash wood shield handle"},
			{material_id: "Processed hickory wood", count: 4, result_id: "Hickory shield handle"},
			{material_id: "Alchemical Wood", count: 4, result_id: "Alchemical wood shield handle"},
        ],
        item_type: "Component",
        recipe_skill: "Woodworking",
        component_type: "shield handle",
    });

    forging_recipes.components["Shield base"] = new ComponentRecipe({
        name: "Shield base",
        materials: [
            {material_id: "Low quality iron ingot", count: 5, result_id: "Cheap iron shield base"},
            {material_id: "Iron ingot", count: 5, result_id: "Iron shield base"},
            {material_id: "Steel ingot", count: 5, result_id: "Steel shield base"},
            {material_id: "Turtle shellplate", count: 10, result_id: "Turtleshell shield base"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
        component_type: "shield base",
    });

})();

//armor components
(()=>{
    crafting_recipes.components["Helmet exterior"] = new ComponentRecipe({
        name: "Helmet exterior",
        materials: [
            {material_id: "Piece of wolf leather", count: 3, result_id: "Wolf leather helmet armor"}, 
            {material_id: "Piece of boar leather", count: 3, result_id: "Boar leather helmet armor"},
            {material_id: "Piece of bear leather", count: 3, result_id: "Bear leather helmet armor"},
            {material_id: "Piece of alligator leather", count: 3, result_id: "Alligator helmet armor"},
        ],
        item_type: "Component",
        recipe_skill: "Crafting",
        component_type: "helmet exterior",
    });

    forging_recipes.components["Helmet exterior"] = new ComponentRecipe({
        name: "Helmet exterior",
        materials: [
            {material_id: "Iron chainmail", count: 3, result_id: "Iron chainmail helmet armor"},
            {material_id: "Steel chainmail", count: 3, result_id: "Steel chainmail helmet armor"},
            {material_id: "Turtle shellplate", count: 6, result_id: "Turtleshell helmet armor"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
        component_type: "helmet exterior",
    });
    
    crafting_recipes.components["Chestplate exterior"] = new ComponentRecipe({
        name: "Chestplate exterior",
        materials: [
            {material_id: "Piece of wolf leather", count: 5, result_id: "Wolf leather chestplate armor"}, 
            {material_id: "Piece of boar leather", count: 5, result_id: "Boar leather chestplate armor"},
            {material_id: "Piece of bear leather", count: 5, result_id: "Bear leather chestplate armor"},
            {material_id: "Piece of alligator leather", count: 5, result_id: "Alligator chestplate armor"},
        ],
        item_type: "Component",
        recipe_skill: "Crafting",
        component_type: "chestplate exterior",
    });

    forging_recipes.components["Chestplate exterior"] = new ComponentRecipe({
        name: "Chestplate exterior",
        materials: [
            {material_id: "Iron chainmail", count: 5, result_id: "Iron chainmail vest"},
            {material_id: "Steel chainmail", count: 5, result_id: "Steel chainmail vest"},
            {material_id: "Turtle shellplate", count: 10, result_id: "Turtleshell chestplate armor"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
        component_type: "chestplate exterior",
    });

    crafting_recipes.components["Leg armor exterior"] = new ComponentRecipe({
        name: "Leg armor exterior",
        materials: [
            {material_id: "Piece of wolf leather", count: 4, result_id: "Wolf leather greaves"}, 
            {material_id: "Piece of boar leather", count: 4, result_id: "Boar leather greaves"},
            {material_id: "Piece of bear leather", count: 4, result_id: "Bear leather greaves"},
            {material_id: "Piece of alligator leather", count: 4, result_id: "Alligator greaves"},
        ],
        item_type: "Component",
        recipe_skill: "Crafting",
        component_type: "leg armor exterior",
    });

    forging_recipes.components["Leg armor exterior"] = new ComponentRecipe({
        name: "Leg armor exterior",
        materials: [
            {material_id: "Iron chainmail", count: 4, result_id: "Iron chainmail greaves"},
            {material_id: "Steel chainmail", count: 4, result_id: "Steel chainmail greaves"},
            {material_id: "Turtle shellplate", count: 8, result_id: "Turtleshell greaves"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
        component_type: "leg armor exterior",
    });

    crafting_recipes.components["Glove exterior"] = new ComponentRecipe({
        name: "Glove exterior",
        materials: [
            {material_id: "Piece of wolf leather", count: 3, result_id: "Wolf leather glove armor"}, 
            {material_id: "Piece of boar leather", count: 3, result_id: "Boar leather glove armor"},
            {material_id: "Piece of bear leather", count: 3, result_id: "Bear leather glove armor"},
            {material_id: "Piece of alligator leather", count: 3, result_id: "Alligator armor"},
        ],
        item_type: "Component",
        recipe_skill: "Crafting",
        component_type: "glove exterior",
    });

    forging_recipes.components["Glove exterior"] = new ComponentRecipe({
        name: "Glove exterior",
        materials: [
            {material_id: "Iron chainmail", count: 3, result_id: "Iron chainmail glove armor"},
            {material_id: "Steel chainmail", count: 3, result_id: "Steel chainmail glove armor"},
            {material_id: "Turtle shellplate", count: 6, result_id: "Turtleshell glove armor"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
        component_type: "Glove exterior",
    });

    crafting_recipes.components["Shoes exterior"] = new ComponentRecipe({
        name: "Shoes exterior",
        materials: [
            {material_id: "Piece of wolf leather", count: 3, result_id: "Wolf leather shoe armor"}, 
            {material_id: "Piece of boar leather", count: 3, result_id: "Boar leather shoe armor"},
            {material_id: "Piece of bear leather", count: 3, result_id: "Bear leather shoe armor"},
            {material_id: "Piece of alligator leather", count: 3, result_id: "Alligator shoe armor"},
        ],
        item_type: "Component",
        recipe_skill: "Crafting",
        component_type: "shoes exterior",
    });

    forging_recipes.components["Shoes exterior"] = new ComponentRecipe({
        name: "Shoes exterior",
        materials: [
            {material_id: "Iron chainmail", count: 3, result_id: "Iron chainmail shoe armor"},
            {material_id: "Steel chainmail", count: 3, result_id: "Steel chainmail shoe armor"},
            {material_id: "Turtle shellplate", count: 6, result_id: "Turtleshell shoe armor"},
        ],
        item_type: "Component",
        recipe_skill: "Forging",
        component_type: "shoes exterior",
    });


})();

//equipment
(()=>{
    //full weapons
    crafting_recipes.equipment["Axe"] = new EquipmentRecipe({
        name: "Axe",
        components: ["axe head", "medium handle"],
        item_type: "Weapon",
    });
    crafting_recipes.equipment["Dagger"] = new EquipmentRecipe({
        name: "Dagger",
        components: ["short blade", "short handle"],
        item_type: "Weapon",
    });
    crafting_recipes.equipment["Hammer"] = new EquipmentRecipe({
        name: "Hammer",
        components: ["hammer head", "medium handle"],
        item_type: "Weapon",
    });
    crafting_recipes.equipment["Spear"] = new EquipmentRecipe({
        name: "Spear",
        components: ["short blade", "long handle"],
        item_type: "Weapon",
    });
    crafting_recipes.equipment["Sword"] = new EquipmentRecipe({
        name: "Sword",
        components: ["long blade", "short handle"],
        item_type: "Weapon",
    });

    //full shields
    crafting_recipes.equipment["Shield"] = new EquipmentRecipe({
        name: "Shield",
        components: ["shield base","shield handle"],
        item_type: "Shield",
    });

    //full armor
    crafting_recipes.equipment["Helmet"] = new EquipmentRecipe({
        name: "Helmet",
        components: ["helmet interior", "helmet exterior"],
        item_type: "Armor",
    });
    crafting_recipes.equipment["Chestplate"] = new EquipmentRecipe({
        name: "Chestplate",
        components: ["chestplate interior", "chestplate exterior"],
        item_type: "Armor",
    });
    crafting_recipes.equipment["Leg armor"] = new EquipmentRecipe({
        name: "Leg armor",
        components: ["leg armor interior", "leg armor exterior"],
        item_type: "Armor",
    });
    crafting_recipes.equipment["Gauntlets"] = new EquipmentRecipe({
        name: "Gauntlets",
        components: ["glove interior", "glove exterior"],
        item_type: "Armor",
    });
    crafting_recipes.equipment["Armored shoes"] = new EquipmentRecipe({
        name: "Armored shoes",
        components: ["shoes interior", "shoes exterior"],
        item_type: "Armor",
    });
})();
    
//clothes (which is also equipment, but also components, therefore separate)
(()=>{
    crafting_recipes.equipment["Hat"] = new ComponentRecipe({
        name: "Hat",
        materials: [
            {material_id: "Piece of wolf leather", count: 3, result_id: "Leather hat"},
            {material_id: "Wool cloth", count: 3, result_id: "Wool hat"},
            {material_id: "Wicker", count: 3, result_id: "Sun hat"},
            {material_id: "Piece of goat leather", count: 3, result_id: "Goat leather hat"},
            {material_id: "Linen cloth", count: 3, result_id: "Linen bandanna"},
            {material_id: "Piece of frog leather", count: 3, result_id: "Batrachian hat"},
            {material_id: "Piece of snakeskin leather", count: 3, result_id: "Snakeskin hat"}
        ],
        item_type: "Armor",
        component_type: "helmet interior",
        recipe_skill: "Crafting",
    });

    crafting_recipes.equipment["Shirt"] = new ComponentRecipe({
        name: "Shirt",
        materials: [
            {material_id: "Piece of wolf rat leather", count: 5, result_id: "Cheap leather vest"},
            {material_id: "Piece of wolf leather", count: 5, result_id: "Leather vest"},
            {material_id: "Wool cloth", count: 5, result_id: "Wool shirt"},
            {material_id: "Piece of goat leather", count: 5, result_id: "Goat leather vest"},
            {material_id: "Linen cloth", count: 5, result_id: "Linen vest"},
            {material_id: "Piece of frog leather", count: 5, result_id: "Batrachian vest"},
            {material_id: "Piece of snakeskin leather", count: 5, result_id: "Snakeskin vest"}
        ],
        item_type: "Armor",
        component_type: "chestplate interior",
        recipe_skill: "Crafting",
    });

    crafting_recipes.equipment["Pants"] = new ComponentRecipe({
        name: "Pants",
        materials: [
            {material_id: "Piece of wolf rat leather", count: 3, result_id: "Cheap leather pants"},
            {material_id: "Piece of wolf leather", count: 3, result_id: "Leather pants"},
            {material_id: "Wool cloth", count: 3, result_id: "Wool pants"},
            {material_id: "Piece of goat leather", count: 3, result_id: "Goat leather pants"},
            {material_id: "Linen cloth", count: 3, result_id: "Linen leggings"},
            {material_id: "Piece of frog leather", count: 3, result_id: "Batrachian pants"},
            {material_id: "Piece of snakeskin leather", count: 3, result_id: "Snakeskin leggings"}
        ],
        item_type: "Armor",
        component_type: "leg armor interior",
        recipe_skill: "Crafting",
    });

    crafting_recipes.equipment["Gloves"] = new ComponentRecipe({
        name: "Gloves",
        materials: [
            {material_id: "Piece of wolf leather", count: 2, result_id: "Leather gloves"},
            {material_id: "Wool cloth", count: 2, result_id: "Wool gloves"},
            {material_id: "Piece of goat leather", count: 2, result_id: "Goat leather gloves"},
            {material_id: "Linen cloth", count: 2, result_id: "Linen gloves"},
            {material_id: "Piece of frog leather", count: 2, result_id: "Batrachian gloves"},
            {material_id: "Piece of snakeskin leather", count: 2, result_id: "Snakeskin gloves"}
        ],
        item_type: "Armor",
        component_type: "glove interior",
        recipe_skill: "Crafting",
    });

    crafting_recipes.equipment["Shoes"] = new ComponentRecipe({
        name: "Shoes",
        materials: [
            {material_id: "Piece of wolf rat leather", count: 2, result_id: "Cheap leather shoes"},
            {material_id: "Piece of wolf leather", count: 2, result_id: "Leather shoes"},
            {material_id: "Piece of goat leather", count: 2, result_id: "Goat leather shoes"},
            {material_id: "Piece of frog leather", count: 2, result_id: "Batrachian shoes" },
            {material_id: "Piece of snakeskin leather", count: 2, result_id: "Snakeskin boots"}
        ],
        item_type: "Armor",
        component_type: "shoes interior",
        recipe_skill: "Crafting",
    });

    crafting_recipes.equipment["Amulet"] = new ComponentRecipe({
        name: "Amulet",
        materials: [
            {material_id: "Wool cloth", count: 5, result_id: "Wool scarf"}
        ],
        item_type: "Amulet",
        recipe_skill: "Crafting",
    });
})();

//componentless equipment (currently just capes)
(()=>{
    crafting_recipes.equipment["Cape"] = new ComponentlessEquipRecipe({
        name: "Cape",
        materials: [
            {material_id: "Processed rat pelt", count: 12, result_id: "Rat pelt cape"},
            {material_id: "Processed wolf pelt", count: 8, result_id: "Wolf pelt cape"},
            {material_id: "Processed boar hide", count: 8, result_id: "Boar hide cape"},
            {material_id: "Processed goat hide", count: 8, result_id: "Goat hide cape"},
            {material_id: "Processed bear hide", count: 8, result_id: "Bear hide cape"},
            {material_id: "Piece of frog leather", count: 8, result_id: "Batrachian cape"}
        ],
        item_type: "Cape",
        recipe_skill: "Crafting",
    });
})();

//materials
(function(){
    butchering_recipes.items["Piece of wolf rat leather"] = new ItemRecipe({
        name: "Piece of wolf rat leather",
        recipe_type: "material",
        materials: [{material_id: "Rat pelt", count: 6}], 
        result: {result_id: "Piece of wolf rat leather", count: 1},
        success_chance: [0.4,1],
        recipe_level: [1,5],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Piece of wolf leather"] = new ItemRecipe({
        name: "Piece of wolf leather",
        recipe_type: "material",
        materials: [{material_id: "Wolf pelt", count: 6}], 
        result: {result_id: "Piece of wolf leather", count: 1},
        success_chance: [0.2,1],
        recipe_skill: "Butchering",
        recipe_level: [1,10],
    });
    butchering_recipes.items["Piece of boar leather"] = new ItemRecipe({
        name: "Piece of boar leather",
        recipe_type: "material",
        materials: [{material_id: "Boar hide", count: 6}],
        result: {result_id: "Piece of boar leather", count: 1},
        success_chance: [0.2,1],
        recipe_skill: "Butchering",
        recipe_level: [5,15],
    });
    butchering_recipes.items["Piece of goat leather"] = new ItemRecipe({
        name: "Piece of goat leather",
        recipe_type: "material",
        materials: [{material_id: "Mountain goat hide", count: 6}],
        result: {result_id: "Piece of goat leather", count: 1},
        success_chance: [0.2,1],
        recipe_skill: "Butchering",
        recipe_level: [5,15],
    });
    butchering_recipes.items["Piece of bear leather"] = new ItemRecipe({
        name: "Piece of bear leather",
        recipe_type: "material",
        materials: [{material_id: "Bear hide", count: 6}],
        result: {result_id: "Piece of bear leather", count: 1},
        success_chance: [0.2,1],
        recipe_skill: "Butchering",
        recipe_level: [12,25],
    });
    butchering_recipes.items["Piece of frog leather"] = new ItemRecipe({
        name: "Piece of frog leather",
        recipe_type: "material",
        materials: [{ material_id: "Frog hide", count: 4 },
                    { material_id: "Belmart leaf", count: 2 }],
        result: {result_id: "Piece of frog leather", count: 1},
        success_chance: [0.2,1],
        recipe_level: [12,25],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Piece of alligator leather"] = new ItemRecipe({
        name: "Piece of alligator leather",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{material_id: "Alligator skin", count: 6}],
        result: {result_id: "Piece of alligator leather", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Butchering",
        recipe_level: [22,30],
    });
    butchering_recipes.items["Piece of snakeskin leather"] = new ItemRecipe({
        name: "Piece of snakeskin leather",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{material_id: "Giant snake skin", count: 6}],
        result: {result_id: "Piece of snakeskin leather", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Butchering",
        recipe_level: [22,30],
    });
    butchering_recipes.items["Turtle shellplate"] = new ItemRecipe({
        name: "Turtle shellplate",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{material_id: "Turtle shell", count: 10}],
        result: {result_id: "Turtle shellplate", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Butchering",
        recipe_level: [27,37],
    });

    butchering_recipes.items["Processed rat pelt"] = new ItemRecipe({
        name: "Processed rat pelt",
        recipe_type: "material",
        materials: [{material_id: "Rat pelt", count: 6}],
        result: {result_id: "Processed rat pelt", count: 1},
        success_chance: [0.4,1],
        recipe_level: [1,5],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Processed wolf pelt"] = new ItemRecipe({
        name: "Processed wolf pelt",
        recipe_type: "material",
        materials: [{material_id: "Wolf pelt", count: 6}],
        result: {result_id: "Processed wolf pelt", count: 1},
        success_chance: [0.2,1],
        recipe_level: [1,10],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Processed boar hide"] = new ItemRecipe({
        name: "Processed boar hide",
        recipe_type: "material",
        materials: [{material_id: "Boar hide", count: 6}],
        result: {result_id: "Processed boar hide", count: 1},
        success_chance: [0.2,1],
        recipe_level: [5,15],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Processed goat hide"] = new ItemRecipe({
        name: "Processed goat hide",
        recipe_type: "material",
        materials: [{material_id: "Mountain goat hide", count: 6}],
        result: {result_id: "Processed goat hide", count: 1},
        success_chance: [0.2,1],
        recipe_level: [5,15],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Processed bear hide"] = new ItemRecipe({
        name: "Processed bear hide",
        recipe_type: "material",
        materials: [{material_id: "Bear hide", count: 6}],
        result: {result_id: "Processed bear hide", count: 1},
        success_chance: [0.2,1],
        recipe_level: [12,25],
        recipe_skill: "Butchering",
    });
    crafting_recipes.items["Wool cloth"] = new ItemRecipe({
        name: "Wool cloth",
        recipe_type: "material",
        materials: [{material_id: "Wool", count: 5}], 
        result: {result_id: "Wool cloth", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Crafting",
        recipe_level: [5,15],
    });
    crafting_recipes.items["Linen cloth"] = new ItemRecipe({
        name: "Linen cloth",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{material_id: "Flax", count: 10}], 
        result: {result_id: "Linen cloth", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Crafting",
        recipe_level: [22,30],
    });
    crafting_recipes.items["Glass phial"] = new ItemRecipe({
        name: "Glass phial",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{ material_id: "Raw Glass", count: 1}], 
        result: {result_id: "Glass phial", count: 1},
        success_chance: [0.1,1],
        recipe_level: [15,25],
        recipe_skill: "Crafting",
    });

    crafting_recipes.items["Glass bottle"] = new ItemRecipe({
        name: "Glass bottle",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{ material_id: "Raw Glass", count: 3}], 
        result: {result_id: "Glass bottle", count: 1},
        success_chance: [0.1,1],
        recipe_level: [15,25],
        recipe_skill: "Crafting",
    });

    forging_recipes.items["Iron chainmail"] = new ItemRecipe({
        name: "Iron chainmail",
        recipe_type: "material",
        materials: [{material_id: "Iron ingot", count: 2}], 
        result: {result_id: "Iron chainmail", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Forging",
        recipe_level: [5,15],
    });
    forging_recipes.items["Steel chainmail"] = new ItemRecipe({
        name: "Steel chainmail",
        recipe_type: "material",
        materials: [{material_id: "Steel ingot", count: 2}], 
        result: {result_id: "Steel chainmail", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Forging",
        recipe_level: [10,20],
    });
    forging_recipes.items["Metal fishing hook"] = new ItemRecipe({
        name: "Metal fishing hook",
        recipe_type: "material",
        materials: [{material_type: "metal", count: 1}], 
        result: {result_id: "Metal fishing hook", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Forging",
        recipe_level: [5,15],
    });

    butchering_recipes.items["Rat meat chunks"] = new ItemRecipe({
        name: "Rat meat chunks",
        recipe_type: "material",
        materials: [{material_id: "Rat tail", count: 3}],
        result: {result_id: "Rat meat chunks", count: 1},
        success_chance: [0.4,1],
        recipe_level: [1,5],
        recipe_skill: "Butchering",
    });

    butchering_recipes.items["Fish fillet"] = new ItemRecipe({
        name: "Fish fillet",
        recipe_type: "material",
        materials: [{material_type: "large fish", count: 1}],
        result: {result_id: "Fish fillet", count: 3},
        success_chance: [0.4,1],
        recipe_level: [10,15],
        recipe_skill: "Butchering",
    });

    smelting_recipes.items["Low quality iron ingot"] = new ItemRecipe({
        name: "Low quality iron ingot",
        recipe_type: "material",
        materials: [{material_id: "Low quality iron ore", count: 5}, {material_type: "coal", count: 1}], 
        result: {result_id: "Low quality iron ingot", count: 1},
        success_chance: [0.6,1],
        recipe_level: [1,5],
        recipe_skill: "Smelting",
    });
    smelting_recipes.items["Iron ingot"] = new ItemRecipe({
        name: "Iron ingot",
        recipe_type: "material",
        materials: [{material_id: "Iron ore", count: 5}, {material_type: "coal", count: 1}], 
        result: {result_id: "Iron ingot", count: 1},
        success_chance: [0.4,1],
        recipe_level: [5,15],
        recipe_skill: "Smelting",
    });
    /*
    smelting_recipes.items["Silver ingot"] = new ItemRecipe({
        name: "Silver ingot",
        recipe_type: "material",
        materials: [{material_id: "Silver ore", count: 5}, {material_type: "coal", count: 1}], 
        result: {result_id: "Silver ingot", count: 1},
        success_chance: [0.4,1],
        recipe_level: [7,17],
        recipe_skill: "Smelting",
    });
    */
    smelting_recipes.items["Steel ingot (inefficient)"] = new ItemRecipe({
        name: "Steel ingot (inefficient)",
        recipe_type: "material",
        materials: [{material_id: "Iron ore", count: 5}, {material_id: "Atratan ore", count: 4}, {material_type: "coal", count: 2}],
        result: {result_id: "Steel ingot", count: 1},
        success_chance: [0.3,1],
        recipe_level: [10,20],
        recipe_skill: "Smelting",
        is_unlocked: false,
    });

    smelting_recipes.items["Raw Glass"] = new ItemRecipe({
        name: "Raw Glass",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{ material_id: "Silica Sand", count: 2},
                    { material_id: "Potash", count: 1}], 
        result: {result_id: "Raw Glass", count: 1},
        success_chance: [0.2,1],
        recipe_level: [10,20],
        recipe_skill: "Smelting",
    });

    smelting_recipes.items["Alchemical Wood"] = new ItemRecipe({
        name: "Alchemical Wood",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{ material_id: "Sulfur", count: 5},
                    { material_id: "Potash", count: 5},
                    { material_id: "Processed hickory wood", count: 2}],
        result: {result_id: "Alchemical Wood", count: 1},
        success_chance: [0.2,1],
        recipe_level: [15,25],
        recipe_skill: "Smelting",
    });

    woodworking_recipes.items["Processed rough wood"] = new ItemRecipe({
        name: "Processed rough wood",
        recipe_type: "material",
        materials: [{material_id: "Rough wood log", count: 1}], 
        result: {result_id: "Processed rough wood", count: 3},
        success_chance: [0.3,1],
        recipe_level: [1,8],
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.items["Processed wood"] = new ItemRecipe({
        name: "Processed wood",
        recipe_type: "material",
        materials: [{material_id: "Wood log", count: 1}], 
        result: {result_id: "Processed wood", count: 3},
        success_chance: [0.3,1],
        recipe_level: [6,16],
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.items["Processed ash wood"] = new ItemRecipe({
        name: "Processed ash wood",
        recipe_type: "material",
        materials: [{material_id: "Ash wood log", count: 1}], 
        result: {result_id: "Processed ash wood", count: 3},
        success_chance: [0.3,1],
        recipe_level: [11,22],
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.items["Processed hickory wood"] = new ItemRecipe({
        name: "Processed hickory wood",
        recipe_type: "material",
        materials: [{material_id: "Hickory wood log", count: 1}], 
        result: {result_id: "Processed hickory wood", count: 3},
        success_chance: [0.3,1],
        recipe_level: [17,28],
        recipe_skill: "Woodworking",
    });

    woodworking_recipes.items["Wicker"] = new ItemRecipe({
        name: "Wicker",
        recipe_type: "material",
        materials: [{material_id: "Piece of willow wood", count: 6}], 
        result: {result_id: "Wicker", count: 1},
        success_chance: [0.2,1],
        recipe_level: [7,17],
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.items["Willow bark"] = new ItemRecipe({
        name: "Willow bark",
        recipe_type: "material",
        materials: [{material_id: "Piece of willow wood", count: 2}], 
        result: {result_id: "Willow bark", count: 1},
        success_chance: [0.1,1],
        recipe_level: [10,25],
        recipe_skill: "Woodworking",
    });

    butchering_recipes.items["Processed weak monster bone"] = new ItemRecipe({
        name: "Processed weak monster bone",
        recipe_type: "material",
        materials: [{material_id: "Weak monster bone", count: 5}], 
        result: {result_id: "Processed weak monster bone", count: 1},
        success_chance: [0.1,1],
        recipe_level: [10,20],
        recipe_skill: "Butchering",
    });
    smelting_recipes.items["Charcoal"] = new ItemRecipe({
        name: "Charcoal",
        recipe_type: "material",
        materials: [{material_type: "raw wood", count: 5}],
        result: {result_id: "Charcoal", count: 1},
        success_chance: [0.4,1],
        recipe_level: [1,10],
        recipe_skill: "Smelting",
    });
    cooking_recipes.items["Animal fat"] = new ItemRecipe({
        name: "Animal fat",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Boar meat", count: 3}], 
        result: {result_id: "Animal fat", count: 1},
        success_chance: [0.1,1],
        recipe_level: [7,20],
        recipe_skill: "Cooking",
    });
    butchering_recipes.items["Sinew"] = new ItemRecipe({
        name: "Sinew",
        recipe_type: "material",
        materials: [{material_type: "raw meat", count: 2}], 
        result: {result_id: "Sinew", count: 1},
        success_chance: [0.1,1],
        recipe_level: [10,20],
        recipe_skill: "Butchering",
    });
    crafting_recipes.items["Sinew string"] = new ItemRecipe({
        name: "Sinew string",
        recipe_type: "material",
        materials: [{material_id: "Sinew", count: 5}], 
        result: {result_id: "Sinew string", count: 1},
        success_chance: [0.2,1],
        recipe_level: [5,15],
        recipe_skill: "Crafting",
    });
    crafting_recipes.items["Flax string"] = new ItemRecipe({
        name: "Flax string",
        recipe_type: "material",
        materials: [{material_id: "Flax", count: 5}], 
        result: {result_id: "Flax string", count: 1},
        success_chance: [0.2,1],
        recipe_level: [20,30],
        recipe_skill: "Crafting",
    });

    butchering_recipes.items["High quality wolf fang"] = new ItemRecipe({
        name: "High quality wolf fang",
        recipe_type: "material",
        materials: [{material_id: "Wolf fang", count: 50}],
        result: {result_id: "High quality wolf fang", count: 1},
        success_chance: [0.5,1],
        recipe_level: [1,7],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["High quality boar tusk"] = new ItemRecipe({
        name: "High quality boar tusk",
        recipe_type: "material",
        materials: [{material_id: "Boar tusk", count: 50}], 
        result: {result_id: "High quality boar tusk", count: 1},
        success_chance: [0.5,1],
        recipe_level: [5,12],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Pristine mountain goat horn"] = new ItemRecipe({
        name: "Pristine mountain goat horn",
        recipe_type: "material",
        materials: [{material_id: "Mountain goat horn", count: 50}], 
        result: {result_id: "Pristine mountain goat horn", count: 1},
        success_chance: [0.5,1],
        recipe_level: [10,17],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Sharp bear claw"] = new ItemRecipe({
        name: "Sharp bear claw",
        recipe_type: "material",
        materials: [{material_id: "Bear claw", count: 50}], 
        result: {result_id: "Sharp bear claw", count: 1},
        success_chance: [0.5,1],
        recipe_level: [13,20],
        recipe_skill: "Butchering",
    });
    butchering_recipes.items["Giant crab claw"] = new ItemRecipe({
        name: "Giant crab claw",
        recipe_type: "material",
        materials: [{material_id: "Crab claw", count: 50}], 
        result: {result_id: "Giant crab claw", count: 1},
        success_chance: [0.3,1],
        recipe_level: [18,25],
        recipe_skill: "Butchering",
    });

    alchemy_recipes.items["Potash"] = new ItemRecipe({
        name: "Potash",
        is_unlocked: false,
        recipe_type: "material",
        materials: [{ material_id: "Charcoal", count: 8}], 
        result: {result_id: "Potash", count: 1},
        success_chance: [0.5,1],
        recipe_level: [10,20],
        recipe_skill: "Alchemy",
    });
})();

//misc
(function(){
    crafting_recipes.items["Bonemeal"] = new ItemRecipe({
        name: "Bonemeal",
        is_unlocked: true,
        recipe_type: "material",
        materials: [{material_type: "animal tooth", count: 20}],
        result: {result_id: "Bonemeal", count: 1},
        success_chance: [0.1,1],
        recipe_level: [1,12],
        recipe_skill: "Crafting",
    });

    woodworking_recipes.items["Makeshift fishing pole"] = new ItemRecipe({
        name: "Makeshift fishing pole",
        recipe_type: "equipment",
        materials: [
            { material_id: "Processed rough wood", count: 4 },
            //{ material_id: "Simple long wooden shaft", count: 1 },    //TODO
            { material_id: "Wool", count: 1 },
        ],
        result: { result_id: "Makeshift fishing pole", count: 1 },
        success_chance: [0.1, 1],
        recipe_level: [1, 12],
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.items["Wooden fishing pole"] = new ItemRecipe({
        name: "Wooden fishing pole",
        recipe_type: "equipment",
        materials: [
            { material_id: "Processed wood", count: 4 },
            //{ material_id: "Simple long wooden shaft", count: 1 },    //TODO
            { material_id: "Sinew string", count: 1 },
            { material_id: "Metal fishing hook", count: 1 },
        ],
        result: { result_id: "Wooden fishing pole", count: 1 },
        success_chance: [0.1, 1],
        recipe_level: [7, 17],
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.items["Ash wood fishing pole"] = new ItemRecipe({
        name: "Ash wood fishing pole",
        recipe_type: "equipment",
        materials: [
            { material_id: "Processed ash wood", count: 4 },
            //{ material_id: "Simple long wooden shaft", count: 1 },    //TODO
            { material_id: "Sinew string", count: 1 },
            { material_id: "Metal fishing hook", count: 1 },
        ],
        result: { result_id: "Ash wood fishing pole", count: 1 },
        success_chance: [0.1, 1],
        recipe_level: [12, 22],
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.items["Hickory wood fishing pole"] = new ItemRecipe({
        name: "Hickory wood fishing pole",
        recipe_type: "equipment",
        materials: [
            { material_id: "Processed hickory wood", count: 4 },
            //{ material_id: "Simple long wooden shaft", count: 1 },    //TODO
            { material_id: "Flax string", count: 1 },
            { material_id: "Metal fishing hook", count: 1 },
        ],
        result: { result_id: "Hickory wood fishing pole", count: 1 },
        success_chance: [0.1, 1],
        recipe_level: [17, 27],
        recipe_skill: "Woodworking",
    });
    woodworking_recipes.items["Alchemical wood fishing pole"] = new ItemRecipe({
        name: "Alchemical wood fishing pole",
        recipe_type: "equipment",
        materials: [
            { material_id: "Alchemical Wood", count: 4 },
            //{ material_id: "Simple long wooden shaft", count: 1 },    //TODO
            { material_id: "Flax string", count: 1 },
            { material_id: "Metal fishing hook", count: 1 },
        ],
        result: { result_id: "Alchemical wood fishing pole", count: 1 },
        success_chance: [0.1, 1],
        recipe_level: [22, 32],
        recipe_skill: "Woodworking",
    });
})();

//consumables
(function(){
    cooking_recipes.items["Roasted rat meat"] = new ItemRecipe({
        name: "Roasted rat meat",
        recipe_type: "usable",
        materials: [{material_id: "Rat meat chunks", count: 2}], 
        result: {result_id: "Roasted rat meat", count: 1},
        success_chance: [0.7,1],
        recipe_level: [1,5],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Roasted purified rat meat"] = new ItemRecipe({
        name: "Roasted purified rat meat",
        recipe_type: "usable",
        materials: [{material_id: "Rat meat chunks", count: 2},
                    {material_id: "Belmart leaf", count: 1},
        ],
        result: {result_id: "Roasted purified rat meat", count: 1},
        success_chance: [0.4,1],
        recipe_level: [1,10],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Fried pork"] = new ItemRecipe({
        name: "Fried pork",
        recipe_type: "usable",
        materials: [{material_id: "Boar meat", count: 2}], 
        result: {result_id: "Fried pork", count: 1},
        success_chance: [0.5,1],
        recipe_level: [7,15],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Fried goat meat"] = new ItemRecipe({
        name: "Fried goat meat",
        recipe_type: "usable",
        materials: [{material_id: "Goat meat", count: 2}], 
        result: {result_id: "Fried goat meat", count: 1},
        success_chance: [0.4,1],
        recipe_level: [10,15],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Pork roast"] = new ItemRecipe({
        name: "Pork roast",
        recipe_type: "usable",
        materials: [{ material_id: "Boar meat", count: 2},
                    { material_id: "Cooking herbs", count: 3}], 
        result: {result_id: "Pork roast", count: 1},
        success_chance: [0.5,1],
        recipe_level: [10,20],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Goat stew"] = new ItemRecipe({
        name: "Goat stew",
        recipe_type: "usable",
        materials: [{ material_id: "Goat meat", count: 2},
                    { material_id: "Cooking herbs", count: 2}], 
        result: {result_id: "Goat stew", count: 1},
        success_chance: [0.4,1],
        recipe_level: [12,22],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Bread kwas"] = new ItemRecipe({
        name: "Bread kwas",
        recipe_type: "usable",
        materials: [{material_type: "bread", count: 2}, 
                    {material_id: "Glass bottle", count: 1}
                ], 
        result: {result_id: "Bread kwas", count: 1},
        success_chance: [0.3,1],
        recipe_level: [10,15],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Fish skewer"] = new ItemRecipe({
        name: "Fish skewer",
        recipe_type: "usable",
        materials: [{material_type: "small fish", count: 5}], 
        result: {result_id: "Fish skewer", count: 1},
        success_chance: [0.5,1],
        recipe_level: [1,10],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Fried fish"] = new ItemRecipe({
        name: "Fried fish",
        recipe_type: "usable",
        materials: [{material_type: "medium fish", count: 1}], 
        result: {result_id: "Fried fish", count: 1},
        success_chance: [0.5,1],
        recipe_level: [7,15],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Fish steak"] = new ItemRecipe({
        name: "Fish steak",
        recipe_type: "usable",
        materials: [{material_id: "Fish fillet", count: 1},
                    {material_id: "Cooking herbs", count: 1}], 
        result: {result_id: "Fish steak", count: 1},
        success_chance: [0.5,1],
        recipe_level: [7,15],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Fried frog meat"] = new ItemRecipe({
        name: "Fried frog meat",
        recipe_type: "usable",
        materials: [{material_id: "Frog meat", count: 2}], 
        result: {result_id: "Fried frog meat", count: 1},
        success_chance: [0.4,1],
        recipe_level: [12,20],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Kingsized frog legs"] = new ItemRecipe({
        name: "Kingsized frog legs",
        recipe_type: "usable",
        materials: [{ material_id: "Frog meat", count: 2},
                    { material_id: "Cooking herbs", count: 2}], 
        result: {result_id: "Kingsized frog legs", count: 1},
        success_chance: [0.5,1],
        recipe_level: [15,25],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Alligator jerky"] = new ItemRecipe({
        name: "Alligator jerky",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Alligator meat", count: 2}],
        result: {result_id: "Alligator jerky", count: 1},
        success_chance: [0.3,1],
        recipe_level: [22,30],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Snake jerky"] = new ItemRecipe({
        name: "Snake jerky",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Giant snake meat", count: 2}],
        result: {result_id: "Snake jerky", count: 1},
        success_chance: [0.3,1],
        recipe_level: [22,30],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Turtle jerky"] = new ItemRecipe({
        name: "Turtle jerky",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Turtle meat", count: 2}],
        result: {result_id: "Turtle jerky", count: 1},
        success_chance: [0.3,1],
        recipe_level: [22,30],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Swampland skewer"] = new ItemRecipe({
        name: "Swampland skewer",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Alligator meat", count: 1},
                    {material_id: "Giant snake meat", count: 1},
                    {material_id: "Turtle meat", count: 1},
                    {material_id: "Wild garlic", count: 1},
                    {material_id: "Wild onion", count: 1},
                    {material_id: "Cooking herbs", count: 1}
                ], 
        result: {result_id: "Swampland skewer", count: 1},
        success_chance: [0.3,1],
        recipe_level: [27,37],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Crab bisque"] = new ItemRecipe({
        name: "Crab bisque",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Crab meat", count: 3},
                    {material_id: "Cooking herbs", count: 1},
                    {material_id: "Wild potato", count: 2},
                    {material_id: "Wild onion", count: 1},
                    {material_id: "Glass bottle", count: 1}
                ], 
        result: {result_id: "Crab bisque", count: 1},
        success_chance: [0.4,1],
        recipe_level: [22,30],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Clam broth"] = new ItemRecipe({
        name: "Clam broth",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Clam", count: 3},
                    {material_id: "Cooking herbs", count: 1},
                    {material_id: "Wild garlic", count: 1},
                    {material_id: "Glass bottle", count: 1}
                ], 
        result: {result_id: "Clam broth", count: 1},
        success_chance: [0.4,1],
        recipe_level: [22,30],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Turtle soup"] = new ItemRecipe({
        name: "Turtle soup",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Turtle meat", count: 1},
                    {material_id: "Cooking herbs", count: 1},
                    {material_id: "Wild potato", count: 1},
                    {material_id: "Glass bottle", count: 1}
                ], 
        result: {result_id: "Turtle soup", count: 1},
        success_chance: [0.4,1],
        recipe_level: [22,30],
        recipe_skill: "Cooking",
    });
    cooking_recipes.items["Basin gumbo"] = new ItemRecipe({
        name: "Basin gumbo",
        is_unlocked: false,
        recipe_type: "usable",
        materials: [{material_id: "Alligator meat", count: 3},
                    {material_id: "Turtle meat", count: 3},
                    {material_id: "Crab meat", count: 6},
                    {material_id: "Clam", count: 6},
                    {material_id: "Wild potato", count: 6},
                    {material_id: "Wild garlic", count: 4},
                    {material_id: "Wild onion", count: 4},
                    {material_id: "Animal fat", count: 3},
                    {material_id: "Cooking herbs", count: 3},
                    {material_id: "Belmart leaf", count: 2},
                    {material_id: "Glass bottle", count: 1}
                ], 
        result: {result_id: "Basin gumbo", count: 1},
        success_chance: [0.1,1],
        recipe_level: [35,60],
        recipe_skill: "Cooking",
    });
    
    alchemy_recipes.items["Weak healing powder"] = new ItemRecipe({
        name: "Weak healing powder",
        recipe_type: "usable",
        is_unlocked: false,
        materials: [{material_id: "Golmoon leaf", count: 5}],
        result: {result_id: "Weak healing powder", count: 1},
        success_chance: [0.4,1],
        recipe_level: [1,10],
        recipe_skill: "Alchemy",
    });
    alchemy_recipes.items["Healing powder"] = new ItemRecipe({
        name: "Healing powder",
        recipe_type: "usable",
        is_unlocked: false,
        materials: [{material_id: "Golmoon leaf", count: 3}, {material_id: "Silver thistle", count: 3}],
        result: {result_id: "Healing powder", count: 1},
        success_chance: [0.1,1],
        recipe_level: [5,15],
        recipe_skill: "Alchemy",
    });
    alchemy_recipes.items["Potent healing powder"] = new ItemRecipe({
        name: "Potent healing powder",
        recipe_type: "usable",
        is_unlocked: false,
        materials: [{material_id: "Willow bark", count: 3}, {material_id: "Silver thistle", count: 3}],
        result: {result_id: "Potent healing powder", count: 1},
        success_chance: [0.1,1],
        recipe_level: [10,20],
        recipe_skill: "Alchemy",
    });
    alchemy_recipes.items["Oneberry juice"] = new ItemRecipe({
        name: "Oneberry juice",
        recipe_type: "usable",
        is_unlocked: false,
        materials: [{material_id: "Oneberry", count: 10},
                    {material_id: "Glass phial", count: 1},
        ],
        result: {result_id: "Oneberry juice", count: 1},
        success_chance: [0.5,1],
        recipe_level: [2,12],
        recipe_skill: "Alchemy",
    });
    alchemy_recipes.items["Healing potion"] = new ItemRecipe({
        name: "Healing potion",
        recipe_type: "usable",
        is_unlocked: false,
        materials: [{material_id: "Oneberry", count: 8},
                    {material_id: "Silver thistle", count: 4},
                    {material_id: "Glass phial", count: 1},
        ],
        result: {result_id: "Healing potion", count: 1},
        success_chance: [0.1,1],
        recipe_level: [7,17],
        recipe_skill: "Alchemy",
    });
    alchemy_recipes.items["Healing balm"] = new ItemRecipe({
        name: "Healing balm",
        recipe_type: "usable",
        is_unlocked: false,
        materials: [{material_id: "Oneberry", count: 10},
                    {material_id: "Golmoon leaf", count: 5},
                    {material_id: "Animal fat", count: 1},
        ],
        result: {result_id: "Healing balm", count: 1},
        success_chance: [0.1,1],
        recipe_level: [7,15],
        recipe_skill: "Alchemy",
    });
    alchemy_recipes.items["Thick healing balm"] = new ItemRecipe({
        name: "Thick healing balm",
        recipe_type: "usable",
        is_unlocked: false,
        materials: [{material_id: "Healing balm", count: 1},
                    {material_id: "Willow bark", count: 2},
        ],
        result: {result_id: "Thick healing balm", count: 2},
        success_chance: [0.1,1],
        recipe_level: [12,20],
        recipe_skill: "Alchemy",
    });

    alchemy_recipes.items["Potion of sapping"] = new ItemRecipe({
        name: "Potion of sapping",
        recipe_type: "usable",
        is_unlocked: false,
        materials: [{material_id: "Tree sap", count: 2},
                    {material_id: "Glass phial", count: 1},
        ],
        result: {result_id: "Potion of sapping", count: 1},
        success_chance: [0.2,1],
        recipe_level: [3,15],
        recipe_skill: "Alchemy",
    });
    alchemy_recipes.items["Sulfur"] = new ItemRecipe({
        name: "Sulfur",
        recipe_type: "material",
        is_unlocked: false,
        materials: [{material_id: "Low quality iron ore", count: 10}],
        result: {result_id: "Sulfur", count: 1},
        success_chance: [0.1,1],
        recipe_level: [10,20],
        recipe_skill: "Alchemy",
    });

})();

//trinkets and jewellery
(function(){
    crafting_recipes.items["Wolf trophy"] = new ItemRecipe({
        name: "Wolf trophy",
        recipe_type: "equipment",
        materials: [{material_id: "High quality wolf fang", count: 4}],
        result: {result_id: "Wolf trophy", count: 1},
        success_chance: [0.5,1],
        recipe_level: [1,10],
        recipe_skill: "Crafting",
    });
    crafting_recipes.items["Boar trophy"] = new ItemRecipe({
        name: "Boar trophy",
        recipe_type: "equipment",
        materials: [{material_id: "High quality boar tusk", count: 4}],
        result: {result_id: "Boar trophy", count: 1},
        success_chance: [0.5,1],
        recipe_level: [5,15],
        recipe_skill: "Crafting",
    });
    crafting_recipes.items["Mountain goat trophy"] = new ItemRecipe({
        name: "Mountain goat trophy",
        recipe_type: "equipment",
        materials: [{material_id: "Pristine mountain goat horn", count: 4}],
        result: {result_id: "Mountain goat trophy", count: 1},
        success_chance: [0.5,1],
        recipe_level: [10,20],
        recipe_skill: "Crafting",
    });
    crafting_recipes.items["Bear trophy"] = new ItemRecipe({
        name: "Bear trophy",
        recipe_type: "equipment",
        materials: [{material_id: "Sharp bear claw", count: 4}],
        result: {result_id: "Bear trophy", count: 1},
        success_chance: [0.3,1],
        recipe_level: [15,25],
        recipe_skill: "Crafting",
    });
    crafting_recipes.items["Crab trophy"] = new ItemRecipe({
        name: "Crab trophy",
        recipe_type: "equipment",
        materials: [{material_id: "Giant crab claw", count: 4}],
        result: {result_id: "Crab trophy", count: 1},
        success_chance: [0.3,1],
        recipe_level: [22,30],
        recipe_skill: "Crafting",
    });

    crafting_recipes.items["Simple dream catcher"] = new ItemRecipe({
        name: "Simple dream catcher",
        recipe_type: "equipment",
        is_unlocked: false,
        materials: [
            { material_id: "Piece of willow wood", count: 1 },
            { material_id: "Sinew string", count: 1 }
        ],
        result: {result_id: "Simple dream catcher", count: 1},
        success_chance: [0.1,1],
        recipe_skill: "Crafting",
        recipe_level: [10,20],
    });
})();

const recipes = {
    crafting: crafting_recipes, 
    cooking: cooking_recipes, 
    smelting: smelting_recipes, 
    forging: forging_recipes, 
    alchemy: alchemy_recipes,
    butchering: butchering_recipes,
    woodworking: woodworking_recipes,
}


Object.keys(recipes).forEach(recipe_category => {
    Object.keys(recipes[recipe_category]).forEach(recipe_subcategory => {
        Object.keys(recipes[recipe_category][recipe_subcategory]).forEach(recipe_key => {
            recipes[recipe_category][recipe_subcategory][recipe_key].id = recipe_key;
        });
    });
});

export { recipes, find_recipe_material, get_recipe_xp_value, get_crafting_quality_caps, get_component_stats, ItemRecipe }
