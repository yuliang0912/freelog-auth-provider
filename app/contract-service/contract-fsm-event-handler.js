/**
 * Created by yuliang on 2017/9/7.
 */

'use strict'

const Promise = require('bluebird')
const contractFsmHelper = require('./contract-fsm')
const contractFsmEvents = require('./contract-fsm-events')
const contractEventGroupHandler = require('./contract-event-group-handler')

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
    async contractEventTriggerHandler(eventId, contractId, ...otherArgs){

        let contractInfo = await eggApp.dataProvider.contractProvider.getContract({_id: contractId}).then(eggApp.toObject)

        if (!contractInfo) {
            return Promise.reject("未找到有效的合同信息")
        }

        /** 测试使用的模拟状态机描述
         contractInfo.policySegment.fsmDescription = [
         {
             "currentState": "initial",
             "nextState": "activatetwo",
             "event": {
                 "eventId": "1601de175a0a42d68b9bd582f1976977",
                 "eventName": "contractGuaranty",
                 "params": "contractGuaranty_5000_1_day",
                 "type": "contractGuaranty"
             }
         },
         {
             "currentState": "activatetwo",
             "nextState": "activate",
             "event": {
                 "eventId": "c4ca4238a0b923820dcc509a6f75849b",
                 "params": [
                     {
                         "eventId": "9af3c6ec3e5a42958e86d4c7e873bcdc",
                         "params": [
                             "1",
                             "2012-12-12"
                         ],
                         "type": "arrivalDate"
                     },
                     {
                         "eventId": "f99cac2ab5ea4c17801a86694a02d3f2",
                         "params": [
                             "1",
                             "2012-12-12"
                         ],
                         "type": "arrivalDate"
                     }
                 ],
                 "type": "compoundEvents"
             }
         },
         {
             "currentState": "activate",
             "nextState": "activatetwo",
             "event": {
                 "eventId": "4353d20363d343cc9885bd1cc8951d06",
                 "params": [
                     "cycle"
                 ],
                 "type": "period"
             }
         }
         ]
         **/

        let event = contractInfo.policySegment.fsmDescription.find(item => {
            return item.event.eventId === eventId ||
                item.currentState === contractInfo.fsmState && item.event.eventName === eventId ||
                item.currentState === contractInfo.fsmState && item.event.type === 'compoundEvents' &&
                item.event.params.some(subEvent => subEvent.eventId === eventId || subEvent.eventName === eventId)
        })

        if (!event) {
            return Promise.reject("事件ID错误")
        }

        if (event.event.type === 'compoundEvents') { //组合事件的子事件交给组合事件处理
            return await contractEventGroupHandler.EventGroupHandler(contractInfo, event.event, eventId, ...otherArgs)
        }

        let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)

        if (!contractFsm.can(event.event.eventId)) {
            console.log(`合同不能执行${event.event.eventId}事件`)
            console.log(contractFsm.state, contractFsm.transitions())
            return Promise.reject(`合同不能执行${event.event.eventId}事件`)
        }

        contractFsm.execEvent(event.event, ...otherArgs)
        return Promise.resolve(true)
    },

    /**
     * 首次初始化合同
     * @param contractInfo
     * @returns {Promise.<void>}
     */
    async initContractFsm(contractInfo){

        contractInfo.fsmState = contractInfo.policySegment.initialState
        contractInfo.isFirst = true

        /**
         contractInfo.policySegment.fsmDescription = [
         {
             "currentState": "initial",
             "nextState": "activatetwo",
             "event": {
                 "eventId": "1601de175a0a42d68b9bd582f1976977",
                 "eventName": "contractGuaranty",
                 "params": "contractGuaranty_5000_1_day",
                 "type": "contractGuaranty"
             }
         },
         {
             "currentState": "activatetwo",
             "nextState": "activate",
             "event": {
                 "eventId": "c4ca4238a0b923820dcc509a6f75849b",
                 "params": [
                     {
                         "eventId": "9af3c6ec3e5a42958e86d4c7e873bcdc",
                         "params": [
                             "1",
                             "2012-12-12"
                         ],
                         "type": "arrivalDate"
                     },
                     {
                         "eventId": "f99cac2ab5ea4c17801a86694a02d3f2",
                         "params": [
                             "0",
                             "10",
                             "day"
                         ],
                         "type": "arrivalDate"
                     }
                 ],
                 "type": "compoundEvents"
             }
         },
         {
             "currentState": "activate",
             "nextState": "activatetwo",
             "event": {
                 "eventId": "4353d20363d343cc9885bd1cc8951d06",
                 "params": [
                     "cycle"
                 ],
                 "type": "period"
             }
         }
         ]
         **/

        /**
         * 初始化合同状态机数据
         */
        contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)
    },

    /**
     * 模拟测试状态机运行情况
     * @param contractId
     * @param stateChangeDescript
     * @returns {Promise.<void>}
     */
    async contractTest(contractId, events){

        let contractInfo = await eggApp.dataProvider.contractProvider.getContract({_id: contractId}).then(eggApp.toObject)

        if (!contractInfo) {
            console.log('contractInfo is null')
            return Promise.reject("未找到有效的合同信息")
        }

        /**
         contractInfo.policySegment.fsmDescription = [
         {
             "currentState": "initial",
             "nextState": "activatetwo",
             "event": {
                 "eventId": "1601de175a0a42d68b9bd582f1976977",
                 "eventName": "contractGuaranty",
                 "params": "contractGuaranty_5000_1_day",
                 "type": "contractGuaranty"
             }
         },
         {
             "currentState": "activatetwo",
             "nextState": "activate",
             "event": {
                 "eventId": "c4ca4238a0b923820dcc509a6f75849b",
                 "params": [
                     {
                         "eventId": "9af3c6ec3e5a42958e86d4c7e873bcdc",
                         "params": [
                             "1",
                             "2012-12-12"
                         ],
                         "type": "arrivalDate"
                     },
                     {
                         "eventId": "f99cac2ab5ea4c17801a86694a02d3f2",
                         "params": [
                             "0",
                             "30",
                             "seconds"
                         ],
                         "type": "arrivalDate"
                     }
                 ],
                 "type": "compoundEvents"
             }
         },
         {
             "currentState": "activate",
             "nextState": "activatetwo",
             "event": {
                 "eventId": "4353d20363d343cc9885bd1cc8951d06",
                 "params": [
                     "cycle"
                 ],
                 "type": "period"
             }
         }
         ]
         **/


        let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)

        let execEvents = events.map(eventId => {
            return contractInfo.policySegment.fsmDescription
                .find(item => item.event.eventId === eventId || item.event.eventName === eventId)
        })


        let result = []

        execEvents.forEach(event => {
            if (contractFsm.can(event.event.eventId)) {
                contractFsm.execEvent(event.event)
                result.push({
                    eventId: event.event.eventId,
                    state: `${event.currentState} to ${event.nextState}`,
                    error: null
                })
            } else {
                result.push({
                    eventId: event.event.eventId,
                    state: `${event.currentState} to ${event.nextState}`,
                    error: '不能被执行,currState:' + contractFsm.state
                })
            }
        })

        return Promise.resolve(result)
    },

}