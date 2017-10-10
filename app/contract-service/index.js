/**
 * Created by yuliang on 2017/9/5.
 */

'use start'

const rabbit = require('../extend/helper/rabbit_mq_client')
const mqEventHandler = require('./mq-event-handler-map')
const fsmEventHandler = require('./contract-fsm-event-handler')

module.exports = {

    /**
     * 启动合同服务,处理消息队列事件
     * @param app
     * @returns {Promise.<void>}
     */
    async runContractService (app) {

        //连接rabbitMQ,并且订阅指定的队列
        await new rabbit(app.config.rabbitMq).connect().then((client) => {

            //订阅所有合约相关的消息
            client.subscribe('auth-contract-queue', mqEventHandler.execEvent)

            //订阅直接推动合同状态机改变的事件
            client.subscribe('auth-contract-event-receive-queue', async (message, headers, deliveryInfo, messageObject) => {
                //直接驱动合同状态机改变的事件或者无法判断是否子事件的事件
                if (messageObject.routingKey === 'event.contract.trigger') {
                    await fsmEventHandler.contractEventTriggerHandler(headers.eventName, message.contractId, message)
                }
                messageObject.acknowledge(false)
            })
        })
    }
}