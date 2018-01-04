/**
 * Created by yuliang on 2017/9/7.
 */

'use strict'

const Promise = require('bluebird')
const contractFsmHelper = require('./contract-fsm')
const contractFsmEvents = require('./contract-fsm-events')
const contractEventGroupHandler = require('./contract-event-group-handler')
const globalInfo = require('egg-freelog-base/globalInfo')

/**
 * message-queue 事件与合同状态机对应事件映射
 * @type {{}}
 */
const handler = {
    /**
     * 合同状态机事件触发handler
     * @param eventName
     * @param otherArgs
     */
    async contractEventTriggerHandler(eventId, contractId, ...otherArgs) {

        let contractInfo = await globalInfo.app.dataProvider.contractProvider.getContract({_id: contractId}).then(globalInfo.app.toObject)

        if (!contractInfo) {
            return Promise.reject("未找到有效的合同信息")
        }

        let event = contractInfo.policySegment.fsmDescription.find(item => {
            return item.event.eventId === eventId ||
                item.currentState === contractInfo.fsmState && item.event.eventName === eventId ||
                item.currentState === contractInfo.fsmState && item.event.type === 'compoundEvents' &&
                item.event.params.some(subEvent => subEvent.eventId === eventId || subEvent.eventName === eventId)
        })

        if (!event) {
            return Promise.reject("事件ID错误")
        }

        return handler.contractEventExecute(contractInfo, event.event, eventId)
    },

    /**
     * 首次初始化合同
     * @param contractInfo
     * @returns {Promise.<void>}
     */
    async initContractFsm(contractInfo) {

        contractInfo.fsmState = contractInfo.policySegment.initialState
        contractInfo.isFirst = true

        /**
         * 初始化合同状态机数据,首次自动把合同状态从none变更为initial
         */
        contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)
    },

    /**
     * 模拟测试状态机运行情况
     * @param contractId
     * @param stateChangeDescript
     * @returns {Promise.<void>}
     */
    // async contractTest(contractId, events){
    //
    //     let contractInfo = await globalInfo.app.dataProvider.contractProvider.getContract({_id: contractId}).then(globalInfo.app.toObject)
    //
    //     if (!contractInfo) {
    //         console.log('contractInfo is null')
    //         return Promise.reject("未找到有效的合同信息")
    //     }
    //
    //     let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)
    //
    //     let execEvents = events.map(eventId => {
    //         return contractInfo.policySegment.fsmDescription
    //             .find(item => item.event.eventId === eventId || item.event.eventName === eventId)
    //     })
    //
    //     let result = []
    //
    //     execEvents.forEach(event => {
    //         if (contractFsm.can(event.event.eventId)) {
    //             contractFsm.execEvent(event.event)
    //             result.push({
    //                 eventId: event.event.eventId,
    //                 state: `${event.currentState} to ${event.nextState}`,
    //                 error: null
    //             })
    //         } else {
    //             result.push({
    //                 eventId: event.event.eventId,
    //                 state: `${event.currentState} to ${event.nextState}`,
    //                 error: '不能被执行,currState:' + contractFsm.state
    //             })
    //         }
    //     })
    //
    //     return Promise.resolve(result)
    // },

    /**
     * 执行合同事件
     * @param contractInfo
     * @param event
     * @returns {Promise.<void>}
     */
    async contractEventExecute(contractInfo, event, eventId, ...otherArgs) {

        //组合事件的子事件交给组合事件handler处理
        if (event.type === 'compoundEvents') {
            return contractEventGroupHandler.EventGroupHandler(contractInfo, event, eventId, ...otherArgs)
        }

        let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)

        if (!contractFsm.can(event.eventId)) {
            console.log(`合同不能执行${event.eventId}事件`)
            console.log(contractFsm.state, contractFsm.transitions())
            return Promise.reject(`合同不能执行${event.eventId}事件`)
        }

        return contractFsm.execEvent(event, ...otherArgs)
    },

    /**
     * 合同状态机事件触发handler
     * @param eventName
     * @param otherArgs
     */
    async isCanExecEvent(eventId, contractInfo) {

        let event = contractInfo.policySegment.fsmDescription.find(item => {
            return item.event.eventId === eventId ||
                item.currentState === contractInfo.fsmState && item.event.eventName === eventId ||
                item.currentState === contractInfo.fsmState && item.event.type === 'compoundEvents' &&
                item.event.params.some(subEvent => subEvent.eventId === eventId || subEvent.eventName === eventId)
        })

        if (!event) {
            return false
        }

        let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)
        if (event.type !== 'compoundEvents') {
            return contractFsm.can(event.eventId)
        }

        if (event.eventId === eventId) {
            return Promise.resolve(false)
        }

        let envetGroup = await globalInfo.app.dataProvider.contractEventGroupProvider.getEventGroup({
            contractId: contractInfo.contractId,
            groupEventId: event.eventId
        })

        if (!envetGroup) {
            return false
        }

        let hasExec = envetGroup.executedEvents.some(t => t === eventId)

        return !hasExec
    },
}

module.exports = handler