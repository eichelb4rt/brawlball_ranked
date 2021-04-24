import Match, { Teams } from "../../matches/Match";
import Player from "../../players/Player";
import Pool from "../Pool";
import Team, { JoinConfig } from "../../players/Team";
import PoolSystem from "../PoolSystem";
import Role, { Roles } from "../../players/Role";
import Config from "../../Config";
import Elo, { Score } from "../../matches/Elo";

export default class Solo3v3Impl extends Pool {
    static readonly poolSystem = PoolSystem.Solo3v3;
    readonly maxPremadeSize = 1;
    readonly maxTeamSize = 3;

    private players: Player[];
    private readonly min_fairness = Number.NEGATIVE_INFINITY;

    // these constraints have to be fulfilles for a match that is generated
    private readonly match_constraints: ((match: Match) => Promise<boolean>)[] = [
        async match => {
            // check team A
            let represented_roles_A: Role[] = [];
            for (const player of match.teamA.players) {
                represented_roles_A = represented_roles_A.concat(player.roles);
            }
            if (!represented_roles_A.includes(Config.roles[Roles.Runner])) return false;
            if (!represented_roles_A.includes(Config.roles[Roles.Support]) && !represented_roles_A.includes(Config.roles[Roles.Defense])) return false;
            // check team B
            let represented_roles_B: Role[] = [];
            for (const player of match.teamB.players) {
                represented_roles_B = represented_roles_B.concat(player.roles);
            }
            if (!represented_roles_B.includes(Config.roles[Roles.Runner])) return false;
            if (!represented_roles_B.includes(Config.roles[Roles.Support]) && !represented_roles_B.includes(Config.roles[Roles.Defense])) return false;
            // both checked, we're ok
            return true;
        },
        async match => await this.evaluate(match) >= this.min_fairness, // evaluation score high enough?
    ];

    private async all_constraints_fulfilled(match: Match): Promise<boolean> {
        for (const constraint of this.match_constraints) {
            if (! await constraint(match)) return false;
        }
        return true;
    }

    constructor() {
        super();
        this.players = [];
    }

    async add(team: Team): Promise<void> {
        for (let player of team.players) {
            this.players.push(player);
        }
    }

    async remove(players: Player[]): Promise<void> {
        // should remove every team that contains the players passed as argument
        for (let player of players) {
            let index = this.players.indexOf(player);
            this.players.splice(index, 1);
        }
    }

    async *getMatches(): AsyncGenerator<Match, void, void> {
        // https://stackoverflow.com/questions/53119389/team-matchmaking-algorithm-based-on-elo/53246693
        let matched_players: Player[] = [];
        for (const players of this.make_list6()) {
            // outer fight against inner
            const team_A = new Team();
            team_A.join(players[0], JoinConfig.System);
            team_A.join(players[1], JoinConfig.System);
            team_A.join(players[2], JoinConfig.System);
            const team_B = new Team();
            team_B.join(players[3], JoinConfig.System);
            team_B.join(players[4], JoinConfig.System);
            team_B.join(players[5], JoinConfig.System);
            const match = new Match(team_A, team_B);
            // match has to fulfill constraints
            // matches shouldn't match already matched players
            if (await this.all_constraints_fulfilled(match) && !Solo3v3Impl.intersect(matched_players, match.players)) {
                yield match;
                matched_players = matched_players.concat(match.players);
                this.remove(match.players);
            }
        }
    }

    private make_list2(): Player[][] {
        // sort players (list1)
        function player_sort(player1: Player, player2: Player) {
            if (player1.elo < player2.elo) return 1;
            if (player1.elo > player2.elo) return -1;
            return 0;
        }
        this.players.sort(player_sort);

        // list2
        let list2: Player[][] = [];
        for (let i = 0; i < this.players.length - 1; ++i) {
            list2.push([this.players[i], this.players[i + 1]]);
        }
        return list2;
    }
    
    private make_list6(): Player[][] {
        let list2 = this.make_list2();
        function list2_sort_by_avg_elo(set1: Player[], set2: Player[]) {
            if (Solo3v3Impl.avg_elo(set1) < Solo3v3Impl.avg_elo(set2)) return 1;
            if (Solo3v3Impl.avg_elo(set1) > Solo3v3Impl.avg_elo(set2)) return -1;
            return 0;
        }
        list2.sort(list2_sort_by_avg_elo);

        let list6: Player[][] = [];
        while (list2.length > 3) {
            // Now search for 3 groups of 2 such that A is as close as possible to the sum of B and C. The better players from A will go with the worse players from B and C.
            const abc_groups = this.find_abc(list2);
            const group6 = [
                abc_groups[0][0],   // best player of A
                abc_groups[1][1],   // worst player of B
                abc_groups[2][1],   // worst player of C
                abc_groups[0][1],   // worst player of A
                abc_groups[1][0],   // best player of B
                abc_groups[2][0]    // best player of C
            ];
            // add it to the list
            list6.push(group6);
            // remove the matched players from list2
            for (let i = 0; i < list2.length; ++i) {
                if (Solo3v3Impl.intersect(group6, list2[i])) {
                    list2.splice(i, 1);
                }
            }
        }
        return list6;
    }

    private static intersect(set1: Player[], set2: Player[]): boolean {
        const small_set = set1.length > set2.length ? set2 : set1;
        const big_set = new Set(set1.length > set2.length ? set1 : set2);
        for (const player of small_set) {
            if (big_set.has(player)) return true;
        }
        return false;
    }

    private find_abc(list2: Player[][]): Player[][] {
        // Now search for 3 groups of 2 such that A is as close as possible to the sum of B and C. The better players from A will go with the worse players from B and C.
        const n = list2.length;
        const threshold = 0;
        if (n < 3) throw new Error("Not enough pairs of 2 to find match.");
        let min_delta = Number.POSITIVE_INFINITY;
        let min_abc: Player[][];
        for (let a = 0; a < n - 2; ++a) {   // start seaching A from the left
            for (let b = n-2; b > a; --b) { // start searching B from the right
                for (let c = n-1; c > b; --c) { // start searching C from the right
                    if (!Solo3v3Impl.intersect(list2[a], list2[b]) && !Solo3v3Impl.intersect(list2[b], list2[c]) && !Solo3v3Impl.intersect(list2[a], list2[c])) {    // A, B, C must not intersect
                        const delta = Math.abs(Solo3v3Impl.avg_elo(list2[a]) - (Solo3v3Impl.avg_elo(list2[b]) + Solo3v3Impl.avg_elo(list2[c])));
                        if (delta < min_delta) {
                            min_delta = delta;
                            min_abc = [list2[a], list2[b], list2[c]];
                        }
                        if (delta <= threshold) break;
                    }
                }
            }
        }
        return min_abc!;
    }

    static avg_elo(players: Player[]): number {
        let sum = 0;
        for (const player of players) {
            sum += player.elo;
        }
        return sum / players.length
    }

    async evaluate(match: Match) {
        // determine the actual scores
        let scoreA: Score = match.winnerToScore(match.teamA.players[0], Teams.TeamA);
        let scoreB: Score = match.winnerToScore(match.teamB.players[0], Teams.TeamB);
    
        // calculate the average elo of every team for the expected scores
        let avgEloA: number = match.teamA.averageElo();
        let avgEloB: number = match.teamB.averageElo();
    
        // start avg elo gain calc
        let elo_gain_a = 0;
        let elo_gain_b = 0;
    
        // calculate the expected scores for every player (calculated with average enemy elo) and update elo
        match.teamA.players.forEach(player => {
            // calculated as if every player in team A fought against the average of team B
            let expScore = Elo.expectedScore(player.elo, avgEloB);
            let newElo = Elo.newElo(player, scoreA, expScore);
            elo_gain_a += newElo - player.elo;
        });
        match.teamB.players.forEach(player => {
            // calculated as if every player in team B fought against the average of team A
            let expScore = Elo.expectedScore(player.elo, avgEloA);
            let newElo = Elo.newElo(player, scoreB, expScore);
            elo_gain_b += newElo - player.elo;
        });
        return - Math.abs(elo_gain_a - elo_gain_b);
    }
}