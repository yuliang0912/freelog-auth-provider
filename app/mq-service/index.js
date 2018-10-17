'use strict'

const Patrun = require('patrun')
const rabbit = require('../extend/helper/rabbit_mq_client')
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
        new rabbit(this.app.config.rabbitMq).connect().then(client => {
            const handlerFunc = this.handleMessage.bind(this)
            client.subscribe('auth#contract-event-receive-queue', handlerFunc)
            client.subscribe('auth#event-register-completed-queue', handlerFunc)
        }).catch(console.error)
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
        const {PaymentOrderStatusChangedEvent, TransferRecordTradeStatusChangedEvent, RegisteredEventTriggerEvent, InquirePaymentEvent, InquireTransferEvent, RegisterCompletedEvent} = outsideSystemEvent

        //注册到事件中心的事件触发了
        patrun.add({routingKey: 'event.contract.trigger'}, ({message}) => {
            app.emit(RegisteredEventTriggerEvent, message)
        })

        //支付中心支付订单状态变更事件
        patrun.add({routingKey: 'event.payment.order', eventName: 'paymentOrderStatusChangedEvent'}, ({message}) => {
            app.emit(PaymentOrderStatusChangedEvent, message)
        })

        patrun.add({routingKey: 'event.payment.order', eventName: 'TransferRecordTradeStatusChanged'}, ({message}) => {
            app.emit(TransferRecordTradeStatusChangedEvent, message)
        })

        //支付中心确认函事件(支付)
        patrun.add({routingKey: 'event.payment.order', eventName: 'inquirePaymentEvent'}, ({message}) => {
            app.emit(InquirePaymentEvent, message)
        })

        //支付中心确认函事件(转账)
        patrun.add({routingKey: 'event.payment.order', eventName: 'inquireTransferEvent'}, ({message}) => {
            app.emit(InquireTransferEvent, message)
        })

        //事件注册完成事件
        patrun.add({routingKey: 'register.event.completed'}, ({message, header}) => {
            app.emit(RegisterCompletedEvent, message, header.eventName)
        })
    }
}