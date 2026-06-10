import { injectable } from "inversify"

import { Notification } from "../../dto/notification.js"
import { NotificationChannel, NotificationEntityType, NotificationEventType, NotificationStatus } from "../../service/enums.js"
import { NotificationRepository } from "../notification-repository.js"

@injectable()
class NotificationRepositoryNodeImpl implements NotificationRepository {

    async get(id: string, options?: any): Promise<Notification> {
        return Notification.findByPk(id, options)
    }

    async put(notification: Notification, options?: any): Promise<Notification> {
        await notification.save(options)
        return notification
    }


    async getPending(options?: any): Promise<Notification[]> {
        const query = {
            where: {
                status: NotificationStatus.PENDING
            },
            order: [
                ["dateCreated", "ASC"]
            ]
        }

        return Notification.findAll(Object.assign(query, options))
    }

    async getPendingByChannel(channel: NotificationChannel, options?: any): Promise<Notification[]> {
        const query = {
            where: {
                status: NotificationStatus.PENDING,
                channel: channel
            },
            order: [
                ["dateCreated", "ASC"]
            ]
        }

        return Notification.findAll(Object.assign(query, options))
    }

    async getByEntity(entityType: NotificationEntityType, entityId: string, options?: any): Promise<Notification[]> {
        const query = {
            where: {
                entityType: entityType,
                entityId: entityId
            }
        }

        return Notification.findAll(Object.assign(query, options))
    }

    async getByEntityEventChannel(entityType: NotificationEntityType, entityId: string, eventType: NotificationEventType, channel: NotificationChannel, options?: any): Promise<Notification> {
        const query = {
            where: {
                entityType: entityType,
                entityId: entityId,
                eventType: eventType,
                channel: channel
            }
        }

        return Notification.findOne(Object.assign(query, options))
    }

    async getByIds(ids: string[], options?: any): Promise<Notification[]> {
        const query = {
            where: {
                _id: ids
            }
        }

        return Notification.findAll(Object.assign(query, options))
    }

}

export {
    NotificationRepositoryNodeImpl
}