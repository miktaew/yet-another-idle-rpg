"use strict";

import { recipes } from "./crafting_recipes.js";

function use_recipe(event) {
    const category = event.target.parentNode.dataset.crafting_category;
    const subcategory = event.target.parentNode.dataset.crafting_subcategory;
    const recipe_id = event.target.dataset.recipe_id;

    //console.log(category, subcategory, recipe_id);
    if(!recipes[category][subcategory][recipe_id]) {
        //shouldn't be possible to reach this, but whatever
        throw new Error(`Tried to use a recipe that doesn't exist: ${category} -> ${subcategory} -> ${recipe_id}`);
    } else {
        
        const recipe = recipes[category][subcategory][recipe_id];
        let recipe_status;

        if(category === "items") {
            recipe_status = recipe.use_recipe();
        } else if(subcategory === "components") {
            //read the selected material, pass it as param


            recipe_status = recipe.use_recipe();
        } else if(subcategory === "equipment") {
            //read the selected components, pass them as params


            recipe_status = recipe.use_recipe();
        }

        

        return 1; //calculate xp in some way (just base it on recipe tier?)
    }
}


export {use_recipe};