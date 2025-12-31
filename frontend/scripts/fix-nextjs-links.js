#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', 'node_modules', 'next');

// Create server directory if it doesn't exist
const serverDir = path.join(nextDir, 'server');
if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true });
}

// Create server/lib directory if it doesn't exist
const serverLibDir = path.join(serverDir, 'lib');
if (!fs.existsSync(serverLibDir)) {
  fs.mkdirSync(serverLibDir, { recursive: true });
}

// Create symlinks
const symlinks = [
  {
    target: path.join(nextDir, 'dist', 'server', 'require-hook.js'),
    link: path.join(serverDir, 'require-hook.js')
  },
  {
    target: path.join(nextDir, 'dist', 'server', 'lib', 'utils.js'),
    link: path.join(serverLibDir, 'utils.js')
  }
];

symlinks.forEach(({ target, link }) => {
  if (fs.existsSync(target)) {
    // Remove existing link/file if it exists
    if (fs.existsSync(link)) {
      fs.unlinkSync(link);
    }
    // Create symlink
    fs.symlinkSync(path.relative(path.dirname(link), target), link);
    console.log(`✓ Created symlink: ${link} -> ${target}`);
  } else {
    console.warn(`⚠ Target not found: ${target}`);
  }
});

console.log('✓ Next.js symlinks fixed!');
