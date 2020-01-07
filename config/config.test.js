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

    mongoose: {
        url: "mongodb://mongo-test.common:27017/auth"
    },

    rabbitMq: {
        connOptions: {
            host: '112.74.140.101',
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