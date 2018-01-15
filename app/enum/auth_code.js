/**
 * Created by yuliang on 2017/11/17.
 */

'use strict'

/**
 * 授权码
 * @type {{BasedOnUserContract: number, BasedOnNodeContract: number, BasedOnNodePolicy: number, BasedOnResourcePolicy: number, UserContractUngratified: number, NodeContractUngratified: number, NodePolicyUngratified: number, ResourcePolicyUngratified: number}}
 */

module.exports = {

    Default: 0,

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
     * 基于个人用户认证
     */
    BasedOnIndividuals: 5,

    /**
     * 基于用户组策略
     */
    BasedOnGroup: 5,

    /**
     * 基于用户组或用户组策略
     */
    BasedOnUserObjectAuth: 6,

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

    /**
     * 用户对象不满足
     */
    UserObjectUngratified: 15,

    /**
     * 未知的异常
     */
    Exception: 100
}