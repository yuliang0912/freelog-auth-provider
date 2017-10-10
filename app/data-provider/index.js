/**
 * Created by yuliang on 2017/9/26.
 */

'use strict'

const contractProvider = require('./contract-provider')
const cycleSettlementProvider = require('./cycle-settlement-data-provider')
const contractEventGroupProvider = require('./contract-event-group-provider')
const contractChangeHisoryProvider = require('./contract-changed-history-provider')

module.exports = {

    registerToApp(app){

        app.provider = {
            /**
             * 合同数据提供服务
             */
            contractProvider,

            /**
             * 周期结算池数据提供服务
             */
            cycleSettlementProvider,

            /**
             * 事件分组数据提供服务
             */
            contractEventGroupProvider,

            /**
             * 合同变更历史记录
             */
            contractChangeHisoryProvider
        }
    },

    /**
     * 合同数据提供服务
     */
    contractProvider,

    /**
     * 周期结算池数据提供服务
     */
    cycleSettlementProvider,

    /**
     * 事件分组数据提供服务
     */
    contractEventGroupProvider,

    /**
     * 合同变更历史记录
     */
    contractChangeHisoryProvider
}