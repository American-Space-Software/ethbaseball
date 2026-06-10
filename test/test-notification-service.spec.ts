import assert from "assert"
import { v4 as uuidv4 } from "uuid"

import { getContainer } from "./inversify.config.js"

import { NotificationService } from "../src/service/data/notification-service.js"
import { Notification } from "../src/dto/notification.js"
import { NotificationChannel, NotificationEntityType, NotificationEventType, NotificationStatus } from "../src/service/enums.js"

let id1: string

describe("NotificationService", async () => {

    let notificationService: NotificationService

    before("", async () => {

        let container = getContainer()

        notificationService = container.get(NotificationService)

    })

    it("should create and get notification", async () => {

        let notification: Notification = Object.assign(new Notification(), {
            _id: uuidv4(),
            entityType: NotificationEntityType.GAME,
            entityId: uuidv4(),
            eventType: NotificationEventType.GAME_STARTED,
            channel: NotificationChannel.DISCORD,
            status: NotificationStatus.PENDING,
            attempts: 0
        })

        await notificationService.put(notification)

        id1 = notification._id

        let fetched = await notificationService.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.entityType, NotificationEntityType.GAME)
        assert.equal(fetched.entityId, notification.entityId)
        assert.equal(fetched.eventType, NotificationEventType.GAME_STARTED)
        assert.equal(fetched.channel, NotificationChannel.DISCORD)
        assert.equal(fetched.status, NotificationStatus.PENDING)
        assert.equal(fetched.attempts, 0)

    })

    it("should get pending notifications", async () => {

        let fetched = await notificationService.getPending()

        assert.equal(fetched.length, 1)
        assert.equal(fetched[0]._id, id1)

    })

    it("should get pending notifications by channel", async () => {

        let fetched = await notificationService.getPendingByChannel(NotificationChannel.DISCORD)

        assert.equal(fetched.length, 1)
        assert.equal(fetched[0]._id, id1)
        assert.equal(fetched[0].channel, NotificationChannel.DISCORD)

    })

    it("should update notification", async () => {

        let notification: Notification = await notificationService.get(id1)

        notification.status = NotificationStatus.SENT
        notification.processedAt = new Date()
        notification.lastAttemptedAt = new Date()
        notification.attempts = 1

        await notificationService.put(notification)

        let fetched = await notificationService.get(id1)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.status, NotificationStatus.SENT)
        assert.equal(fetched.attempts, 1)
        assert.ok(fetched.processedAt)
        assert.ok(fetched.lastAttemptedAt)

    })

    it("should get notifications by entity", async () => {

        let notification: Notification = await notificationService.get(id1)

        let fetched = await notificationService.getByEntity(NotificationEntityType.GAME, notification.entityId)

        assert.equal(fetched.length, 1)
        assert.equal(fetched[0]._id, id1)
        assert.equal(fetched[0].entityType, NotificationEntityType.GAME)
        assert.equal(fetched[0].entityId, notification.entityId)

    })

    it("should get notification by entity, event, and channel", async () => {

        let notification: Notification = await notificationService.get(id1)

        let fetched = await notificationService.getByEntityEventChannel(NotificationEntityType.GAME, notification.entityId, NotificationEventType.GAME_STARTED, NotificationChannel.DISCORD)

        assert.equal(fetched._id, id1)
        assert.equal(fetched.entityType, NotificationEntityType.GAME)
        assert.equal(fetched.entityId, notification.entityId)
        assert.equal(fetched.eventType, NotificationEventType.GAME_STARTED)
        assert.equal(fetched.channel, NotificationChannel.DISCORD)

    })

    it("should get notifications by ids", async () => {

        let fetched = await notificationService.getByIds([id1])

        assert.equal(fetched.length, 1)
        assert.equal(fetched[0]._id, id1)

    })

    after("After", async () => {
    })

})