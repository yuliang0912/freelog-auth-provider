/**
 * Created by yuliang on 2017/9/26.
 */


'use strict'

const mongoModels = require('../models/index')

module.exports = app => {

    const {type} = app

    return {
        /**
         * 创建合约
         * @param model
         * @returns {Promise.<TResult>}
         */
        createContract(model) {

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            return mongoModels.contract.create(model)
        },


        /**
         * 创建pageBuild类型资源的合同
         * @param contracts
         * @returns {*}
         */
        createPageBuildContract(contracts){

            if (!Array.isArray(contracts)) {
                return Promise.reject(new Error("contracts must be array"))
            }

            if (!contracts.length) {
                return Promise.resolve([])
            }

            contracts.forEach(model => {
                model._id = mongoModels.ObjectId
                if (model.subsidiaryInfo && model.subsidiaryInfo.relevanceContractIds) {
                    model.subsidiaryInfo.relevanceContractIds.push(model._id)
                }
            })

            return mongoModels.contract.insertMany(contracts)
        },

        /**
         * 查询合约
         * @param condition
         * @returns {*}
         */
        getContract(condition) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.contract.findOne(condition).exec()
        },

        /**
         * 获取合同
         * @param condition
         * @param projection
         * @returns {*}
         */
        getContracts(condition, projection) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.contract.find(condition, projection).exec()
        },

        /**
         * 查询合约
         * @param condition
         * @returns {*}
         */
        getContractList(condition, projection, page, pageSize) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            let options = {}
            if (type.int32(page) && type.int32(pageSize)) {
                options = {skip: (page - 1) * pageSize, limit: pageSize}
            } else if (type.int32(pageSize)) {
                options = {limit: pageSize}
            }

            return mongoModels.contract.find(condition, projection, options).exec()
        },

        /**
         * 根据ID查询合约
         * @param contractId
         * @returns {Promise}
         */
        getContractById(contractId) {
            return mongoModels.contract.findById(contractId).exec()
        },

        /**
         * 更新合约状态
         */
        updateContractFsmState(contractId, fsmState, status){
            return mongoModels.contract.update({_id: contractId}, {fsmState})
        },

        /**
         * 获取数量
         * @param condition
         * @returns {Promise.<*>|Promise}
         */
        getCount(condition) {
            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }
            return mongoModels.contract.count(condition).exec()
        }
    }
}