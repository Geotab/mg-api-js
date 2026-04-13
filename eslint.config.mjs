import globals from "globals";

export default [{
    files: ["lib/**/*.js"],
    languageOptions: {
        ecmaVersion: 2017,
        sourceType: "commonjs",
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.es2017
        }
    }
}];
