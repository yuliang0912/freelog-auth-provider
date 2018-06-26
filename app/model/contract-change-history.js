/**
 * Created by yuliang on 2017/9/26.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose
    const ContractChangeHistorySchema = new mongoose.Schema({
        contractId: {type: String, unique: true, required: true},
        histories: {type: Array, required: true},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    ContractChangeHistorySchema.index({contractId: 1});

    return mongoose.model('contract-changed-history', ContractChangeHistorySchema)
}