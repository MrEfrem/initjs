#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';
import shell from 'shelljs';
import sourcePackageJSON from '../package.json';

/** @type {Array<string>} */
const basisDependencies = ['core-js'];
const basisDevDependencies = [
  'babel-eslint',
  'eslint',
  'prettier',
  'typescript',
  '@babel/cli',
  '@babel/core',
  '@babel/preset-env',
  '@babel/register',
  '@types/node',
];

const basisPackagesConfigFiles = [
  '.babelrc',
  '.editorconfig',
  '.eslintignore',
  '.eslintrc',
  '.gitattributes',
  '.gitignore',
  '.prettierrc',
  '.prettierignore',
  'tsconfig.json',
  'README.md',
];

const ARG_OVERWRITE_CONFIG_FILES = '--overwrite-config-files';

const cliArgs = process.argv.slice(2);
let projectDir = null;
let overwriteConfigFiles = false;
for (let arg of cliArgs) {
  if (arg.slice(0, 2) === '--' || arg[0] === '-') {
    switch (arg) {
      case ARG_OVERWRITE_CONFIG_FILES:
        overwriteConfigFiles = true;
        break;
      default:
        throw new Error(`Unknown argument ${arg}`);
    }
  } else {
    if (arg.length) {
      if (projectDir) {
        throw new Error(`A project directory already is set to ${projectDir}`);
      }
      projectDir = arg;
    }
  }
}

let existsPackageJSON;
if (!projectDir) {
  try {
    fs.accessSync('package.json', fs.constants.F_OK);
    existsPackageJSON = true;
  } catch (err) {
    existsPackageJSON = false;
  }
}

let yarnMajorVersion;
let yarnMinorVersion;
let yarnPatchVersion;
try {
  const result = execSync(`yarn --version`).toString();
  const matches = result.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)/);
  if (!matches) {
    console.error(`Yarn version is incorrect: ${result}`);
    process.exit(1);
  }
  yarnMajorVersion = Number(matches[1]);
  yarnMinorVersion = Number(matches[2]);
  yarnPatchVersion = Number(matches[3]);
} catch (err) {
  console.error(`Error getting yarn version`, err);
  process.exit(1);
}

if (
  yarnMajorVersion === 1 &&
  (yarnMinorVersion < 17 || (yarnMinorVersion === 17 && yarnPatchVersion < 2))
) {
  throw new Error('Upgrade Global Yarn to the latest 1 version');
}

if (overwriteConfigFiles && projectDir) {
  throw new Error(
    `The command-line argument ${ARG_OVERWRITE_CONFIG_FILES} can be used only with an existing project`
  );
}

if (projectDir) {
  try {
    fs.mkdirSync(projectDir);
    process.chdir(projectDir);
    console.log(`Created directory: ${projectDir}`);
  } catch (err) {
    console.error(`Error creating a directory "${projectDir}"`, err);
    process.exit(1);
  }
}

if (projectDir || !existsPackageJSON) {
  try {
    execSync(`yarn init --yes`);
    console.log(`Created package.json`);
  } catch (err) {
    console.error(`Error creating package.json`, err);
    process.exit(1);
  }
}

if (yarnMajorVersion === 1 || projectDir || !existsPackageJSON) {
  // Copy Yarn files/cache/yarn/plugins files to .yarn/plugins
  try {
    shell.mkdir('-p', '.yarn');
    shell.cp('-R', `${__dirname}/../files/cache/yarn/plugins`, '.yarn/plugins');
    console.log('Copied Yarn plugins');
  } catch (err) {
    console.error('Error copy Yarn plugins', err);
  }

  // Copy Yarn files/cache/yarn/releases files to .yarn/releases
  try {
    shell.cp(
      '-R',
      `${__dirname}/../files/cache/yarn/releases`,
      '.yarn/releases'
    );
    console.log('Copied Yarn releases');
  } catch (err) {
    console.error('Error copy Yarn releases', err);
  }

  // Copy .yarnrc.yml
  try {
    fs.copyFileSync(`${__dirname}/../files/cache/yarnrc.yml`, '.yarnrc.yml');
    console.log('Copied .yarnrc.yml file');
  } catch (err) {
    console.error('Error copying .yarnrc.yml file', err);
  }
} else {
  try {
    execSync('yarn set version latest');
    execSync('yarn');
    console.log('Latest Yarn version installed');
  } catch (err) {
    console.error('Error installing latest Yarn version', err);
    process.exit(1);
  }

  try {
    execSync('yarn plugin import interactive-tools');
    console.log('Added yarn plugin interactive-tools');
  } catch (err) {
    console.error('Error adding yarn plugin interactive-tools', err);
    process.exit(1);
  }

  try {
    execSync('yarn plugin import typescript');
    console.log('Added yarn plugin typescript');
  } catch (err) {
    console.error('Error adding yarn plugin typescript', err);
    process.exit(1);
  }
}

/** @type {{ [x: string]: any }} */
let targetPackageJSON;
try {
  targetPackageJSON = JSON.parse(fs.readFileSync('package.json').toString());
} catch (err) {
  console.error(`package.json isn't found in the current directory`, err);
  process.exit(1);
}

// Fill package.json
if (!targetPackageJSON.scripts) {
  targetPackageJSON.scripts = {};
}
if (!targetPackageJSON.scripts.outdated) {
  targetPackageJSON.scripts.outdated = 'yarn upgrade-interactive';
}

if (projectDir || !existsPackageJSON) {
  targetPackageJSON.scripts.start = 'node -r @babel/register src/index.js';
  targetPackageJSON.scripts.build = 'babel src -d dist';
  targetPackageJSON.scripts.exec = 'node dist/index.js';
  targetPackageJSON.main = 'dist/index.js';

  // Copy main and dev dependencies from a source package.json
  // to a new package.json
  if ('devDependencies' in sourcePackageJSON) {
    targetPackageJSON.devDependencies = sourcePackageJSON['devDependencies'];
  }
  if ('dependencies' in sourcePackageJSON) {
    targetPackageJSON.dependencies = sourcePackageJSON['dependencies'];
  }
}

// Write content to a new package.json
try {
  fs.writeFileSync('package.json', JSON.stringify(targetPackageJSON));
} catch (err) {
  console.error('Error writing to package.json', err);
  process.exit(1);
}

if (yarnMajorVersion === 1 || projectDir || !existsPackageJSON) {
  // Copy Yarn files/cache/yarn/cache files to the globalCache config path if it's available
  // (because of copy-on-write feature by default used in MacOS APFS, ZFS, BTRFS)
  // otherwise we will use <PROJECT_DIR>/.yarn/cache
  let yarnCachePath = '.yarn/cache';
  try {
    const globalFolder = execSync('yarn config get globalFolder')
      .toString()
      .trim();
    if (globalFolder) {
      yarnCachePath = `${globalFolder}/cache`;
    } else {
      console.error(
        `yarn globaFolder config value is empty so we will use ${yarnCachePath}`
      );
    }
  } catch (err) {
    console.error('Error getting the yarn globaFolder config value', err);
    process.exit(1);
  }
  try {
    shell.mkdir('-p', yarnCachePath);
    shell.cp('-R', `${__dirname}/../files/cache/yarn/cache/*`, yarnCachePath);
    console.log(
      `Copied Yarn cache files to the cache folder: ${yarnCachePath}`
    );
  } catch (err) {
    console.error('Error copy Yarn cache files', err);
  }

  // Copy .pnp.js
  try {
    fs.copyFileSync(`${__dirname}/../files/cache/pnp.js`, '.pnp.js');
    console.log('Copied .pnp.js file');
  } catch (err) {
    console.error('Error copying .pnp.js file', err);
  }

  if (projectDir || !existsPackageJSON) {
    // Copy yarn.lock
    try {
      fs.copyFileSync(`${__dirname}/../files/cache/yarn.lock`, 'yarn.lock');
      console.log('Copied yarn.lock file');
    } catch (err) {
      console.error('Error copying yarn.lock file', err);
    }

    // Install other packages
    try {
      execSync('yarn');
      console.log(`Other packages installed`);
    } catch (err) {
      console.error('Error installing other packages', err);
      process.exit(1);
    }

    // Create src directory and copy index.js
    try {
      fs.mkdirSync('src');
      console.log('Created directory: src');
    } catch (err) {
      console.error(`Error creating directory "src"`, err);
      process.exit(1);
    }
    try {
      fs.copyFileSync(`${__dirname}/../files/index.js`, 'src/index.js');
      console.log(`Copied JS file: src/index.js`);
    } catch (err) {
      console.error(`Error copying JS file src/index.js`, err);
      process.exit(1);
    }
  }
}

if (!(projectDir || !existsPackageJSON)) {
  let actualBasisDependencies = [];
  let actualBasisDevDependencies = [];
  for (let basisDependency of basisDependencies) {
    if (targetPackageJSON.devDependencies?.[basisDependency]) {
      actualBasisDevDependencies.push(basisDependency);
    } else {
      actualBasisDependencies.push(basisDependency);
    }
  }
  for (let basisDevDependency of basisDevDependencies) {
    if (targetPackageJSON.dependencies?.[basisDevDependency]) {
      actualBasisDependencies.push(basisDevDependency);
    } else {
      actualBasisDevDependencies.push(basisDevDependency);
    }
  }

  // Install packages
  if (actualBasisDependencies.length) {
    const addDependencies = actualBasisDependencies.join(' ');
    try {
      execSync(`yarn add ${addDependencies}`);
      console.log(`Added dependencies: ${addDependencies}`);
    } catch (err) {
      console.error(`Error adding dependencies: ${addDependencies}`, err);
      process.exit(1);
    }
  }

  if (actualBasisDevDependencies.length) {
    const addDevDependencies = actualBasisDevDependencies.join(' ');
    try {
      execSync(`yarn add ${addDevDependencies} -D`);
      console.log(`Added devDependencies: ${addDevDependencies}`);
    } catch (err) {
      console.error(`Error adding devDependencies: ${addDevDependencies}`, err);
      process.exit(1);
    }
  }
}

// Copy dependensies config files
/** @type {Array<string>} */
const foundConfigFiles = [];
if (overwriteConfigFiles) {
  foundConfigFiles.push('README.md');
} else {
  const files = fs.readdirSync('.');
  files.forEach((filename) => {
    if (basisPackagesConfigFiles.includes(filename)) {
      foundConfigFiles.push(filename);
    }
  });
}
for (let filename of basisPackagesConfigFiles) {
  if (!foundConfigFiles.includes(filename)) {
    try {
      let sourceFilename = filename;
      if (sourceFilename[0] === '.') {
        sourceFilename = sourceFilename.slice(1);
      }
      fs.copyFileSync(`${__dirname}/../files/${sourceFilename}`, filename);
      console.log(`Copied a config file: ${filename}`);
    } catch (err) {
      console.error(`Error copying a config file : ${filename}`, err);
      process.exit(1);
    }
  }
}

if (yarnMajorVersion === 1 || projectDir || !existsPackageJSON) {
  // Copy Yarn files/cache/vscode files to .vscode
  try {
    shell.cp('-R', `${__dirname}/../files/cache/vscode`, '.vscode');
    console.log('Copied VSCode settings');
  } catch (err) {
    console.error('Copied VSCode settings', err);
  }
} else {
  // Install Editor SDKs
  try {
    execSync(`yarn dlx @yarnpkg/pnpify --sdk`);
    console.log(`Editor SDKs installed`);
  } catch (err) {
    console.error('Error installing Editor SDKs', err);
    process.exit(1);
  }
}
