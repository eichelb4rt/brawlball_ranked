import FS from "fs";
import Path from "path";
import UPath from "upath";
import Test from "./interfaces/Test";

run_tests();

async function run_tests() {
    let test_count = 0;
    let passed_count = 0;
    for (const test of getTests("tests")) {
        const result = await test.run();
        console.log(`${test.name}: ${result ? "✅ passed" : "🚫 failed"}`);
        ++test_count;
        if (result) ++passed_count;
    }
    console.log(`\nEnd Result: ${passed_count}/${test_count} passed.`);
}

function getTests(dir: string): Test[] {
    // return all the commands
    let commands: Test[] = [];
    for (const path_to_test of getFiles("src", dir)) {
        const test_class = require(path_to_test).default;
        const test = new test_class() as Test;
        if (test.enabled)
            commands.push(test);
    }
    return commands;
}

function getFiles(offset: string, start_dir: string, relative_dir: string = "."): string[] {
    // returns names of files in the directory path (recursive)
    const path_from_start = Path.join(start_dir, relative_dir);
    const path_from_offset = Path.join(offset, path_from_start);
    let files: string[] = [];
    for (const file of FS.readdirSync(path_from_offset)) {
        const file_path_from_offset: string = Path.join(path_from_offset, file);
        const file_name = Path.parse(file).name;
        const file_path_relative: string = Path.join(relative_dir, file_name);	// without extension - this is ok because we use it for directories and want the .ts cut off
        if (FS.statSync(file_path_from_offset).isDirectory()) {
            files = files.concat(getFiles(offset, start_dir, file_path_relative));
        } else {
            files.push(`./${UPath.toUnix(Path.join(start_dir, file_path_relative))}`);
        }
    }
    return files;
}