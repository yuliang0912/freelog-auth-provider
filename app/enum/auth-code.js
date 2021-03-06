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
     * 默认授权,例如发行没有解决的合约,则默认返回此值
     */
    BasedOnDefaultAuth: 206,

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
     * 发行合同未激活测试授权
     */
    ReleaseContractNotActiveTestAuthorization: 304,

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
     * 节点合同未激活测试授权
     */
    NodeContractNotActiveTestAuthorization: 407,

    /**
     * 测试资源未上线
     */
    NodeTestResourceNotOnline: 450,

    /**
     * 测试资源未完成全部签约
     */
    NodeTestResourceNotCompleteSignContract: 451,

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
     * 未找到用户信息(未登陆或已注销)
     */
    UnLoginUser: 505,

    /**
     * 登陆用户未获得授权(目前主要用于限制测试节点只能节点所有者才能访问)
     */
    UserUnauthorized: 550,

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
     * 基于节点合同的测试授权
     */
    BasedOnNodeContractTestAuth: 701,

    /**
     * 基于发行合同的测试授权
     */
    BasedOnReleaseContractTestAuth: 702,

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