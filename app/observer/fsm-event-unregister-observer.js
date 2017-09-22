/**
 * Created by yuliang on 2017/9/22.
 */

const baseObserver = require('./base-observer')
const mqEventType = require('../contract-service/mq-event-type')
const unRegisterEventTypes = ['settlementForward']

const cycleSettlementDataProvider = require('../data-provider/cycle-settlement-data-provider')

/**
 * 合同状态机事件取消注册观察者
 * @type {FsmEventRegisterObserver}
 */
module.exports = class FsmEventUnRegisterObserver extends baseObserver {

    constructor(subject) {
        super(subject)
    }

    /**
     * 合同状态机状态转移
     * @param lifeCycle
     * @returns {Promise.<void>}
     */
    update(lifeCycle) {

        let contract = lifeCycle.fsm.contract
        let prevState = lifeCycle.from

        //根据前一个状态遍历出所有需要取消注册的事件
        contract.fsmDescription
            .filter(item => item.current_state === prevState && unRegisterEventTypes.some(type => type === item.event.type))
            .forEach(item => {
                let handlerName = `${item.event.type}UnRegisterHandler`
                Reflect.get(this, handlerName).call(this, item.event.eventId, contract.contractId)
            })
    }

    /**
     *周期结算时间点到达事件取消
     * @param contractInfo
     */
    settlementForwardUnRegisterHandler(eventId, contractId) {
        return cycleSettlementDataProvider.deleteCycleSettlementEvent({eventId, contractId}).catch(console.error)
    }

    /**
     * 注册事件到事件中心
     * @param routingKey
     * @param eventName
     * @param message
     */
    unRegisterFromEventCenter(eventId, contractId) {
        return eggApp.rabbitClient.publish({
            routingKey: mqEventType.register.unRegisterEvent.routingKey,
            eventName: mqEventType.register.unRegisterEvent.eventName,
            body: {eventId, contractId}
        }).catch(console.log)
    }
}