"use strict";

import { add_to_character_inventory, character, remove_from_character_inventory } from "./character.js";
import { recipes } from "./crafting_recipes.js";
import { log_message } from "./display.js";
import { item_templates } from "./items.js";

function use_recipe(target) {
    const category = target.parentNode.parentNode.dataset.crafting_category;
    const subcategory = target.parentNode.parentNode.dataset.crafting_subcategory;
    const recipe_id = target.parentNode.dataset.recipe_id;

    if(!category || !subcategory || !recipe_id) {
        console.log(category, subcategory, recipe_id);
        return;
    } else if(!recipes[category][subcategory][recipe_id]) {
        //shouldn't be possible to reach this, but whatever
        throw new Error(`Tried to use a recipe that doesn't exist: ${category} -> ${subcategory} -> ${recipe_id}`);
    } else {
        
        const recipe = recipes[category][subcategory][recipe_id];
        const recipe_div = document.querySelector(`[data-crafting_category="${category}"] [data-crafting_subcategory="${subcategory}"] [data-recipe_id="${recipe_id}"]`);

        if(subcategory === "items") {
            
            if(recipe.get_availability()) {
                const success_chance = recipe.get_success_chance();
                if(Math.random() < success_chance) {
                    for(let i = 0; i < recipe.materials.length; i++) {
                        remove_from_character_inventory({item_name: recipe.materials[i].name, item_count: recipe.materials[i].count});
                    } 
    
                    const {name, count} = recipe.getResult();
                    add_to_character_inventory([{item: item_templates[name], count: count}]);
                    

                    //log a message about success
                } else {
                    //log a message about failing
                }
            } else {
                console.warn(`Tried to use an unavailable recipe!`);
            }
            
        } else if(subcategory === "components") {
            //read the selected material, pass it as param

            let available = true;
            //todo: do an additional check if enough of selected material is available
            
            if(available) {
                //todo
                //remove material from inventory
                //add_to_character_inventory(recipe.getResult());
                return true;
            } else {
                return false;
            }
        } else if(subcategory === "equipment") {
            //read the selected components, pass them as params

            const component_1_name = recipe_div.children[1].children[0].children[1].querySelector(".selected_component")?.dataset.item_name;
            const component_1_id = recipe_div.children[1].children[0].children[1].querySelector(".selected_component")?.dataset.item_id;
            
            const component_2_name = recipe_div.children[1].children[1].children[1].querySelector(".selected_component")?.dataset.item_name;
            const component_2_id = recipe_div.children[1].children[1].children[1].querySelector(".selected_component")?.dataset.item_id;
            
            if(!component_1_id || !component_2_id) {
                return;
            } else {
                if(!character.inventory[component_1_name][component_1_id] || !character.inventory[component_2_name][component_2_id]) {
                    throw new Error(`Tried to create item with components that are not present in the inventory!`);
                } else {
                    const result = recipe.getResult(character.inventory[component_1_name][component_1_id], character.inventory[component_2_name][component_2_id]);
                    remove_from_character_inventory({item_name: component_1_name, item_id: component_1_id});
                    remove_from_character_inventory({item_name: component_2_name, item_id: component_2_id});
                    add_to_character_inventory([{item: result}]);

                    log_message(`Created ${result.getName()} [${result.quality*100}% quality]`, "crafting");

                    recipe_div.children[1].children[0].children[1].querySelector(".selected_component")?.remove();
                    recipe_div.children[1].children[1].children[1].querySelector(".selected_component")?.remove();

                    //todo: update all displayed component choices!
                }
            }
        }

        return 1; //calculate xp in some way (just base it on recipe tier?)
    }
}


export {use_recipe};