'use strict';

module.exports = app => {

    const {router, controller} = app
    const {contract, auth} = controller

    //获取合同列表
    router.get('/v1/contracts/list', contract.v1.list)
    router.post('/v1/contracts/test', contract.v1.testContractFsm)
    router.post('/v1/contracts/createUserPresentableContract', contract.v1.createUserPresentableContract)
    router.put('/v1/contracts/setDefault', contract.v1.setDefault)

    //合同事件执行
    router.post('/v1/contracts/events/payment', contract.events.payment)
    router.post('/v1/contracts/events/escrowRefunded', contract.events.escrowRefunded)
    router.post('/v1/contracts/events/signingLicenses', contract.events.signingLicenses)
    router.post('/v1/contracts/events/escrowConfiscated', contract.events.escrowConfiscated)
    router.post('/v1/contracts/events/customEventInvoking', contract.events.customEventInvoking)

    router.post('batch-sign-release-contracts', '/v1/contracts/batchCreateReleaseContracts', contract.v2.batchCreateReleaseContracts)

    /**
     * 获取合同记录
     */
    //router.get('/v1/contracts/contractRecords', contract.v1.contractRecords)
    router.get('/v1/contracts/contractRecords', contract.v2.contractRecords)
    router.get('/v1/contracts/isCanExecEvent', contract.v1.isCanExecEvent)
    router.get('/v1/contracts/initial', contract.v1.initial)
    router.get('/v1/contracts/terminateContracts', contract.v1.terminateContracts)


    //请求获取授权方案和presentable中的策略身份认证结果
    router.get('/v1/auths/authSchemeIdentityAuth', auth.v1.authSchemeIdentityAuth)
    router.get('/v1/auths/presentableIdentityAuth', auth.v1.presentableIdentityAuth)
    router.get('/v1/auths/presentable/getPresentableSignAuth', auth.v1.getPresentableSignAuth)
    router.get('/v1/auths/presentables/:presentableId/presentableTreeAuthTest', auth.v1.presentableTreeAuthTest)
    router.get('/v1/auths/presentables/getPresentableContractChainAuth', auth.v1.getPresentableContractChainAuth)

    //请求获取presentable资源
    router.get('/v1/auths/presentable/:presentableId.:extName', auth.v1.presentable)
    router.get('/v1/auths/presentable/:presentableId', auth.v1.presentable)
    //请求获取presentable资源的子资源
    router.get('/v1/auths/presentable/subResource/:resourceId', auth.v1.presentableSubResource)

    //直接请求授权资源
    router.get('/v1/auths/resource/:resourceId.:extName', auth.v1.resource)
    router.get('/v1/auths/resource/:resourceId', auth.v1.resource)

    router.get('release-policy-identity-authorization-test', '/v1/auths/releasePolicyIdentityAuthentication', auth.v2.releasePolicyIdentityAuthentication)

    //批量签约
    router.post('/v1/contracts/batchCreateAuthSchemeContracts', '/v1/contracts/batchCreateAuthSchemeContracts', contract.v1.batchCreateAuthSchemeContracts)

    /**
     * 资源合约相关REST-API
     */
    router.resources('/v1/contracts', '/v1/contracts', contract.v1)
};
