const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: '../.env' });

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN
};
