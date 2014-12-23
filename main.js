/*global define: false, brackets: false, $: false, console: false*/
define(function (require, exports, module) {
    "use strict";

    var CodeInspection  = brackets.getModule("language/CodeInspection"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        NodeDomain      = brackets.getModule("utils/NodeDomain"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        scssDomain      = new NodeDomain("scss", ExtensionUtils.getModulePath(module, "node/ScssDomain")),
        fnmatch         = brackets.getModule("thirdparty/globmatch"),
        yaml = require("js-yaml");

    /**
     * Asynchronous linting entry point.
     *
     * @param {string} text File contents.
     * @param {string} fullPath Absolute path to the file.
     *
     * @return {$.Promise} Promise to return results of code inspection.
     */
    function handleHinterAsync(text, fullPath) {
        var projectRoot = ProjectManager.getProjectRoot().fullPath,
            def = new $.Deferred(),
            excludes,
            exclude,
            i, len,
            relFilepath = fullPath.replace(projectRoot, ""), // Path to scss file relative to project root
            configFile = projectRoot + ".scss-lint.yml",
            configContent;

        // Read the configuration file
        FileSystem.getFileForPath(configFile).read(function (error, data) {
            if (!error) {
               // Parse config file
                configContent = yaml.safeLoad(data);

                // Get the list of excluded files
                excludes = configContent.exclude;

                // Terminate if we're currently looking at an excluded file
                for (i = 0, len = excludes.length; i < len; i += 1) {
                    exclude = excludes[i];

                    if (fnmatch(relFilepath, exclude)) {
                        return def.resolve(null);
                    }
                }
            } else {
                configFile = null;
            }

            // scss-lint the file if not excluded
            scssDomain.exec("build", fullPath, projectRoot, configFile)
                .fail(function (err) {
                    console.error("[brackets-scss-lint] failed to run scss-lint", err);

                    return err;
                })
                .done(function (result) {
                    var json = JSON.parse(result),
                        filepath,
                        errors,
                        error,
                        i, len,
                        results = [],
                        severity;

                    // Get path (which happens to be the object key)
                    for (filepath in json) {
                        break;
                    }

                    if (filepath === undefined) {
                        return def.resolve(null);
                    }

                    errors = json[filepath];

                    for (i = 0, len = errors.length; i < len; i += 1) {
                        error = errors[i];
                        severity = (error.severity === "warning") ? CodeInspection.Type.WARNING : CodeInspection.Type.ERROR;

                        results.push({
                            pos: {
                                line: error.line - 1,
                                ch: error.column - 1
                            },
                            message: error.reason,
                            type: severity
                        });
                    }

                    return def.resolve({errors: results});
                });
         });

        return def.promise();
    }

    CodeInspection.register("scss", {
        name: "SCSS Lint",
        scanFileAsync: handleHinterAsync
    });

});
