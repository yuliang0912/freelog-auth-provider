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
            host: 'rabbitmq-test.common',
            port: 5672,
            login: 'test_user_auth',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        },
    },

    logger: {
        level: 'ERROR'
    },
}