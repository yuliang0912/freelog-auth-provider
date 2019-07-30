'use strict'

const tradeStatus = require('../../enum/trade-status')
const {ReplyAndSetInquireTransferResult} = require('../../enum/rabbit-mq-publish-event')

module.exports = class InquireTransferEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.contractTradeRecordProvider = app.dal.contractTradeRecordProvider
    }

    /**
     * 询问支付时间,对确认函做出回应
     * TEST AND SET 互斥锁实现支付中心到合同服务之间的逻辑
     */
    async handler({transferRecord, refParam}) {

        const {transferId} = transferRecord
        const contractTradeRecord = await this.contractTradeRecordProvider.findOne({tradeRecordId: refParam})
        if (!contractTradeRecord) {
            await this.sendInquireResultToMessageQueue({transferId, inquireResult: false})
            return
        }

        const {contractId, eventId} = contractTradeRecord
        const inquireResult = await this.app.contractService.execContractFsmEvent(contractId, eventId).catch(error => {
            this.errorHandler(error, transferRecord)
            return false
        })

        await contractTradeRecord.updateOne({
            paymentOrderId: transferId,
            status: inquireResult ? tradeStatus.InitiatorConfirmed : tradeStatus.InitiatorAbandon
        })

        await this.sendInquireResultToMessageQueue({transferId, inquireResult})
    }

    /**
     * 发送确认函结果到消息队列
     * @param paymentOrderId
     * @param inquireResult
     */
    sendInquireResultToMessageQueue({transferId, inquireResult}) {
        return this.app.rabbitClient.publish(Object.assign({}, ReplyAndSetInquireTransferResult, {
            body: {transferId, inquireResult}
        })).catch(error => this.errorHandler(error, ...arguments))
    }

    /**
     * 错误处理
     */
    errorHandler(error, ...args) {
        this.app.logger.error('inquire-transfer-event-handler事件执行异常', error, ...args)
    }
}