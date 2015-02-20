/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, node: true */

(function () {

    "use strict";

    var exec = require("child_process").exec,
        fs = require("fs"),
        http = require("http"),
        url = require("url");

    function lint(scssFile, callback) {
        var configSwitch = "",
            configFile = ".scss-lint.yml",
            cmd;

        fs.exists(configFile, function (exists) {
            if (exists) {
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
        });
    }

    // Run external scss-lint command
    function cmdBuild(scssFile, projectRoot, callback) {
        var cmd,
            remoteConfigFile = projectRoot + ".scss-lint.remote.yml";

        console.log("checking for remote file: " + remoteConfigFile);
        fs.exists(remoteConfigFile, function(exists) {
            if (!exists) {
                console.log("remote file doesn't exist");
                lint(scssFile, callback);
            } else {
                console.log("file exists");
                console.log("reading file...");
                fs.readFile(remoteConfigFile, function (error, address) {
                    if (error) {
                        console.log("read error....");
                        lint(scssFile, callback);
                    } else {
                        console.log("fetching remotely");
                        console.log("data: " + address.toString());

                        http
                            .get(address.toString(), function(res) {
                                console.log("get()");
                                var str = "";

                                res.on("data", function (chunk) {
                                    str += chunk;
                                });

                                res.on("end", function() {
                                    console.log("end: " + str);
                                });

                                res
                                    .pipe(fs.createWriteStream(projectRoot + ".scss-lint.yml"))
                                    .on("finish", function () {
                                        console.log("finish");
                                        lint(scssFile, callback);
                                    });
                            })
                            .on("error", function(error) {
                                console.log("http error: " + error);
                            });
                    }
                });
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
