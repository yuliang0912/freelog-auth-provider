/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {

    cluster: {
        listen: {
            port: 5008
        }
    },

    gatewayUrl: "http://172.18.215.224:8895/test",

    mongoose: {
        url: "mongodb://172.18.215.231:27018/auth"
    },

    rabbitMq: {
        connOptions: {
            host: '172.18.215.231',
            port: 5673,
            login: 'test_user_auth',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        },
    },

    logger: {
        level: 'ERROR'
    },
}