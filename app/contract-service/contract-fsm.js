/**
 * Created by yuliang on 2017/9/1.
 */

'use strict'

const StateMachine = require('javascript-state-machine')

/**
 * 自动根据合同信息生成合同状态机
 */
module.exports.getContractFsm = (contractInfo, events) => {

    return new StateMachine({

        /**
         * 初始化合同当前状态
         */
        init: contractInfo.status,

        /**
         * 附加到状态机上的数据与函数
         */
        data: {
            /**
             * 合同本身数据信息
             */
            contract: contractInfo,

            currEvent: {},

            /**
             * 执行合同状态机上的事件
             * @param eventNasme
             * @param message
             */
            execEvent(event, message, ...args){
                if (Reflect.has(this, event.eventNo) && typeof this[event.eventNo] === 'function') {
                    this[event.eventNo](message, ...args)
                    this.currEvent = event
                } else {
                    console.log('无效的事件:' + eventName)
                }
            }
        },

        /**
         * 所有的事件定义与状态流转
         */
        transitions: contractInfo.policy.map(item => {
            return {
                name: item.eventNo,
                from: item.currentState,
                to: item.nextState
            }
        }),

        /**
         * 事件处理函数
         */
        methods: events
    })
}



