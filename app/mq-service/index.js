'use strict'

const Patrun = require('patrun')
const outsideSystemEvent = require('../enum/outside-system-event')

module.exports = class RabbitMessageQueueEventHandler {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.__registerEventHandler__()
        this.subscribe()
    }

    /**
     * 订阅rabbitMQ消息
     */
    subscribe() {

        const rabbitClient = this.app.rabbitClient
        const handlerFunc = this.handleMessage.bind(this)

        const subscribeQueue = function () {
            rabbitClient.subscribe('auth#contract-event-receive-queue', handlerFunc)
            rabbitClient.subscribe('auth#event-register-completed-queue', handlerFunc)
            rabbitClient.subscribe('auth#release-scheme-created-queue', handlerFunc)
            rabbitClient.subscribe('auth#release-scheme-bind-contract-queue', handlerFunc)
            rabbitClient.subscribe('auth#release-scheme-auth-reset-queue', handlerFunc)
            rabbitClient.subscribe('auth#release-scheme-contract-auth-changed-queue', handlerFunc)
            rabbitClient.subscribe('auth#release-scheme-auth-changed-queue', handlerFunc)
        }

        if (rabbitClient.isReady) {
            subscribeQueue()
        } else {
            rabbitClient.on('ready', subscribeQueue)
        }
    }

    /**
     * rabbitMq事件处理主函数
     * @param message
     * @param headers
     * @param deliveryInfo
     * @param messageObject
     */
    async handleMessage(message, headers, deliveryInfo, messageObject) {

        const givenEventHandler = this.patrun.find({
            queueName: deliveryInfo.queue,
            routingKey: messageObject.routingKey,
            eventName: headers.eventName
        })

        if (givenEventHandler) {
            await givenEventHandler({message, headers, deliveryInfo, messageObject})
        } else {
            console.log(`不能处理的未知事件,queueName:${deliveryInfo.queue},routingKey:${messageObject.routingKey},eventName:${headers.eventName}`)
        }

        messageObject.acknowledge(false)
    }

    /**
     * 注册事件处理函数
     * @private
     */
    __registerEventHandler__() {

        const {patrun, app} = this

        //注册到事件中心的事件触发了
        patrun.add({routingKey: 'event.contract.trigger'}, ({message}) => {
            app.emit(outsideSystemEvent.RegisteredEventTriggerEvent, message)
        })

        //支付中心支付订单状态变更事件
        patrun.add({routingKey: 'event.payment.order', eventName: 'PaymentOrderTradeStatusChanged'}, ({message}) => {
            app.emit(outsideSystemEvent.PaymentOrderStatusChangedEvent, message)
        })

        patrun.add({routingKey: 'event.payment.order', eventName: 'TransferRecordTradeStatusChanged'}, ({message}) => {
            app.emit(outsideSystemEvent.TransferRecordTradeStatusChangedEvent, message)
        })

        //支付中心确认函事件(支付)
        patrun.add({routingKey: 'event.payment.order', eventName: 'inquirePaymentEvent'}, ({message}) => {
            app.emit(outsideSystemEvent.InquirePaymentEvent, message)
        })

        //支付中心确认函事件(转账)
        patrun.add({routingKey: 'event.payment.order', eventName: 'inquireTransferEvent'}, ({message}) => {
            app.emit(outsideSystemEvent.InquireTransferEvent, message)
        })

        //创建发行方案事件
        patrun.add({routingKey: 'release.scheme.created', eventName: 'releaseSchemeCreatedEvent'}, ({message}) => {
            app.emit(outsideSystemEvent.ReleaseSchemeCreateEvent, message)
        })

        //发行方案绑定合同(或切换合同)事件
        patrun.add({
            routingKey: 'release.scheme.bindContract', eventName: 'releaseSchemeBindContractEvent'
        }, ({message}) => {
            app.emit(outsideSystemEvent.ReleaseSchemeBindContractEvent, message)
        })

        patrun.add({
            routingKey: 'auth.releaseScheme.contractStatus.changed', eventName: 'releaseSchemeContractAuthChangedEvent'
        }, ({message}) => {
            app.emit(outsideSystemEvent.ReleaseSchemeContractAuthChangedEvent, message)
        })

        patrun.add({
            routingKey: 'auth.releaseScheme.authStatus.changed', eventName: 'releaseSchemeAuthChangedEvent'
        }, ({message}) => {
            app.emit(outsideSystemEvent.ReleaseSchemeAuthChangedEvent, message)
        })

        patrun.add({
            routingKey: 'auth.releaseScheme.authStatus.reset', eventName: 'releaseSchemeAuthResultResetEvent'
        }, ({message}) => {
            app.emit(outsideSystemEvent.ReleaseSchemeAuthResetEvent, message)
        })

        //事件注册完成事件
        patrun.add({routingKey: 'register.event.completed'}, ({message, header}) => {
            app.emit(outsideSystemEvent.RegisterCompletedEvent, message, header.eventName)
        })
    }
}