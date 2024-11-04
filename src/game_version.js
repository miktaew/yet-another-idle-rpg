"use strict";

const game_version = "v0.4.4h";

function get_game_version() {
    return game_version;
}

const v = document.getElementsByClassName("game_version");
    for(let i = 0; i < v.length; i++) {
        v[i].innerHTML = game_version;
    }

export { game_version, get_game_version }