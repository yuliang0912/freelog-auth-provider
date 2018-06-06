/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose
    const toObjectOptions = {
        transform(doc, ret, options) {
            return {
                contractId: ret._id.toString(),
                targetId: ret.targetId,
                resourceId: ret.resourceId,
                partyOne: ret.partyOne,
                partyOneUserId: ret.partyOneUserId,
                partyTwo: ret.partyTwo,
                partyTwoUserId: ret.partyTwoUserId,
                segmentId: ret.segmentId,
                policySegment: ret.policySegment,
                contractType: ret.contractType,
                createDate: ret.createDate,
                updateDate: ret.updateDate,
                status: ret.status,
                fsmState: ret.fsmState,
            }
        }
    }

    const ContractSchema = new mongoose.Schema({
        targetId: {type: String, required: true}, //目标ID,当为资源时是资源策略ID,为消费方案时是presentableId
        partyOne: {type: String, required: true}, //甲方
        partyTwo: {type: String, required: true}, //乙方
        partyOneUserId: {type: Number, required: true}, //甲方的用户主体ID
        partyTwoUserId: {type: Number, required: true}, //乙方的用户主体ID
        contractType: {type: Number, required: true}, //合约类型
        resourceId: {type: String, required: true},
        segmentId: {type: String, required: true},
        policySegment: {  //预览策略
            users: {type: Array, required: true},
            segmentText: {type: String, required: false},
            fsmDescription: {type: Array, required: true},
            initialState: {type: String, required: true},
            terminateState: {type: String, required: true},
            activatedStates: {type: [String], required: true}
        },
        status: {type: Number, required: true, default: 1}, //默认未开始执行
        fsmState: {type: String, default: 'none'},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
        toJSON: toObjectOptions,
        toObject: toObjectOptions
    })

    ContractSchema.index({targetId: 1, partyOne: 1, partyTwo: 1, segmentId: 1}, {unique: true});

    return mongoose.model('contract', ContractSchema)
}
