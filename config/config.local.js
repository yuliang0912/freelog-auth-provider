/**
 * Created by yuliang on 2017/9/4.
 */

'use strict'

module.exports = {

    gatewayUrl: 'http://api.testfreelog.com',

    middleware: ['errorHandler', 'localUserIdentity'],

    mongoose: {
        url: "mongodb://119.23.45.143:27017/auth"
    },

    // mongoose: {
    //     url: "mongodb://119.23.45.143:27018/auth"
    // },

    // rabbitMq: {
    //     connOptions: {
    //         host: '119.23.45.143',
    //         port: 5673,
    //         login: 'test_user_auth',
    //         password: 'rabbit@freelog',
    //         authMechanism: 'AMQPLAIN'
    //     },
    // },

    /**
     * 本地开发环境身份信息
     */

    localIdentity: {
        userId: 50018,
        userName: "余亮",
        nickname: "烟雨落叶",
        email: "4896819@qq.com",
        mobile: "",
        tokenSn: "86cd7c43844140f2a4101b441537728f",
        userRol: 1,
        status: 1,
        createDate: "2017-10-20T16:38:17.000Z",
        updateDate: "2017-11-01T15:53:29.000Z",
        tokenType: "jwt"
    }
}

