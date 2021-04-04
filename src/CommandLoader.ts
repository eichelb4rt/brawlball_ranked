import FS from "fs";
import Path from "path";
import Config from "./Config";
import Command from "./interfaces/Command";

export default class CommandLoader {
	// makes a list including all the commands

	private commandList = [] as Command[];

	constructor() {
		Config.commandDirs.forEach(commandDir => {
			this.commandList = this.commandList.concat(CommandLoader.getCommandList(commandDir));
		});
	}

	public getCommandList(): Command[] {
		return this.commandList;
	}

	public static getCommandList(dir: string): Command[] {
		// return all the commands
		let commands: Command[] = [];
		for (const commandName of this.getCommandFiles(`./src/${dir}`)) {
			const commandClass = require(`./${dir}/${commandName}`).default;
			const command = new commandClass() as Command;
			if (command.enabled)
				commands.push(command);
		}
		return commands;
	}

	private static getCommandFiles(path: string): string[] {
		// returns names of files in the directory path
		let files: string[] = [];
		FS.readdirSync(path).forEach(file => {
			files.push(Path.parse(file).name);
		})
		return files;
	}

}