import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import sourcePackageJSON from '../package.json';

/** @type {Array<string>} */
const basisDependencies = [];
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
  '@yarnpkg/pnpify',
  'core-js',
];

const basisPackagesConfigFiles = [
  '.babelrc',
  '.editorconfig',
  '.eslintignore',
  '.gitignore',
  '.prettierrc',
  '.prettierignore',
  'tsconfig.json',
  '.eslintrc',
  'README.md',
];

let existsPackageJSON;
if (process.argv.length === 2) {
  try {
    fs.accessSync('package.json', fs.constants.F_OK);
    existsPackageJSON = true;
  } catch (err) {
    existsPackageJSON = false;
  }
}

let newProject = false;
if (process.argv.length === 3 || !existsPackageJSON) {
  newProject = true;
  if (process.argv.length === 3) {
    const dirName = process.argv[2];
    try {
      fs.mkdirSync(dirName);
      process.chdir(dirName);
      console.log(`Created directory: ${dirName}`);
    } catch (err) {
      console.error(`Error create directory "${dirName}"`, err);
      process.exit(1);
    }
  }

  try {
    execSync(`yarn init --yes`);
    console.log(`Created package.json`);
  } catch (err) {
    console.error(`Error create package.json`, err);
    process.exit(1);
  }

  try {
    execSync(`yarn set version berry`);
    console.log(`yarn version berry is set`);
  } catch (err) {
    console.error(`Error to set yarn version berry`, err);
    process.exit(1);
  }

  let yarnConf;
  try {
    yarnConf = fs.readFileSync('.yarnrc.yml').toString();
  } catch (err) {
    console.error(`.yarnrc.yml isn't found in the current directory`, err);
    process.exit(1);
  }
  try {
    fs.writeFileSync('.yarnrc.yml', `${yarnConf}enableGlobalCache: false\n`);
  } catch (err) {
    console.error(`Error write to .yarnrc.yml`, err);
    process.exit(1);
  }

  try {
    execSync(`yarn plugin import interactive-tools`);
    console.log(`Added yarn plugin interactive-tools`);
  } catch (err) {
    console.error(`Error add yarn plugin interactive-tools`, err);
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

if (newProject) {
  // Fill package.json
  targetPackageJSON.scripts = {
    start: 'node -r @babel/register src/index.js',
    outdated: 'yarn upgrade-interactive',
    build: 'babel src -d dist',
    exec: 'node dist/index.js',
  };
  if ('devDependencies' in sourcePackageJSON) {
    targetPackageJSON.devDependencies = sourcePackageJSON['devDependencies'];
  }
  if ('dependencies' in sourcePackageJSON) {
    targetPackageJSON.dependencies = sourcePackageJSON['dependencies'];
  }
  targetPackageJSON.main = 'dist/index.js';
  try {
    fs.writeFileSync('package.json', JSON.stringify(targetPackageJSON));
  } catch (err) {
    console.error(`Error write to package.json`, err);
    process.exit(1);
  }

  // Copy Yarn files/cache files to .yarn/cache
  const sourceDir = `${__dirname}/../files/cache/yarn`;
  const targetDir = '.yarn/cache';
  try {
    fs.mkdirSync(targetDir);
    console.log(`Created directory: ${targetDir}`);
  } catch (err) {
    console.error(`Error create directory: ${targetDir}`, err);
  }
  const cacheFiles = fs.readdirSync(sourceDir);
  for (let filename of cacheFiles) {
    let targetFilename = filename;
    if (targetFilename === 'gitignore') {
      targetFilename = `.${targetFilename}`;
    }
    try {
      fs.copyFileSync(
        path.join(sourceDir, filename),
        path.join(targetDir, targetFilename)
      );
    } catch (err) {
      console.error(`Error copy a Yarn cache file: ${filename}`, err);
    }
  }
  console.log('Copied Yarn cache files');

  // Copy yarn.lock
  try {
    fs.copyFileSync(
      path.resolve(`${__dirname}/../files/cache/yarn.lock`),
      'yarn.lock'
    );
    console.log('Copied yarn.lock file');
  } catch (err) {
    console.error('Error copy yarn.lock file', err);
  }

  // Install other packages
  try {
    execSync(`yarn`);
    console.log(`Other packages installed`);
  } catch (err) {
    console.error('Error install other packages', err);
    process.exit(1);
  }

  // Install Editor SDKs
  try {
    execSync(`yarn pnpify --sdk`);
    console.log(`Editor SDKs installed`);
  } catch (err) {
    console.error('Error install Editor SDKs', err);
    process.exit(1);
  }

  // Create src directory and copy index.js
  try {
    fs.mkdirSync('src');
    console.log('Created directory: src');
  } catch (err) {
    console.error(`Error create directory "src"`, err);
    process.exit(1);
  }
  try {
    fs.copyFileSync(`${__dirname}/../files/index.js`, 'src/index.js');
    console.log(`Copied JS file: src/index.js`);
  } catch (err) {
    console.error(`Error copy JS file src/index.js`, err);
    process.exit(1);
  }
} else {
  // Install packages
  /** @type {Array<string>} */
  let requiredDependencies = [];
  if (targetPackageJSON.dependencies) {
    const { dependencies } = targetPackageJSON;
    basisDependencies.forEach((dependency) => {
      if (!dependencies[dependency]) {
        requiredDependencies.push(dependency);
      }
    });
  } else {
    requiredDependencies = basisDependencies;
  }
  if (requiredDependencies.length) {
    const addDependencies = requiredDependencies.join(' ');
    try {
      execSync(`yarn add ${addDependencies}`);
      console.log(`Added dependencies: ${addDependencies}`);
    } catch (err) {
      console.error(`Error add dependencies: ${addDependencies}`, err);
      process.exit(1);
    }
  }

  /** @type {Array<string>} */
  let requiredDevDependencies = [];
  if (targetPackageJSON.devDependencies) {
    const { devDependencies } = targetPackageJSON;
    basisDevDependencies.forEach((devDependency) => {
      if (!devDependencies[devDependency]) {
        requiredDevDependencies.push(devDependency);
      }
    });
  } else {
    requiredDevDependencies = basisDevDependencies;
  }
  if (requiredDevDependencies.length) {
    const addDevDependencies = requiredDevDependencies.join(' ');
    try {
      execSync(`yarn add ${addDevDependencies} -D`);
      console.log(`Added devDependencies: ${addDevDependencies}`);
    } catch (err) {
      console.error(`Error add devDependencies: ${addDevDependencies}`, err);
      process.exit(1);
    }
  }
}

// Copy config files
const files = fs.readdirSync('.');
/** @type {Array<string>} */
const foundConfigFiles = [];
files.forEach((filename) => {
  if (basisPackagesConfigFiles.includes(filename)) {
    foundConfigFiles.push(filename);
  }
});
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
      console.error(`Error copy a config file : ${filename}`, err);
      process.exit(1);
    }
  }
}
