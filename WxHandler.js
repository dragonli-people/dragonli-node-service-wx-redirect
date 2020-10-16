const axios = require('axios');
const jssha = require('jssha');
const authorizeUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
const generalTokenUrl = 'https://api.weixin.qq.com/cgi-bin/token';
const accessTokenUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token';
const ticketUrl = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket';
const userInfoUrl = 'https://api.weixin.qq.com/sns/userinfo';
const userSubscribeUrl = 'https://api.weixin.qq.com/cgi-bin/user/info';

function createNonceStr() {
    return Math.random().toString(36).substr(2, 15);
};

function createTimestamp() {
    return `${parseInt(Date.now() / 1000)}`;
};

function raw(args) {
    return Object.entries(args).map(v=>(v[0]=v[0].toLowerCase(),v))
        .sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join('&');
}

/*
function raw2(args) {
    var keys = Object.keys(args);
    keys = keys.sort()
    var newArgs = {};
    keys.forEach(function (key) {
        newArgs[key.toLowerCase()] = args[key];//bug:应该先转小写再sort，在微信场景
    });

    var string = '';
    for (var k in newArgs) {
        string += '&' + k + '=' + newArgs[k];
    }
    string = string.substr(1);
    return string;
};
var obj = {a:1,B:'xxx',c:555};
console.log('test',raw(obj),raw2(obj));
return;
*/

class WxHandler{

    constructor(appID,appSerect){
        this.appID = appID;
        this.appSerect = appSerect;
    }

    authUrl(host,redirectUrl,is_base=0){
        var scope = is_base && 'snsapi_base' || 'snsapi_userinfo';
        return `${authorizeUrl}?appid=${this.appID}&redirect_uri=` +
            (`${host}${redirectUrl}`)+`&response_type=code&scope=${scope}&state=STATE#wechat_redirect`;

    }

    async wxAuth(code) {
        //通过拿到的code和appID、app_serect获取返回信息
        //解析得到access_token和open_id
        var {access_token,openid} = await this.getAccessToken(code);
        console.log('access_token,openid',access_token,openid)
        //通过上一步获取的access_token和open_id获取userInfo即用户信息
        return await this.getUserInfo(access_token, openid);
    }

    async wxGeneralAuth(open_id){
        var {access_token} = await this.getGeneralToken();
        var data = await this.getUserSubscribe(access_token,open_id);
        console.log('=====wxGeneralAuth',data)
        if( !data.subscribe )return null;
        return data;
    }


    async wxTicket(){
        var {access_token} = await this.getGeneralToken();
        console.log('===access_token====',access_token);
        var {ticket} = await this.getTicket(access_token);
        console.log('===ticket====',ticket);
        return ticket
    }

    async wxSign(url){
        var ticket = await this.wxTicket();
        return this.signInfo(ticket,url);
    }

    async getGeneralToken() {
        var url = `${generalTokenUrl}?grant_type=client_credential&appid=${this.appID}&secret=${this.appSerect}`;
        var {data} = await axios.get(url);
        console.log('===getGeneralToken====',this.appID,this.appSerect,data);
        return data;
    }

    //通过拿到的code和appID、app_serect获取access_token和open_id
    async getAccessToken(code) {
        // console.log('wx code',code);
        var getAccessUrl = `${accessTokenUrl}?appid=` +
            `${this.appID}&secret=${this.appSerect}&code=${code}&grant_type=authorization_code`;
        var {data} = await axios.get(getAccessUrl);
        return data;
    }

    //通过上一步获取的access_token和open_id获取userInfo即用户信息
    async getUserInfo(access_token, open_id) {
        var getUserUrl = `${userInfoUrl}?access_token=${access_token}&openid=${open_id}&lang=zh_CN`;
        var {data} = await axios.get(getUserUrl);
        return data;
    }

    //通过上一步获取的access_token和open_id获取userInfo即用户信息
    async getUserSubscribe(access_token, open_id) {
        var getUserUrl = `${userSubscribeUrl}?access_token=${access_token}&openid=${open_id}&lang=zh_CN`;
        var {data} = await axios.get(getUserUrl);
        return data;
    }

    async getTicket(access_token){
        var getTicketUrl = `${ticketUrl}?access_token=${access_token}&type=wx_card&lang=zh_CN`;
        var {data} = await axios.get(getTicketUrl);
        return data;
    }

    /**
     * @synopsis 签名算法
     *
     * @param jsapi_ticket 用于签名的 jsapi_ticket
     * @param url 用于签名的 url ，注意必须动态获取，不能 hardcode
     *
     * @returns
     {
        jsapi_ticket: 'kqxRwT0lF4G-mWsgBWkeIrpSGV1_9vmdjLddeBJdwUtDkJcrvjhkoW8SCzE1-3j_C_BvzHI_vUsvv87S4FhQmg',
        nonceStr: '18nxm06vi4q',
        timestamp: '1602841788',
        url: 'http://http://redirect.wx.carryforward.cn/test',
        signature: 'd4cf5daea241951d7ea8d02ce3658b75949dafa0'
    }
     */
    signInfo(jsapi_ticket, url) {
        var ret = {
            jsapi_ticket,
            nonceStr: createNonceStr(),
            timestamp: createTimestamp(),
            url,
        };
        var ret1 = raw(ret);
        ret.signature = (new jssha(ret1, 'TEXT')).getHash('SHA-1', 'HEX');
        console.log('==ret',ret1,ret.signature);
        return ret;
    };
}

module.exports = WxHandler;