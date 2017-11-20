/**
 * Created by yuliang on 2017/10/31.
 */


'use strict'


const moment = require('moment')
const mongoModels = require('../models/index')
const policyParse = require('../extend/helper/policy_parse_factory')

module.exports = app => {

    const type = app.type

    return {
        /**
         * 创建presentable
         * @param model
         * @returns {Promise}
         */
        createPresentable(model) {

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            model.policy = policyParse.parse(model.policyText, model.languageType)
            model.serialNumber = mongoModels.ObjectId

            return mongoModels.presentable.create(model)
        },

        /**
         * 更新消费策略
         * @param model
         * @param condition
         * @returns {Promise}
         */
        updatePresentable(model, condition) {

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            if (model.policyText && model.languageType) {
                model.policy = policyParse.parse(model.policyText, model.languageType)
                model.serialNumber = mongoModels.ObjectId
            }

            return mongoModels.presentable.update(condition, model).exec()
        },


        /**
         * 查找单个消费策略
         * @param condtion
         * @returns {Promise}
         */
        getPresentable(condition) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.presentable.findOne(condition).exec()
        },

        /**
         * 查找单个消费策略
         * @param condtion
         * @returns {Promise}
         */
        getPresentableById(presentableId) {

            if (!presentableId) {
                return Promise.reject(new Error("presentableId must be mongodbObjectId"))
            }

            return mongoModels.presentable.findOne({_id: presentableId}).exec()
        },

        /**
         * 查找多个消费策略
         * @param condtion
         * @returns {Promise}
         */
        getPresentableList(condition) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            let projection = '_id createDate name resourceId contractId nodeId userId serialNumber status tagInfo'

            return mongoModels.presentable.find(condition, projection).exec()
        },

        /**
         * 根据合同ID批量获取presentables
         */
        getPresentablesByContractIds(nodeId, contractIds) {

            if (!Array.isArray(contractIds)) {
                return Promise.reject(new Error("contractIds must be array"))
            }

            if (contractIds.length < 1) {
                return Promise.resolve([])
            }

            let projection = '_id createDate name resourceId contractId nodeId userId serialNumber status'

            return mongoModels.presentable.find({nodeId, contractId: {$in: contractIds}}, projection).exec()
        },

        /**
         * 批量新增presentables
         * @param presentables
         */
        createPageBuildPresentable(presentables){

            if (!Array.isArray(presentables)) {
                return Promise.reject(new Error("presentables must be array"))
            }

            if (!presentables.length) {
                return Promise.resolve([])
            }

            let pbPresentable = presentables.find(x => x.tagInfo.resourceInfo.resourceType === 'page_build')

            presentables.forEach(model => {
                model._id = mongoModels.ObjectId
                model.policy = policyParse.parse(model.policyText, model.languageType)
                model.serialNumber = mongoModels.ObjectId
                if (model.tagInfo.resourceInfo.resourceType === 'widget') {
                    pbPresentable.widgetPresentables.push(model._id.toString())
                }
            })

            return mongoModels.presentable.insertMany(presentables)
        }
    }
}