/**
 * Created by yuliang on 2017/8/17.
 */

'use strict'

const RabbitMessageQueueEventHandler = require('./app/mq-service/index')

module.exports = async (app) => {
    new RabbitMessageQueueEventHandler(app)
}


