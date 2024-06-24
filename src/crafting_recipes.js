"use strict";

import { character } from "./character.js";
import { Armor, Shield, Weapon, getItem } from "./items.js";
import { skills } from "./skills.js";

const crafting_recipes = {items: {}, components: {}, equipment: {}};
const cooking_recipes = {items: {}};
const smelting_recipes = {items: {}};
const forging_recipes = {items: {}, components: {}};
const alchemy_recipes = {items: {}};

/*
    recipes can be treated differently for display based on if they are in items/components/equipment category

    non-equipment recipes have a success rate (presented with min-max value, where max should be 1) that shall scale with skill level and with crafting station level
    for equipment recipes, there is no success rate in favor of equipment's "quality" property

    resulting quality of equipment is based on component quality; 100% (with slight variation?) with 100% components and required skill, more at higher levels
    
    overal max quality achievable scales with related skills?
    lvl 15/60: 150
    lvl 30/60: 200
    lvl 45/60: 250s
    skills can increase quality of resulting item, but they are more required to keep it from getting lower than the components, as higher tier components = higher skill lvl required?
    

    todo: actually add quality to components!
    should be savegame compatible
*/

class Recipe {
    constructor({
        name,
        id,
        is_unlocked = true, //TODO: change to false when unlocking is implemented!
        recipe_type,
        result,
        getResult,
        recipe_level = 1,
        recipe_skill,
    }) {
        this.name = name;
        this.id = id || name;
        this.is_unlocked = is_unlocked;
        this.recipe_type = recipe_type;
        this.result = result;
        this.getResult = getResult || function(){return this.result};
        this.recipe_level = recipe_level;
        this.recipe_skill = recipe_skill;
    }
}

class ItemRecipe extends Recipe {
    constructor({
        name,
        id,
        materials = [], //{name, count}
        is_unlocked = true, //TODO: change to false when unlocking is implemented!
        recipe_type,
        result,
        getResult,
        recipe_level,
        recipe_skill,
        success_chance = [1,1],
    }) {
        super({name, id, is_unlocked, recipe_type, result, getResult, recipe_level, recipe_skill});
        this.materials = materials;
        this.success_chance = success_chance;
    }

    get_success_chance(station_bonus=0) {
        const skill_modifier = Math.max(1,((skills[this.recipe_skill].current_level+station_bonus)/this.recipe_level));
        return this.success_chance[0]*(this.success_chance[1]/this.success_chance[0])**skill_modifier;
    }

    get_availability() {
        for(let i = 0; i < this.materials.length; i++) {
            if(!character.inventory[this.materials[i].name] || character.inventory[this.materials[i].name].count < this.materials[i].count) {
                return false;
            }
        }
        return true;
    }
}

class ComponentRecipe extends ItemRecipe{
    constructor({
        name,
        id,
        materials = [],
        is_unlocked = true, //TODO: change to false when unlocking is implemented!
        result,
        component_type,
        recipe_level,
        recipe_skill,
    }) {
        super({name, id, materials, is_unlocked, recipe_type: "component", result, recipe_level, recipe_skill, getResult: null, success_rate: [1,1]})
        this.component_type = component_type;
        this.getResult = function(){

            //return based on material used
        }
    }
}

class EquipmentRecipe extends Recipe {
    constructor({
        name,
        id,
        components = [], //pair of component types; first letter not capitalized
        is_unlocked = true, //TODO: change to false when unlocking is implemented!
        result = null,
        item_type, //weapon/armor? probably unnecessary
        //no recipe level, difficulty based on selected components
    }) {
        super({name, id, is_unlocked, recipe_type: "equipment", result, getResult: null, recipe_level: 0, recipe_skill: null, success_rate: [1,1]})
        this.components = components;
        this.item_type = item_type;
        this.recipe_skills = ["Equipment creation", "Crafting"];
        this.getResult = function(component_1, component_2){

            let quality = 1;
            //return based on components used
            if(this.item_type === "Weapon") {
                return new Weapon(
                    {
                        components: {
                            head: component_1.name,
                            handle: component_2.name,
                        }
                    }
                );
            } else if(this.item_type === "Armor") {
                return new Armor(
                    {
                        components: {
                            internal: component_1.name,
                            external: component_2.name,
                        }
                    }
                );
            } else if(this.item_type === "Shield") {
                return new Shield(
                    {
                        components: {
                            shield_base: component_1.name,
                            handle: component_2.name,
                        },
                        quality: quality,
                    }
                );
            } else {
                throw new Error(`Recipe "${this.name}" has an incorrect item_type provided ("${this.item_type}")`);
            }
        }
    }
}


//components
(()=>{
    forging_recipes.components["Short blade"] = new ComponentRecipe({
        name: "Short blade",
        materials: [
            {name: "Low quality iron bar", count: 2}, 
            {name: "Iron bar", count: 2}
        ],
        item_type: "Component",
        recipe_skill: "Forging"
    });
    forging_recipes.components["Long blade"] = new ComponentRecipe({
        name: "Long blade",
        materials: [
            {name: "Low quality iron bar", count: 3}, 
            {name: "Iron bar", count: 3}
        ],
        item_type: "Component",
        recipe_skill: "Forging",
    });
})();

//equipment
(()=>{
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
})();


//materials
(function(){
    crafting_recipes.items["Piece of wolf rat leather"] = new ItemRecipe({
        name: "Piece of wolf rat leather",
        recipe_type: "material",
        materials: [{name: "Rat pelt", count: 5}], 
        result: {name: "Piece of wolf rat leather", count: 1},
        success_rate: [0.4,1],
        recipe_skill: "Crafting",
    });
    crafting_recipes.items["Rat meat chunks"] = new ItemRecipe({
        name: "Rat meat chunks",
        recipe_type: "material",
        materials: [{name: "Rat tail", count: 5}], 
        result: {name: "Rat meat chunks", count: 1},
        success_rate: [0.4,1],
        recipe_skill: "Crafting",
    });
})();

//consumables
(function(){
    cooking_recipes.items["Roasted rat meat"] = new ItemRecipe({
        name: "Roasted rat meat",
        recipe_type: "material",
        materials: [{name: "Rat meat chunks", count: 2}], 
        result: {name: "Roasted rat meat", count: 1},
        success_rate: [0.4,1],
        recipe_skill: "Cooking",
    });
})();

crafting_recipes.items["Wolf trophy"] = new ItemRecipe({
    name: "Wolf trophy",
    id: "Wolf trophy",
    recipe_type: "equipment",
    recipe_level: 10,
    materials: [{name: "High quality wolf fang", count: 5}],
    result: {name: "Wolf trophy", count: 1},
    success_rate: [0.5,1],
    recipe_skill: "Crafting",
});


const recipes = {
    crafting: crafting_recipes, 
    cooking: cooking_recipes, 
    smelting: smelting_recipes, 
    forging: forging_recipes, 
    alchemy: alchemy_recipes
}

export {recipes}
