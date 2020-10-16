const {AppWithExpress} = require('dragonli-node-service-core');
const {AppConfig} = require('dragonli-node-general-service-core');

const WxRedirectController = require('./WxRedirectController');

const config = new AppConfig();
const port = process.env.HTTP_PORT || 16001;
config.setViewFolder('views');
config.setPort(port);
config.addRoutesConfig(WxRedirectController);

(new AppWithExpress()).start(config);
