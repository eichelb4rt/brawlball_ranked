import Player from "../elo/Player"

export default class Match {
    public readonly teamA: Player[];
    public readonly teamB: Player[];

    constructor(teamA: Player[], teamB: Player[]) {
        this.teamA = teamA;
        this.teamB = teamB;
    }
}