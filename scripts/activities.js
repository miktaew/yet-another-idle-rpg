
const activities = {};

class Activity {
    constructor(activity_data) {
        this.name = activity_data.name;
        this.description = activity_data.description; //description on job
        this.action_text = activity_data.action_text; //text displayed in action div, e.g. "Working the fields"
        this.base_skills_names = activity_data.base_skills_names;
        this.is_unlocked = activity_data.is_unlocked || false;
        //skills that affect efficiency of an activity and are raised when performing it
        //some will have only 1 (e.g. "foraging", "mining") and some multiple
    }
}

class Training extends Activity {
    constructor(activity_data) {
        super(activity_data);
        this.type = "TRAINING";
    }
}

class Gathering extends Activity {
    constructor(activity_data) {
        super(activity_data);
        this.type = "GATHERING";
        //drops would be defined in Location
        //anyway, this waits for crafting to be implemented
    }
}

class Job extends Activity {
    constructor(activity_data) {
        super(activity_data);
        this.type = "JOB";
        this.payment_type = activity_data.payment_type;
    }
}

//jobs
(function(){
    activities["plowing the fields"] = new Job({
        name: "plowing the fields",
        action_text: "Working on the fields...",
        description: "It's tiring and doesn't pay much, but it's better than doing nothing",
        base_skills_names: ["Farming"],
        is_unlocked: true,
    }) 
})();


export {activities};