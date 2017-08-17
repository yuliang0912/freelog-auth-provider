/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

const contractType = module.exports = {

    /**
     * 资源商to资源商
     */
    "Resource-Resource": 1,

    /**
     * 节点商to资源
     */
    "Node-Resource": 2,

    /**
     * 用户to节点消费方案
     */
    "Uer-Presentable": 3
}

module.exports.allContractTypes = Object.values(contractType)