/**
 * Created by yuliang on 2017/8/16.
 */


'use strict'

const mongoose = require('mongoose')

const ContractSchema = new mongoose.Schema({
    targetId: {type: String, required: true}, //目标ID,当为资源时是资源ID,为消费方案时 是presentableId
    partyOne: {type: Number, required: true}, //甲方
    partyTwo: {type: Number, required: true}, //乙方
    contractType: {type: Number, required: true}, //合约类型
    policySegment: {  //预览策略
        user: {type: Array, required: true},
        license: {type: String, required: true},
        payMent: {type: String, required: true}
    },
    policySegmentDescription: {type: String, default: [], required: true}, //引用策略描述语言原文
    expireDate: {type: Date, required: true}, //合同过期时间
    status: {type: String, required: true, default: 0},
}, {versionKey: false, timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}})


module.exports = mongoose.model('contract', ContractSchema)