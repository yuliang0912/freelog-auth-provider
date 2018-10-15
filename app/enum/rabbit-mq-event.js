'use strict'

module.exports = {

    /**
     * 注册事件到事件中心
     */
    RegisterEventToEventCenter: Object.freeze({
        routingKey: 'contract.event.register',
    }),

    /**
     * 取消注册的事件
     */
    UnregisterEventFromEventCenter: Object.freeze({
        routingKey: 'contract.event.unregister',
    }),

    /**
     * 答复问询支付的确认函(互斥锁)
     */
    ReplyAndSetInquirePaymentResult: Object.freeze({
        routingKey: 'inquire.payment.result',
        eventName: 'replyAndSetInquirePaymentResult'
    }),

    /**
     * 答复问询支付的确认函(互斥锁)
     */
    ReplyAndSetInquireTransferResult: Object.freeze({
        routingKey: 'inquire.payment.result',
        eventName: 'replyAndSetInquireTransferResult'
    }),

    /**
     * presentable消费事件 (同一个合同只计入一次消费)
     */
    PresentableConsumptionEvent: Object.freeze({
        routingKey: 'presentable.consumption.event',
        eventName: 'presentableConsumptionEvent'
    }),
}