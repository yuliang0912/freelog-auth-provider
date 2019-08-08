'use strict'

module.exports = app => {

    const mongoose = app.mongoose

    const ReleaseAuthResultSchema = new mongoose.Schema({
        releaseId: {type: String, required: true},
        resourceId: {type: String, required: true},
        schemeId: {type: String, required: true},
        version: {type: String, required: true},
        resolveReleaseCount: {type: Number, default: 0, required: true},
        isAuth: {type: Number, enum: [0, 1], default: 0, required: true},
        //0:初始太 1:自身已授权 2:自身未授权 4:授权链上游已获得授权 7:授权链上游未获得授权 (单一资源状态 (1 | 4 ) = 5)
        status: {type: Number, required: true, default: 0},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    })

    //自身是否获得授权(自己签的合约是否OK)
    ReleaseAuthResultSchema.virtual("selfIsAuth").get(function () {
        return (this.status & 1) === 1 ? 1 : 0
    })

    //上游授权链是否获得授权
    ReleaseAuthResultSchema.virtual("upstreamIsAuth").get(function () {
        return (this.status & 4) === 4 ? 1 : 0
    })

    //自身合同授权状态
    ReleaseAuthResultSchema.virtual("selfContractAuthStatus").get(function () {
        return (this.status & 1) === 1 ? 1 : (this.status & 2) === 2 ? 2 : 0
    })

    //上游发行授权状态
    ReleaseAuthResultSchema.virtual("upstreamAuthStatus").get(function () {
        return (this.status & 4) === 4 ? 4 : (this.status & 8) === 8 ? 8 : 0
    })

    ReleaseAuthResultSchema.index({version: 1, status: 1})
    ReleaseAuthResultSchema.index({schemeId: 1}, {unique: true})
    ReleaseAuthResultSchema.index({releaseId: 1, version: 1}, {unique: true})

    return mongoose.model('release-scheme-auth-result', ReleaseAuthResultSchema)
}
