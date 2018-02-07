/**
 * Created by yuliang on 2017/8/31.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose
    const PresentableAuthTokenSchema = new mongoose.Schema({
        userId: {type: Number, required: true}, //用户ID
        nodeId: {type: Number, required: true}, //节点ID
        presentableId: {type: String, required: true}, //presentableId
        nodeContractId: {type: String, required: true}, //节点合同ID
        userContractId: {type: String}, //用户合同ID
        resourceId: {type: String, required: true}, //资源ID
        signature: {type: String, required: true}, //token签名信息
        expire: {type: Number, required: true}, //合同过期时间
        status: {type: Number, required: true, default: 0},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    })

    PresentableAuthTokenSchema.index({presentableId: 1, userId: 1});

    return mongoose.model('presentable-auth-token', PresentableAuthTokenSchema)
}
