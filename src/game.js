const Player = require('./player.js')
const GameStates = require('./game_states.js')
const PlayerColours = require('./player_colours.js')

class Game {
    constructor (voiceChannel, textChannel, manager) {
        this.manager = manager
        this.syncId = Math.random().toString(36).substring(2, 8).toUpperCase()
        this.voiceChannel = voiceChannel
        this.textChannel = textChannel
        this.gameStage = GameStates.LOBBY
        this.players = []

        voiceChannel.members.forEach(element => {
            this.addPlayer(element, this.generateColour());
        });
    }

    addPlayer(member, colour) {
        const player = new Player(member, colour)
        this.players.push(player)

        this.updatePlayerBase();
        this.updatePlayerMute(player);

        return player
    }

    removePlayer(member) {
        const player = this.getPlayer(member)
        this.players.splice(this.players.indexOf(player), 1)

        this.updatePlayerBase()
        this.updatePlayerMute(player)

        if (this.players.length === 0) {
            this.textChannel.send(`The game in **${this.voiceChannel.name}** has ended because there were no players left.`)
            this.manager.endGame(this.syncId)
        }
    }

    getPlayer(member) {
        return this.players.find(p => p.member.user.id === member.user.id) || null;
    }

    generateColour() {
        let return_value = '';

        while(return_value == ''){
            Object.keys(PlayerColours).forEach(key => {
                if (!this.colourExists(PlayerColours[key])) {
                    return_value = PlayerColours[key];
                    return PlayerColours[key];
                }
            });
        }
        
        return return_value;
    }

    colourExists(colour) {
        let return_value = false;
        this.players.forEach(element => {
            if(element.colour == colour){
                return_value = true;
            }
        });

        return return_value;
    }

    setStage(stage) {
        this.gameStage = stage;

        if (stage.toLowerCase() === GameStates.LOBBY) this.setAll(true)
        this.updatePlayerMute();
    }

    setAll(alive) {
        for (const player of this.players) {
            player.setState(alive)
        }
    }

    updatePlayerBase() {
        // Send Socket to room.
        var secure_custom_game_obj = {
            players: this.players,
            syncId: this.syncId,
            gameStage: this.gameStage,
            name: this.voiceChannel.name
        }

        this.manager.io.emit('updateGame', secure_custom_game_obj);
    }

    updatePlayerMute() {
        this.players.forEach(element => {
            if(this.gameStage == 'lobby'){
                element.member.voice.setMute(false);
                element.member.voice.setDeaf(false);

                console.log('Gamestage - Lobby: Unmuting Member');
            }else if(this.gameStage == 'discussion'){
                element.member.voice.setDeaf(false);

                console.log('Gamestage - Discussion: Managing');
                if(element.alive) {
                    element.member.voice.setMute(false);
                }else{
                    element.member.voice.setMute(true);
                }

            }else if(this.gameStage == 'tasks'){ 
                console.log('Gamestage - Tasks: Muting');

                element.member.voice.setMute(element.alive);
                element.member.voice.setDeaf(element.alive);
            }else{
                element.member.voice.setMute(false);
                element.member.voice.setDeaf(false);

                console.error('invalid gamestage');
            }
        });
    }

    kill(player_colour) {
        console.log("Oh no...");

        this.players.forEach(element => {
            if(element.colour == player_colour){
                element.alive = false;

                this.updatePlayerMute();
                this.updatePlayerBase();
            }
        });
    }

    revive(player_colour) {
        console.log("DPS Mercy has arived...");

        this.players.forEach(element => {
            if(element.colour == player_colour){
                element.alive = true;

                this.updatePlayerMute();
                this.updatePlayerBase();
            }
        });
    }
}

module.exports = Game