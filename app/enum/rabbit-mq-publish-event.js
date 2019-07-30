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

    /**
     * presentable获取到presentable或者recontractable授权事件
     */
    PresentableOnlineAuthEvent: Object.freeze({
        routingKey: 'presentable.onlineAuth.event',
        eventName: 'presentableOnlineAuthEvent'
    }),

    /**
     * 创建合同事件
     */
    CreateContractEvent: Object.freeze({
        routingKey: 'contract.create.event',
        eventName: 'createContractEvent'
    }),

    /**
     * 发行方案关联绑定的合约授权状态计算事件
     */
    ReleaseSchemeContractAuthChangedEvent: Object.freeze({
        routingKey: 'auth.releaseScheme.contractStatus.changed',
        eventName: 'releaseSchemeContractAuthChangedEvent'
    }),

    /**
     * 发行方案的授权状态已变更事件
     */
    ReleaseSchemeAuthChangedEvent: Object.freeze({
        routingKey: 'auth.releaseScheme.authStatus.changed',
        eventName: 'releaseSchemeAuthChangedEvent'
    }),

    /**
     * 重新计算发行方案授权结果事件
     */
    ReleaseSchemeAuthResultResetEvent: Object.freeze({
        routingKey: 'auth.releaseScheme.authStatus.reset',
        eventName: 'releaseSchemeAuthResultResetEvent'
    }),
}