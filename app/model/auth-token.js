'use strict'

module.exports = app => {

    const mongoose = app.mongoose

    const AuthTokenSchema = new mongoose.Schema({
        partyTwo: {type: String, required: true}, //乙方
        partyTwoUserId: {type: Number, required: true}, //乙方用户ID
        targetId: {type: String, required: true}, //presentableId or releaseId
        targetVersion: {type: String, required: true},
        identityType: {type: Number, required: true}, //合同甲乙双方的身份关系.类似于合同类型
        authReleaseIds: {type: [String], required: true}, //授权体中包含的资源ID
        authCode: {type: Number, required: true}, //授权时的授权码
        signature: {type: String, required: true}, //授权数据签名信息
        expire: {type: Number, required: true}, //授权过期时间
        status: {type: Number, required: true, default: 0},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    })

    AuthTokenSchema.index({targetId: 1, partyTwo: 1, partyOne: 1, partyTwoUserId: 1})

    AuthTokenSchema.virtual("token").get(function () {
        return this.id.toString()
    })

    return mongoose.model('auth-token', AuthTokenSchema)
}
