module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons'],
    },
    projects: [
        {
            displayName: 'client',
            testEnvironment: 'jsdom',
            testMatch: ['<rootDir>/tests/client/**/*.test.{ts,tsx}'],
            setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
            transform: {
                '^.+\\.(ts|tsx)$': ['@swc/jest', {
                    jsc: {
                        parser: {
                            syntax: 'typescript',
                            tsx: true,
                        },
                        transform: {
                            react: {
                                runtime: 'automatic',
                            },
                        },
                    },
                }],
            },
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/src/$1',
                '^react-native$': 'react-native-web',
                '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',
            },
        },
        {
            displayName: 'server',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/server/**/*.test.{ts,tsx}'],
            setupFilesAfterEnv: ['<rootDir>/tests/server/setup.ts'],
            transform: {
                '^.+\\.(ts|tsx)$': ['@swc/jest', {
                    jsc: {
                        parser: {
                            syntax: 'typescript',
                            tsx: false,
                        },
                    },
                }],
            },
            transformIgnorePatterns: [
                'node_modules/(?!(uuid)/)'
            ],
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/src/$1',
                '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
            },
        },
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^react-native$': 'react-native-web',
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest', {
            jsc: {
                parser: {
                    syntax: 'typescript',
                    tsx: true,
                },
                transform: {
                    react: {
                        runtime: 'automatic',
                    },
                },
            },
        }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!tests/**/*',
    ],
    testMatch: [
        '<rootDir>/tests/**/*.test.{ts,tsx}',
    ],
};
