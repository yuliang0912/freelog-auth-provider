/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = appInfo => {
    return {

        gatewayUrl: "http://172.18.215.224:8895",

        mongo: {
            uri: "mongodb://root:Ff233109@dds-wz9b5420c30a27941546-pub.mongodb.rds.aliyuncs.com:3717,dds-wz9b5420c30a27942267-pub.mongodb.rds.aliyuncs.com:3717/auth?replicaSet=mgset-5016983"
        },

        dbConfig: {
            contract: {
                client: 'mysql2',
                connection: {
                    host: 'rm-wz9wj9435a0428942.mysql.rds.aliyuncs.com',
                    user: 'freelog',
                    password: 'Ff@233109',
                    database: 'fr_contract',
                    charset: 'utf8',
                    timezone: '+08:00',
                    bigNumberStrings: true,
                    supportBigNumbers: true,
                    connectTimeout: 10000
                },
                pool: {
                    maxConnections: 50,
                    minConnections: 1,
                },
                acquireConnectionTimeout: 10000,
                debug: false
            },
        },

        rabbitMq: {
            connOptions: {
                host: '172.18.215.224',
                port: 5672,
                login: 'guest',
                password: 'guest',
                authMechanism: 'AMQPLAIN'
            },
            implOptions: {
                reconnect: true,
                reconnectBackoffTime: 10000  //10秒尝试连接一次
            },
            exchange: {
                name: 'freelog-contract-exchange',
            },
            queues: [
                {
                    name: 'auth-contract-event-receive-queue',
                    options: {autoDelete: false, durable: true},
                    routingKeys: [
                        {
                            exchange: 'freelog-event-exchange',
                            routingKey: 'event.contract.trigger'
                        },
                        {
                            exchange: 'freelog-pay-exchange',
                            routingKey: 'pay.payment.contract'
                        }
                    ]
                },
                {
                    name: 'auth-event-handle-result',
                    options: {autoDelete: false, durable: true},
                    routingKeys: [
                        {
                            exchange: 'freelog-contract-exchange',
                            routingKey: 'auth.event.handle.result.#'
                        }
                    ]
                }
            ]
        },
    }
}