/**
 * Created by yuliang on 2017/11/17.
 */

'use strict'

/**
 * 授权码
 * @type {{BasedOnUserContract: number, BasedOnNodeContract: number, BasedOnNodePolicy: number, BasedOnResourcePolicy: number, UserContractUngratified: number, NodeContractUngratified: number, NodePolicyUngratified: number, ResourcePolicyUngratified: number}}
 */

module.exports = {

    /**
     * 基于用户合约授权 (user to node contract)
     */
    BasedOnUserContract: 1,

    /**
     * 基于节点合同授权(node to resource contract)
     */
    BasedOnNodeContract: 2,

    /**
     * 基于节点的策略授权(presentable policy)
     */
    BasedOnNodePolicy: 3,

    /**
     * 基于资源的策略(presentable policy)
     */
    BasedOnResourcePolicy: 4,

    /**
     * 用户合同不满足
     */
    UserContractUngratified: 11,

    /**
     * 节点合同不满足
     */
    NodeContractUngratified: 12,

    /**
     * 节点策略不满足
     */
    NodePolicyUngratified: 13,

    /**
     * 资源策略不满足
     */
    ResourcePolicyUngratified: 14,
}