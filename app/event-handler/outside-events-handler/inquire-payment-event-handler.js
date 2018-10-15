'use strict'

const tradeStatus = require('../../enum/trade-status')
const {ReplyAndSetInquirePaymentResult} = require('../../enum/rabbit-mq-event')

module.exports = class InquirePaymentEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.contractTradeRecordProvider = app.dal.contractTradeRecordProvider
    }

    /**
     * 询问转账事件,对确认函做出回应
     * TEST AND SET 互斥锁实现支付中心到合同服务之间的逻辑
     */
    async handler(paymentOrderInfo) {

        const {outsideTradeNo, paymentOrderId, paymentType} = paymentOrderInfo
        if (paymentType !== 1) {
            console.log('不处理的确认函请求')
            return
        }

        const contractTradeRecord = await this.contractTradeRecordProvider.findOne({tradeRecordId: outsideTradeNo})
        if (!contractTradeRecord) {
            await this.sendInquireResultToMessageQueue({paymentOrderId, inquireResult: false})
        }

        const {contractId, eventId} = contractTradeRecord
        const inquireResult = await this.app.contractService.execContractFsmEvent(contractId, eventId).catch(error => {
            this.errorHandler(error, paymentOrderInfo)
            return false
        })

        await contractTradeRecord.updateOne({
            paymentOrderId, status: inquireResult ? tradeStatus.InitiatorConfirmed : tradeStatus.InitiatorAbandon
        })

        await this.sendInquireResultToMessageQueue({paymentOrderId, inquireResult})
    }

    /**
     * 发送确认函结果到消息队列
     * @param paymentOrderId
     * @param inquireResult
     */
    sendInquireResultToMessageQueue({paymentOrderId, inquireResult}) {
        return this.app.rabbitClient.publish(Object.assign({}, ReplyAndSetInquirePaymentResult, {
            body: {paymentOrderId, inquireResult}
        })).catch(error => this.errorHandler(error, ...arguments))
    }

    /**
     * 错误处理
     */
    errorHandler(error, ...args) {
        this.app.logger.error('inquire-payment-event-handler事件执行异常', error, ...args)
    }
}