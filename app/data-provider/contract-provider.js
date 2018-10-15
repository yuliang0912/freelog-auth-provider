/**
 * Created by yuliang on 2017/9/26.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class ContractProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.Contract)
    }

    /**
     * 创建合约
     * @param model
     * @returns {Promise.<TResult>}
     */
    createContract(model) {
        return super.create(model)
    }

    /**
     * 批量创建合同
     * @param contractList
     */
    batchCreateContract(contractList) {
        return super.insertMany(contractList)
    }


    /**
     * 创建pageBuild类型资源的合同
     * @param contracts
     * @returns {*}
     */
    createPageBuildContract(contracts) {
        return super.insertMany(contracts)
    }

    /**
     * 查询合约
     * @param condition
     * @returns {*}
     */
    getContract(condition) {
        return super.findOne(condition)
    }

    /**
     * 根据合同ID查询合同
     * @param contractId
     * @returns {*}
     */
    getContractById(contractId) {
        return super.findById(contractId)
    }

    /**
     * 获取合同
     * @param condition
     * @param projection
     * @returns {*}
     */
    getContracts(condition, projection) {
        return super.find(condition, projection)
    }

    /**
     * 查询合约
     * @param condition
     * @returns {*}
     */
    getContractList(condition, projection, page, pageSize) {
        return super.findPageList(condition, page, pageSize, projection, {createDate: 1})
    }

    /**
     * 更新合约状态
     */
    updateContractFsmState({contractId, oldFsmState, fsmState, status}) {
        return super.updateOne({_id: contractId, fsmState: oldFsmState}, {fsmState, status})
    }
}