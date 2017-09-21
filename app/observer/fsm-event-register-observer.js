/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const baseObserver = require('./base-observer')
const mqEventType = require('../contract-service/mq-event-type')
const registerEventTypes = ['settlementForward', 'contractExpire']

const cycleSettlementDataProvider = require('../data-provider/cycle-settlement-data-provider')

/**
 * 合同状态机事件注册观察者
 * @type {FsmEventRegisterObserver}
 */
module.exports = class FsmEventRegisterObserver extends baseObserver {

    constructor(subject) {
        super()
        this.subject = subject
        this.subject.registerObserver(this)
    }

    /**
     * 合同状态机状态转移
     * @param lifeCycle
     * @returns {Promise.<void>}
     */
    update(lifeCycle) {

        let {contract, state} = lifeCycle.fsm

        //根据当前状态遍历出所以需要注册到事件中心的事件
        contract.fsmDescription
            .filter(item => item.current_state === state && registerEventTypes.some(type => type === item.event.type))
            .forEach(item => {
                let handlerName = `${item.event.type}Handler`
                this[handlerName](item.event, contract)
                console.log(item.event.eventName + '注册成功!')
            })
    }


    /**
     *周期结算时间点到达事件注册
     * @param contractInfo
     */
    async settlementForwardHandler(event, contractInfo) {
        await cycleSettlementDataProvider.createCycleSettlementEvent({
            eventId: event.eventNo,
            contractId: contractInfo.contractId,
            eventParams: JSON.stringify({
                eventNo: event.eventNo
            })
        }).catch(console.error)
    }

    /**
     * 注册合同过期事件到事件中心
     * @param event
     * @param contractInfo
     */
    async contractExpireHandler(event, contractInfo) {
        this.registerToEventCenter({
            event: mqEventType.register.contractExpireEvent,
            message: {
                eventId: event.eventNo,
                eventType: 1, //contractExpire
                eventParams: {
                    expireDate: event.params[0],
                    eventNo: event.eventNo
                },
                triggerLimit: 1,
                contractId: contractInfo.contractId
            }
        })
    }

    /**
     * 注册事件到事件中心
     * @param routingKey
     * @param eventName
     * @param message
     */
    async registerToEventCenter({event, message}) {
        message.eventParams.routingKey = 'event.contract.trigger'
        await eggApp.rabbitClient.publish({
            routingKey: event.routingKey,
            eventName: event.eventName,
            body: message
        }).catch(console.log)
    }
}