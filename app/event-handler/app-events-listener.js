'use strict'

const Patrun = require('patrun')
const outsideSystemEvent = require('../enum/outside-system-event')
const ContractEventTriggerHandler = require('./contract-event-trigger-handler')
const RegisteredEventTriggerHandler = require('./outside-events-handler/registered-event-trigger-handler')
const InquirePaymentEventHandler = require('./outside-events-handler/inquire-payment-event-handler')
const InquireTransferEventHandler = require('./outside-events-handler/inquire-transfer-event-handler')
const TradeStatusChangedEventHandler = require('./outside-events-handler/trade-status-changed-event-handler')
const EventRegisterCompletedEventHandler = require('./outside-events-handler/event-register-completed-event-handler')
const ContractFsmStateTransitioningEventHandler = require('./internal-event-handler/fsm-state-transitioning-handler')
const ContractFsmTransitionCompletedHandler = require('./internal-event-handler/fsm-state-transition-completed-handler')
const {ContractFsmStateChangedEvent, ContractFsmEventTriggerEvent, ContractFsmStateTransitionCompletedEvent} = require('../enum/contract-fsm-event')

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

        const {PaymentOrderStatusChangedEvent, TransferRecordTradeStatusChangedEvent, RegisteredEventTriggerEvent, InquirePaymentEvent, InquireTransferEvent, RegisterCompletedEvent} = outsideSystemEvent

        this.registerEventAndHandler(InquirePaymentEvent)
        this.registerEventAndHandler(InquireTransferEvent)
        this.registerEventAndHandler(RegisterCompletedEvent)
        this.registerEventAndHandler(RegisteredEventTriggerEvent)
        this.registerEventAndHandler(ContractFsmStateChangedEvent)
        this.registerEventAndHandler(ContractFsmEventTriggerEvent)
        this.registerEventAndHandler(PaymentOrderStatusChangedEvent)
        this.registerEventAndHandler(ContractFsmStateTransitionCompletedEvent)
        this.registerEventAndHandler(TransferRecordTradeStatusChangedEvent)
    }

    /**
     * 注册事件以及事件处理者
     * @param eventName
     */
    registerEventAndHandler(eventName) {

        const eventHandler = this.patrun.find({event: eventName.toString()})
        if (!eventHandler) {
            throw new Error(`尚未注册事件${eventName}的处理者`)
        }

        this.app.on(eventName, eventHandler.handler.bind(eventHandler))
    }

    /**
     * 注册事件处理者
     */
    registerEventHandler() {

        const {app, patrun} = this

        const {PaymentOrderStatusChangedEvent, TransferRecordTradeStatusChangedEvent, RegisteredEventTriggerEvent, InquirePaymentEvent, InquireTransferEvent, RegisterCompletedEvent} = outsideSystemEvent

        patrun.add({event: InquirePaymentEvent.toString()}, new InquirePaymentEventHandler(app))
        patrun.add({event: InquireTransferEvent.toString()}, new InquireTransferEventHandler(app))
        patrun.add({event: ContractFsmEventTriggerEvent.toString()}, new ContractEventTriggerHandler(app))
        patrun.add({event: RegisterCompletedEvent.toString()}, new EventRegisterCompletedEventHandler(app))
        patrun.add({event: RegisteredEventTriggerEvent.toString()}, new RegisteredEventTriggerHandler(app))
        patrun.add({event: PaymentOrderStatusChangedEvent.toString()}, new TradeStatusChangedEventHandler(app))
        patrun.add({event: TransferRecordTradeStatusChangedEvent.toString()}, new TradeStatusChangedEventHandler(app))
        patrun.add({event: ContractFsmStateChangedEvent.toString()}, new ContractFsmStateTransitioningEventHandler(app))
        patrun.add({event: ContractFsmStateTransitionCompletedEvent.toString()}, new ContractFsmTransitionCompletedHandler(app))
    }
}