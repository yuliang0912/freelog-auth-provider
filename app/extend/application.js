/**
 * Created by yuliang on 2017/9/5.
 */

const moment = require('moment')
const rabbitClient = require('./helper/rabbit_mq_client')
const freelogContractEvent = require('./event/freelog-contract-event')
const restfulWebApi = require('./restful-web-api/index')
let restfulWebApiInstance = null
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
        if (restfulWebApiInstance === null) {
            restfulWebApiInstance = new restfulWebApi(this.config)
        }
        return restfulWebApiInstance
    },

    moment,
}