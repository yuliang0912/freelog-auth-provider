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