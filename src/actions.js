"use strict";

import { get_total_skill_level } from "./character.js";

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
        conditions = [],
        rewards = {},
        attempt_duration = 0,
        success_chances = [1,1],
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
        /*  conditional_loss - conditions not met
            random_loss - conditions (at least 1st part) were met, but didn't roll high enough on success chance
        */
        this.success_text = success_text; //text displayed on success
                                          //if action is supposed to be "impossible" for narrative purposes, just make it finish without unlocks and with text that says it failed
        
        this.required = required; //things needed to be able to make an attempt
        //{stats, skills, items_by_id: {'item_id': {count, remove_on_success?, remove_on_fail?}}, money: {Number, remove_on_success?, remove_on_fail?}}
        if(conditions.length > 2) {
            throw new Error('LocationAction cannot have more than 2 sets of conditions!');
        }
        this.conditions = conditions; 
        //things needed to succeed
        //either single set of values or two sets, one for minimum chance provided and one for maximum
        //two-set approach does not apply to items, so it only checks them for conditions[0]
        //if applicable, items get removed both on failure and or success - if action requires them, it's better to have guaranteed success
        /* 
            {
                money: {
                    number: Number, //how much money to require
                    remove: Boolean //if should be removed from inventory (false -> its kept)
                }
                stats: [
                    "stat_id": Number //required stat
                ],

                skills: [
                    "skill_id": Number //required level
                ],
                items_by_id: 
                [
                    {
                        "item_id": {
                            count: Number,
                            remove: Boolean
                    }
                ]
            }
        */
        this.check_conditions_on_finish = check_conditions_on_finish; //means an action with duration can be attempted even if conditions are not met
        this.rewards = rewards; //{unlocks, money, items,move_to}?
        this.attempt_duration = attempt_duration; //0 means instantaneous, otherwise there's a progress bar
        this.success_chances = success_chances; 
        //chances to succeed; to guarantee that multiple attempts will be needed, just make a few consecutive actions with same text
        this.is_unlocked = is_unlocked;
        this.is_finished = false; //really same as is_locked but with a more fitting name
        this.repeatable = repeatable;
        this.unlock_text = unlock_text;
    }

    /**
     * @returns {Number} the degree at which conditions are met. 0 means failure (some requirement is not met at all),
     * everything else is for calculating final success chance (based on minimal and maximal chance, with 1 meaning that it's just the maximal).
     * Items do not get fuzzy treatment, they are either all met or not.
     */
    get_conditions_status(character) {
        return this.process_conditions(this.conditions, character);
        
    }

    /**
     * @returns {Boolean} if start conditions are met
     */
    can_be_started(character) {
        return this.process_conditions([this.required], character);
    }

    /**
     * Analyzes passed conditions, returns their status (0 or 1 if 1-length array, fuzzier value if 2-length array)
     * @param {*} character 
     * @param {*} condition 
     */
    process_conditions(conditions, character) {
        let met = 1;

        if(conditions.length == 0) {
            return 1;
        }

        //check money
        if(conditions[0].money && character.money < conditions[0].money) {
            met = 0;
            return met;
        } else if(conditions[1]?.money && conditions[1].money > conditions[0].money && character.money < conditions[1].money) {
            met *= (character.money - conditions[0].money)/(conditions[1].money - conditions[0].money);
        }

        if(!met) {
            return met;
        }
        //check skills
        if(conditions[0].skills) {
            Object.keys(conditions[0].skills).forEach(skill_id => {
                if(get_total_skill_level(skill_id) < conditions[0].skills[skill_id]) {
                    met = 0;
                } else if(conditions[1]?.skills && conditions[1].skills[skill_id] > conditions[0].skills[skill_id] && get_total_skill_level(skill_id) < conditions[1].skills[skill_id]) {
                    met *= (get_total_skill_level(skill_id) - conditions[0].skills[skill_id])/(conditions[1].skills[skill_id] - conditions[0].skills[skill_id]);
                }
            });
        }

        if(!met) {
            return met;
        }
        //check items
        if(conditions[0].items_by_id) {
            Object.keys(conditions[0].items_by_id).forEach(item_id => {
                let found = false;
                //iterate through inventory, set found to true if id is present and count is enough
                Object.keys(character.inventory).forEach(item_key => {
                    if(found) {
                        return;
                    }
                    
                    const {id} = JSON.parse(item_key);
                    if(id === item_id && character.inventory[item_key].count >= conditions[0].items_by_id[item_id].count) {
                        found = true;
                    }
                });

                if(!found) {
                    met = 0;
                }
            });
        }
        if(!met) {
            return met;
        }
        //checks stats
        if(conditions[0].stats) {
            Object.keys(conditions[0].stats).forEach(stat_key => {
                if(character.stats.full[stat_key] < conditions[0].stats[stat_key]) {
                    met = 0;
                } else if(conditions[1]?.stats && conditions[1].stats[stat_key] > conditions[0].stats[stat_key] && character.stats.full[stat_key] < conditions[1].stats[stat_key]) {
                    met *= (character.stats.full[stat_key] - conditions[0].stats[stat_key])/(conditions[1].stats[stat_key] - conditions[0].stats[stat_key]);
                }
            });
        }

        return met;
    }
}

export {GameAction};