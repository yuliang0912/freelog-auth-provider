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
        url: "mongodb://172.18.215.229:27017/auth"
    },

    rabbitMq: {
        connOptions: {
            host: '172.18.215.229',
            port: 5672,
            login: 'test_user_auth',
            password: 'test_user_2018',
            authMechanism: 'AMQPLAIN'
        },
    },

    logger: {
        level: 'ERROR'
    },
}