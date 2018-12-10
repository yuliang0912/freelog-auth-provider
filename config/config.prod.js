/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {

    gatewayUrl: "http://172.18.215.224:8895",

    mongoose: {
        url: "mongodb://172.18.215.229:27017/auth"
    },

    rabbitMq: {
        connOptions: {
            host: '172.18.215.231',
            port: 5672,
            login: 'prod_auth_node',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        },
    },
}