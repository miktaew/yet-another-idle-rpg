import { enemy_templates } from "./enemies.js";
import { locations } from "./locations.js";

var dialogues = {};


//add them to proper locations, maybe only name of their key in dialogues

function Dialogue(dialogue_data) {
    this.name = dialogue_data.name; // displayed name, e.g. "Village elder"
    this.starting_text = typeof dialogue_data.starting_text !== "undefined"? dialogue_data.starting_text : `> Talk to the ${this.name} <`;
    this.ending_text = typeof dialogue_data.ending_text !== "undefined"? dialogue_data.ending_text : `> Go back <`;
    this.is_unlocked = typeof dialogue_data.is_unlocked !== "undefined"? dialogue_data.is_unlocked : true;
    this.is_finished = typeof dialogue_data.is_finished !== "undefined"? dialogue_data.is_finished : false; 
    //separate bool to remove dialogue option if it's finished

    this.textlines = dialogue_data.textlines;  //all the lines in dialogue
}

function Textline(textline_data) {
    this.name = textline_data.name; // option to click, don't make it too long
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
            name: "Goodmorning, elder",
            text: "Goodmorning, lad",
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["ask to leave 1", "about"]}],
            },
        }),
        "about": new Textline({
            name: "Can you tell me about yourself?",
            text: "That's a rare question, but there's nothing interesting to know. I spent my entire life here in this village.",
            is_unlocked: false,
        }),
        "ask to leave 1": new Textline({
            name: "Can I leave the village?",
            text: "Don't you know how dangerous it is outside? No, you wouldn't even make it to the nearest town.",
            is_unlocked: false,
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["prove"]}],
            },
        }),
        "prove": new Textline({
            name: "Is there any way to prove I can survive on my own?",
            text: "You're really stubborn, aren't you?... Alright. If you manage to kill all wolf rats on any of the fields, I will acknowledge your strength.",
            is_unlocked: false,
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["rats", "ask to leave 2"]}],
                locations: ["Infested field"],
            },
            locks_lines: ["ask to leave 1", "prove"],
        }),
        "ask to leave 2": new Textline({
            name: "Can I leave the village?",
            text: "We talked about this, defeat the rats and I will allow it.",
            is_unlocked: false,
        }),
        "rats": new Textline({
            name: "Are wolf rats a big issue?",
            text: `Oh yes, quite a big one. Not literally, no, though they are much larger than normal rats... 
They are a nasty vermin that's really hard to get rid of. And with their numbers they can be seriously life-threatening.`,
            is_unlocked: false,
        }),
        "cleared": new Textline({ //will be unlocked on clearing infested field combat_zone
            name: "I cleared the fields, just as you asked me to",
            text: "You... You did? Maybe I judged you too harshly... Well then, if you want to leave, I won't stop you. Still, remember to be careful.",
            is_unlocked: false,
            unlocks: {
                textlines: [{dialogue: "village elder", lines: ["ask to leave 3"]}],
                locations: ["Forest road"],
            },
        }),
        "ask to leave 3": new Textline({
            name: "Can I leave the village?",
            text: "You are strong enough, you can leave and come whenever you want.",
            is_unlocked: false,
        }),
    }
});

export {dialogues};