'use strict'

/**
 * 发行的方案具体依赖的发行关系
 * 合同状态变更引发方案授权状态变更.方案状态变更引起presentable或者其他依赖他的方案授权状态发生变更
 * @param app
 * @returns {*}
 */

module.exports = app => {

    const mongoose = app.mongoose

    const AssociatedContractSchema = new mongoose.Schema({
        contractId: {type: String, required: true},
        // 1:未获得身份授权  2:未获得状态机授权  4:已获得身份授权  8:已获得状态机授权
        // 通过|运算,计算综合状态.目前动态分组没有实现,只需计算已获得状态机授权即可. 计算(contractStatus & 8 ) == 8即可获得授权
        contractStatus: {type: Number, required: true},
        updateDate: {type: Date, required: true},
    }, {_id: false})

    const ReleaseSchemeDependRelationSchema = new mongoose.Schema({
        releaseId: {type: String, required: true},
        schemeId: {type: String, required: true},
        resourceId: {type: String, required: true},
        version: {type: String, required: true},
        resolveReleaseId: {type: String, required: true},
        //合并解决时,会存在多个版本的情况
        resolveReleaseVersionRanges: {type: [String], required: true},
        //关联的合约是否已经获得授权(合约分组中任意一个获得授权即可)
        contractIsAuth: {type: Number, default: 0, required: true},
        associatedContracts: [AssociatedContractSchema]
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'}
    })

    AssociatedContractSchema.index({contractId: 1})
    ReleaseSchemeDependRelationSchema.index({schemeId: 1, resolveReleaseId: 1}, {unique: true})

    return mongoose.model('release-scheme-auth-relations', ReleaseSchemeDependRelationSchema)
}