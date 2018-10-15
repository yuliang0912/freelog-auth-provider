'use strict'

const lodash = require('lodash')

module.exports = app => {

    const mongoose = app.mongoose

    const toJsonOptions = {
        transform(doc, ret, options) {
            return lodash.omit(ret, ['_id'])
        }
    }

    const ContractTradeRecord = new mongoose.Schema({
        tradeRecordId: {type: String, required: true},
        paymentOrderId: {type: String, default: ''},
        tradeType: {type: Number, enum: [2, 3], required: true},
        contractId: {type: String, required: true},
        contractName: {type: String, required: true},
        contractType: {type: Number, required: true},
        fromAccountId: {type: String, required: true}, //付款方账号ID
        toAccountId: {type: String, required: true}, //收款方账号ID
        userId: {type: Number, required: true}, //发起支付的用户ID
        amount: {type: Number}, //支付金额
        fsmState: {type: String, required: true}, //本次发起支付时的合同状态
        eventId: {type: String, required: true}, //本次发起支付的事件ID
        status: {type: Number, required: true, default: 1}, //支付状态 1:发起支付中 2:支付确认中 3:支付成功 4:支付失败 5:发起方放弃支付
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toJsonOptions
    })

    ContractTradeRecord.index({contractId: 1, userId: 1})
    ContractTradeRecord.index({tradeRecordId: 1}, {unique: true})

    ContractTradeRecord.virtual('isPaymentSuccess').get(function () {
        return this.status === 3
    })

    return mongoose.model('contract-trade-record', ContractTradeRecord)
}