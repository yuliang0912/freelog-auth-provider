/**
 * Created by yuliang on 2017/8/16.
 */


const mongoModels = require('../models/index')

module.exports = app => {
    return class ContractService extends app.Service {

        /**
         * 创建合约
         * @param model
         * @returns {Promise.<TResult>}
         */
        createContract(model) {

            if (!this.app.type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }
            model.id = mongoModels.ObjectId

            return mongoModels.contract.create(model).then()
        }

        /**
         * 查询合约
         * @param condition
         * @returns {*}
         */
        getContract(condition) {

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.contract.findOne(condition)
        }

        /**
         * 查询合约
         * @param condition
         * @returns {*}
         */
        getContractList(condition, page, pageSize) {

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.contract.find(condition, null, {skip: (page - 1) * pageSize, limit: pageSize})
        }

        /**
         * 根据ID查询合约
         * @param contractId
         * @returns {Query}
         */
        getContractById(contractId) {
            return mongoModels.contract.findById(contractId)
        }
    }
}