'use strict'

const Patrun = require('patrun')
const {ApplicationError} = require('egg-freelog-base/error')
const contractFsmEvents = require('../enum/contract-fsm-event')
const outsideSystemEvent = require('../enum/outside-system-event')
const ContractEventTriggerHandler = require('./contract-event-trigger-handler')
const RegisteredEventTriggerHandler = require('./outside-events-handler/registered-event-trigger-handler')
const InquirePaymentEventHandler = require('./outside-events-handler/inquire-payment-event-handler')
const InquireTransferEventHandler = require('./outside-events-handler/inquire-transfer-event-handler')
const ContractSetDefaultEventHandler = require('./internal-event-handler/contract-set-default-event-handler')
const TradeStatusChangedEventHandler = require('./outside-events-handler/trade-status-changed-event-handler')
const EventRegisterCompletedEventHandler = require('./outside-events-handler/event-register-completed-event-handler')
const ContractFsmStateTransitioningEventHandler = require('./internal-event-handler/fsm-state-transitioning-handler')
const ContractFsmTransitionCompletedHandler = require('./internal-event-handler/fsm-state-transition-completed-handler')

const presentableAuthEventHandler = require('./presentable-auth-events-handler')
const releaseSchemeAuthEventHandler = require('./release-scheme-auth-events-handler')


module.exports = class AppEventsListener {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.registerEventHandler()
        this.registerEventListener()
    }

    /**
     * 注册事件侦听者
     */
    registerEventListener() {

        //外部事件
        this.registerEventAndHandler(outsideSystemEvent.InquirePaymentEvent)
        this.registerEventAndHandler(outsideSystemEvent.InquireTransferEvent)
        this.registerEventAndHandler(outsideSystemEvent.RegisterCompletedEvent)
        this.registerEventAndHandler(outsideSystemEvent.RegisteredEventTriggerEvent)
        this.registerEventAndHandler(outsideSystemEvent.PaymentOrderStatusChangedEvent)
        this.registerEventAndHandler(outsideSystemEvent.TransferRecordTradeStatusChangedEvent)

        //合同状态机事件
        this.registerEventAndHandler(contractFsmEvents.ContractFsmStateChangedEvent)
        this.registerEventAndHandler(contractFsmEvents.ContractFsmEventTriggerEvent)
        this.registerEventAndHandler(contractFsmEvents.ContractFsmStateTransitionCompletedEvent)

        presentableAuthEventHandler.concat(releaseSchemeAuthEventHandler).forEach(({eventName}) => {
            this.registerEventAndHandler(eventName)
        })
    }

    /**
     * 注册事件以及事件处理者
     * @param eventName
     */
    registerEventAndHandler(eventName) {

        const eventHandler = this.patrun.find({event: eventName.toString()})
        if (!eventHandler) {
            throw new ApplicationError(`尚未注册事件${eventName}的处理者`)
        }

        this.app.on(eventName, (...args) => eventHandler.handler(...args).catch(error => {
            console.log(`事件执行异常,eventName:${eventName.toString()}`, error)
            console.log(JSON.stringify(...args))
        }))
    }

    /**
     * 注册事件处理者
     */
    registerEventHandler() {

        const {app, patrun} = this

        //外部事件
        patrun.add({event: outsideSystemEvent.InquirePaymentEvent.toString()}, new InquirePaymentEventHandler(app))
        patrun.add({event: outsideSystemEvent.InquireTransferEvent.toString()}, new InquireTransferEventHandler(app))
        patrun.add({event: outsideSystemEvent.RegisterCompletedEvent.toString()}, new EventRegisterCompletedEventHandler(app))
        patrun.add({event: outsideSystemEvent.RegisteredEventTriggerEvent.toString()}, new RegisteredEventTriggerHandler(app))
        patrun.add({event: outsideSystemEvent.PaymentOrderStatusChangedEvent.toString()}, new TradeStatusChangedEventHandler(app))
        patrun.add({event: outsideSystemEvent.TransferRecordTradeStatusChangedEvent.toString()}, new TradeStatusChangedEventHandler(app))

        //状态机事件
        patrun.add({event: contractFsmEvents.ContractFsmEventTriggerEvent.toString()}, new ContractEventTriggerHandler(app))
        patrun.add({event: contractFsmEvents.ContractFsmStateChangedEvent.toString()}, new ContractFsmStateTransitioningEventHandler(app))
        patrun.add({event: contractFsmEvents.ContractFsmStateTransitionCompletedEvent.toString()}, new ContractFsmTransitionCompletedHandler(app))
        patrun.add({event: contractFsmEvents.ContractSetDefaultEvent.toString()}, new ContractSetDefaultEventHandler(app))

        presentableAuthEventHandler.concat(releaseSchemeAuthEventHandler).forEach(({eventName, handler}) => {
            patrun.add({event: eventName.toString()}, new handler(app))
        })
    }
}