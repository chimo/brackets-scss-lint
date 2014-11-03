/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, node: true */

(function () {

    "use strict";

    var exec = require("child_process").exec,
        fs   = require("fs"),
        os   = require("os");

    // Run external scss-lint command
    function cmdBuild(scssFile, projectRoot, configFile, callback) {

        var tmpdir          = os.tmpdir() + "/scss-lint",
            logfile         = projectRoot + "~scss-lint.tmp",
            configSwitch    = "",
            cmd;

        // The scss-lint gem ( https://rubygems.org/gems/scss-lint ) operates
        // on directories, so we copy the contents of the current file to
        // "scss-lint/tmp.scss" in the OS's temporary directory...

        // Create tmp dir if it doesn't exist
        if (!fs.existsSync(tmpdir)) {
            fs.mkdir(tmpdir);
        }

        if (configFile !== null) {
            configSwitch = "-c " + configFile;
        }

        // Copy file in there
        // FIXME: error handling
        fs.createReadStream(scssFile).pipe(fs.createWriteStream(tmpdir + "/tmp.scss"));

        // Build command
        cmd = "scss-lint -f JSON " + configSwitch + " " + tmpdir + " > " + logfile;

        // Call external scss-lint command
        exec(cmd, function () {
            fs.readFile(logfile, function (error, data) {
                // After we're done, delete tmp file
                fs.unlink(logfile);

                // Pass data to callback
                callback(error, data.toString());
            });
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
