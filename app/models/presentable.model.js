/**
 * Created by yuliang on 2017/8/15.
 */

'use strict'

const mongoose = require('mongoose')

const toObjectOptions = {
    transform: function (doc, ret, options) {
        return {
            presentableId: ret._id.toString(),
            name: ret.name,
            resourceId: ret.resourceId,
            contractId: ret.contractId,
            userId: ret.userId,
            nodeId: ret.nodeId,
            serialNumber: ret.serialNumber,
            createDate: ret.createDate,
            updateDate: ret.updateDate,
            policy: ret.policy,
            policyText: ret.policyText,
            languageType: ret.languageType,
            tagInfo: ret.tagInfo,
            status: ret.status
        }
    }
}

const PresentableSchema = new mongoose.Schema({
    name: {type: String, required: true},
    policy: {type: Array, default: []}, //引用策略段
    policyText: {type: String, default: []}, //引用策略描述语言原文
    languageType: {type: String, required: true}, //描述语言类型,yaml或者其他
    nodeId: {type: Number, required: true}, //节点ID
    userId: {type: Number, required: true}, //创建者ID
    contractId: {type: String, required: true}, //合同ID
    resourceId: {type: String, required: true}, //资源ID
    serialNumber: {type: String, required: true}, //序列号,用于校验前端与后端是否一致
    tagInfo: {
        resourceInfo: {
            mimeType: {type: String, default: '', required: true},
            resourceType: {type: String, default: '', required: true},
            resourceName: {type: String, default: '', required: true},
            resourceId: {type: String, default: '', required: true},
        },
        userDefined: {type: Array, default: []},//用户自定义tags
        //widgetPresentables: {type: Array, default: []} //pb资源的widget
    },
    status: {type: Number, default: 0, required: true} //状态
}, {
    versionKey: false,
    timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    toJSON: toObjectOptions,
    toObject: toObjectOptions
})

PresentableSchema.index({nodeId: 1, userId: 1});

module.exports = mongoose.model('presentable', PresentableSchema)