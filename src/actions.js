"use strict";
import { process_conditions } from "./conditions.js";

class GameAction{
    /**
     * 
     * @param {Object} data
     * @param {Object} data.conditions [{stats, skills, [items_by_id: {item_id: {count, remove?}}], money: {number, remove?}}]
     */
    constructor({
        starting_text,
        action_id,
        action_name,
        description,
        action_text,
        success_text,
        failure_texts = {},
        required = {},
        display_conditions = {},
        conditions = [],
        rewards = {},
        attempt_duration = 0,
        success_chances = [1,1],
        keep_progress = false,
        is_unlocked = false,
        repeatable = false,
        check_conditions_on_finish = true,
        unlock_text,
    }) {
        this.starting_text = starting_text; //text on the button to start
        this.action_name = action_name || starting_text;
        this.action_id = action_id;
        this.description = description; //description on hover
        this.action_text = action_text; //text displayed during action animation
        this.failure_texts = failure_texts; //text displayed on failure
        if(!this.failure_texts.conditional_loss) {
            this.failure_texts.conditional_loss = [];
        }
        if(!this.failure_texts.random_loss) {
            this.failure_texts.random_loss = [];
        }
        if(!this.failure_texts.unable_to_begin) {
            this.failure_texts.unable_to_begin = [];
        }
        /*  conditional_loss - conditions are checked at the end and were not met
            random_loss - conditions (at least 1st part) were met, but didn't roll high enough on success chance
            unable_to_begin - .required are not fullfilled
        */
        this.success_text = success_text; //text displayed on success
                                          //if action is supposed to be "impossible" for narrative purposes, just make it finish without unlocks and with text that says it failed
        
        this.required = required; 
        //things needed to be able to make an attempt
        //uses similar format as conditions, but is a single object instead of an array of up to two
        //{stats, skills, items_by_id: {'item_id': {count, remove_on_success?, remove_on_fail?}}, money: {Number, remove_on_success?, remove_on_fail?}}
        if(conditions.length > 2) {
            throw new Error('LocationAction cannot have more than 2 sets of conditions!');
        }
        this.conditions = conditions; 
        //things needed to succeed, breakdown in conditions.js

        this.display_conditions = display_conditions;
        
        this.check_conditions_on_finish = check_conditions_on_finish; 
        //means an action with duration can be attempted even if conditions are not met;
        //setting it to false will check them on start instead
        this.rewards = rewards; //{unlocks, money, items,move_to}?
        this.attempt_duration = attempt_duration; //0 means instantaneous, otherwise there's a progress bar
        this.success_chances = success_chances; 
        //chances to succeed; to guarantee that multiple attempts will be needed, just make a few consecutive actions with same text
        this.keep_progress = keep_progress;
        //will make progress persist through leaving the action and through save/load; 
        //should be used only for actions that guarantee success if conditions are met, to not encourage save scumming
        this.accumulated_progress = 0;

        this.is_unlocked = is_unlocked;
        this.is_finished = false; //really same as is_locked but with a more fitting name
        this.repeatable = repeatable;
        this.completion_count = 0; //only used for repeatables
        this.unlock_text = unlock_text;
    }

    /**
     * @returns {Number} the degree at which conditions are met. 0 means failure (some requirement is not met at all),
     * everything else is for calculating final success chance (based on minimal and maximal chance, with 1 meaning that it's just the maximal).
     * Items do not get fuzzy treatment, they are either all met or not.
     */
    get_conditions_status(character) {
        return process_conditions(this.conditions, character);
    }

    /**
     * @returns {Boolean} if start conditions are met
     */
    can_be_started(character) {
        return process_conditions([this.required], character);
    }

    /**
     * 
     * @returns  {Boolean} if display conditions are met
     */
    can_be_displayed(character) {
        return process_conditions([this.display_conditions], character);
    }
}

export {GameAction};