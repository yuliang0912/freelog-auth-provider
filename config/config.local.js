/**
 * Created by yuliang on 2017/9/4.
 */

'use strict'

module.exports = appInfo => {
    return {

        middleware: ['errorHandler', 'localUserIdentity'],

        /**
         * 本地开发环境身份信息
         */

        localIdentity: {
            userId: 10026,
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
        },

        // gatewayUrl: "http://119.23.63.19:8895/test",
        //
        // mongoose: {
        //     url: "mongodb://119.23.63.19:27017/auth"
        // },

        //
        // gatewayUrl: "https://api.freelog.com",
        //
        // mongoose: {
        //     url: "mongodb://root:Ff233109@dds-wz9b5420c30a27941546-pub.mongodb.rds.aliyuncs.com:3717,dds-wz9b5420c30a27942267-pub.mongodb.rds.aliyuncs.com:3717/auth?replicaSet=mgset-5016983"
        // },
        //
        // knex: {
        //     contract: {
        //         connection: {
        //             host: 'rm-wz9wj9435a04289421o.mysql.rds.aliyuncs.com',
        //             user: 'freelog',
        //             password: 'Ff@233109',
        //             database: 'fr_contract',
        //         },
        //         debug: false
        //     },
        // },
        //
        // rabbitMq: {
        //     connOptions: {
        //         host: '39.108.77.211',
        //         port: 5672,
        //         login: 'guest',
        //         password: 'guest',
        //         authMechanism: 'AMQPLAIN'
        //     },
        // },
    }
}

