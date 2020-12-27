export default class Config {
	static readonly lowerBoundElo = 800;
	static readonly upperBoundElo = 3000;
	static readonly lowerBoundK = 50;
	static readonly upperBoundK = 10;
	
	static readonly publicCommandsDir = 'commands';
	static readonly secretCommandsDir = 'secret_commands';
	static readonly commandDirs = [
		Config.publicCommandsDir,
		Config.secretCommandsDir
	];
};