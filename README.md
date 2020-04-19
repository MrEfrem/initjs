# JS skeleton

## Using

### Yarn 2 (berry)

```bash
yarn dlx @efrem/initjs [<project name>] [--enable-global-cache]
```

### Npm

```bash
npx @efrem/initjs [<project name>] [--enable-global-cache]
```

- `<project name>` is optional. If it isn't set then:

  1. If a current directory contains existing Yarn project (contains `package.json` and `yarn.lock`) then it will be adjusted (NPM projects aren't supported).
  2. If `package.json` isn't found in a current directory then a new `Yarn 2` project will be created.

- `--enable-global-cache` is optional and will act only in a new `Yarn 2` project.

## VSCode

- Setup (<https://yarnpkg.com/advanced/editor-sdks#vscode>)

  - Open this project directly otherwise you should add to VSCode Workspace `settings.json`:

  ```json
  "typescript.tsdk": "<current directory name>/.vscode/pnpify/typescript/lib"
  ```

  - Press ctrl+shift+p in a TypeScript file
  - Choose "Select TypeScript Version"
  - Pick "Use Workspace Version"
