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
        this.tags = [];
        this.is_unlocked = is_unlocked;
    }
}

class Job extends Activity {
    constructor(activity_data) {
        super(activity_data);
        this.type = "JOB";
        this.payment_type = activity_data.payment_type;
    }
}

class Training extends Activity {
    constructor(activity_data) {
        super(activity_data);
        this.type = "TRAINING";
    }
}

class Gathering extends Training {
    constructor({ name,
        description,
        action_text,
        base_skills_names,
        is_unlocked = false,
        required_tool_type,
    }) {
        super({name, description, action_text, base_skills_names, is_unlocked});
        this.type = "GATHERING";
        this.tags["gathering"] = true;
        this.required_tool_type = required_tool_type;
        //drops are defined in locations
    }
}
/*
    All 3 types of activity can yield loot.
    For trainings and jobs, it doesn't require a tool and is a small bonus on top of xp/money, plus their skills get xp every tick.
    For gatherings, tools are required and loot is the main focus, plus their skills get xp when work period is finished
*/

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

//resource gatherings
(function(){
    activities["mining"] = new Gathering({
        name: "mining",
        action_text: "Swinging the pickaxe",
        description: "Swing you pickaxe against the hard rock",
        base_skills_names: ["Mining"],
        is_unlocked: true,
        required_tool_type: "pickaxe",
    });
    activities["woodcutting"] = new Gathering({
        name: "woodcutting",
        action_text: "Gathering wood",
        description: "Chop chop",
        base_skills_names: ["Woodcutting"],
        is_unlocked: true,
        required_tool_type: "axe",
    });

    activities["herbalism"] = new Gathering({
        name: "herbalism",
        action_text: "Searching for herbs",
        description: "Look for any useful plants and mushrooms",
        base_skills_names: ["Herbalism"],
        is_unlocked: true,
        required_tool_type: "herb sickle",
    });

    activities["animal care"] = new Gathering({
        name: "animal care",
        action_text: "Tending to animals",
        description: "Take care of animals",
        base_skills_names: ["Animal handling"],
        is_unlocked: true,
    });
})();


export {activities};