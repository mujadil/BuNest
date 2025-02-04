"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.updateTSConfigAsync = updateTSConfigAsync;
exports.baseTSConfigName = void 0;
var _jsonFile = _interopRequireDefault(require("@expo/json-file"));
var _chalk = _interopRequireDefault(require("chalk"));
var _fs = _interopRequireDefault(require("fs"));
var Log = _interopRequireWildcard(require("../../../log"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
        return obj;
    } else {
        var newObj = {};
        if (obj != null) {
            for(var key in obj){
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {};
                    if (desc.get || desc.set) {
                        Object.defineProperty(newObj, key, desc);
                    } else {
                        newObj[key] = obj[key];
                    }
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}
var _projectTSConfig;
const baseTSConfigName = "expo/tsconfig.base";
exports.baseTSConfigName = baseTSConfigName;
async function updateTSConfigAsync({ tsConfigPath  }) {
    const shouldGenerate = !_fs.default.existsSync(tsConfigPath) || _fs.default.statSync(tsConfigPath).size === 0;
    if (shouldGenerate) {
        await _jsonFile.default.writeAsync(tsConfigPath, {
            compilerOptions: {}
        });
    }
    const projectTSConfig = _jsonFile.default.read(tsConfigPath, {
        // Some tsconfig.json files have a generated comment in the file.
        json5: true
    });
    var _compilerOptions;
    (_compilerOptions = (_projectTSConfig = projectTSConfig).compilerOptions) != null ? _compilerOptions : _projectTSConfig.compilerOptions = {};
    const modifications = [];
    // If the extends field isn't defined, set it to the expo default
    if (!projectTSConfig.extends) {
        // if (projectTSConfig.extends !== baseTSConfigName) {
        projectTSConfig.extends = baseTSConfigName;
        modifications.push([
            "extends",
            baseTSConfigName
        ]);
    }
    // If no changes, then quietly bail out
    if (!modifications.length) {
        return;
    }
    // Write changes and log out a summary of what changed
    await _jsonFile.default.writeAsync(tsConfigPath, projectTSConfig);
    // If no changes, then quietly bail out
    if (modifications.length === 0) {
        return;
    }
    Log.log();
    if (shouldGenerate) {
        Log.log(_chalk.default`{bold TypeScript}: A {cyan tsconfig.json} has been auto-generated`);
    } else {
        Log.log(_chalk.default`{bold TypeScript}: The {cyan tsconfig.json} has been updated {dim (Use EXPO_NO_TYPESCRIPT_SETUP to skip)}`);
        logModifications(modifications);
    }
    Log.log();
}
function logModifications(modifications) {
    Log.log();
    Log.log(_chalk.default`\u203A {bold Required} modifications made to the {cyan tsconfig.json}:`);
    Log.log();
    // Sort the items based on key name length
    printTable(modifications.sort((a, b)=>a[0].length - b[0].length
    ));
    Log.log();
}
function printTable(items) {
    const tableFormat = (name, msg)=>`  ${_chalk.default.bold`${name}`} is now ${_chalk.default.cyan(msg)}`
    ;
    for (const [key, value] of items){
        Log.log(tableFormat(key, value));
    }
}

//# sourceMappingURL=updateTSConfig.js.map