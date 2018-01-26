/**
 * Created by yuliang on 2017/9/5.
 */

'use start'

const mqEventHandler = require('./mq-event-handler-map')
const rabbit = require('../extend/helper/rabbit_mq_client')
const fsmEventHandler = require('../contract-service/contract-fsm-event-handler')
const mqEventType = require('./mq-event-type').authService
const Promise = require('bluebird')

module.exports = async (app) => {
    //连接rabbitMQ,并且订阅指定的队列
    await new rabbit(app.config.rabbitMq).connect().then((client) => {

        //订阅直接推动合同状态机改变的事件
        client.subscribe('auth-contract-event-receive-queue', async (message, headers, deliveryInfo, messageObject) => {
            console.log(messageObject.routingKey)
            let handleResult = null
            switch (messageObject.routingKey) {
                case 'event.contract.trigger':
                    handleResult = fsmEventHandler.contractEventTriggerHandler(headers.eventName, message.contractId, message)
                    break
                case 'pay.payment.contract':
                    handleResult = mqEventHandler.execEvent(message, headers, deliveryInfo, messageObject)
                    //handleResult = eventHandler.paymentContractHandler(message, headers, deliveryInfo, messageObject)
                    break
                default:
                    console.log(`不能处理的未知事件,routingKey:${messageObject.routingKey}`, message, headers)
                    return
            }
            await handleResult.then(result => {
                handleResultReport(null, message, headers, deliveryInfo, messageObject, result)
            }).catch(error => {
                handleResultReport(error, message, headers, deliveryInfo, messageObject, null)
            })
            messageObject.acknowledge(false)
        })

        //授权服务事件处理结果订阅
        client.subscribe('auth-event-handle-result', async (message, headers, deliveryInfo, messageObject) => {
            await app.dataProvider.eventHandleResultProvider.create(message).catch(console.log)
            messageObject.acknowledge(false)
        })

        function handleResultReport(err, message, headers, deliveryInfo, messageObject, result) {
            let msgArgs = {
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
                    result: result,
                    error: err
                }
            }

            //延迟2秒是为了让其他应用有时间写入DB.然后再接受到回调事件
            Promise.delay(2000).then(() => {
                client.publish(msgArgs).then(ret => {
                    console.log('发送事件回执结果:' + ret)
                }).catch(console.error)
            })
        }
    })
}