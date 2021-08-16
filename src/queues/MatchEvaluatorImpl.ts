import Player from "../players/Player";
import MatchEvaluator from "./MatchEvaluator";

export default class MatchEvaluatorPaperImpl implements MatchEvaluator {
    private readonly P: number; // p parameter for team matchmaking algorithm
    private readonly Q: number; // q parameter for team matchmaking
    private readonly ALPHA: number;  // alpha parameter for team matchmaking

    constructor(P: number, Q: number, ALPHA: number) {
        this.P = P;
        this.Q = Q;
        this.ALPHA = ALPHA;
    }

    quality(match: Player[][] | undefined): number {
        if (match === undefined) {
            return Number.NEGATIVE_INFINITY;
        }
        return -this.imbalance_function(match);
    }

    heap_order(match_1: Player[][] | undefined, match_2: Player[][] | undefined): number {
        let score_1 = this.quality(match_1);
        let score_2 = this.quality(match_2);
        if (score_1 > score_2) return -1;
        if (score_1 < score_2) return 1;
        return 0;
    }

    private imbalance_function(match: Player[][]): number {
        return this.ALPHA * this.skill_difference(match[0], match[1]) + this.uniformity(match);
    }

    private skill_difference(team_a: Player[], team_b: Player[]): number {
        return Math.abs(this.team_skill(team_a) - this.team_skill(team_b));
    }

    private team_skill(players: Player[]): number {
        let sum = 0;
        for (const player of players) {
            sum += Math.pow(player.elo, this.P);
        }
        return Math.pow(sum, 1 / this.P);
    }

    private uniformity(match: Player[][]): number {
        let players: Player[] = match[0].concat(match[1]);
        const mean = this.mean_skill(players);
        let sum = 0;
        for (const player of players) {
            sum += Math.pow(Math.abs(player.elo - mean), this.Q);
        }
        return Math.pow(sum / players.length, 1 / this.Q);
    }

    private mean_skill(players: Player[]): number {
        let sum = 0;
        for (const player of players) {
            sum += player.elo;
        }
        return sum / players.length;
    }
}