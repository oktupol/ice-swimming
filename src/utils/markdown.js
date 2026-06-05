const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

module.exports = function md(filePath) {
    return marked(fs.readFileSync(path.resolve(__dirname, filePath), 'utf8'));
};
