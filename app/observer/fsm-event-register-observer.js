/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const baseObserver = require('./base-observer')
const mqEventType = require('../mq-service/mq-event-type')
const registerEventTypes = ['period', 'arrivalDate', 'compoundEvents']
const globalInfo = require('egg-freelog-base/globalInfo')

/**
 * 合同状态机事件注册观察者
 * @type {FsmEventRegisterObserver}
 */
module.exports = class FsmEventRegisterObserver extends baseObserver {

    constructor(subject) {
        super(subject)
    }

    /**
     * 合同状态机状态转移
     * @param lifeCycle
     * @returns {Promise.<void>}
     */
    update(lifeCycle) {

        let {contract, state} = lifeCycle.fsm

        //根据当前状态遍历出所以需要注册到事件中心的事件
        contract.policySegment.fsmDescription
            .filter(item => item.currentState === state && registerEventTypes.some(type => type === item.event.type))
            .forEach(item => {
                let handlerName = `${item.event.type}Handler`
                Reflect.get(this, handlerName).call(this, item.event, contract)
                console.log("事件注册:" + handlerName)
            })
    }

    /**
     * 组合事件注册
     * @param event
     * @param contractInfo
     */
    compoundEventsHandler(event, contractInfo) {

        let groupEventModel = {
            contractId: contractInfo.contractId,
            groupEventId: event.eventId,
            taskEvents: event.params.map(subEvent => subEvent.eventId || subEvent.eventName)
        }

        return globalInfo.app.dataProvider.contractEventGroupProvider
            .registerEventGroup(groupEventModel).then(() => {
                event.params.forEach(subEvent => {
                    if (registerEventTypes.some(type => type === subEvent.type)) {
                        let handlerName = `${subEvent.type}Handler`
                        Reflect.get(this, handlerName).call(this, subEvent, contractInfo)
                        //console.log("事件注册:" + handlerName)
                    }
                })
            }).catch(console.error)
    }

    /**
     *周期时间到达事件(目前支持cycle,day,week等自然单位,同意注册到池子里)
     * @param contractInfo
     */
    periodHandler(event, contractInfo) {
        return globalInfo.app.dataProvider.cycleSettlementProvider.createCycleSettlementEvent({
            eventId: event.eventId,
            contractId: contractInfo.contractId,
            eventParams: JSON.stringify({
                eventId: event.eventId
            })
        }).then((data) => {
            if (data[0].affectedRows > 0) {
                console.log('period注册成功!')
            }
        }).catch(console.error)
    }

    /**
     * 指定时间达到事件
     * @param event
     * @param contractInfo
     */
    arrivalDateHandler(event, contractInfo) {

        return this.registerToEventCenter({
            event: mqEventType.register.arrivalDateEvent,
            message: {
                eventId: event.eventId,
                eventType: mqEventType.register.arrivalDateEvent.eventRegisterType,
                eventParams: {
                    contractId: contractInfo.contractId || contractInfo._id
                },
                triggerLimit: 1,
                triggerDate: tools.arrivalDateConvert(event.params),
                contractId: contractInfo.contractId || contractInfo._id
            }
        }).then(() => {
            console.log('arrivalDate注册成功')
        })
    }

    /**
     * 注册事件到事件中心
     * @param routingKey
     * @param eventName
     * @param message
     */
    registerToEventCenter({event, message}) {
        console.log(message)
        message.eventParams.routingKey = 'event.contract.trigger'
        return globalInfo.app.rabbitClient.publish({
            routingKey: event.routingKey,
            eventName: event.eventName,
            body: message
        }).catch(console.log)
    }
}

const tools = {
    /**
     * wiki:https://github.com/nergalyang/freelog-policy
     * @param eventParams
     * @returns {Date|*}
     */
    arrivalDateConvert(eventParams){
        if (eventParams[0] === '1') {
            return globalInfo.app.moment(eventParams[1]).toDate().toLocaleString()
        }
        /**
         * 目前是相对事件注册时间.后续有需求,也可以基于合同创建时间.特此备注
         */
        return globalInfo.app.moment().add(eventParams[1], eventParams[2]).toDate().toLocaleString()
    }
}