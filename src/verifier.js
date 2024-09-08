import { effect_templates } from "./active_effects.js";
import { item_templates } from "./items.js";

function Verify_Game_Objects() {
    let results = [0,0];
    let start_time = performance.now();
    console.log("Began verifying game objects.");
    console.log("Began verifying items.");
    for(const [key,item] of Object.entries(item_templates)){
        let has_issue = false;
        if(key !== item.id) {
            console.error(`Id mismatch: "${key}" - "${item.id}"`);
            has_issue = true;
        }
        if(item.tags.usable) {
            for(let i = 0; i < item.effects.length; i++) {
                if(!effect_templates[item.effects[i].effect]) {
                    console.error(`Effect "${item.effects[i].effect}" of item "${key}" is not defined in effect templates`);
                    has_issue = true;
                }
            }
        }
        /*
        UNNEEDED, check is already done in item creation
        if(item.components) {
            Object.values(item.components).forEach(component => {
                if(!item_templates[component]) {
                    console.error(`Component "${component}" of item "${key}" is not defined in item templates`);
                    has_issue = true;
                }
            })
        }*/


        results[0]++;
        results[1]+=has_issue;
    }
    let end_time = performance.now();
    if(results[1] > 0) {
        console.log(`Finished verifying items in: ${Math.round(10000*(end_time-start_time))/10000}s\nFound issue in ${results[1]} out of ${results[0]}`);
    } else {
        console.log(`Finished verifying items in: ${Math.round(10000*(end_time-start_time))/10000}s\nNo issues were found.`);
    }
}

export {
    Verify_Game_Objects
}