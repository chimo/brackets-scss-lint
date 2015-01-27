/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, node: true */

(function () {

    "use strict";

    var exec = require("child_process").exec;

    // Run external scss-lint command
    function cmdBuild(scssFile, projectRoot, configFile, callback) {
        var configSwitch = "",
            cmd;

        if (configFile !== null) {
            configSwitch = "-c " + configFile;
        }

        // Build command
        cmd = "scss-lint -f JSON " + configSwitch + " \"" + scssFile + "\"";

        // Call external scss-lint command
        // Exit codes: https://github.com/causes/scss-lint/blob/1fcce198f9a6281952f8af4961f2655ec29e683e/lib/scss_lint/cli.rb#L13
        exec(cmd, function (error, stdout/*, stderr*/) {
            var message;

            // These error codes are okay
            if (error === null || error.code === 1 || error.code === 2) {
                callback(false, stdout);
            } else {
                switch(error.code) {
                    case 64:
                        message = "Command line usage error";
                        break;

                    case 66:
                        message = "Input file did not exist or was not readable";
                        break;

                    case 70:
                        message = "Internal software error";
                        break;

                    case 78:
                        message = "Configuration error";
                        break;

                    default:
                        message = "Unknown error";
                }

                callback(message);
            }
        });
    }

    // Register "scss" domain
    function init(domainManager) {
        if (!domainManager.hasDomain("scss")) {
            domainManager.registerDomain("scss", {major: 0, minor: 1});
        }

        domainManager.registerCommand(
            "scss",
            "build",
            cmdBuild,
            true,
            "Runs scss linter",
            ["scssFile", "projectRoot"],
            [{
                name: "result",
                type: "string",
                description: "The result of the execution"
            }]
        );
    }

    exports.init = init;
}());
