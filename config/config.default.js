'use strict';

const fs = require('fs')

module.exports = appInfo => {

    const config = {
        keys: '20ab72d9397ff78c5058a106c635f008',

        i18n: {
            enable: false
        },

        /**
         * 关闭安全防护
         */
        security: {
            xframe: {
                enable: false,
            },
            csrf: {
                enable: false,
            }
        },

        ua: {
            enable: true
        },

        bodyParser: {
            enable: true,
        },

        middleware: ['errorHandler', 'identiyAuthentication'],

        /**
         * DB-mysql相关配置
         */
        dbConfig: {
            contract: {
                client: 'mysql2',
                connection: {
                    host: '192.168.0.99',
                    user: 'root',
                    password: 'yuliang@@',
                    database: 'fr_contract',
                    charset: 'utf8',
                    timezone: '+08:00',
                    bigNumberStrings: true,
                    supportBigNumbers: true,
                    connectTimeout: 10000
                },
                pool: {
                    maxConnections: 50,
                    minConnections: 2,
                },
                acquireConnectionTimeout: 10000,
                debug: false
            },
        },

        /**
         * mongoDB配置
         */
        mongo: {
            uri: "mongodb://192.168.0.99:27017/auth"
        },

        mongoNode: {
            uri: "mongodb://192.168.0.99:27017/node"
        },

        /**
         * 上传文件相关配置
         */
        uploadConfig: {
            aliOss: {
                enable: true,
                accessKeyId: "LTAIy8TOsSnNFfPb",
                accessKeySecret: "Bt5yMbW89O7wMTVQsNUfvYfou5GPsL",
                bucket: "freelog-shenzhen",
                internal: false,
                region: "oss-cn-shenzhen",
                timeout: 180000
            },
            amzS3: {}
        },

        multipart: {
            autoFields: true,
            defaultCharset: 'utf8',
            fieldNameSize: 100,
            fieldSize: '100kb',
            fields: 10,
            fileSize: '100mb',
            files: 10,
            fileExtensions: [],
            whitelist: (fileName) => true,
        },

        freelogBase: {
            retCodeEnum: {},
            errCodeEnum: {}
        },

        gatewayUrl: "http://api.freelog.com",

        rabbitMq: {
            connOptions: {
                host: '192.168.164.129',
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

        rasSha256Key: {
            resourceAuth: {
                privateKey: fs.readFileSync('config/auth_key/private_key.pem').toString(),
                publickKey: fs.readFileSync('config/auth_key/public_key.pem').toString()
            }
        },

        clientCredentialInfo: {
            clientId: 1003,
            publicKey: 'a4fc45596a8ef4f6c65b0b6620811ead',
            privateKey: 'e394b36cd66c9c205f1e3304058ba4d4'
        }
    }

    return config;
};
