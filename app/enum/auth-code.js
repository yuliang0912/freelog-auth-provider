'use strict'

module.exports = Object.freeze({

    //默认状态
    Default: 0,

    /**
     * 基于全链路授权树授权
     */
    BaseOnLinkTrack: 200,

    /**
     * 基于资源合同(授权点)授权(resource to resource contract)
     */
    BasedOnResourceContract: 201,

    /**
     * 基于节点合同授权(node to resource contract)
     */
    BasedOnNodeContract: 202,

    /**
     * 基于用户合约授权 (user to node contract)
     */
    BasedOnUserContract: 203,

    /**
     * 基于资源的策略(resource policy)
     */
    BasedOnResourcePolicy: 204,

    /**
     * 基于节点的策略授权(presentable policy)
     */
    BasedOnNodePolicy: 205,

    /**
     * 基于个人用户认证
     */
    BasedOnIndividuals: 261,

    /**
     * 基于用户组策略
     */
    BasedOnGroup: 262,

    /**
     * 基于节点域名
     */
    BasedOnDomain: 263,

    /**
     * 给予最后一次授权结果的缓存授权
     */
    BaseOnLatestAuthCache: 299,

    /**
     * 资源合同未激活
     */
    ResourceContractNotActive: 301,

    /**
     * 资源合同中的策略身份认证失败
     */
    ResourceContractIdentityAuthenticationFailed: 302,

    /**
     * 未找到有效的资源合同(未签约或者废弃)
     */
    NotFoundResourceContract: 303,

    /**
     * 未找到资源的所有人信息
     */
    NotFoundResourceOwnerUserInfo: 304,

    /**
     * 资源合同未激活
     */
    NodeContractNotActive: 401,

    /**
     * 节点合同中的策略身份认证失败
     */
    NodeContractIdentityAuthenticationFailed: 402,

    /**
     * 未找到有效的节点合同(未签约或者废弃)
     */
    NotFoundNodeContract: 403,

    /**
     * 节点不满足资源策略中的身份认证 (不满足策略,说明需要合同.此处直接返回未找到合同即可)
     *  ResourcePolicyIdentityAuthenticationFailedForNodeInfo: 404,
     */
    /**
     * 未找到有效的节点信息(注销或者其他原因)
     */
    NotFoundNodeInfo: 404,

    /**
     * 未找到节点的所有人用户信息
     */
    NotFoundNodeOwnerUserInfo: 405,

    /**
     * 资源合同未激活
     */
    UserContractNotActive: 501,

    /**
     * 用户合同中的策略身份认证失败
     */
    UserContractIdentityAuthenticationFailed: 502,

    /**
     * 未找到有效的presentable合约(用户尚未与请求的presentable签约或者合约已废弃)
     */
    NotFoundUserPresentableContract: 503,

    /**
     * 未找到有效的resource合约(用户尚未与资源签约或者合约已废弃)
     */
    NotFoundUserResourceContract: 504,

    /**
     * 未找到用户信息(未登陆或已注销)
     */
    NotFoundUserInfo: 505,

    /**
     * 无法确定执行哪个用户合同(多个合同存在时)
     */
    UnsureExecuteUserContracts: 506,

    /**
     * 策略身份认证失败
     */
    PolciyIdentityAuthenticationFailed: 601,

    /**
     * 系统异常
     */
    Exception: 900
})