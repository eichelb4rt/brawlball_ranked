import { Rank } from "./elo/Player";

export default class Config {
	static readonly lowerBoundElo = 800;
	static readonly upperBoundElo = 3000;

	// this is about the elo they will win/lose with an elo difference of 400
	static readonly lowerBoundKOnWin = 50;	// noobs gain a lot of elo
	static readonly upperBoundKOnWin = 10;	// pros don't gain much elo

	static readonly lowerBoundKOnLoss = 0;	// noobs lose no elo
	static readonly upperBoundKOnLoss = 40;	// prose lose much elo

	static readonly lowerBoundKOnDraw = 0;	// no elo lost or gained on draw
	static readonly upperBoundKOnDraw = 0;

	static readonly ranks: Rank[] = [
		{ name: "Tin 0", start: 200 },
		{ name: "Tin 1", start: 720 },
		{ name: "Tin 2", start: 758 },
		{ name: "Tin 3", start: 796 },
		{ name: "Tin 4", start: 834 },
		{ name: "Tin 5", start: 872 },
		{ name: "Bronze 1", start: 910 },
		{ name: "Bronze 2", start: 954 },
		{ name: "Bronze 3", start: 998 },
		{ name: "Bronze 4", start: 1042 },
		{ name: "Bronze 5", start: 1086 },
		{ name: "Silver 1", start: 1130 },
		{ name: "Silver 2", start: 1182 },
		{ name: "Silver 3", start: 1234 },
		{ name: "Silver 4", start: 1286 },
		{ name: "Silver 5", start: 1338 },
		{ name: "Gold 1", start: 1390 },
		{ name: "Gold 2", start: 1448 },
		{ name: "Gold 3", start: 1506 },
		{ name: "Gold 4", start: 1564 },
		{ name: "Gold 5", start: 1622 },
		{ name: "Platinum 1", start: 1680 },
		{ name: "Platinum 2", start: 1744 },
		{ name: "Platinum 3", start: 1808 },
		{ name: "Platinum 4", start: 1872 },
		{ name: "Platinum 5", start: 1936 },
		{ name: "Diamond", start: 2000 }
	];

	static readonly queueWaitingTime = 30;	// time interval in seconds for refreshing match function

	static readonly publicCommandsDir = 'commands';
	static readonly secretCommandsDir = 'secret_commands';
	static readonly commandDirs = [
		Config.publicCommandsDir,
		Config.secretCommandsDir
	];
}