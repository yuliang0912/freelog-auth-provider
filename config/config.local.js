/**
 * Created by yuliang on 2017/9/4.
 */

'use strict'

module.exports = {

    //gatewayUrl: 'http://api.testfreelog.com',

    //middleware: ['errorHandler', 'localUserIdentity'],

    mongoose: {
        url: "mongodb://39.108.77.211:30772/auth"
    },

    // rabbitMq: {
    //     connOptions: {
    //         host: '112.74.140.101',
    //         port: 5673,
    //         login: 'test_user_auth',
    //         password: 'rabbit@freelog',
    //         authMechanism: 'AMQPLAIN'
    //     },
    // },

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

