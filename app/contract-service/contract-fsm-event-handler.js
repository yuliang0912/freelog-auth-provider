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

        let contractInfo = await globalInfo.app.dataProvider.contractProvider.getContractById(contractId).then(globalInfo.app.toObject)

        if (!contractInfo) {
            return Promise.reject("未找到有效的合同信息")
        }

        let event = contractInfo.policySegment.fsmDescription.find(item => {
            return item.event.eventId === eventId ||
                item.currentState === contractInfo.fsmState && item.event.eventName === eventId ||
                item.currentState === contractInfo.fsmState && item.event.type === 'compoundEvents' &&
                item.event.params.some(subEvent => subEvent.eventId === eventId || subEvent.eventName === eventId)
        })

        if (!event && event.event) {
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

        if (contractInfo.fsmState !== 'none') {
            throw new Error('合同已经激活,不能重复操作')
        }

        contractInfo.fsmState = contractInfo.policySegment.initialState
        contractInfo.isFirst = true

        /**
         * 初始化合同状态机数据,首次自动把合同状态从none变更为initial
         */
        contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)
    },

    /**
     * 执行合同事件
     * @param contractInfo
     * @param event
     * @returns {Promise.<void>}
     */
    async contractEventExecute(contractInfo, event, eventId, ...otherArgs) {

        //组合事件的子事件交给组合事件handler处理
        if (event.type.toLowerCase() === 'compoundevents') {
            return contractEventGroupHandler.eventGroupHandler(contractInfo, event, eventId, ...otherArgs)
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

        event = event.event

        let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)
        if (event.type.toLowerCase() !== 'compoundevents') {
            return contractFsm.can(event.eventId)
        }

        if (event.eventId === eventId) {
            return false
        }

        let envetGroup = await globalInfo.app.dataProvider.contractEventGroupProvider.getEventGroup({
            contractId: contractInfo.contractId,
            groupEventId: event.eventId
        })

        return envetGroup ? !envetGroup.executedEvents.some(t => t === eventId) : false
    },
}

module.exports = handler