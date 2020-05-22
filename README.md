# JS skeleton

## Using

### Yarn 2 (berry)

```bash
yarn dlx @efrem/initjs [<project name>] [--overwrite-config-files]
```

### Npm

```bash
npx @efrem/initjs [<project name>] [--overwrite-config-files]
```

- `<project name>` is optional. If it isn't set then:

  1. If a current directory contains existing Yarn project (contains `package.json` and `yarn.lock`; NPM projects aren't supported) then:

     - If a project is `Yarn 1` then it will be upgraded to `Yarn 2`.

     - If a project already is `Yarn 2` then it will be adjusted.

  2. If `package.json` isn't found in a current directory then a new `Yarn 2` project will be created.

- `--overwrite-config-files` is optional and will enforce overwriting of all dependencies config files (`.babelrc`, `.eslintrc`, `.gitignore` etc.)

## VSCode

- Setup (<https://yarnpkg.com/advanced/editor-sdks#vscode>)

  - Open this project directly otherwise you should add to VSCode Workspace `settings.json`:

  ```json
  "typescript.tsdk": "<current directory name>/.vscode/pnpify/typescript/lib"
  ```

  - Press ctrl+shift+p in a TypeScript file
  - Choose "Select TypeScript Version"
  - Pick "Use Workspace Version"
