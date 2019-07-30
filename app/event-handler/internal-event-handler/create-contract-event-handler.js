'use strict'

const {CreateContractEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class CreateContractEventHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 创建合约事件处理
     * @param contracts
     * @returns {Promise<void>}
     */
    async handle(contracts) {
        this.app.rabbitClient.publish({
            routingKey: CreateContractEvent.routingKey,
            eventName: CreateContractEvent.eventName,
            body: {
                contracts: Array.isArray(contracts) ? contracts : [contracts]
            }
        })
    }
}
