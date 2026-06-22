"use strict";

import { InventoryHaver } from "./inventory.js";

class Person extends InventoryHaver {
    constructor(data = {}){
        super(data);
        this.personal = {
            race: data.race,
            height: data.height,
            age: data.age,
        }
    }
}


export {
    Person
}