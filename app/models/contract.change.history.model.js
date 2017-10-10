/**
 * Created by yuliang on 2017/9/26.
 */


'use strict'

const mongoose = require('mongoose')

const ContractChangeHistorySchema = new mongoose.Schema({
    contractId: {type: String, required: true},
    histories: {type: Array, required: true},
}, {
    versionKey: false,
    timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
})

ContractChangeHistorySchema.index({contractId: 1});

module.exports = mongoose.model('contractChangeHistory', ContractChangeHistorySchema)