/**
 * Created by yuliang on 2017/8/31.
 */

'use strict'

const mongoose = require('mongoose')

const toObjectOptions = {
    transform: function (doc, ret, options) {
        return {
            executeId: ret._id,
            contractId: ret.contractId,
            partyTwo: ret.partyTwo,
            createDate: ret.createDate,
            expireDate: ret.expireDate,
            status: ret.status
        }
    }
}

const ExecuteContractSchema = new mongoose.Schema({
    contractId: {type: String, required: true}, //合同ID
    partyTwo: {type: Number, required: true}, //执行人,乙方
    expireDate: {type: Date, required: true}, //合同过期时间
    status: {type: Number, required: true, default: 0},
    payMents: []
}, {
    versionKey: false,
    timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    toJSON: toObjectOptions,
    toObject: toObjectOptions
})

ExecuteContractSchema.index({contractId: 1});

module.exports = mongoose.model('contract', ExecuteContractSchema)