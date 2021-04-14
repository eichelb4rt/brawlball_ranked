export default class ArgumentParser {
    private args: Argument[] = [];
    private readonly invoke_str: string
    private has_optional_arguments: boolean = false;

    constructor(invoke_str: string) {
        this.invoke_str = invoke_str;
    }

    public add_argument(arg: Argument) {
        if (!arg.optional) {    // if optional is undefined or set to true
            if (this.has_optional_arguments) {
                throw new Error("Cannot put non-optional arguments after optional arguments.");
            }
        }
        
        this.args.push(arg);
        if (arg.optional) {
            this.has_optional_arguments = true;
        }
    }

    public parse_arguments(msg_content: string): Arguments {
        const msg_args: string[] = msg_content.split(/ +/).splice(1);
        if (msg_args.length > this.args.length) {
            const unrecognised_args = msg_args.splice(this.args.length);
            throw new Error(`Unrecognised arguments: ${unrecognised_args}`);
        }
        const parsed_args: Arguments = {};
        for (let i = 0; i < this.args.length; ++i) {
            if (i > msg_args.length - 1) {
                if (this.args[i].optional) {
                    break;
                }
                throw new Error(`Argument missing: ${this.args[i].name}`);
            }
            parsed_args[this.args[i].dest] = msg_args[i];
        }

        return parsed_args;
    }

    public get usage(): string {
        const usage_line = `${this.invoke_str} ${this.args.map(arg => arg.optional? `[${arg.name}]` : arg.name).join(" ")}`;
        const argument_descriptions = this.args.map(arg => `${arg.name}:\t${arg.optional ? "(optional) ": ""}${arg.help}`).join("\n");
        return `${usage_line}\n\n${argument_descriptions}`;
    }
}

export interface Arguments {
    [index: string]: string;
}

export interface Argument {
    name: string;
    dest: string;
    optional?: boolean;
    help: string;
}