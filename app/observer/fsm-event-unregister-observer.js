/**
 * Created by yuliang on 2017/9/22.
 */

'use strict'

const baseObserver = require('./base-observer')
const globalInfo = require('egg-freelog-base/globalInfo')
const mqEventType = require('../mq-service/mq-event-type')
const unRegisterEventTypes = ['period', 'arrivalDate', 'compoundEvents']

/**
 * 合同状态机事件取消注册观察者
 * @type {FsmEventRegisterObserver}
 */
module.exports = class FsmEventUnRegisterObserver extends baseObserver {

    /**
     * 合同状态机状态转移
     * @param lifeCycle
     * @returns {Promise.<void>}
     */
    update(lifeCycle) {

        const {contractId, policySegment} = lifeCycle.fsm.contract

        //根据前一个状态遍历出所有需要取消注册的事件
        policySegment.fsmDescription
            .filter(item => item.event && item.currentState === lifeCycle.from && unRegisterEventTypes.some(type => type === item.event.type))
            .forEach(item => {
                const handlerName = `${item.event.type}UnRegisterHandler`
                Reflect.get(this, handlerName).call(this, item.event, contractId)
                console.log("事件取消注册:" + handlerName)
            })
    }

    /**
     * 组合事件注册
     * @param event
     * @param contractInfo
     */
    compoundEventsUnRegisterHandler(event, contractId) {

        return globalInfo.app.dataProvider.contractEventGroupProvider
            .deletEventGroup(contractId, event.eventId).then(() => event.params.forEach(subEvent => {
                if (unRegisterEventTypes.some(type => type === subEvent.type)) {
                    let handlerName = `${subEvent.type}UnRegisterHandler`
                    Reflect.get(this, handlerName).call(this, subEvent, contractId)
                    console.log("事件取消注册:" + handlerName)
                }
            })).catch(console.error)
    }


    /**
     *周期结算时间点到达事件取消
     * @param contractInfo
     */
    periodUnRegisterHandler(event, contractId) {
        return globalInfo.app.dataProvider.cycleSettlementProvider.deleteCycleSettlementEvent({
            eventId: event.eventId,
            contractId
        }).catch(console.error)
    }


    /**
     * 时间到达事件取消
     * @param eventId
     * @param contractId
     */
    arrivalDateUnRegisterHandler(event, contractId) {
        this.unRegisterFromEventCenter(event, contractId)
    }

    /**
     * 注册事件到事件中心
     * @param routingKey
     * @param eventName
     * @param message
     */
    unRegisterFromEventCenter(event, contractId) {
        return globalInfo.app.rabbitClient.publish({
            routingKey: mqEventType.register.unRegisterEvent.routingKey,
            eventName: mqEventType.register.unRegisterEvent.eventName,
            body: {eventId: event.eventId, contractId}
        }).catch(console.log)
    }
}