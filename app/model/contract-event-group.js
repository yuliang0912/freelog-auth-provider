/**
 * Created by yuliang on 2017/10/9.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose
    const ContractEventGroupSchema = new mongoose.Schema({
        contractId: {type: String, required: true},
        groupEventId: {type: String, required: true},
        groupType: {type: Number, required: true, default: 1},
        taskEvents: {type: Array, required: true},
        executedEvents: {type: Array, default: []},
        status: {type: Number, required: true, default: 0}
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    ContractEventGroupSchema.index({contractId: 1, groupEventId: 1});

    return mongoose.model('contract-event-group', ContractEventGroupSchema)
}