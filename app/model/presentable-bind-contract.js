'use strict'

module.exports = app => {

    const mongoose = app.mongoose

    const AssociatedContractSchema = new mongoose.Schema({
        contractId: {type: String, required: true},
        // 1:未获得身份授权  2:未获得状态机授权  4:已获得身份授权  8:已获得状态机授权
        // 通过|运算,计算综合状态.目前动态分组没有实现,只需计算已获得状态机授权即可. 计算(contractStatus & 8 ) == 8即可获得授权
        contractStatus: {type: Number, required: true},
        updateDate: {type: Date, required: true},
    }, {_id: false})

    const PresentableBindContractSchema = new mongoose.Schema({
        presentableId: {type: String, required: true},
        resolveReleaseId: {type: String, required: true},
        associatedContracts: [AssociatedContractSchema],
        //0:初始太 1:合同已授权 2:合同未获得授权
        status: {type: Number, required: true, default: 0},
    }, {
        versionKey: false,
        timestamps: {createdAt: 'createDate', updatedAt: 'updateDate'},
    })

    AssociatedContractSchema.index({contractId: 1})
    PresentableBindContractSchema.index({presentableId: 1, resolveReleaseId: 1}, {unique: true})

    return mongoose.model('presentable-bind-contracts', PresentableBindContractSchema)

}
