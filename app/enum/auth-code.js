'use strict'

module.exports = Object.freeze({

    //默认状态
    Default: 0,

    /**
     * 基于全链路授权树授权
     */
    //BaseOnLinkTrack: 200,

    /**
     * 基于资源合同(授权点)授权(resource to resource contract)
     */
    BasedOnReleaseContract: 201,

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
    BasedOnReleasePolicy: 204,

    /**
     * 基于节点的策略授权(presentable policy)
     */
    BasedOnNodePolicy: 205,

    /**
     * 基于个人用户认证 (内部使用的错误码)
     */
    BasedOnIndividuals: 261,

    /**
     * 基于用户组策略 (内部使用的错误码)
     */
    BasedOnGroup: 262,

    /**
     * 基于用户自定义分组 (内部使用的错误码)
     */
    BasedOnCustomGroup: 263,

    /**
     * 基于节点域名 (内部使用的错误码)
     */
    BasedOnDomain: 264,

    /**
     * 基于重签授权
     */
    //BasedOnReContractableSign: 265,

    /**
     * 给予presentable重签授权
     */
    //BasedOnPresentableSign: 266,

    /**
     * 基于最后一次授权结果的缓存授权
     */
    //BaseOnLatestAuthCache: 299,

    /**
     * 资源合同未激活
     */
    ReleaseContractNotActive: 301,

    /**
     * 资源合同中的策略身份认证失败
     */
    ReleaseContractIdentityAuthenticationFailed: 302,

    /**
     * 未找到有效的资源合同(合约已终止)
     */
    ReleaseContractTerminated: 303,

    /**
     * 未找到资源的所有人信息
     */
    //NotFoundResourceOwnerUserInfo: 304,

    /**
     * 节点合同未激活
     */
    NodeContractNotActive: 401,

    /**
     * 节点合同中的策略身份认证失败
     */
    NodeContractIdentityAuthenticationFailed: 402,

    /**
     * 未找到有效的节点合同(合约已终止)
     */
    NodeContractTerminated: 403,

    /**
     * 未找到有效的节点信息(注销或者其他原因)
     */
    NodeUnusable: 404,

    /**
     * 未找到节点的所有人用户信息
     */
    //NotFoundNodeOwnerUserInfo: 405,

    /**
     * 节点presentable未上线
     */
    PresentableNotOnline: 406,

    /**
     * 用户合同未激活
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
     * 用户合同已终止
     */
    UserContractTerminated: 504,

    /**
     * 未找到有效的resource合约(用户尚未与资源签约或者合约已废弃)
     */
    //NotFoundUserResourceContract: 504,

    /**
     * 未找到用户信息(未登陆或已注销)
     */
    UnLoginUser: 505,

    /**
     * [过时的]无法确定执行哪个用户合同(多个合同存在时,新版本已经设置了默认合同 此错误码已无意义)
     */
    //UnsureExecuteUserContracts: 506,

    /**
     * 资源授权token无效
     */
    //ResourceAuthTokenInvalid: 507,

    /**
     * 策略身份认证失败(内部使用的错误码)
     */
    PolicyIdentityAuthenticationFailed: 601,

    /**
     * 策略授权失败
     */
    PolicyAuthFailed: 602,

    /**
     * 转签授权失败
     *
     //ReContractableSignAuthFailed: 701,

     /**
     * presentable签约授权失败
     */
    //PresentableSignAuthFailed: 702,

    /**
     * 系统异常
     */
    Exception: 900,

    /**
     * 授权参数错误
     */
    AuthArgumentsError: 901,

    /**
     * 授权数据校验失败错误
     */
    AuthDataValidateFailedError: 902
})