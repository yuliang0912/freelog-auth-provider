/**
 * Created by yuliang on 2017/8/31.
 */

'use strict'

module.exports = app => {

    const mongoose = app.mongoose

    // const toObjectOptions = {
    //     transform(doc, ret, options) {
    //         return {
    //             token: ret._id.toString(),
    //             partyOne: ret.partyOne,
    //             partyTwo: ret.partyTwo,
    //             partyTwoUserId: ret.partyTwoUserId,
    //             targetId: ret.targetId,
    //             contractType: ret.contractType,
    //             masterResourceId: ret.masterResourceId,
    //             authResourceIds: ret.authResourceIds,
    //             authCode: ret.authCode,
    //             signature: ret.signature,
    //             expire: ret.expire,
    //             createDate: ret.createDate,
    //             updateDate: ret.updateDate,
    //             status: ret.status,
    //         }
    //     }
    // }

    const AuthTokenSchema = new mongoose.Schema({
        partyOne: {type: String, required: true}, //甲方
        partyTwo: {type: String, required: true}, //乙方
        partyTwoUserId: {type: Number, required: true}, //乙方用户ID
        targetId: {type: String, required: true}, //presentableId or resourceId
        contractType: {type: Number, required: true}, //合同甲乙双方的身份关系.类似于合同类型
        masterResourceId: {type: String, required: true}, //主资源ID
        authResourceIds: {type: [String], required: true}, //授权体中包含的资源ID
        authCode: {type: Number, required: true}, //授权时的授权码
        signature: {type: String, required: true}, //授权数据签名信息
        expire: {type: Number, required: true}, //授权过期时间
        status: {type: Number, required: true, default: 0},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    })

    AuthTokenSchema.index({targetId: 1, partyTwo: 1, partyTwoUserId: 1});

    AuthTokenSchema.virtual("token").get(function () {
        return this._id.toString()
    })

    return mongoose.model('auth-token', AuthTokenSchema)
}
