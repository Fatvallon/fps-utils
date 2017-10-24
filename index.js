/*
//  FpsUtils revision 1.4 - Hugedong Edition
//  Check readme for this versions updates, thank.
//  Thanks: Bernkastel - PinkiePie for ideas. - and code (love, hugedong)
*/

var config = require('./config.json');
const format = require('./format.js');

const fs = require('fs');

module.exports = function FpsUtils(dispatch) {

    let DEBUG = config.debug || false;

    let player,
        cid,
        model,
        pcid,
        clss;
    let locx = [];
    let locy = [];
    let state = 0,
        lastState = 0,
        hiddenPlayers = {},
        hiddenIndividual = {};

    let flags = {
        hide: {
            tanks: false,
            healers: false,
            dps: false
        },
        fireworks: false, //these options control the settings, true will enable them upon login, flase disabled. By default all are false except TC.
        hit: false,
        damage: false,
        logo: false,
        tc: true
    };

    const classes = config.classes;

    function getClass(m) {
        return (m % 100);
    }

    function handleCommands(event) {

        let command = format.stripTags(event.message).split(' ');

        if (command[0] !== '!fps')
            return;

        lastState = state;

        if (command.length > 1) {
            let arg = command[1];

            switch (arg.toString()) {
                // Set state to 0: Disabled.
                case "0":
                    state = 0;
                    config.state = 0;
                    log('fps-utils optimization disabled by client.');
                    systemMsg('optimization disabled by user. [0]');

                    if (lastState > 2) {
                        // Display all hidden players.
                        for (let pl in hiddenPlayers) {
                            if (!hiddenIndividual[hiddenPlayers[pl].cid]) {
                                dispatch.toClient('S_SPAWN_USER', 3, hiddenPlayers[pl]);
                            }
                        }
                    }

                    break;
                    // Set state to 1: Only hide projectiles.
                case "1":
                    state = 1;
                    config.state = 1;
                    log('fps-utils optimization set to stage 1, disabling skill particles.');
                    systemMsg('optimization set to remove skill particles. [1]');

                    if (lastState > 2) {
                        // Display all hidden players. EXCEPT HIDDEN INDIVIDUALS
                        for (let pl in hiddenPlayers) {
                            if (!hiddenIndividual[hiddenPlayers[pl].cid]) {
                                dispatch.toClient('S_SPAWN_USER', 3, hiddenPlayers[pl]);
                            }
                        }
                    }

                    break;
                    // Set state to 2: Hide all skill animations.
                case "2":
                    state = 2;
                    config.state = 2;
                    log('fps-utils optimization set to stage 2, disabling skill animations.');
                    systemMsg('optimization set to remove skill animations. [2]');

                    // Spawn all players with disabled animations.
                    if (lastState > 2) {
                        for (let pl in hiddenPlayers) {
                            if (!hiddenIndividual[hiddenPlayers[pl].cid]) {
                                dispatch.toClient('S_SPAWN_USER', 3, hiddenPlayers[pl]);
                            }
                        }
                    }
                    break;
                    // Set state to 3: Hide all other players.
                case "3":
                    state = 3;
                    config.state = 3;
                    log('fps-utils optimization set to stage 3, disabling other player models.');
                    systemMsg('optimization set to remove other player models [3]');

                    if (lastState < 3) {
                        // Hide all players on screen and disable spawn.
                        for (let pl in hiddenPlayers) {
                            if (!hiddenIndividual[hiddenPlayers[pl].cid]) {
                                dispatch.toClient('S_DESPAWN_USER', 2, {
                                    target: hiddenPlayers[pl].cid,
                                    type: 1
                                });
                            }
                        }
                    }
                    break;
                    // Save configuration to file.
                case "save":
                    saveConfig();
                    break;
                    // Disable fireworks.
                case "fireworks":
                    flags.fireworks = !flags.fireworks;
                    log('fps-utils toggled fireworks: ' + flags.fireworks);
                    systemMsg(`Fireworks toggled off: ${flags.fireworks}`);
                    break;
                    //disable players attack markers
                case "hit":
                    flags.hit = !flags.hit;
                    log('fps-utils toggled player damage numbers: ' + flags.hit);
                    systemMsg(`Player damage numbers toggled off: ${flags.hit}`);
                    break;
                    //as above so below 
                case "damage":
                    flags.damage = !flags.damage;
                    log('fps-utils toggled player damage numbers: ' + flags.damage);
                    systemMsg(`Player damage numbers toggled off: ${flags.damage}`);
                    break;
                    //disable guild logos
                case "logo":
                    flags.logo = !flags.logo;
                    log('fps-utils toggled guild logos: ' + flags.logo);
                    systemMsg(`toggled guild logos off: ${flags.logo}`);
                    break;
                case "tc":
                    flags.tc = !flags.tc;
                    log('fps-utils toggled showing traverse cut: ' + flags.tc);
                    systemMsg(`toggled toggled showing traverse cut off: ${flags.tc}`);
                    break;
                    // Toggle individual classes on and off
                case "hide":
                    if (command.length < 3) {
                        log('fps-utils missing arguments for command "hide"');
                        systemMsg(`missing arguments for command "hide" [dps, healers, tanks] or [username]`);
                        break;
                    } else {
                        let arg2 = command[2];
                        if (state < 3)
                            switch (arg2.toString()) {
                                // Hide all dps classes
                                case "dps":
                                    log('fps-utils hiding dps classes');
                                    systemMsg(`hiding dps classes.`);
                                    flags.hide.dps = true;
                                    for (let pl in hiddenPlayers) {
                                        if ((!hiddenPlayers[pl].block || !hiddenIndividual[hiddenPlayers[pl].cid]) && classes.dps.indexOf(getClass(hiddenPlayers[pl].model)) > -1) {
                                            dispatch.toClient('S_DESPAWN_USER', 2, {
                                                target: hiddenPlayers[pl].cid,
                                                type: 1
                                            });
                                        }
                                    }
                                    break;
                                    // Hide all healer classes
                                case "healers":

                                    flags.hide.healers = true;
                                    for (let pl in hiddenPlayers) {
                                        if ((!hiddenPlayers[pl].block || !hiddenIndividual[hiddenPlayers[pl].cid]) && classes.healers.indexOf(getClass(hiddenPlayers[pl].model)) > -1) {
                                            dispatch.toClient('S_DESPAWN_USER', 2, {
                                                target: hiddenPlayers[pl].cid,
                                                type: 1
                                            });
                                        }
                                    }
                                    break;
                                    // Hide all tank classes
                                case "tanks":

                                    flags.hide.tanks = true;
                                    for (let pl in hiddenPlayers) {
                                        if (!hiddenIndividual[hiddenPlayers[pl].cid] && classes.tanks.indexOf(getClass(hiddenPlayers[pl].model)) > -1) {
                                            dispatch.toClient('S_DESPAWN_USER', 2, {
                                                target: hiddenPlayers[pl].cid,
                                                type: 1
                                            });
                                        }
                                    }
                                    break;
                                    // Argument is an individual name or not recognized.
                                default:
                                    for (let pl in hiddenPlayers) {
                                        if (hiddenPlayers[pl].name.toString().toLowerCase() === arg2.toString().toLowerCase()) {
                                            systemMsg(`player ${hiddenPlayers[pl].name} is added to the hiding list.`);
                                            hiddenIndividual[hiddenPlayers[pl].cid] = hiddenPlayers[pl];
                                            config.hiddenPeople.push(hiddenPlayers[pl].name.toString());
                                            dispatch.toClient('S_DESPAWN_USER', 2, {
                                                target: hiddenPlayers[pl].cid,
                                                type: 1
                                            });
                                            break;
                                        } else {
                                            continue;
                                        }
                                    }
                                    break;
                            }
                    }
                    break;

                    // Try to respawn all hidden players included in show command.
                case "show":
                    if (command.length < 3) {
                        log('fps-utils missing arguments for command "show"');
                        systemMsg(`missing arguments for command "show" [dps, healers, tanks] or [username]`);
                        break;
                    } else {
                        let arg2 = command[2];
                        if (state < 3) {
                            switch (arg2.toString()) {
                                case "dps":
                                case "healers":
                                case "tanks":
                                    if (flags.hide[arg2.toString()]) {
                                        flags.hide[arg2.toString()] = false;
                                        log('fps-utils showing: ' + arg2);
                                        systemMsg(`showing ${arg2}`);
                                        for (let pl in hiddenPlayers) {
                                            if (classes[arg2.toString()].indexOf(getClass(hiddenPlayers[pl].model)) > -1) {
                                                if (!hiddenIndividual[hiddenPlayers[pl].cid])
                                                    dispatch.toClient('S_SPAWN_USER', 3, hiddenPlayers[pl]);
                                            }
                                        }
                                    }
                                    break;
                                default:
                                    // Individuals or unkown handler.
                                    for (let pl in hiddenIndividual) {
                                        if (arg2.toString().toLowerCase() === hiddenIndividual[pl].name.toString().toLowerCase()) {
                                            systemMsg(`showing player ${hiddenIndividual[pl].name}.`);
                                            config.hiddenPeople.splice(config.hiddenPeople.indexOf(hiddenPlayers[pl].name), 1);
                                            dispatch.toClient('S_SPAWN_USER', 3, hiddenIndividual[pl]);
                                            delete hiddenIndividual[pl];
                                        }
                                    }
                                    break;
                            }
                        }
                    }
                    break;
                    // List the players in individuals list.
                case "list":
                    let hiddenArray = [];
                    for (let pl in hiddenIndividual) {
                        hiddenArray.push(hiddenIndividual[pl].name);
                    }
                    systemMsg(`Manually hidden players: ${hiddenArray}`);
                    break;
                    // Command not recognized
                default:
                    systemMsg('Command not recognized. use [!fps help] for a list of available commands');
                    break;
            }

            return false;
        } else {

            return false;
        }

    }

    function log(msg) {
        if (DEBUG) console.log('[fps-utils] ' + msg);
    }

    function systemMsg(msg) {
        dispatch.toClient('S_CHAT', 1, {
            channel: 24,
            authorID: 0,
            unk1: 0,
            gm: 0,
            unk2: 0,
            authorName: '',
            message: ' (fps-utils) ' + msg
        });
    }

    function saveConfig() {
        fs.writeFile('./config.json', config, 'utf8', (err) => {
            if (!err) log("config file overwritten successfully");
        });
    }

    dispatch.hook('S_LOGIN', 2, (event) => {
        pcid = event.cid;
        ({
            cid,
            model
        } = event);
        player = event.name;
        clss = getClass(event.model);
        state = config.state || 0;
    });

    dispatch.hook('S_LOAD_TOPO', 1, (event) => {
        // Refresh the hide list upon teleport or zone change.
        hiddenPlayers = {};
    });

    dispatch.hook('S_SPAWN_USER', 3, (event) => {

        // Add players in proximity of user to possible hide list.
        hiddenPlayers[event.cid] = event;

        // Check the state or if the individual is hidden.
        if (state === 3 || hiddenIndividual[event.cid]) {
            return false;
        }

        // Hide dps enabled, remove dps characters;
        if (flags.hide.dps && classes.dps.indexOf(getClass(event.model)) > -1) {
            return false;
        }

        // Hide tanks enabled, remove tank characters;
        if (flags.hide.tanks && classes.tanks.indexOf(getClass(event.model)) > -1) {
            return false;
        }

        // Why would you want this on, seriously...
        if (flags.hide.healers && classes.healers.indexOf(getClass(event.model)) > -1) {
            return false;
            locx[event.cid] = event.x;
            locy[event.cid] = event.y;
        }

    });

    dispatch.hook('S_DESPAWN_USER', 2, (event) => {
        delete hiddenPlayers[event.target];

        if (state === 3 || hiddenIndividual[event.target]) {
            return false;
        }
    });

    dispatch.hook('S_SPAWN_NPC', 3, (event) => {
        if (flags.fireworks) {
            if (event.huntingZoneId === 1023 && (event.templateId === 60016000 || event.templateId === 80037000))
                return false;
        }
    });
    dispatch.hook('S_EACH_SKILL_RESULT', 3, {
        order: 6969
    }, (event) => {
        if (flags.damage) {
            if (event.source === pcid) {
                event.damage = '';
                return true;
            }
        }
        if (flags.hit) {
            if (event.source === pcid) {
                event.skill = '',
                    event.type = '',
                    event.type2 = '';
                //event.model = '',
                //event.crit = ''				
                return true;
            }
        }
    });
    dispatch.hook('S_SPAWN_USER', 5, (event) => {
        if (flags.logo) {
            event.guildEmblem = '';
            return true;
        }
    });
    dispatch.hook('S_GUILD_NAME', 1, (event) => {
        if (flags.logo) {
            event.guildEmblem = '';
            return true;
        }
    });

    dispatch.hook('S_ABNORMALITY_BEGIN', 2, (event) => {
        if (flags.tc) {
            if (event.id === 101300 || event.id === 101200)
                return false;
        }
    });
    dispatch.hook('S_PARTY_MEMBER_ABNORMAL_ADD', 3, (event) => {
        if (flags.tc) {
            if (event.id === 101300 || event.id === 101200)
                return false;
        }
    });

    dispatch.hook('S_USER_LOCATION', 1, (event) => {
        // Update locations of every player in case we need to spawn them.
        hiddenPlayers[event.target].x = event.x2;
        hiddenPlayers[event.target].y = event.y2;
        hiddenPlayers[event.target].z = event.z2;
        hiddenPlayers[event.target].w = event.w;
        locx[event.target] = event.x2;
        locy[event.target] = event.y2;

        if (state > 2 || hiddenIndividual[event.target]) {
            return false;
        }
    });

    dispatch.hook('S_ACTION_STAGE', 1, (event) => {

        // If state is higher than state1 remove all skill animations.    
        if (state > 1 && (hiddenPlayers[event.source] || hiddenIndividual[event.source])) {
            return false;
        }
        if (state === 2) {
            dispatch.toClient('S_USER_LOCATION', 1, {
                target: event.source,
                x1: locx[event.source],
                y1: locy[event.source],
                z1: event.z,
                w: event.w,
                unk2: 0,
                speed: 300,
                x2: event.x,
                y2: event.y,
                z2: event.z,
                type: 0,
                unk: 0
            });
            locx[event.source] = event.x;
            locy[event.source] = event.y;
        }
    });

    dispatch.hook('S_ACTION_END', 1, (event) => {
        // If we're removing skill animations we should ignore the end packet too.
        if (state > 1 && (hiddenPlayers[event.source] || hiddenIndividual[event.source]))
            return false;
    });

    dispatch.hook('S_START_USER_PROJECTILE', 1, (event) => {
        // State 1 and higher ignores particles and projectiles so we're ignoring this.
        if (state > 0 && (hiddenPlayers[event.source] || hiddenIndividual[event.source]))
            return false;
    });

    dispatch.hook('S_SPAWN_PROJECTILE', 1, (event) => {
        // Ignore the projectile spawn if enabled in state.
        if (state > 0 && (hiddenPlayers[event.source] || hiddenIndividual[event.source]))
            return false;
    });

    dispatch.hook('C_CHAT', 1, handleCommands);

};
