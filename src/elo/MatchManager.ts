import Match from "./Match";
import Player from "./Player";

export default class MatchManager {
    private static instance: MatchManager;
    public ongoingMatches: Match[];

    private constructor() {
        this.ongoingMatches = [];
    }

    public getInstance(): MatchManager {
        if (MatchManager.instance)
            return MatchManager.instance;
        return new MatchManager();
    }

    removeMatch(match: Match) {
        const index = this.ongoingMatches.indexOf(match);
        if (index > -1) {
            this.ongoingMatches.splice(index, 1);
        }
    }

    addMatch(match: Match) {
        this.ongoingMatches.push(match);
    }

    findMatch(player: Player): Match | null {
        // look for a match containing the player
        this.ongoingMatches.forEach(match => {
            // look in team A
            match.teamA.forEach(matchPlayer => {
                if (player == matchPlayer) {
                    return match;
                }
            });
            // look in team B
            match.teamB.forEach(matchPlayer => {
                if (player == matchPlayer) {
                    return match;
                }
            });
        });
        // nothing found
        return null;
    }
}