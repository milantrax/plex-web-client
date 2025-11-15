/**
 * This script installs the sass dependency that is needed
 * to compile SCSS files in the project.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing sass dependency...');

try {
  // Try using npm
  execSync('npm install --save sass', { stdio: 'inherit' });
  console.log('✅ Successfully installed sass with npm');
} catch (error) {
  try {
    // If npm fails, try using yarn
    console.log('npm failed, trying yarn...');
    execSync('yarn add sass', { stdio: 'inherit' });
    console.log('✅ Successfully installed sass with yarn');
  } catch (yarnError) {
    console.error('❌ Failed to install sass. Please manually install it with one of these commands:');
    console.log('npm install --save sass');
    console.log('-- or --');
    console.log('yarn add sass');
  }
}

// Creating a temporary .scss file to validate installation
const testScssPath = path.join(__dirname, 'test.scss');
const testCssPath = path.join(__dirname, 'test.css');

try {
  fs.writeFileSync(testScssPath, '$color: red; body { color: $color; }');
  console.log('Testing sass compilation...');
  
  try {
    execSync('npx sass --version', { stdio: 'inherit' });
    execSync(`npx sass ${testScssPath} ${testCssPath}`, { stdio: 'inherit' });
    console.log('✅ Sass compilation successful!');
  } catch (compileError) {
    console.error('❌ Sass compilation failed. This may indicate an installation issue.');
    console.error(compileError);
  }
  
  // Clean up test files
  if (fs.existsSync(testScssPath)) fs.unlinkSync(testScssPath);
  if (fs.existsSync(testCssPath)) fs.unlinkSync(testCssPath);
} catch (error) {
  console.error('Error during sass testing:', error);
}

console.log('\nIf you still see the "Cannot find module \'sass\'" error after this installation:');
console.log('1. Restart your development server');
console.log('2. Make sure to run "npm start" with the --no-cache flag the first time');
console.log('   Example: npm start -- --no-cache');
