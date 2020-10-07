const {Crypto} = require('dragonli-node-tools');
const WxHandler = require('./WxHandler');

/* ======== */
const crypto = require('crypto');
Crypto.cbcEncrypt = function(dataStr, key, iv) {
    let cipherChunks = [];
    let cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    cipher.setAutoPadding(true);
    cipherChunks.push(cipher.update(dataStr, 'utf8', 'base64'));
    cipherChunks.push(cipher.final('base64'));
    return cipherChunks.join('');
}

Crypto.cbcDecrypt = function(dataStr, key, iv) {
    let cipherChunks = [];
    let decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(true);
    cipherChunks.push(decipher.update(dataStr, 'base64', 'utf8'));
    cipherChunks.push(decipher.final('utf8'));
    return cipherChunks.join('');
}
/* ======== */

const wx_redirect_proxy_key = process.env.WX_REDIRECT_PROXY_KEY || '0123456789abcdef',
    wx_redirect_proxy_iv = process.env.WX_REDIRECT_PROXY_IV || 'fedcba9876543210';
const wx_redirect_proxy_host = process.env.WX_REDIRECT_PROXY_HOST || 'http://redirect.wx.carryforward.cn';

/*
console.log('http://redirect.wx.carryforward.cn/redirect?info='+encodeURIComponent(Crypto.cbcEncrypt(
    JSON.stringify({url:'http://127.0.0.1:16001/test?id=1',appId:'wx*********12b',
        secret:'adf********85218a',is_base:1}),
    wx_redirect_proxy_key,wx_redirect_proxy_iv)));
*/
var list = [],bigId = 0;
class  WxRedirectController{

    async wxRedirect(){
        list = list.filter(v=>Math.abs(Date.now()-v.time)<30*60*60*1000)
        // console.log('===info',this.paras.info);
        var time = Date.now(),info = JSON.parse( Crypto.cbcDecrypt(`${this.paras.info}`,wx_redirect_proxy_key,wx_redirect_proxy_iv) );
        var {url,appId,secret,is_base} = info;
        list.push({id: ++bigId,url,time});
        var wxHandler = new WxHandler(appId,secret);

        // console.log('loccation',this.wxHandler.authUrl(host,redirectUrl))
        this.response.writeHead(302, {'Location': wxHandler.authUrl(wx_redirect_proxy_host,`/callback?id=${bigId}`,parseInt(is_base)||0)});
        this.response.end();
    }
    async callback(){
        var {code,id} = this.paras;
        var {url} = list.find(v=>v.id===parseInt(id)) || {};
        url = url.replace(/\?$/gi,'');
        url = url.replace(/\&$/gi,'');
        url = url.indexOf('?') >= 0 ? `${url}&code=${code}` : `${url}?code=${code}`;
        // console.log('==code==','bigId:[',id,'],code:[',code,'],url:[',url,']');
        this.response.writeHead(302, {'Location': url});
        this.response.end();
        // return {code,id,url}
    }

    async test(){
        var {code,id} = this.paras;
        // console.log('==code==','code:[',code,'],id:[',id,']');
        return {code,id}
    }
}

module.exports = [

    {url:'/redirect',clz:WxRedirectController,method:'wxRedirect'},
    {url:'/callback',clz:WxRedirectController,method:'callback'},
    {url:'/test',clz:WxRedirectController,method:'test'},

];
