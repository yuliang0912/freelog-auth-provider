/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = {
    
    gatewayUrl: "http://172.18.215.224:8895",

    mongoose: {
        url: "mongodb://root:Ff233109@dds-wz9b5420c30a27941546-pub.mongodb.rds.aliyuncs.com:3717,dds-wz9b5420c30a27942267-pub.mongodb.rds.aliyuncs.com:3717/auth?replicaSet=mgset-5016983"
    },

    rabbitMq: {
        connOptions: {
            host: '172.18.215.224',
            port: 5672,
            login: 'guest',
            password: 'guest',
            authMechanism: 'AMQPLAIN'
        },
    },
}