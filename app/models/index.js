/**
 * Created by yuliang on 2017/7/25.
 */

'use strict'

const mongoose = require('mongoose')
const contract = require('./contract.model')
const presentableToken = require('./presentable.token.model')
const contractEventGroup = require('./contract.event.group.model')
const contractChangeHistroy = require('./contract.change.history.model')
const authEventHandleResult = require('./auth.event.handle.result.model')

module.exports = {

    /**
     * 合约model
     */
    contract,

    /**
     * presentable授权token记录
     */
    presentableToken,

    /**
     * 合同状态变更记录
     */
    contractChangeHistroy,

    /**
     * 合同事件分组
     */
    contractEventGroup,

    /**
     * 授权事件处理结果保存
     */
    authEventHandleResult,


    /**
     * 自动生成mongose-objectId
     * @returns {*}
     * @constructor
     */
    get ObjectId() {
        return new mongoose.Types.ObjectId
    }
}