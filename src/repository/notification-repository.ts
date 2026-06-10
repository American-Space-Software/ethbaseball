import { Notification } from "../dto/notification.js"
import { NotificationChannel, NotificationEntityType, NotificationEventType, NotificationStatus } from "../service/enums.js"

interface NotificationRepository {

    get(id: string, options?: any): Promise<Notification>

    put(notification: Notification, options?: any): Promise<Notification>

    getPending(options?: any): Promise<Notification[]>

    getPendingByChannel(channel: NotificationChannel, options?: any): Promise<Notification[]>

    getByEntity(entityType: NotificationEntityType, entityId: string, options?: any): Promise<Notification[]>

    getByEntityEventChannel(entityType: NotificationEntityType, entityId: string, eventType: NotificationEventType, channel: NotificationChannel, options?: any): Promise<Notification>

    getByIds(ids: string[], options?: any): Promise<Notification[]>

}

export {
    NotificationRepository
}