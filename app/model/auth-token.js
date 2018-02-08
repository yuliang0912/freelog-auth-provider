/**
 * Created by yuliang on 2017/8/31.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose
    const AuthTokenSchema = new mongoose.Schema({
        userId: {type: Number, required: true}, //用户ID
        nodeId: {type: Number, required: true}, //节点ID
        targetId: {type: String, required: true}, //presentableId or resourceId
        targetType: {type: Number, required: true},
        authCode: {type: Number, required: true},
        extendInfo: {}, //其他数据,混合类型
        signature: {type: String, required: true}, //token签名信息
        expire: {type: Number, required: true}, //合同过期时间
        status: {type: Number, required: true, default: 0},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    })

    AuthTokenSchema.index({targetId: 1, userId: 1});

    return mongoose.model('auth-token', AuthTokenSchema)
}
