'use strict'

module.exports = app => {

    const mongoose = app.mongoose

    const AuthTokenSchema = new mongoose.Schema({
        partyTwo: {type: String, required: true}, //乙方ID
        targetId: {type: String, required: true}, //presentableId or schemeId
        targetVersion: {type: String, required: true},
        identityType: {type: Number, required: true}, //1:发行  2:节点  3:用户
        authReleaseIds: {type: [String], required: true}, //授权体中包含的资源ID
        authCode: {type: Number, required: true}, //授权时的授权码
        expire: {type: Date, required: true}, //授权过期时间
        status: {type: Number, required: true, default: 0},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    })

    AuthTokenSchema.index({targetId: 1, identityType: 1, partyTwo: 1})

    AuthTokenSchema.virtual("token").get(function () {
        return this.id.toString()
    })

    return mongoose.model('auth-token', AuthTokenSchema)
}
