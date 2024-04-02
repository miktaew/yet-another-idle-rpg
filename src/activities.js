"use strict";

const activities = {};

/*
    A bit complicated with activities defined both here and in locations, but:
    - multiple locations can have "same" activity available, though with different xp/money gains
    - activity can be overall unlocked, but not yet available in specific location
*/

class Activity {
    constructor({ name,
                  description,
                  action_text,
                  base_skills_names,
                  is_unlocked = false,
        }) 
    {
        this.name = name;
        this.description = description; //description on job
        this.action_text = action_text; //text displayed in action div, e.g. "Working the fields"
        this.base_skills_names = base_skills_names;
        //skills that affect efficiency of an activity and are raised when performing it
        //some will have only 1 (e.g. "foraging", "mining") and some multiple

        this.is_unlocked = is_unlocked;
    }
}

class Training extends Activity {
    constructor(activity_data) {
        super(activity_data);
        this.type = "TRAINING";
    }
}

/*
class Gathering extends Activity {
    constructor(activity_data) {
        super(activity_data);
        this.type = "GATHERING";
        //drops would be defined in Location
        //anyway, this waits for crafting to be implemented
    }
}
*/

class Job extends Activity {
    constructor(activity_data) {
        super(activity_data);
        this.type = "JOB";
        this.payment_type = activity_data.payment_type;
    }
}

//jobs
(function(){
    activities["fieldwork"] = new Job({
        name: "fieldwork",
        action_text: "Working on the fields",
        description: "It's tiring and doesn't pay much, but it's better than doing nothing",
        base_skills_names: ["Farming"],
        is_unlocked: true,
    });
    activities["patrolling"] = new Job({
        name: "patrolling",
        action_text: "Patrolling",
        description: "Nothing ever happens",
        base_skills_names: ["Spatial awareness"],
        is_unlocked: true,
    })
})();

//trainings
(function(){
    activities["running"] = new Training({
        name: "running",
        action_text: "Just running around",
        description: "One of the most basic exercises",
        base_skills_names: ["Running"],
        is_unlocked: true,
    });
    activities["weightlifting"] = new Training({
        name: "weightlifting",
        action_text: "Carrying heavy things",
        description: "One of the most basic exercises",
        base_skills_names: ["Weightlifting"],
        is_unlocked: true,
    });
    activities["balancing"] = new Training({
        name: "balancing",
        action_text: "Trying to keep your balance",
        description: "One of the most basic exercises",
        base_skills_names: ["Equilibrium"],
        is_unlocked: true,
    });
    activities["meditating"] = new Training({
        name: "meditating",
        action_text: "Focusing your mind",
        description: "A somewhat basic exercise",
        base_skills_names: ["Meditation"],
        is_unlocked: true,
    });
})();


export {activities};