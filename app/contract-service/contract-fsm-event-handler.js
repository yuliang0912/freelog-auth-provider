/**
 * Created by yuliang on 2017/9/7.
 */

'use strict'

const contractFsmHelper = require('./contract-fsm')
const contractFsmEvents = require('./contract-fsm-events')
const contractInfo = require('./demo-contract-data')

/**
 * message-queue 事件与合同状态机对应事件映射
 * @type {{}}
 */
module.exports = {
    /**
     * 合同状态机事件触发handler
     * @param eventName
     * @param otherArgs
     */
    async contractEventTriggerHandler(eventId, ...otherArgs){

        let event = contractInfo.policy.find(item => item.eventId === eventId || item.eventName === eventId)

        let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)

        if (!contractFsm.can(event.eventId)) {
            console.log(`合同不能执行${event.eventName}事件`)
            console.log(contractFsm.state, contractFsm.transitions())
            return
        }

        contractFsm.execEvent(event, ...otherArgs)
    }
}