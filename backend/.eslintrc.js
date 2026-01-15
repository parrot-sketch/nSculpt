
module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    ignorePatterns: ['.eslintrc.js'],
    rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-restricted-imports': [
            'error',
            {
                paths: [
                    {
                        name: '@prisma/client',
                        importNames: ['PrismaClient'],
                        message: 'Please use PrismaService instead of raw PrismaClient to ensure audit context is preserved.',
                    },
                ],
            },
        ],
    },
    overrides: [
        {
            // Allow raw import ONLY in the wrapper service itself
            files: ['src/prisma/prisma.service.ts', 'src/prisma/prisma.module.ts'],
            rules: {
                'no-restricted-imports': 'off',
            },
        },
    ],
};
