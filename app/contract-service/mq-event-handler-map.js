/**
 * Created by yuliang on 2017/9/6.
 */

'use strict'

const eventHandler = require('./mq-event-handler')

/**
 * 消息队列中的事件与处理函数之间映射关系
 */
const eventHandlerMap = {

    /**
     * 给指定的合同付款事件
     */
    paymentContractEvent: eventHandler.paymentContractHandler,

    /**
     * 账户充值事件
     */
    accountRechargeEvent: eventHandler.accountRechargeHandler,

    /**
     * 合同超时未执行事件
     */
    contractTimeoutEvent: eventHandler.contractTimeoutHandler,

    /**
     * 合同结算失败事件
     */
    contractChargebackFailureEvent: eventHandler.contractChargebackFailureHandler
}


/**
 * event-handler入口
 * 自动根据事件执行handler
 * @param message
 * @param headers
 * @param deliveryInfo
 * @param messageObject
 */
module.exports.execEvent = (message, headers, deliveryInfo, messageObject) => {
    try {
        let eventName = headers.eventName
        if (Reflect.has(eventHandlerMap, eventName)) {
            eventHandlerMap[eventName](message, headers, deliveryInfo, messageObject)
        } else {
            console.log(`未找到事件handler,eventName:${eventName}`)
        }
        messageObject.acknowledge(false)
    } catch (e) {
        console.error('=========event-hander-error-start==============')
        console.error(e)
        console.error('=========event-hander-error-end==============')
    }
}