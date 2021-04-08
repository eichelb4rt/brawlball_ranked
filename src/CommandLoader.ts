import FS from "fs";
import Path from "path";
import Config from "./Config";
import Command from "./interfaces/Command";
import UPath from "upath";
import PublicCommand from "./interfaces/PublicCommand";

export default class CommandLoader {
	// makes a list including all the commands

	private commandList = [] as Command[];
	private categories: Category[];

	constructor() {
		Config.commandDirs.forEach(commandDir => {
			this.commandList = this.commandList.concat(CommandLoader.getCommandList(commandDir));
		});
		this.categories = CommandLoader.getCategories(Config.publicCommandsDir);
	}

	public getCommandList(): Command[] {
		return this.commandList;
	}

	public static getCommandList(dir: string): Command[] {
		// return all the commands
		let commands: Command[] = [];
		for (const path_to_command of this.getCommandFiles("src", dir)) {
			const command_class = require(path_to_command).default;
			const command = new command_class() as Command;
			if (command.enabled)
				commands.push(command);
		}
		return commands;
	}

	private static getCommandFiles(offset: string, start_dir: string, relative_dir: string = "."): string[] {
		// returns names of files in the directory path (recursive)
		const path_from_start = Path.join(start_dir, relative_dir);
		const path_from_offset = Path.join(offset, path_from_start);
		let files: string[] = [];
		for (const file of FS.readdirSync(path_from_offset)) {
			const file_path_from_offset: string = Path.join(path_from_offset, file);
			const file_name = Path.parse(file).name;
			const file_path_relative: string = Path.join(relative_dir, file_name);	// without extension - this is ok because we use it for directories and want the .ts cut off
			if (FS.statSync(file_path_from_offset).isDirectory()) {
				files = files.concat(this.getCommandFiles(offset, start_dir, file_path_relative));
			} else {
				files.push(`./${UPath.toUnix(Path.join(start_dir, file_path_relative))}`);
			}
		}
		return files;
	}

	public getCategories(): Category[] {
		return this.categories;
	}

	public static getCategories(dir: string): Category[] {
		let categories: Category[] = [];
		const category_dirs = this.getCategoryDirectories(Path.join("src", dir));
		for (const category_dir of category_dirs) {
			let commands: PublicCommand[] = [];
			for (const path_to_command of this.getCommandFiles("src", dir, category_dir)) {
				const command_class = require(path_to_command).default;
				const command = new command_class() as PublicCommand;
				if (command.enabled)
					commands.push(command);
			}
			categories.push(new Category(category_dir, commands));
		}
		return categories;
	}

	private static getCategoryDirectories(dir: string): string[] {
		let categories: string[] = [];
		for (const file of FS.readdirSync(dir)) {
			const file_path = Path.join(dir, file);
			if (FS.statSync(file_path).isDirectory()) {
				const file_name = Path.parse(file_path).name;
				categories.push(file_name);
			}
		}
		return categories;
	}
}

export class Category {
	public name: string;
	public commands: PublicCommand[];

	constructor(name: string, commands: PublicCommand[]) {
		this.name = name;
		this.commands = commands;
	}
}