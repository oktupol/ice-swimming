/**
 * @file Webpack entry point. Pulls in the global stylesheet and the
 * behavioural modules that wire up the page once it loads.
 */

require('../css/_index.scss');
require('./site-state.js');
require('./navigation.js');
require('./footer.js');