/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

/**
 * 授权服务所发送的所有事件类型
 * @type {{register: {contractExpireEvent: {routingKey: string, eventName: string}}}}
 */
module.exports = {
    /**
     * 需要注册到事件中心的事件
     */
    register: {
        /**
         * 合同过期注册事件
         */
        contractExpireEvent: {
            routingKey: 'event.register.contractExpire',
            eventName: 'registerEvent'
        }
    },

    /**
     * 授权服务自身的事件
     */
    authService: {

        /**
         * presentable + 1 (合同首次激活)
         */
        presentableContractEffectiveAuthEvent: {
            routingKey: 'contract.active.contract',
            eventName: 'firstActiveContractEvent'
        }
    }
}