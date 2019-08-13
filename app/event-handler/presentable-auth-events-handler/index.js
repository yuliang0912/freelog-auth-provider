'use strict'

const outsideSystemEvent = require('../../enum/outside-system-event')

const PresentableCreatedEventHandler = require('./presentable-created-event-handler')
const NodeContractAuthChangedEventHandler = require('./node-contract-auth-changed-event-handler')
const PresentableBindContractEventHandler = require('./presentable-bind-contract-event-handler')
const PresentableAuthResultResetEventHandler = require('./presentable-auth-result-reset-event-handler')
const PresentableLockedVersionChangedEventHandler = require('./presentable-locked-version-changed-event-handler')
const GeneratePresentableAuthInfoEventHandler = require('./presentable-generate-auth-info-event-handler')

module.exports = [
    {
        eventName: outsideSystemEvent.PresentableCreatedEvent,
        handler: PresentableCreatedEventHandler
    },
    {
        eventName: outsideSystemEvent.PresentableBindContractEvent,
        handler: PresentableBindContractEventHandler
    },
    {
        eventName: outsideSystemEvent.PresentableAuthResultResetEvent,
        handler: PresentableAuthResultResetEventHandler
    },
    {
        eventName: outsideSystemEvent.PresentableLockedVersionChangedEvent,
        handler: PresentableLockedVersionChangedEventHandler
    },
    {
        eventName: outsideSystemEvent.NodeContractAuthChangedEvent,
        handler: NodeContractAuthChangedEventHandler
    },
    {
        eventName: outsideSystemEvent.GeneratePresentableAuthInfoEvent,
        handler: GeneratePresentableAuthInfoEventHandler
    }
]