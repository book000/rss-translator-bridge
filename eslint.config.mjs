import book000Config from '@book000/eslint-config'

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...book000Config,
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', '*.js'],
  },
]
