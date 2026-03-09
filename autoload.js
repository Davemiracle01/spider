const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
let isAutoLoadRunning = false;

module.exports = {
  autoLoadPairs: async (options = {}) => {
    if (isAutoLoadRunning) { console.log(chalk.yellow('Auto-load already running.')); return; }
    isAutoLoadRunning = true;
    console.log(chalk.yellow('🔄 Auto-loading all paired sessions...'));
    try {
      const pairingDir = path.join(__dirname, 'richstore', 'pairing');
      try { await fs.access(pairingDir); } catch { console.log(chalk.red('No pairing directory found.')); return; }
      const files = await fs.readdir(pairingDir, { withFileTypes: true });
      const users = files.filter(d => d.isDirectory()).map(d => d.name).filter(n => /^\d+$/.test(n));
      if (!users.length) { console.log(chalk.yellow('No paired users found.')); return; }
      console.log(chalk.green(`Found ${users.length} user(s). Connecting...`));
      const startpairing = require('./pair');
      for (let i = 0; i < users.length; i++) {
        try {
          console.log(chalk.blue(`Connecting ${i+1}/${users.length}: ${users[i]}`));
          await startpairing(users[i]);
          console.log(chalk.green(`Connected: ${users[i]}`));
        } catch (e) {
          console.log(chalk.red(`Failed: ${users[i]} - ${e.message}`));
        }
        if (i < users.length - 1) await new Promise(r => setTimeout(r, 1000));
      }
      console.log(chalk.green('Auto-load complete.'));
    } catch (e) {
      console.error(chalk.red('Auto-load error:'), e);
    } finally {
      isAutoLoadRunning = false;
    }
  }
};
