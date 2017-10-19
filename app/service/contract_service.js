/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

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

            return mongoModels.contract.create(model)
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

            return mongoModels.contract.findOne(condition).exec()
        }

        /**
         * 查询合约
         * @param condition
         * @returns {*}
         */
        getContractList(condition, projection, page, pageSize) {

            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            let options = {}
            if (this.app.type.int32(page) && this.app.type.int32(pageSize)) {
                options = {skip: (page - 1) * pageSize, limit: pageSize}
            } else if (this.app.type.int32(pageSize)) {
                options = {limit: pageSize}
            }

            return mongoModels.contract.find(condition, projection, options).exec()
        }


        /**
         * 获取数量
         * @param condition
         * @returns {Promise.<*>|Promise}
         */
        getCount(condition) {
            if (!this.app.type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }
            return mongoModels.contract.count(condition).exec()
        }

        /**
         * 根据ID查询合约
         * @param contractId
         * @returns {Promise}
         */
        getContractById(contractId) {
            return mongoModels.contract.findById(contractId).exec()
        }
    }
}