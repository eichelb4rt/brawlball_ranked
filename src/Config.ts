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
	
	static readonly publicCommandsDir = 'commands';
	static readonly secretCommandsDir = 'secret_commands';
	static readonly commandDirs = [
		Config.publicCommandsDir,
		Config.secretCommandsDir
	];
}