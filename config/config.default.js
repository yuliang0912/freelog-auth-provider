'use strict';

const fs = require('fs')

module.exports = appInfo => {

    const config = {

        cluster: {
            listen: {
                port: 7008
            }
        },

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
        knex: {
            contract: {
                client: 'mysql',
                connection: {
                    host: '192.168.2.239',
                    user: 'root',
                    password: 'yuliang@@',
                    database: 'fr_contract',
                    charset: 'utf8',
                    timezone: '+08:00',
                    bigNumberStrings: true,
                    supportBigNumbers: true,
                    connectTimeout: 1500,
                    typeCast: (field, next) => {
                        if (field.type === 'JSON') {
                            return JSON.parse(field.string())
                        }
                        return next()
                    }
                },
                pool: {max: 10, min: 2},
                acquireConnectionTimeout: 800,
                debug: false
            },
        },

        mongoose: {
            url: "mongodb://192.168.2.239:27017/auth"
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
                authMechanism: 'AMQPLAIN',
                heartbeat: 120  //每2分钟保持一次连接
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
                publicKey: fs.readFileSync('config/auth_key/public_key.pem').toString()
            }
        },

        clientCredentialInfo: {
            clientId: 1003,
            publicKey: 'a4fc45596a8ef4f6c65b0b6620811ead',
            privateKey: 'e394b36cd66c9c205f1e3304058ba4d4'
        },

        logger: {
            level: 'NONE'
        }
    }

    return config;
};
