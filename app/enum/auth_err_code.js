/**
 * Created by yuliang on 2017/11/17.
 */

'use strict'

module.exports = {

    "success": 0,

    /**
     * 未找到用户合同(70080101)
     */
    "notFoundUserContract": 70080101,

    /**
     * 选择需要执行的合同.一般有两个或两个以上的时候需要用户选择具体执行哪个( 70080102)
     */
    "chooseUserContract": 70080102,

    /**
     * 参数userContractId错误,找不到有效的合同(70080103)
     */
    "userContractIdError": 70080103,

    /**
     * 用户的合同未激活(70080104)
     */
    "userContractNotActivate": 70080104,

    /**
     * 用户合同授权异常(70080105)
     */
    "userContractAuthException": 70080105,

    /**
     * 未找到节点与资源的合同信息(除非DB错误,一般不会出现) 70080201
     */
    "notFoundNodeContract": 70080201,

    /**
     * 节点的合同未激活(70080202)
     */
    "nodeContractNotActivate": 70080202,

    /**
     * 节点合同授权异常
     */
    "nodeContractAuthException": 70080203,

    /**
     * 未登陆用户
     */
    "notFoundUser": 70080301,

    /**
     * 个人身份授权不通过
     */
    "individualsRefuse": 70080302,

    /**
     * 用户分组策认证不通过
     */
    "groupRefuse": 70080303,
}