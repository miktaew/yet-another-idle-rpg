//player character
const base_xp_cost = 10;
const character = {name: "Hero", titles: {}, 
                   stats: {max_health: 40, health: 40, strength: 5, agility: 5, dexterity: 5, magic: 0, attack_speed: 1, crit_rate: 0.1, crit_multiplier: 1.2, 
                           attack_power: 0, defense: 0},
                   // crit damage is a multiplier; defense should be only based on worn armor and/or skills (incl magic);
                   combat_stats: {hit_chance: 0, evasion_chance: 0, block_chance: 0}, //depend on stats of current enemy
                   full_stats: {}, //stats with bonuses from equipment and skills
                   inventory: {},
                   equipment: {head: null, torso: null, 
                               arms: null, ring: null, 
                               weapon: null, "off-hand": null,
                               legs: null, feet: null, 
                               amulet: null},
                    money: 0, 
                    xp: {current_level: 0, total_xp: 0, current_xp: 0, xp_to_next_lvl: base_xp_cost, 
                         total_xp_to_next_lvl: base_xp_cost, base_xp_cost: base_xp_cost, xp_scaling: 1.6},
                    add_xp: add_xp, get_level_bonus: get_level_bonus
                };

character.base_stats = character.stats;
character.starting_xp = character.xp;

function add_xp(xp_to_add) {
        character.xp.total_xp += xp_to_add;

        if(xp_to_add + character.xp.current_xp < character.xp.xp_to_next_lvl) { // no levelup
                character.xp.current_xp += xp_to_add;
        }
        else { //levelup
                var level_after_xp = 0;
                
                while(character.xp.total_xp >= character.xp.total_xp_to_next_lvl) {
                        level_after_xp += 1;
                        
                        character.xp.total_xp_to_next_lvl = Math.round(character.xp.base_xp_cost * (1 - character.xp.xp_scaling ** (level_after_xp + 1))/(1 - character.xp.xp_scaling));
                } //calculates lvl reached after adding xp

                var total_xp_to_previous_lvl = Math.round(character.xp.base_xp_cost * (1 - character.xp.xp_scaling ** level_after_xp)/(1 - character.xp.xp_scaling));
                //xp needed for current lvl, same formula but for n-1

                const gains = get_level_bonus(level_after_xp);

                character.xp.xp_to_next_lvl = character.xp.total_xp_to_next_lvl - total_xp_to_previous_lvl;
                character.xp.current_level = level_after_xp;
                character.xp.current_xp = character.xp.total_xp - total_xp_to_previous_lvl;		
                
                return `${character.name} is getting stronger. Reached level ${character.xp.current_level} ${gains}`;
        }
}

function get_level_bonus(level) {

        var gained_hp = 0;
        var gained_str = 0;
        var gained_agi = 0;
        var gained_dex = 0;

        for(let i = character.xp.current_level + 1; i <= level; i++) {
                if(i % 2 == 1) {
                        gained_str += Math.floor(1+(i/10));
                        gained_agi += Math.floor(1+(i/10));
                        gained_dex += Math.floor(1+(i/10));

                        character.stats.strength += Math.floor(1+(i/10));
                        character.stats.agility += Math.floor(1+(i/10));
                        character.stats.dexterity += Math.floor(1+(i/10));
                }
                gained_hp += 10 * Math.floor(1+(i/10));

                character.stats.max_health += 10 * Math.floor(1+(i/10));
                character.stats.health = character.stats.max_health;
                
        }

        var gains = `<br>HP increased by ${gained_hp}`;
        if(gained_str > 0) {
                gains += `<br>Strength increased by ${gained_str}`;
        }
        if(gained_agi > 0) {
                gains += `<br>Agility increased by ${gained_agi}`;
        }
        if(gained_dex > 0) {
                gains += `<br>Dexterity increased by ${gained_dex}`;
        }

        return gains;
}

export {character};