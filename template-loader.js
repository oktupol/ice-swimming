// Evaluates <%= expr %> interpolation in HTML partials so nested require() calls
// (e.g. including _nav.html from within a header partial) are resolved by webpack.
module.exports = function (source) {
    const parts = source.split(/<%=([\s\S]+?)%>/g);
    let code = 'var __output = "";\n';
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            code += '__output += ' + JSON.stringify(parts[i]) + ';\n';
        } else {
            code += '__output += (' + parts[i].trim() + ');\n';
        }
    }
    code += 'module.exports = __output;\n';
    return code;
};
