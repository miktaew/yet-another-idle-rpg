import { character } from "./character.js";

const ReputationManager = {

    add_reputation: ({reputation, region}) => {
        if(Number.isInteger(reputation)) {
            if(region in character.reputation) {
                character.reputation[region] += reputation;
            } else {
                throw new Error(`Tried to add reputation to "${region}", which is not a valid reputation region!`);
            }
        } else {
            throw new Error(`Tried to add "${reputation}", which is not a valid integer!`);
        }
    },


    //for future: some unlocks for reaching certain values?
}


export {ReputationManager}