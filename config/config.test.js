/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {

    gatewayUrl: "http://172.18.215.224:8895",

    mongoose: {
        url: "mongodb://172.18.215.230:27017/auth"
    },

    knex: {
        contract: {
            connection: {
                host: 'rm-wz9wj9435a0428942.mysql.rds.aliyuncs.com',
                user: 'freelog_test',
                password: 'Ff@233109',
                database: 'fr_contract',
            },
            debug: false
        },
    },

    rabbitMq: {
        connOptions: {
            host: '172.18.215.230',
            port: 5672,
            login: 'test_user',
            password: 'test_user_2018',
            authMechanism: 'AMQPLAIN'
        },
    }
}