import { Request, Response } from 'express'
import {
  CreateUserChatMessageService,
  createUserChatMessageServiceInstance,
} from '../../services/chat/create-user-chat-message.js'

class CreateUserChatMessageController {
  constructor(
    private readonly createUserChatMessage: CreateUserChatMessageService,
  ) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const { receiverId, content } = request.body
    const { user } = request

    try {
      const result = await this.createUserChatMessage.execute({
        senderId: user?.id || '',
        receiverId,
        content,
      })

      const statusCode = result.isFailure() ? 400 : 201

      return response.status(statusCode).json(result.value)
    } catch (err) {
      const error = err as Error
      return response.status(500).json({ error: error.message })
    }
  }
}

export const createUserChatMessageControllerInstance =
  new CreateUserChatMessageController(createUserChatMessageServiceInstance)
