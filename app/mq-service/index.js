'use strict'

const Patrun = require('patrun')
const Promise = require('bluebird')
const eventHandler = require('./mq-event-handler')
const mqEventType = require('./mq-event-type').authService
const rabbit = require('../extend/helper/rabbit_mq_client')
const fsmEventHandler = require('../contract-service/contract-fsm-event-handler')

module.exports = class RabbitMessageQueueEventHandler {

    constructor(app) {
        this.app = app
        this.rabbitClient = null
        this.handlerPatrun = this.__registerEventHandler__()
        this.subscribe()
    }

    /**
     * 订阅rabbitMQ消息
     * @returns {Promise<void>}
     */
    async subscribe() {
        await new rabbit(this.app.config.rabbitMq).connect().then(client => {
            this.rabbitClient = client
            client.subscribe('auth-event-handle-result', (...args) => this.handleMessage(...args))
            client.subscribe('auth-contract-event-receive-queue', (...args) => this.handleMessage(...args))
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

        const givenEventHandler = this.handlerPatrun.find({
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

        const patrun = Patrun()

        //直接触发合同事件
        patrun.add({
            queueName: 'auth-contract-event-receive-queue',
            routingKey: 'event.contract.trigger'
        }, async ({message, headers, deliveryInfo, messageObject}) => {
            messageObject.messageId = require('uuid').v4().replace(/-/g, "")
            return fsmEventHandler.contractEventTriggerHandler(headers.eventName, message.contractId, message).then(result => {
                this._handleResultReport({message, headers, deliveryInfo, messageObject, result})
            }).catch(error => {
                this._handleResultReport({message, headers, deliveryInfo, messageObject, error})
            })
        })

        //触发合同支付事件
        patrun.add({
            queueName: 'auth-contract-event-receive-queue',
            routingKey: 'pay.payment.contract',
            eventName: 'paymentContractEvent'
        }, async ({message, headers, deliveryInfo, messageObject}) => {
            return eventHandler.paymentContractHandler(message).then(result => {
                this._handleResultReport({message, headers, deliveryInfo, messageObject, result})
            }).catch(error => {
                this._handleResultReport({message, headers, deliveryInfo, messageObject, error})
            })
        })

        //授权服务事件处理结果订阅
        patrun.add({queueName: 'auth-event-handle-result'}, async ({message}) => {
            return this.app.dal.eventHandleResultProvider.create(message).catch(console.log)
        })

        return patrun
    }


    //处理结果报告
    _handleResultReport({message, headers, deliveryInfo, messageObject, result, error}) {

        const msgArgs = {
            routingKey: `${mqEventType.mqEventHandleResultEvent.routingKey}.${deliveryInfo.routingKey}`,
            eventName: mqEventType.mqEventHandleResultEvent.eventName,
            body: {
                baseInfo: {
                    messageId: messageObject.messageId,
                    exchange: deliveryInfo.exchange,
                    routingKey: deliveryInfo.routingKey
                },
                message: message,
                headers: headers,
                result: result || null,
                error: error ? error.toString() : null
            }
        }

        //延迟2秒是为了让其他应用有时间写入DB.然后再接受到回调事件
        Promise.delay(2000).then(() => {
            this.rabbitClient.publish(msgArgs).then(ret => console.log('发送事件回执结果:' + ret)).catch(console.error)
        })
    }
}