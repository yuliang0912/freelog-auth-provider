/**
 * Created by yuliang on 2017/9/5.
 */

'use strict'

const moment = require('moment')
const rabbitClient = require('./helper/rabbit_mq_client')

module.exports = {

    get rabbitClient() {
        return new rabbitClient(this.config.rabbitMq)
    },

    get contractService() {
        return this[Symbol.for('auth#contractServiceSymbol')]
    },

    moment,
}