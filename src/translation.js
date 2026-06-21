"use strict";

import { global_flags } from "./main.js";

//For now, translations are only used for dialogues

const translations = {};
const default_language = "english";

const translationManager = {

    init: async(language) => {
        if(!translations[language]) {
            const module = await import(`../locales/${language}.js`);
            translations[language] = module.default[language];
            console.log(`Language '${language}' loaded!`);
        }
    },

    getText: (language, text_id) => {
        if(!translations[language]?.[text_id]) {
            //todo: try fallback to default if a different language is being used
            //will need to init the default first, if it's not loaded yet


            //otherwise:
            return "text not found, id: " + text_id;
        } else {
            if(global_flags.is_mofu_mofu_enabled) {
                const key = "mofu#" + text_id;
                return translations[language][key] || translations[language][text_id];
            } else {
                return translations[language][text_id];
            }
        }
    }
};

export { translationManager, translations };
