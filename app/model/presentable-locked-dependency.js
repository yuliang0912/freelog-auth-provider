'use strict'

/**
 * 发行的方案具体依赖的发行关系
 * 合同状态变更引发方案授权状态变更.方案状态变更引起presentable或者其他依赖他的方案授权状态发生变更
 * @param app
 * @returns {*}
 */

module.exports = app => {

    const mongoose = app.mongoose

    const lockReleaseVersionSchema = new mongoose.Schema({
        version: {type: String, required: true},
        // 1:未获得身份授权  2:未获得状态机授权  4:已获得身份授权  8:已获得状态机授权
        //0:初始太 1:自身已授权 2:自身未授权 4:授权链上游已获得授权 8:授权链上游未获得授权 (单一资源状态 (1 | 4 ) = 5),结果引用自发行的授权结果
        authStatus: {type: Number, required: true},
        updateDate: {type: Date, required: true},
    }, {_id: false})

    const PresentableAuthRelationSchema = new mongoose.Schema({
        presentableId: {type: String, required: true},
        dependReleaseId: {type: String, required: true},
        lockedReleaseVersions: [lockReleaseVersionSchema],
        status: {type: Number, required: true},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    PresentableAuthRelationSchema.index({presentableId: 1, dependReleaseId: 1})

    return mongoose.model('presentable-locked-dependency', PresentableAuthRelationSchema)
}