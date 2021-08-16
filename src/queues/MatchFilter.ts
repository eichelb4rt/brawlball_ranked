import Player from "../players/Player";

/**
 * Filters matches based on a set of constraints.
 */
export default class MatchFilter {
    /**
     * Constraints that decide if a match is valid.
     * Example: all players must be in 1 team.
     */
    private readonly match_constraints: ((match: Player[][]) => boolean)[];

    constructor(match_constraints: ((match: Player[][]) => boolean)[]) {
        this.match_constraints = match_constraints;
    }

    /**
     * Tests if a given match is valid or not.
     * @param match The tested match.
     * @returns true if the match is valid, false otherwise.
     */
    public test(match: Player[][]): boolean {
        for (const constraint of this.match_constraints) {
            if (!constraint(match)) {
                return false;
            }
        }
        return true;
    }
}