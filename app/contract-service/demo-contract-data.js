/**
 * Created by yuliang on 2017/9/20.
 */


module.exports = {
    "contractId": "59a6824cac2a69554492f21d",
    "targetId": "59a67443e700dd14d8e81786",
    "resourceId": "59a3b81b0f1f332e84eba2ba",
    "partyOne": 1,
    "partyTwo": 1,
    "contractType": 3,
    "createDate": "2017-08-30T09:15:56.969Z",
    "expireDate": "2018-12-31T16:00:00.000Z",
    "status": "activatetwo",
    "policy": [
        {
            "eventNo": "3e5e1f66e72e434e935898153f21f7e4",
            "eventName": "tbd",
            "currentState": "begining",
            "nextState": "6iaxcwmk"
        },
        {
            "eventNo": "0e4233ed86be4cf0b4a1f3669bc1a53a",
            "eventName": "signing_licenseA",
            "currentState": "6iaxcwmk",
            "nextState": "activatetwo"
        },
        {
            "eventNo": "d714478c2d0d41fc80087a0b131ea11b",
            "eventName": "signing_licenseA",
            "currentState": "begining",
            "nextState": "hw5xc2p8"
        },
        {
            "eventNo": "549f84b313984213b741f5a86dbb6ae2",
            "eventName": "tbd",
            "currentState": "hw5xc2p8",
            "nextState": "activatetwo"
        },
        {
            "eventNo": "dc789bba60c14f8781fc9c9d03833757",
            "eventName": "pricingAgreement",
            "currentState": "activatetwo",
            "nextState": "activate"
        },
        {
            "eventNo": "ffdcf1f9f8eb42c4ab7cc47fecee41d6",
            "eventName": "contractExpire_12_12_2012_03_30",
            "currentState": "begining",
            "nextState": "terminated_state"
        },
        {
            "eventNo": "3ed595a9509f4599861c6bfde5c0d90c",
            "eventName": "contractExpire_12_12_2012_03_30",
            "currentState": "6iaxcwmk",
            "nextState": "terminated_state"
        },
        {
            "eventNo": "8c1cfa6a00184aecbd7bc320750d60da",
            "eventName": "contractExpire_12_12_2012_03_30",
            "currentState": "hw5xc2p8",
            "nextState": "terminated_state"
        },
        {
            "eventNo": "6339388f7a5e4dddaa1fac2f9c335ce8",
            "eventName": "contractExpire_12_12_2012_03_30",
            "currentState": "activatetwo",
            "nextState": "terminated_state"
        },
        {
            "eventNo": "2870a6a52b4e4ae1a0b451370022e697",
            "eventName": "contractExpire_12_12_2012_03_30",
            "currentState": "activate",
            "nextState": "terminated_state"
        },
        {
            "eventNo": "529c5345bfec44bf9b7405e83c5ef2c0",
            "eventName": "settlementForward_3_day",
            "currentState": "activate",
            "nextState": "settlement"
        },
        {
            "eventNo": "6549dd7567b045589fab0ea300500c03",
            "eventName": "accountSettled",
            "currentState": "settlement",
            "nextState": "activate"
        },
        {
            "eventNo": "6c65aac5b6f543efa0a432c5602c045f",
            "eventName": "settlementForward_3_day",
            "currentState": "activatetwo",
            "nextState": "settlement"
        },
        {
            "eventNo": "b4c64ebb1ea740eb8d52a42500dced1b",
            "eventName": "accountSettled",
            "currentState": "settlement",
            "nextState": "activatetwo"
        }
    ],
    "fsmDescription": [
        {
            "current_state": "begining",
            "event": {
                "type": "guarantyEvent",
                "params": "tbd",
                "eventName": "tbd",
                "eventNo": "3e5e1f66e72e434e935898153f21f7e4"
            },
            "next_state": "6iaxcwmk"
        },
        {
            "current_state": "6iaxcwmk",
            "event": {
                "type": "signing",
                "params": [
                    "licenseA"
                ],
                "eventName": "signing_licenseA",
                "eventNo": "0e4233ed86be4cf0b4a1f3669bc1a53a"
            },
            "next_state": "activatetwo"
        },
        {
            "current_state": "begining",
            "event": {
                "type": "signing",
                "params": [
                    "licenseA"
                ],
                "eventName": "signing_licenseA",
                "eventNo": "d714478c2d0d41fc80087a0b131ea11b"
            },
            "next_state": "hw5xc2p8"
        },
        {
            "current_state": "hw5xc2p8",
            "event": {
                "type": "guarantyEvent",
                "params": "tbd",
                "eventName": "tbd",
                "eventNo": "549f84b313984213b741f5a86dbb6ae2"
            },
            "next_state": "activatetwo"
        },
        {
            "current_state": "activatetwo",
            "event": {
                "type": "pricingAgreement",
                "params": "tbd",
                "eventName": "pricingAgreement",
                "eventNo": "dc789bba60c14f8781fc9c9d03833757"
            },
            "next_state": "activate"
        },
        {
            "current_state": "begining",
            "event": {
                "type": "contractExpire",
                "params": [
                    "12-12-2012",
                    "03:30"
                ],
                "eventName": "contractExpire_12_12_2012_03_30",
                "eventNo": "ffdcf1f9f8eb42c4ab7cc47fecee41d6"
            },
            "next_state": "terminated_state"
        },
        {
            "current_state": "6iaxcwmk",
            "event": {
                "type": "contractExpire",
                "params": [
                    "12-12-2012",
                    "03:30"
                ],
                "eventName": "contractExpire_12_12_2012_03_30",
                "eventNo": "3ed595a9509f4599861c6bfde5c0d90c"
            },
            "next_state": "terminated_state"
        },
        {
            "current_state": "hw5xc2p8",
            "event": {
                "type": "contractExpire",
                "params": [
                    "12-12-2012",
                    "03:30"
                ],
                "eventName": "contractExpire_12_12_2012_03_30",
                "eventNo": "8c1cfa6a00184aecbd7bc320750d60da"
            },
            "next_state": "terminated_state"
        },
        {
            "current_state": "activatetwo",
            "event": {
                "type": "contractExpire",
                "params": [
                    "12-12-2012",
                    "03:30"
                ],
                "eventName": "contractExpire_12_12_2012_03_30",
                "eventNo": "6339388f7a5e4dddaa1fac2f9c335ce8"
            },
            "next_state": "terminated_state"
        },
        {
            "current_state": "activate",
            "event": {
                "type": "contractExpire",
                "params": [
                    "12-12-2012",
                    "03:30"
                ],
                "eventName": "contractExpire_12_12_2012_03_30",
                "eventNo": "2870a6a52b4e4ae1a0b451370022e697"
            },
            "next_state": "terminated_state"
        },
        {
            "current_state": "activate",
            "event": {
                "type": "settlementForward",
                "params": [
                    3,
                    "day"
                ],
                "eventName": "settlementForward_3_day",
                "eventNo": "529c5345bfec44bf9b7405e83c5ef2c0"
            },
            "next_state": "settlement"
        },
        {
            "current_state": "settlement",
            "event": {
                "type": "accountSettled",
                "params": [],
                "eventName": "accountSettled",
                "eventNo": "6549dd7567b045589fab0ea300500c03"
            },
            "next_state": "activate"
        },
        {
            "current_state": "activatetwo",
            "event": {
                "type": "settlementForward",
                "params": [
                    3,
                    "day"
                ],
                "eventName": "settlementForward_3_day",
                "eventNo": "6c65aac5b6f543efa0a432c5602c045f"
            },
            "next_state": "settlement"
        },
        {
            "current_state": "settlement",
            "event": {
                "type": "accountSettled",
                "params": [],
                "eventName": "accountSettled",
                "eventNo": "b4c64ebb1ea740eb8d52a42500dced1b"
            },
            "next_state": "activatetwo"
        }
    ]
}
