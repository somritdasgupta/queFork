const chokidar = require('chokidar');
const { execSync } = require('child_process');

console.log('Watching for changes...');

chokidar.watch('src', {
  ignored: /(^|[\/\\])\../,
}).on('change', (path) => {
  console.log(`File ${path} changed, rebuilding...`);
  try {
    execSync('npm run build');
    console.log('Rebuild complete!');
  } catch (error) {
    console.error('Build failed:', error);
  }
});
