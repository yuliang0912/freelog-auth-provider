/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

/**
 * 需要注册到事件中心的事件
 */
module.exports.register = {

    /**
     * 时间到达事件
     */
    arrivalDateEvent: {
        routingKey: 'event.register.arrivalDate',
        eventName: 'registerEvent',
        eventRegisterType: 1,
    },

    /**
     * 取消注册事件
     */
    unRegisterEvent: {
        routingKey: 'event.register.unregister',
        eventName: 'unRegisterEvent'
    },
}

/**
 * 授权服务自身的事件
 */
module.exports.authService = {

    /**
     * presentable + 1 (合同首次激活)
     */
    presentableContractEffectiveAuthEvent: {
        routingKey: 'contract.active.contract',
        eventName: 'firstActiveContractEvent'
    },

    /**
     * 合同事件处理结果
     */
    contractEventHandleEvent: {
        routingKey: 'contract.event.handle',
        eventName: 'contractEventHandle'
    },

    /**
     * 消息队列事件处理结果事件
     */
    mqEventHandleResultEvent: {
        routingKey: 'auth.event.handle.result',
        eventName: 'authEventHandleResultEvent'
    }
}