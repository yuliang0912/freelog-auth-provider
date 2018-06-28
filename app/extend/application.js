/**
 * Created by yuliang on 2017/9/5.
 */

'use strict'

const moment = require('moment')
const restfulWebApiKey = Symbol('app#restfulWebApiKey')
const restfulWebApi = require('./restful-web-api/index')
const rabbitClient = require('./helper/rabbit_mq_client')
const freelogContractEvent = require('./event/freelog-contract-event')

module.exports = {

    get rabbitClient() {
        return rabbitClient.Instance
    },

    initRabbitClient() {
        return new rabbitClient(this.config.rabbitMq)
    },

    event: {
        contractEvent: freelogContractEvent
    },

    toObject(data) {
        return data && data.toObject ? data.toObject() : data
    },

    get webApi() {
        if (!this.__cacheMap__.has(restfulWebApiKey)) {
            this.__cacheMap__.set(restfulWebApiKey, new restfulWebApi(this.config))
        }
        return this.__cacheMap__.get(restfulWebApiKey)
    },

    moment,
}