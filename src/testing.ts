import { TwoPlayerGame, Player, Winner } from "./Elo";
let a: Player = new Player(2800);
let b: Player = new Player(2400);
let game = new TwoPlayerGame(a, b);
game.report(Winner.PlayerB);
console.log(a.getElo(), b.getElo());
