import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,

    {
        files: ["**/*.js"],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",

            globals: {
                ...globals.browser,

                // Foundry core globals
                game: "readonly",
                ui: "readonly",
                Hooks: "readonly",
                CONFIG: "readonly",
                foundry: "readonly",
                fromUuid: "readonly",

                // Canvas / rendering
                canvas: "readonly",
                PIXI: "readonly",
                Roll: "readonly",

                // Documents
                Actor: "readonly",
                Item: "readonly",
                Scene: "readonly",
                TokenDocument: "readonly",
                ChatMessage: "readonly",

                // UI / apps
                Dialog: "readonly",
                Application: "readonly",
                FormApplication: "readonly",
                TextEditor: "readonly",
                Handlebars: "readonly",

                // Utilities / constants
                CONST: "readonly",
            },
        },

        rules: {
            "no-duplicate-imports": "error",
            "prefer-const": "warn",
            "no-useless-assignment": "warn",
            complexity: ["warn", 20],
            "consistent-return": "warn",
            eqeqeq: "warn",
            "no-console": ["error", { allow: ["warn", "error", "info"] }],
            "require-await": "warn",
            "no-else-return": "warn",
            "no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                destructuredArrayIgnorePattern: "^_",
                caughtErrors: "none"
            }]
        },
    },
];
