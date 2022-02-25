import { enemy_templates } from "./enemies.js";
import { locations } from "./locations.js";
import { traders } from "./trade.js";

var dialogues = {};


//add them to proper locations, maybe only name of their key in dialogues

function Dialogue(dialogue_data) {
    this.name = dialogue_data.name; // displayed name, e.g. "Village elder"
    this.starting_text = typeof dialogue_data.starting_text !== "undefined"? dialogue_data.starting_text : `Talk to the ${this.name}`;
    this.ending_text = typeof dialogue_data.ending_text !== "undefined"? dialogue_data.ending_text : `> Go back <`;
    this.is_unlocked = typeof dialogue_data.is_unlocked !== "undefined"? dialogue_data.is_unlocked : true;
    this.is_finished = typeof dialogue_data.is_finished !== "undefined"? dialogue_data.is_finished : false; 
    //separate bool to remove dialogue option if it's finished
    this.trader = typeof dialogue_data.trader !== "undefined"? dialogue_data.trader : null;

    this.textlines = dialogue_data.textlines;  //all the lines in dialogue
}

function Textline(textline_data) {
    this.name = textline_data.name; // displayed option to click, don't make it too long
    this.text = textline_data.text; // what's shown after clicking
    this.is_unlocked = typeof textline_data.is_unlocked !== "undefined"? textline_data.is_unlocked : true;
    this.is_finished = typeof textline_data.is_finished !== "undefined"? textline_data.is_finished : false;

    if(typeof textline_data.unlocks !== "undefined") { 
        this.unlocks = textline_data.unlocks;
        this.unlocks.textlines = typeof textline_data.unlocks.textlines !== "undefined"? textline_data.unlocks.textlines : [];
        this.unlocks.locations = typeof textline_data.unlocks.locations !== "undefined"? textline_data.unlocks.locations : [];
    }
    else {
        this.unlocks = {textlines: [], locations: []};
    }

    this.locks_lines = typeof textline_data.locks_lines !== "undefined"? textline_data.locks_lines : {}; 
    //related text lines that get locked; might be itself, might be some previous line 
    //e.g. line finishing quest would also lock line like "remind me what I was supposed to do"
    //should be alright if it's limited only to lines in same Dialogue
    //just make sure there won't be Dialogues with ALL lines unavailable
}

dialogues["village elder"] = new Dialogue({
    name: "village elder",
    textlines: {
        "hello": new Textline({ //i guess it's the best way to have easy access later on
            name: "Hello?",
            text: "Hello. Glad to see you got better",
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["what happened", "about"]}],
            },
            locks_lines: ["hello"],
        }),
        "about": new Textline({
            name: "Who are you?",
            text: "I'm the unofficial leader of this village. If you have any questions, come to me",
            is_unlocked: false,
            locks_lines: ["about"]
        }),
        "what happened": new Textline({
            name: "I don't remember how I got here, what happened?",
            text: "Some of our people found you unconscious in the forest, with nothing but pants. Must have been bandits.",
            is_unlocked: false,
            locks_lines: ["what happened"],
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["ask to leave 1"]}],
            },
        }),

        "ask to leave 1": new Textline({
            name: "Can I leave the village?",
            text: "It's dangerous and you are still too weak to leave. Do you plan on getting ambushed again?",
            is_unlocked: false,
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["need to"]}],
            },
            locks_lines: ["ask to leave 1"],
        }),
        "need to": new Textline({
            name: "But I need to leave",
            text: `What you need is to recover. Well, you know what? Killing a few wolf rats could be a good exercise. 
You could help us clear some field of them, how about that?`,
            is_unlocked: false,
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["rats", "ask to leave 2", "equipment"]}],
                locations: ["Infested field"],
            },
            locks_lines: ["need to"],
        }),
        "equipment": new Textline({
            name: "How do I get some better clothes and weapon?",
            text: `We don't have anything to spare, but you can talk with our trader. He should be somewhere nearby. 
If you need money, try selling him some rat remains. Fangs, tails or pelts, he will buy them all. I have no idea what he does with this stuff...`,
            is_unlocked: false,
            locks_lines: ["equipment"],
        }),
        "ask to leave 2": new Textline({
            name: "Can I leave the village?",
            text: "We talked about this, you are still too weak",
            is_unlocked: false,
        }),
        "rats": new Textline({
            name: "Are wolf rats a big issue?",
            text: `Oh yes, quite a big one. Not literally, no, though they are much larger than normal rats... 
They are a nasty vermin that's really hard to get rid of. And with their numbers they can be seriously life-threatening. 
Only in a group though, single wolf rat is not much of a threat`,
            is_unlocked: false,
        }),
        "cleared field": new Textline({ //will be unlocked on clearing infested field combat_zone
            name: "I cleared the field, just as you asked me to",
            text: `You did? That's good. How about a stronger target? Nearby cave is just full of this vermin. 
Don't worry, a few people will stay a bit behind you and will help you escape if needed`,
            is_unlocked: false,
            unlocks: {
                locations: ["Nearby cave"],
            },
            locks_lines: ["ask to leave 2", "rats", "cleared field"],
        }),
        "cleared cave": new Textline({
            name: "I cleared the cave. Most of it, at least",
            text: `That's wonderful! I can't claim you are "too weak" anymore, can I? You can leave whenever you want, just be careful.`,
            is_unlocked: false,
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["ask to leave 3"]}],
                locations: ["Forest road"],
            },
            locks_lines: ["ask to leave 2", "rats", "cleared cave"],
        }),
        "ask to leave 3": new Textline({
            name: "Can I leave the village?",
            text: "You are strong enough, you can leave and come whenever you want.",
            is_unlocked: false,
        }),
    }
});

dialogues["village trader"] = new Dialogue({
    name: "trader",
    textlines: {
        "wares": new Textline({
            name: "You've got anything interesting?",
            text: "Come and take a look"
        })
    },
    trader: "village trader",
});

export {dialogues};